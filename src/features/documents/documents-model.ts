import { useMemo } from 'react'
import { useDossier } from '@/app/providers/DossierProvider'
import { runValidation } from '@/domain/rules/runner'
import { resolveVisaTemplate } from '@/config/countries'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { DocumentCategory } from '@/domain/types/common'
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

/** The single most useful "next document to obtain". */
export function deriveNextDocument(documents: Document[]): Document | null {
  const required = documents.filter((d) => d.required)
  return (
    required.find((d) => d.status === 'not_started') ??
    required.find((d) => d.status === 'needs_update') ??
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
  groups: DocumentGroupView[]
  nextDocument: Document | null
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

  return {
    readiness: buildDocumentReadiness({
      documents,
      requiredRequirementCodes: requiredRequirementCodes(template, application),
    }),
    groups: groupByCategory(documents),
    nextDocument: deriveNextDocument(documents),
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
