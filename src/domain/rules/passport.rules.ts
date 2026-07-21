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
        severity: 'error',
        title: 'Passport validity insufficient',
        description: `Passport expires on ${passport.expiryDate}, but must be valid for at least 3 months after trip end (${trip.exitDate}).`,
        relatedFields: ['applicant.passport.expiryDate', 'trip.exitDate'],
        suggestedAction: 'Renew your passport before applying for the visa.',
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
      severity: 'info',
      title: 'Blank passport pages required',
      description:
        'Most visa applications require at least 2 blank pages in your passport.',
      relatedFields: ['applicant.passport'],
      suggestedAction: 'Ensure your passport has at least 2 blank visa pages.',
    },
  ]
}

// Export all passport rules
export const passportRules: ValidationRule[] = [
  passportValidAfterTrip,
  // passportHasBlankPages is informational, can be enabled if needed
]
