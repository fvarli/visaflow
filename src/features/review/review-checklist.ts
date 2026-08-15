import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { VisaTypeTemplate } from '@/config/types'
import type {
  DocumentCategory,
  DocumentStatus,
  OwnerType,
} from '@/domain/types/common'
import { applicableRequirements } from '@/features/documents/template-sync'
import { classifyFreshness } from '@/features/timeline/document-freshness'

/**
 * The submission checklist — "what do I hand over, and is it in hand?"
 *
 * This is the single derivation behind BOTH the item-level checklist and the
 * physical-dossier plan, so the two can never disagree about a document. It is
 * pure, i18n-free and Intl-free (stable codes, keys and ISO dates only).
 *
 * It creates no second document-status store: `status` is the dossier
 * `Document.status` verbatim, plus the `not_instantiated` case the Employment
 * and Finance workspaces already use for an applicable requirement that has no
 * document record yet (ADR-026/ADR-027). `state` is a *presentation grouping*
 * of those statuses for the calm five-way vocabulary the page speaks — it adds
 * no new judgement and never describes an application's chances (ADR-016).
 */

/** A `Document.status`, plus "the requirement exists but no record does". */
export type ChecklistStatus = DocumentStatus | 'not_instantiated'

/**
 * The calm five-way vocabulary. A grouping of `ChecklistStatus`, never a new
 * status: `received` and `needs_update` both mean "you have something, but it
 * is not confirmed ready", which is exactly what a final review should raise.
 */
export type ChecklistState =
  'ready' | 'needsAttention' | 'missing' | 'optional' | 'notApplicable'

/**
 * The groups an applicant physically hands over, mapped from the 12 domain
 * `DocumentCategory` values. Presentation only — the stored category is
 * unchanged.
 */
export type SubmissionGroupId =
  | 'identity'
  | 'application'
  | 'employment'
  | 'financial'
  | 'sponsor'
  | 'travel'
  | 'accommodation'
  | 'insurance'
  | 'additional'

export const SUBMISSION_GROUP_ORDER: SubmissionGroupId[] = [
  'identity',
  'application',
  'employment',
  'financial',
  'sponsor',
  'travel',
  'accommodation',
  'insurance',
  'additional',
]

const CATEGORY_TO_GROUP: Record<DocumentCategory, SubmissionGroupId> = {
  identity: 'identity',
  passport: 'identity',
  application_form: 'application',
  employment: 'employment',
  financial: 'financial',
  sponsor: 'sponsor',
  travel: 'travel',
  accommodation: 'accommodation',
  insurance: 'insurance',
  civil_registry: 'additional',
  previous_travel: 'additional',
  supporting: 'additional',
}

export function groupForCategory(
  category: DocumentCategory
): SubmissionGroupId {
  return CATEGORY_TO_GROUP[category] ?? 'additional'
}

export function checklistState(
  status: ChecklistStatus,
  required: boolean
): ChecklistState {
  if (status === 'not_applicable') return 'notApplicable'
  if (status === 'ready') return 'ready'
  // In hand (or previously in hand) but not confirmed usable.
  if (status === 'received' || status === 'needs_update')
    return 'needsAttention'
  // not_started | requested | not_instantiated
  return required ? 'missing' : 'optional'
}

export interface ChecklistRow {
  /** Stable, language-independent requirement/document code. */
  code: string
  category: DocumentCategory
  group: SubmissionGroupId
  ownerType: OwnerType
  required: boolean
  status: ChecklistStatus
  state: ChecklistState
  /** The dossier document id when a record exists; null for a bare requirement. */
  docId: string | null
  /** Legacy display name from a pre-i18n export, for `documentLabel` fallback. */
  legacyName?: string
  /** Recorded expiry, when the document has one. */
  validUntil: string | null
  /** Factual: the recorded `validUntil` precedes the appointment date. */
  expiresBeforeAppointment: boolean
  /** Where this item is worked on — never a dead end. */
  to: string
}

export interface ChecklistCounts {
  ready: number
  needsAttention: number
  missing: number
  optional: number
  notApplicable: number
  /** Items that count toward being submission-ready (excludes not-applicable). */
  actionable: number
  total: number
}

export interface SubmissionGroup {
  id: SubmissionGroupId
  rows: ChecklistRow[]
  counts: ChecklistCounts
}

export interface SubmissionChecklist {
  groups: SubmissionGroup[]
  rows: ChecklistRow[]
  counts: ChecklistCounts
}

function emptyCounts(): ChecklistCounts {
  return {
    ready: 0,
    needsAttention: 0,
    missing: 0,
    optional: 0,
    notApplicable: 0,
    actionable: 0,
    total: 0,
  }
}

function tally(rows: ChecklistRow[]): ChecklistCounts {
  const counts = emptyCounts()
  for (const row of rows) {
    counts[row.state] += 1
    counts.total += 1
    if (row.state !== 'notApplicable') counts.actionable += 1
  }
  return counts
}

/** Deep-link: an existing record opens its detail panel, a bare requirement its category. */
function rowLink(docId: string | null, category: DocumentCategory): string {
  return docId
    ? `/documents?doc=${encodeURIComponent(docId)}`
    : `/documents?category=${category}`
}

/**
 * Build the checklist from the applicant's own documents **and** the applicable
 * template requirements.
 *
 * Both sources matter: a requirement with no record yet is the thing most
 * likely to be forgotten, and a custom document the applicant added themselves
 * still has to go in the folder. Deduped by `code`, with the dossier record
 * winning — the dossier is the truth about what the applicant has.
 */
export function buildSubmissionChecklist(
  documents: Document[],
  application: Application | null,
  template: VisaTypeTemplate | undefined,
  appointmentDate: string | null
): SubmissionChecklist {
  const byCode = new Map(documents.map((doc) => [doc.code, doc]))

  const rows: ChecklistRow[] = documents.map((doc) => {
    const expiresBeforeAppointment =
      classifyFreshness(doc, appointmentDate, false) ===
      'expiresBeforeAppointment'
    return {
      code: doc.code,
      category: doc.category,
      group: groupForCategory(doc.category),
      ownerType: doc.ownerType,
      required: doc.required,
      status: doc.status,
      state: checklistState(doc.status, doc.required),
      docId: doc.id,
      legacyName: doc.name,
      validUntil: doc.validUntil ?? null,
      expiresBeforeAppointment,
      to: rowLink(doc.id, doc.category),
    }
  })

  // Applicable requirements the applicant has no record for yet.
  const applicable = template
    ? applicableRequirements(template, application)
    : []
  for (const req of applicable) {
    if (byCode.has(req.code)) continue
    rows.push({
      code: req.code,
      category: req.category,
      group: groupForCategory(req.category),
      ownerType: req.ownerType,
      required: req.required,
      status: 'not_instantiated',
      state: checklistState('not_instantiated', req.required),
      docId: null,
      validUntil: null,
      expiresBeforeAppointment: false,
      to: rowLink(null, req.category),
    })
  }

  const groups: SubmissionGroup[] = []
  for (const id of SUBMISSION_GROUP_ORDER) {
    const groupRows = rows.filter((row) => row.group === id)
    if (groupRows.length === 0) continue
    groups.push({ id, rows: groupRows, counts: tally(groupRows) })
  }

  return { groups, rows, counts: tally(rows) }
}
