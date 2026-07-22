import { parseISO, addMonths, isBefore } from 'date-fns'
import type { Dossier } from '../schemas/dossier.schema'
import type { ValidationFinding, ValidationRule } from './types'

/**
 * Rule 3: Passport must be valid after the trip end date
 * Most Schengen countries require passport validity of at least 3 months after departure
 */
export const passportValidAfterTrip: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
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
 * Check passport has at least 2 blank pages (info only)
 */
export const passportHasBlankPages: ValidationRule = (
  _dossier: Dossier
): ValidationFinding[] => {
  // This is an informational reminder since we can't verify blank pages
  return [
    {
      id: 'passport-blank-pages-reminder',
      ruleId: 'passport.hasBlankPages',
      severity: 'info',
      messageKey: 'findings.passportBlankPages',
      relatedFields: ['applicant.passport'],
    },
  ]
}

// Export all passport rules
export const passportRules: ValidationRule[] = [
  passportValidAfterTrip,
  // passportHasBlankPages is informational, can be enabled if needed
]
