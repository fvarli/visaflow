import type { Financing } from '@/domain/schemas/application.schema'
import type { FinanceStepId } from '@/features/finance/finance-wizard'
import {
  personalApplies,
  sponsorApplies,
  employerApplies,
} from '@/features/finance/finance-wizard'

/**
 * Calm, informational guidance for the finance flow.
 *
 * A pure **presentation** layer, deliberately separate from the validation
 * engine: it derives gentle, contextual reminders about what each piece of
 * evidence demonstrates and feeds them to `GuidanceNote`s in the wizard. It is
 * NOT a validation rule — nothing here runs through `runValidation`, contributes
 * to a finding, or affects dossier readiness. Guidance never blocks, never
 * alarms, and is always `info`/`neutral`. It stays non-predictive (ADR-016): it
 * describes what evidence shows, never a minimum balance, a "strength" score, or
 * an approval outcome.
 */

export type GuidanceTone = 'info' | 'neutral'

export interface FinanceGuidanceHint {
  /** Stable id — the `GuidanceNote` key and the i18n suffix. */
  id: string
  /** Which wizard step this hint belongs beside. */
  step: FinanceStepId
  /** i18n key resolving the calm body copy (`finance:guidance.<id>`). */
  messageKey: string
  params?: Record<string, string | number>
  tone: GuidanceTone
}

/**
 * Derive the active guidance hints for the current funding situation. Order is
 * stable; each concern appears at most once. Hints only appear for the sections
 * that apply to the chosen funding source, so an applicant is never nudged about
 * evidence that is not relevant to how they fund the trip.
 */
export function deriveFinanceGuidance(
  financing: Financing | undefined
): FinanceGuidanceHint[] {
  const hints: FinanceGuidanceHint[] = []
  const source = financing?.source

  if (!source) return hints

  if (personalApplies(source)) {
    hints.push({
      id: 'bankStatementDemonstrates',
      step: 'personal',
      messageKey: 'finance:guidance.bankStatementDemonstrates',
      tone: 'info',
    })
    hints.push({
      id: 'salaryAccountConsistency',
      step: 'personal',
      messageKey: 'finance:guidance.salaryAccountConsistency',
      tone: 'info',
    })
  }

  if (sponsorApplies(source)) {
    hints.push({
      id: 'sponsorLetterDemonstrates',
      step: 'sponsors',
      messageKey: 'finance:guidance.sponsorLetterDemonstrates',
      tone: 'info',
    })
  }

  if (employerApplies(source)) {
    hints.push({
      id: 'employerCoverageContext',
      step: 'personal',
      messageKey: 'finance:guidance.employerCoverageContext',
      tone: 'neutral',
    })
  }

  hints.push({
    id: 'evidenceFromDocuments',
    step: 'documents',
    messageKey: 'finance:guidance.evidenceFromDocuments',
    tone: 'neutral',
  })

  return hints
}

/** The hints that belong to one wizard step. */
export function guidanceForStep(
  hints: FinanceGuidanceHint[],
  step: FinanceStepId
): FinanceGuidanceHint[] {
  return hints.filter((hint) => hint.step === step)
}
