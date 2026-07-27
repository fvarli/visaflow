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

/** Employment wizard step ids (matched by ruleId). Leave is the only rule today. */
function employmentStepForRuleId(ruleId: string): string {
  if (ruleId === 'employment.leaveCoversTrip') return 'leave'
  return 'status'
}

/**
 * Finance wizard step ids for the money-relevant `sponsor.*` rules. Only the
 * funding-strategy rule (`sponsor.requiredForSponsoredFunding`) belongs on the
 * Finance page — it is about *how* the trip is funded. Per-sponsor rules
 * (missing sponsor documents, relationship proof) are edited on the Sponsors
 * page and are handled separately below.
 */
function financingStepForRuleId(ruleId: string): string {
  if (ruleId === 'sponsor.requiredForSponsoredFunding') return 'sponsors'
  return 'source'
}

/** The sponsor a finding is tied to (from `sponsors.<id>.*`), or null. */
function sponsorIdForFinding(finding: ValidationFinding): string | null {
  for (const field of finding.relatedFields) {
    const match = /^sponsors\.([^.]+)\./.exec(field)
    if (match) return match[1] ?? null
  }
  return null
}

export function findingAction(
  finding: ValidationFinding
): FindingAction | null {
  const { ruleId } = finding

  if (ruleId.startsWith('passport.')) {
    return { route: '/applicant?step=passport' }
  }
  if (ruleId.startsWith('document.')) return { route: '/documents' }
  if (ruleId.startsWith('employment.')) {
    return { route: `/employment?step=${employmentStepForRuleId(ruleId)}` }
  }
  // The funding-strategy rule lands on the Finance page; per-sponsor rules land
  // on the Sponsors page where the sponsor record is edited.
  if (ruleId === 'sponsor.requiredForSponsoredFunding') {
    return { route: `/finance?step=${financingStepForRuleId(ruleId)}` }
  }
  if (ruleId.startsWith('sponsor.')) {
    // Per-sponsor findings open that sponsor's workspace card/editor directly.
    const sponsorId = sponsorIdForFinding(finding)
    return { route: sponsorId ? `/sponsors?sponsor=${sponsorId}` : '/sponsors' }
  }
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
  if (field.startsWith('financing.')) return { route: '/finance?step=source' }
  if (field.startsWith('sponsors.')) {
    const sponsorId = sponsorIdForFinding(finding)
    return { route: sponsorId ? `/sponsors?sponsor=${sponsorId}` : '/sponsors' }
  }
  if (field.startsWith('trip.') || field.startsWith('appointment.'))
    return { route: '/trip' }

  return null
}
