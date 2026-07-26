import type { ValidationFinding } from '@/domain/rules/types'

/**
 * Where a finding gets fixed — the "Take me there" target.
 *
 * Every actionable finding resolves to a real editing surface so the page has
 * no dead ends. Trip and Applicant findings deep-link to the exact wizard step
 * via the `?step=` parameter those pages already read; other findings land on
 * the page that owns them.
 *
 * This is pure and React-free (a plain route string), so the mapping is
 * unit-tested without a router. It reuses the same `relatedFields`-prefix
 * convention as the dashboard and documents deep-links, keyed off the stable
 * `ruleId` first for precision.
 */
export interface FindingAction {
  route: string
}

/** Trip wizard step ids (kept in sync with `TRIP_STEP_IDS`, matched by ruleId). */
function tripStepForRuleId(ruleId: string): string {
  if (ruleId.startsWith('accommodation.')) return 'accommodation'
  if (ruleId.startsWith('insurance.')) return 'insurance'
  if (
    ruleId === 'trip.routeNightsMatchTotal' ||
    ruleId === 'trip.mainDestinationMatchesLongestStay' ||
    ruleId === 'trip.firstEntryMatchesRoute'
  ) {
    return 'route'
  }
  // trip.datesValid, trip.notInPast, trip.appointmentBeforeTrip — the appointment
  // is edited alongside the dates.
  return 'dates'
}

export function findingAction(
  finding: ValidationFinding
): FindingAction | null {
  const { ruleId } = finding

  if (ruleId.startsWith('passport.')) {
    return { route: '/applicant?step=passport' }
  }
  if (ruleId.startsWith('document.')) return { route: '/documents' }
  if (ruleId.startsWith('employment.')) return { route: '/employment' }
  if (ruleId.startsWith('sponsor.')) return { route: '/sponsors' }
  if (
    ruleId.startsWith('trip.') ||
    ruleId.startsWith('accommodation.') ||
    ruleId.startsWith('insurance.')
  ) {
    return { route: `/trip?step=${tripStepForRuleId(ruleId)}` }
  }

  // Fallback: locate by the first related field, mirroring the existing
  // dashboard/documents convention, so a new rule is never a dead end.
  const field = finding.relatedFields[0] ?? ''
  if (field.startsWith('applicant.')) return { route: '/applicant' }
  if (field.startsWith('documents.')) return { route: '/documents' }
  if (field.startsWith('employment.')) return { route: '/employment' }
  if (field.startsWith('sponsors.') || field.startsWith('financing.'))
    return { route: '/sponsors' }
  if (field.startsWith('trip.') || field.startsWith('appointment.'))
    return { route: '/trip' }

  return null
}
