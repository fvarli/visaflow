import { useMemo } from 'react'
import { useDossier } from '@/app/providers/DossierProvider'
import { runValidation } from '@/domain/rules/runner'
import { resolveVisaTemplate } from '@/config/countries'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { DocumentCategory, DocumentStatus } from '@/domain/types/common'
import type { VisaTypeTemplate } from '@/config/types'
import type { ValidationFinding } from '@/domain/rules/types'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import type { DocumentReadiness } from '@/features/readiness/readiness-types'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'

/**
 * Pure presentation adapter for the Documents workspace.
 *
 * It reads the dossier and produces the display model — readiness buckets,
 * category groups, the next document to obtain, and the association between
 * validation findings and documents — without re-encoding any business or
 * validation logic. Findings come straight from `runValidation`; requirement
 * context is re-resolved from the country template by `code` (never persisted).
 */

export interface DocumentsModelInput {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
}

/**
 * The quick-filter buckets the overview hero surfaces.
 *
 * These are *display* keys over the canonical readiness classes (ADR-033), not
 * a second arithmetic: the counts come from `DocumentReadiness`, and clicking a
 * chip applies the matching status filter, so the number on a chip and the
 * number of rows it reveals always agree.
 */
export type BucketKey =
  | 'ready'
  | 'obtained'
  | 'requested'
  | 'needsUpdate'
  | 'missing'
  | 'notApplicable'
  | 'optional'

/**
 * The document status each chip filters to — the bridge that lets the chips
 * reuse `DOCUMENT_STATUS_TONE` instead of maintaining a parallel tone map.
 * `optional` is a requirement-flag filter, not a status, hence null.
 */
export const BUCKET_STATUS: Record<BucketKey, DocumentStatus | null> = {
  ready: 'ready',
  obtained: 'received',
  requested: 'requested',
  needsUpdate: 'needs_update',
  missing: 'not_started',
  notApplicable: 'not_applicable',
  optional: null,
}

/** Which readiness figure backs each chip. */
export const BUCKET_COUNT: Record<
  BucketKey,
  (readiness: DocumentReadiness) => number
> = {
  ready: (r) => r.ready,
  obtained: (r) => r.obtained,
  requested: (r) => r.inProgress,
  needsUpdate: (r) => r.needsUpdate,
  missing: (r) => r.notStarted,
  notApplicable: (r) => r.notApplicable,
  optional: (r) => r.optional,
}

/** Reading order for category groups; unknown categories fall to the end. */
export const CATEGORY_ORDER: DocumentCategory[] = [
  'identity',
  'passport',
  'application_form',
  'civil_registry',
  'employment',
  'financial',
  'sponsor',
  'travel',
  'accommodation',
  'insurance',
  'previous_travel',
  'supporting',
]

export interface DocumentGroupView {
  category: DocumentCategory
  documents: Document[]
}

