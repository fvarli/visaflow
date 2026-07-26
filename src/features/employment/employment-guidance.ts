import type { Employment } from '@/domain/schemas/employment.schema'
import type { EmploymentStepId } from '@/features/employment/employment-wizard'
import {
  hasEmployer,
  leaveApplies,
} from '@/features/employment/employment-wizard'

/**
 * Calm, informational guidance for the employment flow.
 *
 * A pure **presentation** layer, deliberately separate from the validation
 * engine: it derives gentle, contextual reminders from the current employment
 * data and feeds them to `GuidanceNote`s in the wizard. It is NOT a validation
 * rule — nothing here runs through `runValidation`, contributes to a finding, or
 * affects dossier readiness. Guidance never blocks, never alarms, and is always
 * `info`/`neutral`. It stays non-predictive (ADR-016): it points at facts to
 * check (which HR document to request, which dates to align), never at outcomes.
 */

export type GuidanceTone = 'info' | 'neutral'

export interface EmploymentGuidanceHint {
  /** Stable id — the `GuidanceNote` key and the i18n suffix. */
  id: string
  /** Which wizard step this hint belongs beside. */
  step: EmploymentStepId
  /** i18n key resolving the calm body copy (`employment:guidance.<id>`). */
  messageKey: string
  params?: Record<string, string | number>
  tone: GuidanceTone
}

/**
 * Derive the active guidance hints for the current employment situation. Order
 * is stable; each concern appears at most once. Non-employer statuses produce
 * only the neutral reassurance, so an unemployed/retired applicant is never
 * nudged about employer letters.
 */
export function deriveEmploymentGuidance(
  employment: Employment | undefined
): EmploymentGuidanceHint[] {
  const hints: EmploymentGuidanceHint[] = []
  const status = employment?.employmentStatus

  if (!status) return hints

  if (hasEmployer(status)) {
    hints.push({
      id: 'employerNameMatch',
      step: 'employer',
      messageKey: 'employment:guidance.employerNameMatch',
      tone: 'info',
    })
    hints.push({
      id: 'netVsGross',
      step: 'income',
      messageKey: 'employment:guidance.netVsGross',
      tone: 'info',
    })
    hints.push({
      id: 'salaryConsistency',
      step: 'income',
      messageKey: 'employment:guidance.salaryConsistency',
      tone: 'info',
    })
    hints.push({
      id: 'companyDocsSupporting',
      step: 'documents',
      messageKey: 'employment:guidance.companyDocsSupporting',
      tone: 'info',
    })
  } else {
    // Unemployed / retired / student / homemaker / other — reassure, don't nudge.
    hints.push({
      id: 'noEmployerNeeded',
      step: 'employer',
      messageKey: 'employment:guidance.noEmployerNeeded',
      tone: 'neutral',
    })
  }

  if (leaveApplies(status)) {
    hints.push({
      id: 'leaveDatesMatchTrip',
      step: 'leave',
      messageKey: 'employment:guidance.leaveDatesMatchTrip',
      tone: 'info',
    })
  }

  return hints
}

/** The hints that belong to one wizard step. */
export function guidanceForStep(
  hints: EmploymentGuidanceHint[],
  step: EmploymentStepId
): EmploymentGuidanceHint[] {
  return hints.filter((hint) => hint.step === step)
}
