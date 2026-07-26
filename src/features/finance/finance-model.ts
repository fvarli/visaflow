import { useMemo } from 'react'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type {
  Currency,
  EmploymentStatus,
  ExpenseType,
  FinancingSource,
  SponsorRelationship,
} from '@/domain/types/common'
import { runValidation } from '@/domain/rules/runner'
import type { ValidationFinding } from '@/domain/rules/types'
import { resolveVisaTemplate } from '@/config/countries'
import { useDossier } from '@/app/providers/DossierProvider'
import {
  buildFinanceDocuments,
  type FinanceDocumentsView,
} from './finance-documents'
import {
  deriveFinanceGuidance,
  type FinanceGuidanceHint,
} from './finance-guidance'
import {
  deriveConsistency,
  type ConsistencyObservation,
} from './finance-consistency'
import {
  personalApplies,
  sponsorApplies,
  hasPersonalData,
} from './finance-wizard'

/**
 * The Finance workspace's presentation model — a "financial evidence" view.
 *
 * The one place the page derives its shape, so the page and its widgets stay
 * pure presentation. It re-encodes no rule: funding-consistency findings come
 * straight from the `sponsor.*` findings `runValidation` already produces,
 * evidence readiness from the Documents feature's canonical helpers, and
 * employment income is read (never copied) from the Employment section. It is
 * i18n/Intl-free (raw values + stable keys), so it unit-tests without a React
 * provider (ADR-027).
 */

export interface FinanceInput {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
}

export type FinanceReviewStatus =
  'captured' | 'incomplete' | 'needsReview' | 'notApplicable'

export type FinanceReviewSectionId =
  'source' | 'personal' | 'sponsors' | 'documents'

export interface FinanceReviewSection {
  id: FinanceReviewSectionId
  status: FinanceReviewStatus
}

export interface PersonalView {
  applicable: boolean
  bankName: string | null
  accountBalance: number | null
  currency: Currency
  statementDate: string | null
}

export interface IncomeView {
  /** Whether the Employment section records an income figure to read. */
  hasEmployment: boolean
  status: EmploymentStatus | null
  monthlyNetIncome: number | null
  currency: Currency
}

export interface SponsorSummaryView {
  id: string
  firstName: string
  lastName: string
  relationship: SponsorRelationship
  monthlyIncome: number | null
  currency: Currency
  coveredExpenses: ExpenseType[]
  /** Mirrors the rule's "has financial info" test (income / assets / investments). */
  hasFinanceInfo: boolean
  documentCount: number
  /** This sponsor's own `sponsor.*` findings, verbatim. */
  findings: ValidationFinding[]
}

export interface SponsorsView {
  applicable: boolean
  hasNone: boolean
  list: SponsorSummaryView[]
}

export interface ConsistencyView {
  /** Dossier-level `sponsor.*` findings (not tied to one sponsor), verbatim. */
  findings: ValidationFinding[]
  observations: ConsistencyObservation[]
}

export interface FinanceModel {
  hasData: boolean
  source: FinancingSource | null
  personal: PersonalView
  income: IncomeView
  sponsors: SponsorsView
  documents: FinanceDocumentsView
  consistency: ConsistencyView
  guidance: FinanceGuidanceHint[]
  /** Every money-relevant finding (both dossier- and sponsor-level). */
  findings: ValidationFinding[]
  review: FinanceReviewSection[]
}

function toDossier(
  applicant: Applicant,
  application: Application,
  documents: Document[],
  sponsors: Sponsor[]
): Dossier {
  return {
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    applicant,
    application,
    documents,
    sponsors,
  }
}

/** The sponsor a finding is tied to, or null for a dossier-level finding. */
function sponsorIdForFinding(finding: ValidationFinding): string | null {
  for (const field of finding.relatedFields) {
    const match = /^sponsors\.([^.]+)\./.exec(field)
    if (match) return match[1] ?? null
  }
  return null
}

function sponsorHasFinanceInfo(sponsor: Sponsor): boolean {
  return (
    sponsor.monthlyIncome !== undefined ||
    sponsor.liquidAssets !== undefined ||
    sponsor.investments.length > 0
  )
}

