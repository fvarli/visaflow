import { parseISO, isBefore, isAfter } from 'date-fns'
import type { Dossier } from '../schemas/dossier.schema'
import type { ValidationFinding, ValidationRule } from './types'

/**
 * Rule 6: Approved employment leave must cover the trip
 */
export const leaveCoversTrip: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const employment = dossier.application.employment
  const trip = dossier.application.trip

  // Only check for employed applicants
  if (!employment || employment.employmentStatus !== 'employed') return []
  if (!trip?.entryDate || !trip?.exitDate) return []

  // If no leave dates are set, that's a warning
  if (!employment.approvedLeaveStart || !employment.approvedLeaveEnd) {
    return [
      {
        id: 'no-approved-leave',
        severity: 'warning',
        title: 'No approved leave dates',
        description:
          'Employed applicants typically need to show approved leave from their employer.',
        relatedFields: [
          'employment.approvedLeaveStart',
          'employment.approvedLeaveEnd',
        ],
        suggestedAction: 'Enter your approved leave dates from your employer.',
      },
    ]
  }

  const findings: ValidationFinding[] = []
  const tripStart = parseISO(trip.entryDate)
  const tripEnd = parseISO(trip.exitDate)
  const leaveStart = parseISO(employment.approvedLeaveStart)
  const leaveEnd = parseISO(employment.approvedLeaveEnd)

  // Check if leave starts before or on trip start
  if (isAfter(leaveStart, tripStart)) {
    findings.push({
      id: 'leave-starts-late',
      severity: 'warning',
      title: 'Approved leave starts after trip begins',
      description: `Approved leave starts on ${employment.approvedLeaveStart}, but trip starts on ${trip.entryDate}.`,
      relatedFields: ['employment.approvedLeaveStart', 'trip.entryDate'],
      suggestedAction: 'Ensure your approved leave covers your entire trip.',
    })
  }

  // Check if leave ends after or on trip end
  if (isBefore(leaveEnd, tripEnd)) {
    findings.push({
      id: 'leave-ends-early',
      severity: 'warning',
      title: 'Approved leave ends before trip ends',
      description: `Approved leave ends on ${employment.approvedLeaveEnd}, but trip ends on ${trip.exitDate}.`,
      relatedFields: ['employment.approvedLeaveEnd', 'trip.exitDate'],
      suggestedAction:
        'Ensure your approved leave extends to cover your return.',
    })
  }

  return findings
}

// Export all employment rules
export const employmentRules: ValidationRule[] = [leaveCoversTrip]
