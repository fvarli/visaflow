import { parseISO, addMonths, isBefore } from 'date-fns'
import type {
  ValidationContext,
  ValidationFinding,
  ValidationRule,
} from './types'

/**
 * Rule 3: Passport must be valid after the trip end date
 * Most Schengen countries require passport validity of at least 3 months after departure
 */
export const passportValidAfterTrip: ValidationRule = ({
  dossier,
}: ValidationContext): ValidationFinding[] => {
  const passport = dossier.applicant.passport
  const trip = dossier.application.trip

  if (!passport?.expiryDate || !trip?.exitDate) return []

  const passportExpiry = parseISO(passport.expiryDate)
  const tripExit = parseISO(trip.exitDate)
  const requiredValidity = addMonths(tripExit, 3)

  if (isBefore(passportExpiry, requiredValidity)) {
    return [
      {
        id: 'passport-validity-insufficient',
        ruleId: 'passport.validAfterTrip',
        severity: 'error',
        messageKey: 'findings.passportValidityInsufficient',
        messageParams: {
          dates: {
            expiryDate: passport.expiryDate,
            tripEnd: trip.exitDate,
          },
        },
        relatedFields: ['applicant.passport.expiryDate', 'trip.exitDate'],
      },
    ]
  }

  return []
}

/**
 * `passportHasBlankPages` used to live here — an unconditional `info` reminder
 * that a passport needs two blank pages. It was never registered in
 * `passportRules`, so it never ran, and it is gone rather than enabled.
 *
 * The criterion is real: Visa Code Article 12(b) requires at least two blank
 * pages. It is already stated in the `PASSPORT_CURRENT` requirement contract,
 * which is where an applicant reads it. A rule that fires on every dossier
 * regardless of anything knowable would add noise to the consistency centre
 * without telling anyone something the checklist does not already say.
 *
 * Removing dead code is not a fidelity change: nothing an applicant was told
 * has changed.
 */

// Export all passport rules
export const passportRules: ValidationRule[] = [passportValidAfterTrip]
