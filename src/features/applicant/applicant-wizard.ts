import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { StepStatus } from '@/components/ui/stepper'

/**
 * The guided applicant flow, as data.
 *
 * This module is pure — no React, no i18n, no formatting — so step ordering
 * and completeness can be unit-tested and reused. The UI resolves each id to a
 * translated title (`applicant:steps.<id>.title`) and renders the statuses.
 */
export const WIZARD_STEP_IDS = [
  'personal',
  'passport',
  'previousVisas',
  'travelHistory',
  'review',
] as const

export type WizardStepId = (typeof WIZARD_STEP_IDS)[number]

/** The two steps that carry required fields; the rest are optional records. */
export function isPersonalComplete(applicant: Applicant): boolean {
  return Boolean(
    applicant.firstName &&
    applicant.lastName &&
    applicant.dateOfBirth &&
    applicant.nationality
  )
}

export function isPassportComplete(applicant: Applicant): boolean {
  const p = applicant.passport
  return Boolean(
    p && p.number && p.issueDate && p.expiryDate && p.issuingCountry
  )
}

/**
 * Whether a step counts as "done" for the rail. The required steps depend on
 * their fields; the optional record steps count as done once they hold an
 * entry or the user has already moved past them; Review is terminal and never
 * auto-completes.
 */
export function isStepSatisfied(
  applicant: Applicant,
  stepId: WizardStepId,
  index: number,
  current: number
): boolean {
  switch (stepId) {
    case 'personal':
      return isPersonalComplete(applicant)
    case 'passport':
      return isPassportComplete(applicant)
    case 'previousVisas':
      return applicant.previousVisas.length > 0 || index < current
    case 'travelHistory':
      return applicant.travelHistory.length > 0 || index < current
    case 'review':
      return false
  }
}

/**
 * Marker status for every step given the active index: the active step is
 * `current`, satisfied steps are `complete`, everything else is `upcoming`.
 */
export function deriveStepStatuses(
  applicant: Applicant,
  current: number
): StepStatus[] {
  return WIZARD_STEP_IDS.map((id, index) => {
    if (index === current) return 'current'
    return isStepSatisfied(applicant, id, index, current)
      ? 'complete'
      : 'upcoming'
  })
}
