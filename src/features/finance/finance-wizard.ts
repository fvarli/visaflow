import type { Application } from '@/domain/schemas/application.schema'
import type { Financing } from '@/domain/schemas/application.schema'
import type { FinancingSource } from '@/domain/types/common'
import type { StepStatus } from '@/components/ui/stepper'

/**
 * The guided finance flow, as data.
 *
 * Pure — no React, no i18n, no formatting — so step ordering and completeness
 * can be unit-tested and reused. The UI resolves each id to a translated title
 * (`finance:steps.<id>.title`) and renders the statuses.
 *
 * Completeness is **source-aware**: the funding source decides which sections
 * carry anything to fill in. A self-funded applicant is never nudged about
 * sponsors; a sponsor-funded applicant is never nudged about personal-bank
 * fields — the rail stays calm and each unrelated step counts as satisfied.
 */
export const FINANCE_STEP_IDS = [
  'source',
  'personal',
  'sponsors',
  'documents',
  'consistency',
  'review',
] as const

export type FinanceStepId = (typeof FINANCE_STEP_IDS)[number]

/** Personal-bank evidence is relevant when the applicant funds the trip themselves. */
export function personalApplies(source: FinancingSource | undefined): boolean {
  return source === 'self' || source === 'mixed'
}

/** Sponsors are relevant when someone else contributes. */
export function sponsorApplies(source: FinancingSource | undefined): boolean {
  return source === 'sponsor' || source === 'mixed'
}

/** An employer covers the trip (e.g. business travel) — its own context. */
export function employerApplies(source: FinancingSource | undefined): boolean {
  return source === 'employer'
}

export function isSourceComplete(financing: Financing | undefined): boolean {
  return Boolean(financing?.source)
}

/** Any personal-finance figure recorded (never judged — just "present"). */
export function hasPersonalData(financing: Financing | undefined): boolean {
  return Boolean(
    financing &&
    (financing.bankName ||
      financing.accountBalance != null ||
      financing.statementDate)
  )
}

/**
 * Whether a step counts as "done" for the rail. Steps that don't apply to the
 * current funding source are satisfied; personal / sponsors reflect real data
 * (or being passed); documents and consistency depend on other workspaces, so
 * they are satisfied once passed; Review is terminal and never auto-completes.
 */
export function isStepSatisfied(
  application: Application | null,
  stepId: FinanceStepId,
  index: number,
  current: number
): boolean {
  const financing = application?.financing
  const source = financing?.source
  const sponsors = (application?.sponsorIds ?? []).length
  switch (stepId) {
    case 'source':
      return isSourceComplete(financing)
    case 'personal':
      if (!personalApplies(source)) return true
      return hasPersonalData(financing) || index < current
    case 'sponsors':
      if (!sponsorApplies(source)) return true
      return sponsors > 0 || index < current
    case 'documents':
      return index < current
    case 'consistency':
      return index < current
    case 'review':
      return false
  }
}

/**
 * The rail statuses. `sponsorCount` is passed explicitly because the full
 * sponsor records live on the dossier (not the application), so this stays a
 * pure function of its inputs. When omitted it falls back to
 * `application.sponsorIds`.
 */
export function deriveStepStatuses(
  application: Application | null,
  current: number,
  sponsorCount?: number
): StepStatus[] {
  const withSponsors =
    sponsorCount != null && application
      ? {
          ...application,
          sponsorIds: Array.from({ length: sponsorCount }, (_, i) => `${i}`),
        }
      : application
  return FINANCE_STEP_IDS.map((id, index) => {
    if (index === current) return 'current'
    return isStepSatisfied(withSponsors, id, index, current)
      ? 'complete'
      : 'upcoming'
  })
}
