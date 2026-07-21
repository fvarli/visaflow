import { parseISO, isBefore, isAfter } from 'date-fns'
import type { Dossier } from '../schemas/dossier.schema'
import type { ValidationFinding, ValidationRule } from './types'

/**
 * Rule 5: Insurance must cover the complete trip
 */
export const insuranceCoversTrip: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const trip = dossier.application.trip
  const insurance = trip?.insurance

  if (!trip?.entryDate || !trip?.exitDate) return []

  if (!insurance) {
    return [
      {
        id: 'no-insurance',
        severity: 'error',
        title: 'No travel insurance',
        description:
          'Travel medical insurance is required for Schengen visa applications.',
        relatedFields: ['trip.insurance'],
        suggestedAction:
          'Purchase travel medical insurance covering your entire trip.',
      },
    ]
  }

  if (!insurance.coverageStartDate || !insurance.coverageEndDate) {
    return [
      {
        id: 'insurance-dates-missing',
        severity: 'error',
        title: 'Insurance dates missing',
        description: 'Insurance coverage start and end dates are required.',
        relatedFields: [
          'trip.insurance.coverageStartDate',
          'trip.insurance.coverageEndDate',
        ],
        suggestedAction: 'Enter the insurance coverage dates.',
      },
    ]
  }

  const findings: ValidationFinding[] = []
  const tripStart = parseISO(trip.entryDate)
  const tripEnd = parseISO(trip.exitDate)
  const coverageStart = parseISO(insurance.coverageStartDate)
  const coverageEnd = parseISO(insurance.coverageEndDate)

  // Check if insurance starts before or on trip start
  if (isAfter(coverageStart, tripStart)) {
    findings.push({
      id: 'insurance-starts-late',
      severity: 'error',
      title: 'Insurance starts after trip begins',
      description: `Insurance coverage starts on ${insurance.coverageStartDate}, but trip starts on ${trip.entryDate}.`,
      relatedFields: ['trip.insurance.coverageStartDate', 'trip.entryDate'],
      suggestedAction:
        'Ensure insurance coverage starts on or before your trip start date.',
    })
  }

  // Check if insurance ends after or on trip end
  if (isBefore(coverageEnd, tripEnd)) {
    findings.push({
      id: 'insurance-ends-early',
      severity: 'error',
      title: 'Insurance ends before trip ends',
      description: `Insurance coverage ends on ${insurance.coverageEndDate}, but trip ends on ${trip.exitDate}.`,
      relatedFields: ['trip.insurance.coverageEndDate', 'trip.exitDate'],
      suggestedAction:
        'Ensure insurance coverage extends to or beyond your trip end date.',
    })
  }

  // Check minimum coverage amount (Schengen requires 30,000 EUR)
  if (
    insurance.coverageAmount !== undefined &&
    insurance.coverageAmount < 30000
  ) {
    findings.push({
      id: 'insurance-coverage-low',
      severity: 'warning',
      title: 'Insurance coverage may be insufficient',
      description: `Insurance coverage amount (${insurance.coverageAmount} ${insurance.currency}) may be below the Schengen minimum of 30,000 EUR.`,
      relatedFields: ['trip.insurance.coverageAmount'],
      suggestedAction:
        'Verify your insurance meets the minimum coverage requirement of 30,000 EUR.',
    })
  }

  return findings
}

// Export all insurance rules
export const insuranceRules: ValidationRule[] = [insuranceCoversTrip]
