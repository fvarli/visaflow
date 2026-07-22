import { parseISO, isBefore, isAfter } from 'date-fns'
import type { Dossier } from '../schemas/dossier.schema'
import type { ValidationFinding, ValidationRule } from './types'

/** Schengen minimum travel medical insurance coverage, in EUR. */
const SCHENGEN_MINIMUM_COVERAGE = 30000

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
        ruleId: 'insurance.coversTrip',
        severity: 'error',
        messageKey: 'findings.noInsurance',
        relatedFields: ['trip.insurance'],
      },
    ]
  }

  if (!insurance.coverageStartDate || !insurance.coverageEndDate) {
    return [
      {
        id: 'insurance-dates-missing',
        ruleId: 'insurance.coversTrip',
        severity: 'error',
        messageKey: 'findings.insuranceDatesMissing',
        relatedFields: [
          'trip.insurance.coverageStartDate',
          'trip.insurance.coverageEndDate',
        ],
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
      ruleId: 'insurance.coversTrip',
      severity: 'error',
      messageKey: 'findings.insuranceStartsLate',
      messageParams: {
        dates: {
          coverageStart: insurance.coverageStartDate,
          tripStart: trip.entryDate,
        },
      },
      relatedFields: ['trip.insurance.coverageStartDate', 'trip.entryDate'],
    })
  }

  // Check if insurance ends after or on trip end
  if (isBefore(coverageEnd, tripEnd)) {
    findings.push({
      id: 'insurance-ends-early',
      ruleId: 'insurance.coversTrip',
      severity: 'error',
      messageKey: 'findings.insuranceEndsEarly',
      messageParams: {
        dates: {
          coverageEnd: insurance.coverageEndDate,
          tripEnd: trip.exitDate,
        },
      },
      relatedFields: ['trip.insurance.coverageEndDate', 'trip.exitDate'],
    })
  }

  // Check minimum coverage amount (Schengen requires 30,000 EUR)
  if (
    insurance.coverageAmount !== undefined &&
    insurance.coverageAmount < SCHENGEN_MINIMUM_COVERAGE
  ) {
    findings.push({
      id: 'insurance-coverage-low',
      ruleId: 'insurance.coversTrip',
      severity: 'warning',
      messageKey: 'findings.insuranceCoverageLow',
      messageParams: {
        money: {
          amount: {
            amount: insurance.coverageAmount,
            currency: insurance.currency ?? 'EUR',
          },
          minimum: { amount: SCHENGEN_MINIMUM_COVERAGE, currency: 'EUR' },
        },
      },
      relatedFields: ['trip.insurance.coverageAmount'],
    })
  }

  return findings
}

// Export all insurance rules
export const insuranceRules: ValidationRule[] = [insuranceCoversTrip]
