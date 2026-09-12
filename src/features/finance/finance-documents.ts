import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import type { DocumentReadiness } from '@/features/readiness/readiness-types'
import { applicableRequirements } from '@/features/documents/template-sync'
import type { Document } from '@/domain/schemas/document.schema'
import type { ApplicabilityContext, VisaTypeTemplate } from '@/config/types'
import { RETIRED_REQUIREMENTS } from '@/config/countries/retired'
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
/**
 * Codes that evidence income, for the Finance workspace.
 *
 * The retired codes stay listed. A document keeps its code forever, so a
 * dossier written before those requirements were replaced still holds
 * `TAX_RETURNS` or `PENSION_STATEMENT` records — and `financeDocGroup`
 * returning `null` is the one consumer that *hides* a document outright.
 * Dropping them here would make a person's own files disappear from a screen
 * they had filed them under (ADR-049).
 */
const INCOME_CODES = new Set<string>([
  'PAYSLIPS',
  'EMPLOYMENT_LETTER',
  'SOCIAL_SECURITY',
  'TAX_PAYMENT_STATEMENT',
  'PENSIONER_BOOKLET',
  'COMPANY_ACTIVITY_CERTIFICATE',
  // Withdrawn income requirements, read from the registry rather than copied
  // as literals — a fourth retirement would otherwise silently drop a
  // person's filed document out of this workspace (ADR-050).
  ...RETIRED_REQUIREMENTS.map((r) => r.code),
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
  readiness: DocumentReadiness
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
 *
 * **It does not take an owner, and that is the point.** This used to read
 * `ownerType === 'employer'` as "employer-funded evidence", which is a claim
 * about who pays; `ownerType` says whose situation the document describes
 * ([ADR-049a](../../../docs/decisions.md) decision 6). One signal was feeding
 * two different meanings, visibly: the same rows render under *Employer
 * evidence* in the summary and under *Employer-funded evidence* in the gather
 * list the applicant copies to their clipboard.
 *
 * The clause served exactly two requirements — `EMPLOYER_SIGNATURE_CIRCULAR`
 * and `EMPLOYER_TAX_PLATE` — and was the only reason either reached this
 * workspace. Neither is financial evidence: one proves who may sign for a
 * company, the other that a company is registered. Both keep their place in
 * Documents and in the Employment workspace, where their category puts them.
 *
 * The `employer` group stays in the vocabulary. What belongs in it is the
 * employer's confirmation that it covers the trip — which this pack's own
 * guidance prose already describes and which no requirement declares yet. When
 * one is authored it joins by code, like every other row here.
 *
 * Keeping the owner out is also what makes profile-dependent ownership safe: a
 * subject that resolves differently per applicant cannot move a document
 * between finance groups if the subject is not an input.
 */
export function financeDocGroup(
  code: string,
  category: DocumentCategory
): FinanceDocGroupId | null {
  if (category === 'sponsor' || code === 'RELATIONSHIP_PROOF') return 'sponsor'
  if (INCOME_CODES.has(code)) return 'income'
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
  context: ApplicabilityContext,
  template: VisaTypeTemplate | undefined
): FinanceDocumentsView {
  /**
   * One classifier, three consumers. Membership, the required-requirement
   * filter below and the row builder all ask the same question of the same
   * facts, so none of them can drift into reinterpreting what belongs here.
   */
  const financeDocs = documents.filter(
    (d) => financeDocGroup(d.code, d.category) !== null
  )
  const applicable = template ? applicableRequirements(template, context) : []

  // Scoped to the finance-relevant codes, including applicable requirements
  // with no record yet, so the caption matches the list beneath it (ADR-034).
  const readiness = buildDocumentReadiness({
    documents: financeDocs,
    requiredRequirementCodes: applicable
      .filter(
        (req) =>
          req.required && financeDocGroup(req.code, req.category) !== null
      )
      .map((req) => req.code),
    template,
    context,
  })

  const byCode = new Map(financeDocs.map((d) => [d.code, d]))

  const rows: FinanceDocRow[] = applicable.flatMap((req) => {
    const group = financeDocGroup(req.code, req.category)
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
    readiness,
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