export function groupByCategory(documents: Document[]): DocumentGroupView[] {
  const map = new Map<DocumentCategory, Document[]>()
  for (const doc of documents) {
    const list = map.get(doc.category)
    if (list) list.push(doc)
    else map.set(doc.category, [doc])
  }
  const groups: DocumentGroupView[] = []
  for (const category of CATEGORY_ORDER) {
    const docs = map.get(category)
    if (docs) {
      groups.push({ category, documents: docs })
      map.delete(category)
    }
  }
  for (const [category, docs] of [...map.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    groups.push({ category, documents: docs })
  }
  return groups
}

/**
 * What the applicant should do about the recommended document.
 *
 * Each canonical status maps to the action that status actually calls for — a
 * `requested` document is not "missing", and a `received` one must never be
 * recommended for obtaining again (ADR-034).
 */
export type NextDocumentAction = 'obtain' | 'followUp' | 'update' | 'confirm'

export interface NextDocumentRecommendation {
  /** Stable code — always present, so the UI can always label the item. */
  code: string
  /** The dossier record, or null for an applicable requirement with no record. */
  document: Document | null
  /** Legacy display name from a pre-i18n export, for `documentLabel`. */
  legacyName?: string
  action: NextDocumentAction
}

/**
 * The single most useful next document, and what to do about it.
 *
 * Priority deliberately mirrors the app-wide `deriveNextActions` ordering
 * (`completeMissingDocs` → `updateDocuments` → `confirmDocuments`) so the
 * Documents workspace never contradicts the Dashboard about what matters most:
 *
 *   not in hand (not_started, then un-instantiated, then requested)
 *   → needs_update
 *   → received (cheapest win, but only once nothing else is outstanding)
 *
 * `requiredRequirementCodes` lets it see work the dossier has no record for at
 * all. Without it, a dossier that has never opened the Documents workspace
 * reports "all caught up" beside a 0% readiness bar.
 */
export function deriveNextDocument(
  documents: Document[],
  requiredRequirementCodes: string[] = []
): NextDocumentRecommendation | null {
  const required = documents.filter((d) => d.required)
  const present = new Set(documents.map((d) => d.code))

  const pick = (
    status: Document['status'],
    action: NextDocumentAction
  ): NextDocumentRecommendation | null => {
    const doc = required.find((d) => d.status === status)
    return doc
      ? { code: doc.code, document: doc, legacyName: doc.name, action }
      : null
  }

  // Nothing in hand yet — an existing record first (it is one click away),
  // then a requirement that has not even been added to the dossier.
  const notStarted = pick('not_started', 'obtain')
  if (notStarted) return notStarted

  const uninstantiated = requiredRequirementCodes.find(
    (code) => !present.has(code)
  )
  if (uninstantiated) {
    return { code: uninstantiated, document: null, action: 'obtain' }
  }

  return (
    pick('requested', 'followUp') ??
    pick('needs_update', 'update') ??
    pick('received', 'confirm') ??
    null
  )
}

export type DocumentKind = 'required' | 'conditional' | 'optional' | 'custom'

/**
 * Where a document comes from. A document is template-derived iff its `code`
 * matches a requirement in the resolved template; otherwise it is a user-added
 * custom document. No schema flag is needed.
 */
export function classifyDoc(
  doc: Document,
  template: VisaTypeTemplate | undefined
): DocumentKind {
  const req = template?.documentRequirements.find((r) => r.code === doc.code)
  if (!req) return 'custom'
  if (req.conditionalOn) return 'conditional'
  return req.required ? 'required' : 'optional'
}

export interface FindingLink {
  route: string
}

/** Deep-link for a finding whose fix lives on another page ("Go to Trip"). */
export function findingLink(finding: ValidationFinding): FindingLink | null {
  const field = finding.relatedFields[0] ?? ''
  if (field.startsWith('documents.')) return null
  if (field.startsWith('applicant.')) return { route: '/applicant' }
  if (field.startsWith('trip.') || field.startsWith('appointment.'))
    return { route: '/trip' }
  return null
}

/** Cross-entity findings (no documentCodes) that still belong on a category. */
const FINDING_CATEGORY_HINTS: [string, DocumentCategory][] = [
  ['trip.insurance', 'insurance'],
  ['trip.accommodationReservations', 'accommodation'],
  ['applicant.passport', 'passport'],
]

function findingCategory(finding: ValidationFinding): DocumentCategory | null {
  for (const [prefix, category] of FINDING_CATEGORY_HINTS) {
    if (finding.relatedFields.some((f) => f.startsWith(prefix))) return category
  }
  return null
}

/**
 * Associate each document with its related findings — by document code
 * (`messageParams.documentCodes`), by document id (`relatedFields`), and, for
 * cross-entity findings, by category. Deduped by finding id.
 */
export function associateFindings(
  documents: Document[],
  findings: ValidationFinding[]
): Map<string, ValidationFinding[]> {
  const byDoc = new Map<string, ValidationFinding[]>()
  const attach = (docId: string, finding: ValidationFinding) => {
    const list = byDoc.get(docId)
    if (!list) byDoc.set(docId, [finding])
    else if (!list.some((f) => f.id === finding.id)) list.push(finding)
  }

  for (const finding of findings) {
    const codes = new Set(
      Object.values(finding.messageParams?.documentCodes ?? {}).flat()
    )
    const relatedIds = finding.relatedFields
      .map((f) => /^documents\.([^.]+)/.exec(f)?.[1])
      .filter((id): id is string => Boolean(id))
    const category = findingCategory(finding)

    for (const doc of documents) {
      if (
        codes.has(doc.code) ||
        relatedIds.includes(doc.id) ||
        (category !== null && doc.category === category)
      ) {
        attach(doc.id, finding)
      }
    }
  }
  return byDoc
}

export interface DocumentsModel {
  /** The canonical readiness figure — identical to every other surface's. */
  readiness: DocumentReadiness
  /**
   * Readiness over the documents that actually exist as records.
   *
   * The quick-filter chips count this, not the canonical figure: a chip is a
   * filter over the list below it, so its number must equal the rows it
   * reveals. The canonical figure additionally counts required requirements
   * with no record, which no filter can surface (ADR-034).
   */
  filterableReadiness: DocumentReadiness
  /** Required requirements with no document record — the gap between the two. */
  pendingRequirementCount: number
  groups: DocumentGroupView[]
  nextDocument: NextDocumentRecommendation | null
  template: VisaTypeTemplate | undefined
  findingsByDoc: Map<string, ValidationFinding[]>
  totalDocuments: number
}

export function buildDocumentsModel(
  input: DocumentsModelInput,
  now: Date
): DocumentsModel {
  const { applicant, application, documents, sponsors } = input
  const template = resolveVisaTemplate(
    application?.destinationCountry,
    application?.visaType
  )

  let findings: ValidationFinding[] = []
  if (applicant && application) {
    const dossier: Dossier = {
      schemaVersion: '1.0.0',
      exportedAt: now.toISOString(),
      applicant,
      application,
      documents,
      sponsors,
    }
    findings = runValidation(dossier).findings
  }

  const requirementCodes = requiredRequirementCodes(template, application)
  const present = new Set(documents.map((doc) => doc.code))

  return {
    readiness: buildDocumentReadiness({
      documents,
      requiredRequirementCodes: requirementCodes,
    }),
    filterableReadiness: buildDocumentReadiness({ documents }),
    pendingRequirementCount: requirementCodes.filter(
      (code) => !present.has(code)
    ).length,
    groups: groupByCategory(documents),
    nextDocument: deriveNextDocument(documents, requirementCodes),
    template,
    findingsByDoc: associateFindings(documents, findings),
    totalDocuments: documents.length,
  }
}

export function useDocumentsModel(): DocumentsModel {
  const { state } = useDossier()
  return useMemo(
    () =>
      buildDocumentsModel(
        {
          applicant: state.applicant,
          application: state.application,
          documents: state.documents,
          sponsors: state.sponsors,
        },
        new Date()
      ),
    [state]
  )
}
