import { differenceInCalendarDays, differenceInYears, parseISO } from 'date-fns'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { WizardStepId } from '@/features/applicant/applicant-wizard'

/**
 * Calm, informational onboarding guidance for the applicant flow.
 *
 * This is a pure **presentation** layer, deliberately separate from the
 * validation engine: it derives gentle, contextual reminders from the current
 * applicant data and feeds them to `GuidanceNote`s in the wizard. It is NOT a
 * validation rule — nothing here runs through `runValidation`, contributes to a
 * finding, or affects dossier readiness. Guidance never blocks, never alarms,
 * and is always `info`/`neutral` (never a warning or error). It stays
 * non-predictive (ADR-016): it points at facts to check, never at outcomes.
 *
 * `now` is injected so the thresholds are unit-testable.
 */

export type GuidanceTone = 'info' | 'neutral'

export interface GuidanceHint {
  /** Stable id — the `GuidanceNote` key and the i18n suffix. */
  id: string
  /** Which wizard step this hint belongs beside. */
  step: WizardStepId
  /** i18n key resolving the calm body copy (`applicant:guidance.<id>`). */
  messageKey: string
  params?: Record<string, string | number>
  tone: GuidanceTone
}

/** Passport within ~6 months of expiry is worth flagging early. */
const PASSPORT_EXPIRY_SOON_DAYS = 183
/** A passport issued ~9+ years ago is near the usual 10-year validity. */
const PASSPORT_OLD_YEARS = 9
/** Enough recorded trips to be worth a "this can help" note. */
const LONG_TRAVEL_HISTORY = 3

function daysUntil(iso: string, now: Date): number {
  return differenceInCalendarDays(parseISO(iso), now)
}

/**
 * Derive the full set of active guidance hints for an applicant. Order is
 * stable; each concern appears at most once. Invalid/empty dates simply produce
 * no hint (NaN comparisons are false), so callers need no guarding.
 */
export function deriveApplicantGuidance(
  applicant: Applicant,
  now: Date = new Date()
): GuidanceHint[] {
  const hints: GuidanceHint[] = []
  const passport = applicant.passport

  if (passport?.expiryDate) {
    const days = daysUntil(passport.expiryDate, now)
    if (days > 0 && days <= PASSPORT_EXPIRY_SOON_DAYS) {
      hints.push({
        id: 'passportExpiringSoon',
        step: 'passport',
        messageKey: 'applicant:guidance.passportExpiringSoon',
        tone: 'info',
      })
    }
  }

  if (passport?.issueDate) {
    const years = differenceInYears(now, parseISO(passport.issueDate))
    if (years >= PASSPORT_OLD_YEARS) {
      hints.push({
        id: 'passportOld',
        step: 'passport',
        messageKey: 'applicant:guidance.passportOld',
        tone: 'info',
      })
    }
  }

  if (applicant.previousVisas.length === 0) {
    hints.push({
      id: 'noPreviousVisas',
      step: 'previousVisas',
      messageKey: 'applicant:guidance.noPreviousVisas',
      tone: 'info',
    })
  }

  if (applicant.travelHistory.length >= LONG_TRAVEL_HISTORY) {
    hints.push({
      id: 'longTravelHistory',
      step: 'travelHistory',
      messageKey: 'applicant:guidance.longTravelHistory',
      tone: 'info',
    })
  }

  return hints
}

/** The hints that belong to one wizard step. */
export function guidanceForStep(
  hints: GuidanceHint[],
  step: WizardStepId
): GuidanceHint[] {
  return hints.filter((hint) => hint.step === step)
}
