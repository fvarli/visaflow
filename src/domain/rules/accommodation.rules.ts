import { parseISO, eachDayOfInterval, format } from 'date-fns'
import type { Dossier } from '../schemas/dossier.schema'
import type { ValidationFinding, ValidationRule } from './types'

/**
 * Rule 4: Accommodation must cover every night of the trip
 */
export const accommodationCoversTrip: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const trip = dossier.application.trip
  if (!trip?.entryDate || !trip?.exitDate) return []
  if (!trip.accommodationReservations?.length) {
    return [
      {
        id: 'no-accommodation',
        severity: 'warning',
        title: 'No accommodation reservations',
        description:
          'No accommodation reservations have been added to the trip.',
        relatedFields: ['trip.accommodationReservations'],
        suggestedAction:
          'Add accommodation reservations covering all nights of your trip.',
      },
    ]
  }

  const entryDate = parseISO(trip.entryDate)
  const exitDate = parseISO(trip.exitDate)

  // Get all nights of the trip (we need accommodation for nights, not the exit day)
  const tripNights = eachDayOfInterval({
    start: entryDate,
    end: exitDate,
  }).slice(0, -1)

  // Check which nights are covered by reservations
  const coveredNights = new Set<string>()

  for (const reservation of trip.accommodationReservations) {
    if (!reservation.checkInDate || !reservation.checkOutDate) continue

    const checkIn = parseISO(reservation.checkInDate)
    const checkOut = parseISO(reservation.checkOutDate)

    // Each night from check-in to check-out (exclusive) is covered
    const reservationNights = eachDayOfInterval({
      start: checkIn,
      end: checkOut,
    }).slice(0, -1)
    for (const night of reservationNights) {
      coveredNights.add(format(night, 'yyyy-MM-dd'))
    }
  }

  // Find uncovered nights
  const uncoveredNights = tripNights.filter(
    (night) => !coveredNights.has(format(night, 'yyyy-MM-dd'))
  )

  if (uncoveredNights.length > 0) {
    const uncoveredDates = uncoveredNights
      .map((d) => format(d, 'yyyy-MM-dd'))
      .join(', ')
    return [
      {
        id: 'accommodation-gap',
        severity: 'error',
        title: 'Accommodation does not cover entire trip',
        description: `The following nights are not covered by accommodation: ${uncoveredDates}`,
        relatedFields: [
          'trip.accommodationReservations',
          'trip.entryDate',
          'trip.exitDate',
        ],
        suggestedAction:
          'Add accommodation reservations to cover all nights of your trip.',
      },
    ]
  }

  return []
}

/**
 * Rule 12: Reservation guest names should match the applicant
 */
export const reservationNamesMatch: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const applicant = dossier.applicant
  const trip = dossier.application.trip
  const findings: ValidationFinding[] = []

  if (!trip?.accommodationReservations?.length) return []

  const _applicantFullName =
    `${applicant.firstName} ${applicant.lastName}`.toLowerCase()

  for (const reservation of trip.accommodationReservations) {
    if (reservation.guestName) {
      const guestName = reservation.guestName.toLowerCase()
      // Simple check - names should contain at least one part of the applicant's name
      const firstNameMatch = applicant.firstName.toLowerCase()
      const lastNameMatch = applicant.lastName.toLowerCase()

      if (
        !guestName.includes(firstNameMatch) &&
        !guestName.includes(lastNameMatch)
      ) {
        findings.push({
          id: `accommodation-name-mismatch-${reservation.reservationNumber ?? reservation.name}`,
          severity: 'warning',
          title: 'Accommodation guest name may not match',
          description: `Guest name "${reservation.guestName}" on ${reservation.name} does not clearly match applicant name "${applicant.firstName} ${applicant.lastName}".`,
          relatedFields: [
            'trip.accommodationReservations',
            'applicant.firstName',
            'applicant.lastName',
          ],
          suggestedAction:
            "Verify the reservation is in the applicant's name or includes them as a guest.",
        })
      }
    }
  }

  return findings
}

// Export all accommodation rules
export const accommodationRules: ValidationRule[] = [
  accommodationCoversTrip,
  reservationNamesMatch,
]