function buildReview(
  application: Application | null,
  sponsors: SponsorsView,
  documents: FinanceDocumentsView,
  moneyFindings: ValidationFinding[]
): FinanceReviewSection[] {
  const financing = application?.financing
  const source = financing?.source

  const sections: FinanceReviewSection[] = [
    { id: 'source', status: source ? 'captured' : 'incomplete' },
  ]

  if (!personalApplies(source)) {
    sections.push({ id: 'personal', status: 'notApplicable' })
  } else {
    sections.push({
      id: 'personal',
      status: hasPersonalData(financing) ? 'captured' : 'incomplete',
    })
  }

  if (!sponsorApplies(source)) {
    sections.push({ id: 'sponsors', status: 'notApplicable' })
  } else if (moneyFindings.length > 0) {
    sections.push({ id: 'sponsors', status: 'needsReview' })
  } else {
    sections.push({
      id: 'sponsors',
      status: sponsors.list.length > 0 ? 'captured' : 'incomplete',
    })
  }

  if (!documents.hasFinanceDocs) {
    sections.push({ id: 'documents', status: 'notApplicable' })
  } else if (
    documents.rows.every(
      (r) => r.status === 'ready' || r.status === 'not_applicable'
    )
  ) {
    sections.push({ id: 'documents', status: 'captured' })
  } else {
    sections.push({ id: 'documents', status: 'needsReview' })
  }

  return sections
}

export function buildFinanceModel(input: FinanceInput): FinanceModel {
  const { applicant, application, documents, sponsors } = input
  const hasData = application !== null
  const financing = application?.financing
  const source = financing?.source ?? null

  const template = resolveVisaTemplate(
    application?.destinationCountry,
    application?.visaType
  )
  const docView = buildFinanceDocuments(documents, application, template)

  const moneyFindings =
    applicant && application
      ? runValidation(
          toDossier(applicant, application, documents, sponsors)
        ).findings.filter((f) => f.ruleId.startsWith('sponsor.'))
      : []

  const sponsorList: SponsorSummaryView[] = sponsors.map((sponsor) => ({
    id: sponsor.id,
    firstName: sponsor.firstName,
    lastName: sponsor.lastName,
    relationship: sponsor.relationship,
    monthlyIncome: sponsor.monthlyIncome ?? null,
    currency: sponsor.currency,
    coveredExpenses: sponsor.coveredExpenses,
    hasFinanceInfo: sponsorHasFinanceInfo(sponsor),
    documentCount: sponsor.documentIds.length,
    findings: moneyFindings.filter(
      (f) => sponsorIdForFinding(f) === sponsor.id
    ),
  }))

  const sponsorsView: SponsorsView = {
    applicable: sponsorApplies(source ?? undefined),
    hasNone: sponsors.length === 0,
    list: sponsorList,
  }

  const dossierLevelFindings = moneyFindings.filter(
    (f) => sponsorIdForFinding(f) === null
  )

  const employment = application?.employment
  const personal: PersonalView = {
    applicable: personalApplies(source ?? undefined),
    bankName: financing?.bankName ?? null,
    accountBalance: financing?.accountBalance ?? null,
    currency: financing?.currency ?? 'EUR',
    statementDate: financing?.statementDate ?? null,
  }

  const income: IncomeView = {
    hasEmployment: employment?.monthlyNetIncome != null,
    status: employment?.employmentStatus ?? null,
    monthlyNetIncome: employment?.monthlyNetIncome ?? null,
    currency: employment?.currency ?? 'EUR',
  }

  return {
    hasData,
    source,
    personal,
    income,
    sponsors: sponsorsView,
    documents: docView,
    consistency: {
      findings: dossierLevelFindings,
      observations: deriveConsistency({ application, documents: docView }),
    },
    guidance: deriveFinanceGuidance(financing),
    findings: moneyFindings,
    review: buildReview(application, sponsorsView, docView, moneyFindings),
  }
}

/** Component-facing hook: derives the model once per state change. */
export function useFinanceModel(): FinanceModel {
  const { state } = useDossier()
  return useMemo(
    () =>
      buildFinanceModel({
        applicant: state.applicant,
        application: state.application,
        documents: state.documents,
        sponsors: state.sponsors,
      }),
    [state]
  )
}
