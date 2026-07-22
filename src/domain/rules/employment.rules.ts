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
        ruleId: 'employment.leaveCoversTrip',
        severity: 'warning',
        messageKey: 'findings.noApprovedLeave',
        relatedFields: [
          'employment.approvedLeaveStart',
          'employment.approvedLeaveEnd',
        ],
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
      ruleId: 'employment.leaveCoversTrip',
      severity: 'warning',
      messageKey: 'findings.leaveStartsLate',
      messageParams: {
        dates: {
          leaveStart: employment.approvedLeaveStart,
          tripStart: trip.entryDate,
        },
      },
      relatedFields: ['employment.approvedLeaveStart', 'trip.entryDate'],
    })
  }

  // Check if leave ends after or on trip end
  if (isBefore(leaveEnd, tripEnd)) {
    findings.push({
      id: 'leave-ends-early',
      ruleId: 'employment.leaveCoversTrip',
      severity: 'warning',
      messageKey: 'findings.leaveEndsEarly',
      messageParams: {
        dates: {
          leaveEnd: employment.approvedLeaveEnd,
          tripEnd: trip.exitDate,
        },
      },
      relatedFields: ['employment.approvedLeaveEnd', 'trip.exitDate'],
    })
  }

  return findings
}

// Export all employment rules
export const employmentRules: ValidationRule[] = [leaveCoversTrip]
