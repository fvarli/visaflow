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
        ruleId: 'accommodation.coversTrip',
        severity: 'warning',
        messageKey: 'findings.noAccommodation',
        relatedFields: ['trip.accommodationReservations'],
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
        ruleId: 'accommodation.coversTrip',
        severity: 'error',
        messageKey: 'findings.accommodationGap',
        messageParams: { values: { dates: uncoveredDates } },
        relatedFields: [
          'trip.accommodationReservations',
          'trip.entryDate',
          'trip.exitDate',
        ],
      },
    ]
  }

  return []
}

/**
 * `reservationNamesMatch` used to live here — rule 12, warning severity: it
 * flagged any reservation whose guest name did not contain part of the
 * applicant's name. It is gone, and the reason is that no authority states the
 * criterion it enforced.
 *
 * The Visa Code's own list contemplates exactly the bookings it flagged. Annex
 * II A.3(a) accepts, for accommodation, "an invitation from the host if staying
 * with one" and "any other appropriate document indicating the accommodation
 * envisaged" — neither of which carries the applicant's name in the guest
 * field. A spouse's booking, a host's invitation and a company reservation are
 * routes the Code names, not deviations from it.
 *
 * Softening the wording was tried first and was not enough, because severity —
 * not copy — is what the product reads. The finding still added to the
 * consistency attention count, still produced a warning-toned dashboard action,
 * still landed in the Final Review's attention list, and still moved the
 * accommodation area from `captured` to `needsReview`. That last one survives a
 * downgrade to `info`: `buildReview` keys on a finding *existing*, so there is
 * no severity at which this becomes advisory. VisaFlow has no purely advisory
 * finding level, and inventing one for a single unsourced hint would be the
 * wrong trade.
 *
 * `trip-guidance.ts` is a genuinely non-normative channel, but it takes no
 * applicant and its hints carry no message parameters, so moving the rule there
 * meant reshaping that channel for this one hint. Removal is the smaller
 * truthful correction.
 *
 * Do not restore this without an authority that states the criterion. Wanting
 * to be helpful about a booking in someone else's name is not that authority —
 * and if such a nudge is ever wanted, the honest form is prose on the
 * requirement, not a finding against the dossier.
 */

// Export all accommodation rules
export const accommodationRules: ValidationRule[] = [accommodationCoversTrip]
