import {
  buildDocumentBuckets5,
  type DocumentBuckets5,
} from '@/features/documents/documents-model'
import { applicableRequirements } from '@/features/documents/template-sync'
import type { Document } from '@/domain/schemas/document.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { VisaTypeTemplate } from '@/config/types'
import type {
  DocumentCategory,
  DocumentStatus,
  OwnerType,
} from '@/domain/types/common'

/**
 * Financial-evidence summary + "evidence to gather" checklist — a pure view over
 * the Documents feature. It reuses the canonical helpers
 * (`buildDocumentBuckets5`, `applicableRequirements`) rather than
 * re-implementing bucketing or country-template applicability, and it never
 * becomes a second document-status store: statuses come straight from the
 * dossier `Document` instances (ADR-027).
 */

/** A `Document.status`, plus the "template requirement not yet instantiated" case. */
export type FinanceDocStatus = DocumentStatus | 'not_instantiated'

/** Display groups for financial evidence. */
export type FinanceDocGroupId =
  'bank' | 'income' | 'sponsor' | 'employer' | 'other'

/** Coarser groups used for the "evidence to gather" copy list. */
export type GatherGroupId = 'personal' | 'sponsor' | 'employer'

export const FINANCE_DOC_GROUP_ORDER: FinanceDocGroupId[] = [
  'bank',
  'income',
  'sponsor',
  'employer',
  'other',
]

export const GATHER_GROUP_ORDER: GatherGroupId[] = [
  'personal',
  'sponsor',
  'employer',
]

/** Income evidence, regardless of its document category (some are `financial`). */
const INCOME_CODES = new Set<string>([
  'PAYSLIPS',
  'EMPLOYMENT_LETTER',
  'TAX_RETURNS',
  'PENSION_STATEMENT',
  'SOCIAL_SECURITY',
  'BUSINESS_LICENSE',
])

export interface FinanceDocRow {
  /** Stable requirement/document code. */
  code: string
  /** i18n key for the localized name (`visa-domain:requirements.<code>.name`). */
  nameKey: string
  required: boolean
  ownerType: OwnerType
  /** The document's category — drives the focused Documents deep-link. */
  category: DocumentCategory
  status: FinanceDocStatus
  /** The real dossier document id when instantiated; null when only a requirement. */
  docId: string | null
  group: FinanceDocGroupId
}

export interface FinanceDocGroupView {
  id: FinanceDocGroupId
  rows: FinanceDocRow[]
}

export interface GatherGroupView {
  id: GatherGroupId
  rows: FinanceDocRow[]
}

export interface FinanceDocumentsView {
  buckets: DocumentBuckets5
  /** Every applicable finance requirement, grouped, with its current status. */
  groups: FinanceDocGroupView[]
  /** All applicable finance requirement rows, flat. */
  rows: FinanceDocRow[]
  /** Applicable finance docs not yet in hand, grouped for the copy list. */
  gather: GatherGroupView[]
  hasFinanceDocs: boolean
}

/** Statuses that mean "not in hand yet" — the evidence you would still gather. */
const GATHER_STATUSES = new Set<FinanceDocStatus>([
  'not_instantiated',
  'not_started',
  'requested',
  'needs_update',
])

/**
 * Which finance display group a document/requirement belongs to, or null when it
 * is not financial evidence at all. Order matters: income evidence is grouped by
 * code even when its category is `financial`.
 */
export function financeDocGroup(
  code: string,
  category: DocumentCategory,
  ownerType: OwnerType
): FinanceDocGroupId | null {
  if (category === 'sponsor' || code === 'RELATIONSHIP_PROOF') return 'sponsor'
  if (INCOME_CODES.has(code)) return 'income'
  if (ownerType === 'employer') return 'employer'
  if (category === 'financial') return 'bank'
  if (code === 'PROPERTY_DEED') return 'other'
  return null
}

/** The coarse gather group a display group rolls up into. */
function gatherGroupFor(group: FinanceDocGroupId): GatherGroupId {
  if (group === 'sponsor') return 'sponsor'
  if (group === 'employer') return 'employer'
  return 'personal'
}

export function buildFinanceDocuments(
  documents: Document[],
  application: Application | null,
  template: VisaTypeTemplate | undefined
): FinanceDocumentsView {
  const financeDocs = documents.filter(
    (d) => financeDocGroup(d.code, d.category, d.ownerType) !== null
  )
  const buckets = buildDocumentBuckets5(financeDocs)

  const applicable = template
    ? applicableRequirements(template, application)
    : []

  const byCode = new Map(financeDocs.map((d) => [d.code, d]))

  const rows: FinanceDocRow[] = applicable.flatMap((req) => {
    const group = financeDocGroup(req.code, req.category, req.ownerType)
    if (group === null) return []
    const instance = byCode.get(req.code)
    return [
      {
        code: req.code,
        nameKey: req.nameKey,
        required: req.required,
        ownerType: req.ownerType,
        category: req.category,
        status: instance ? instance.status : 'not_instantiated',
        docId: instance ? instance.id : null,
        group,
      },
    ]
  })

  const groups: FinanceDocGroupView[] = FINANCE_DOC_GROUP_ORDER.map((id) => ({
    id,
    rows: rows.filter((r) => r.group === id),
  })).filter((g) => g.rows.length > 0)

  const missing = rows.filter((row) => GATHER_STATUSES.has(row.status))
  const gather: GatherGroupView[] = GATHER_GROUP_ORDER.map((id) => ({
    id,
    rows: missing.filter((r) => gatherGroupFor(r.group) === id),
  })).filter((g) => g.rows.length > 0)

  return {
    buckets,
    groups,
    rows,
    gather,
    hasFinanceDocs: rows.length > 0,
  }
}

/**
 * Build the plain-text "evidence to gather" list for the clipboard. Names only —
 * never any applicant, sponsor, bank, balance, or income value — grouped under
 * localized headings. Localization (the heading and per-group labels) is
 * injected so this stays pure and locale-correct.
 */
export function financeClipboardText(
  groups: { label: string; rows: FinanceDocRow[] }[],
  heading: string,
  resolveName: (nameKey: string) => string
): string {
  const blocks = groups
    .filter((g) => g.rows.length > 0)
    .map((g) =>
      [
        `${g.label}:`,
        ...g.rows.map((row) => `- ${resolveName(row.nameKey)}`),
      ].join('\n')
    )
  return [heading, ...blocks].join('\n\n')
}
