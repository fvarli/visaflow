import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type {
  EmploymentStatus,
  ExpenseType,
  FinancingSource,
  SponsorRelationship,
  VisaType,
} from '@/domain/types/common'
import { tripNights } from '@/features/trip/route-dates'

/**
 * The application summary — the cover sheet of the dossier.
 *
 * A compact, factual restatement of what this application *is*, assembled from
 * data the applicant already entered. It is not another form and it derives no
 * judgement: every field is either present or honestly absent (`null`), and the
 * page renders a calm "not recorded yet" rather than inventing a value.
 *
 * Pure, i18n-free and Intl-free — raw ISO dates, ISO country codes and stable
 * enum values only, so formatting and translation stay at the UI boundary
 * (ADR-012/ADR-023) and exported JSON can never depend on this module.
 */

/** One fact on the cover sheet, with where it is edited. */
export interface SummaryFact<T> {
  value: T | null
  /** The workspace that owns this fact, for a deep link. */
  to: string
}

export interface AppointmentFacts {
  date: string | null
  time: string | null
  location: string | null
  type: NonNullable<Application['appointment']>['type'] | null
  confirmationNumber: string | null
  to: string
}

/**
 * A refusal the applicant recorded, reduced to what a cover sheet shows.
 *
 * Present so Final Review and the printed package can restate a declaration the
 * form asks for directly. It is **information, never a signal**: nothing here
 * feeds readiness, and no count of refusals means anything (ADR-016, ADR-043).
 */
/**
 * A sponsor, as the cover sheet needs them: who they are and what they cover.
 *
 * The review has always shown sponsors as a bare *count*, while the dossier
 * recorded the relationship and the expense categories all along. "Two
 * sponsors" is not an answer to "who is paying for what" (ADR-044).
 */
export interface SponsorFact {
  id: string
  name: string | null
  relationship: SponsorRelationship
  /** Expense categories this sponsor covers. Empty when none were chosen. */
  covers: ExpenseType[]
  to: string
}

/**
 * The money, declared. Amounts are the applicant's own statement of intent —
 * never compared against a balance, never scored, never called sufficient
 * (ADR-016).
 */
export interface FundingFacts {
  source: FinancingSource | null
  currency: string | null
  /** What the trip is expected to cost, as recorded on the trip. */
  estimatedBudget: number | null
  budgetCurrency: string | null
  selfFundedAmount: number | null
  sponsoredAmount: number | null
  accountBalance: number | null
  to: string
}

export interface RefusalFact {
  country: string
  /** ISO, or null — an applicant may not remember the date. */
  refusedOn: string | null
  visaType: string | null
}

export interface ApplicationSummary {
  /** Full legal name as recorded, or null. Presentation decides how to show it. */
  applicantName: string | null
  passportNumber: string | null
  nationality: string | null
  destinationCountry: SummaryFact<string>
  visaType: SummaryFact<VisaType>
  entryDate: string | null
  exitDate: string | null
  /** Derived from the canonical date pair, never stored (ADR-024). */
  nights: number | null
  tripTo: string
  appointment: AppointmentFacts
  funding: SummaryFact<FinancingSource>
  employmentStatus: SummaryFact<EmploymentStatus>
  /** Surfaced only when the funding actually involves sponsors. */
  sponsorCount: SummaryFact<number> | null
  /** Named sponsors and what each covers. Empty when none are recorded. */
  sponsors: SponsorFact[]
  fundingDetail: FundingFacts
  applicantTo: string
  /** Empty when none are recorded — the absence is never itself displayed. */
  refusals: RefusalFact[]
  refusalsTo: string
}

function nonEmpty(value: string | undefined | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Sponsors are part of the cover sheet only when they are actually involved. */
function sponsorsRelevant(
  source: FinancingSource | null,
  sponsorCount: number
): boolean {
  return sponsorCount > 0 || source === 'sponsor' || source === 'mixed'
}

export function buildApplicationSummary(
  applicant: Applicant | null,
  application: Application | null,
  sponsors: Sponsor[]
): ApplicationSummary {
  const trip = application?.trip ?? null
  const entryDate = trip?.entryDate ?? null
  const exitDate = trip?.exitDate ?? null
  const fundingSource = application?.financing?.source ?? null

  const firstName = nonEmpty(applicant?.firstName)
  const lastName = nonEmpty(applicant?.lastName)
  const applicantName =
    firstName || lastName
      ? [firstName, lastName].filter(Boolean).join(' ')
      : null

  return {
    applicantName,
    passportNumber: nonEmpty(applicant?.passport?.number),
    nationality: nonEmpty(applicant?.nationality),
    destinationCountry: {
      value: nonEmpty(application?.destinationCountry),
      to: '/trip',
    },
    visaType: { value: application?.visaType ?? null, to: '/trip' },
    entryDate,
    exitDate,
    nights: tripNights(entryDate, exitDate),
    tripTo: '/trip?step=dates',
    appointment: {
      date: application?.appointment?.date ?? null,
      time: nonEmpty(application?.appointment?.time),
      location: nonEmpty(application?.appointment?.location),
      type: application?.appointment?.type ?? null,
      confirmationNumber: nonEmpty(
        application?.appointment?.confirmationNumber
      ),
      to: '/trip?step=dates',
    },
    funding: { value: fundingSource, to: '/finance?step=source' },
    employmentStatus: {
      value: application?.employment?.employmentStatus ?? null,
      to: '/employment?step=status',
    },
    sponsorCount: sponsorsRelevant(fundingSource, sponsors.length)
      ? { value: sponsors.length, to: '/sponsors' }
      : null,
    sponsors: sponsors.map((sponsor) => ({
      id: sponsor.id,
      name:
        [nonEmpty(sponsor.firstName), nonEmpty(sponsor.lastName)]
          .filter(Boolean)
          .join(' ') || null,
      relationship: sponsor.relationship,
      covers: sponsor.coveredExpenses ?? [],
      to: '/sponsors',
    })),
    fundingDetail: {
      source: fundingSource,
      currency: nonEmpty(application?.financing?.currency),
      estimatedBudget: application?.trip?.estimatedBudget ?? null,
      budgetCurrency: nonEmpty(application?.trip?.budgetCurrency),
      selfFundedAmount: application?.financing?.selfFundedAmount ?? null,
      sponsoredAmount: application?.financing?.sponsoredAmount ?? null,
      accountBalance: application?.financing?.accountBalance ?? null,
      to: '/finance?step=personal',
    },
    applicantTo: '/applicant',
    refusals: (applicant?.previousRefusals ?? []).map((refusal) => ({
      country: refusal.country,
      refusedOn: refusal.refusedOn ?? null,
      visaType: nonEmpty(refusal.visaType),
    })),
    refusalsTo: '/applicant?step=previousVisas',
  }
}
