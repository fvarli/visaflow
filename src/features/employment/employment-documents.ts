import {
  buildDocumentBuckets5,
  type DocumentBuckets5,
} from '@/features/documents/documents-model'
import { applicableRequirements } from '@/features/documents/template-sync'
import type { Document } from '@/domain/schemas/document.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { VisaTypeTemplate } from '@/config/types'
import type { DocumentStatus, OwnerType } from '@/domain/types/common'

/**
 * Employment-document summary + HR-request checklist — a pure view over the
 * Documents feature. It re-uses the canonical helpers (`buildDocumentBuckets5`,
 * `applicableRequirements`) rather than re-implementing bucketing or
 * country-template applicability, and it never becomes a second document-status
 * store: statuses come straight from the dossier `Document` instances (ADR-026).
 */

/** A `Document.status`, plus the "template requirement not yet instantiated" case. */
export type EmploymentDocStatus = DocumentStatus | 'not_instantiated'

export interface EmploymentDocRow {
  /** Stable requirement/document code. */
  code: string
  /** i18n key for the localized name (`visa-domain:requirements.<code>.name`). */
  nameKey: string
  required: boolean
  ownerType: OwnerType
  status: EmploymentDocStatus
  /** The real dossier document id when instantiated; null when only a requirement. */
  docId: string | null
}

export interface EmploymentDocumentsView {
  buckets: DocumentBuckets5
  /** Every applicable employment requirement, with its current dossier status. */
  rows: EmploymentDocRow[]
  /** Applicable employment docs not yet ready — the "ask HR" list. */
  hrRequests: EmploymentDocRow[]
  hasEmploymentDocs: boolean
}

/** Statuses that mean "not in hand yet" — the docs you would request from HR. */
const HR_REQUEST_STATUSES = new Set<EmploymentDocStatus>([
  'not_instantiated',
  'not_started',
  'requested',
  'needs_update',
])

export function buildEmploymentDocuments(
  documents: Document[],
  application: Application | null,
  template: VisaTypeTemplate | undefined
): EmploymentDocumentsView {
  const employmentDocs = documents.filter((d) => d.category === 'employment')
  const buckets = buildDocumentBuckets5(employmentDocs)

  const applicable = template
    ? applicableRequirements(template, application).filter(
        (req) => req.category === 'employment'
      )
    : []

  const byCode = new Map(employmentDocs.map((d) => [d.code, d]))

  const rows: EmploymentDocRow[] = applicable.map((req) => {
    const instance = byCode.get(req.code)
    return {
      code: req.code,
      nameKey: req.nameKey,
      required: req.required,
      ownerType: req.ownerType,
      status: instance ? instance.status : 'not_instantiated',
      docId: instance ? instance.id : null,
    }
  })

  const hrRequests = rows.filter((row) => HR_REQUEST_STATUSES.has(row.status))

  return {
    buckets,
    rows,
    hrRequests,
    hasEmploymentDocs: rows.length > 0,
  }
}

/**
 * Build the plain-text "ask HR" list for the clipboard. Names only — never any
 * applicant, employer, or salary value — localized via the injected resolver so
 * this stays pure and locale-correct.
 */
export function hrClipboardText(
  rows: EmploymentDocRow[],
  heading: string,
  resolveName: (nameKey: string) => string
): string {
  const lines = rows.map((row) => `- ${resolveName(row.nameKey)}`)
  return [heading, ...lines].join('\n')
}
