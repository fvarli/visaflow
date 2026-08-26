import type { Trip } from '@/domain/schemas/trip.schema'
import { computeNights } from '@/features/trip/route-dates'

/**
 * The journey, as something a person can read on one page.
 *
 * Trip data has always been complete — `route`, `transportReservations` and
 * `accommodationReservations` are real arrays, edited through real collection
 * editors, and the example dossier has carried two stops, two legs and two
 * stays since v1.0. None of it reached Final Review or the printed package,
 * which showed the trip as two dates and a night count. This module is the
 * missing read model, not a new fact: it stores nothing, adds nothing to the
 * schema, and every value it returns is already in the dossier (ADR-044).
 *
 * Pure, i18n-free and Intl-free — raw ISO dates, ISO country codes and stable
 * enum values only, so formatting and translation stay at the UI boundary
 * (ADR-012/ADR-023). Anything the dossier does not record comes back `null`
 * rather than guessed.
 */

/**
 * Which part of the journey a leg belongs to.
 *
 * Derived from dates rather than stored. A stored direction would be a second
 * source of truth that could disagree with the dates the moment either is
 * edited — and the dates already answer it: a leg departing on or before the
 * trip begins is how you get there, one departing on or after it ends is how
 * you come back, anything between is movement inside the trip.
 *
 * `unscheduled` is its own answer, not a default: a leg with no departure date,
 * or a trip with no entry/exit dates to compare it against, cannot be placed —
 * and saying so is more useful than filing it under "outbound" and being wrong.
 */
export type LegDirection = 'outbound' | 'internal' | 'return' | 'unscheduled'

export interface ItineraryLeg {
  /** Stable within one derivation — index order, so React keys are safe. */
  id: string
  direction: LegDirection
  type: Trip['transportReservations'][number]['type']
  /** ISO, or null when the reservation records none. */
  departureDate: string | null
  departureTime: string | null
  departureCity: string | null
  arrivalDate: string | null
  arrivalTime: string | null
  arrivalCity: string | null
  carrier: string | null
  reservationNumber: string | null
  status: Trip['transportReservations'][number]['status']
}

export interface ItineraryStay {
  id: string
  /** The property's own name, e.g. "Hotel Plaka". */
  name: string | null
  city: string | null
  country: string | null
  checkInDate: string | null
  checkOutDate: string | null
  /** Derived from the date pair, never read from a stored count. */
  nights: number
  reservationNumber: string | null
  status: Trip['accommodationReservations'][number]['status']
}

export interface ItineraryStop {
  id: string
  city: string | null
  country: string | null
  arrivalDate: string | null
  departureDate: string | null
  /** Derived. `0` is a real answer — a day trip, not missing data. */
  nights: number
}

export interface Itinerary {
  purpose: string | null
  entryDate: string | null
  exitDate: string | null
  entryCity: string | null
  exitCity: string | null
  firstEntryCountry: string | null
  legs: ItineraryLeg[]
  stays: ItineraryStay[]
  stops: ItineraryStop[]
  /** True when the trip records nothing at all worth printing. */
  isEmpty: boolean
}

const EMPTY: Itinerary = {
  purpose: null,
  entryDate: null,
  exitDate: null,
  entryCity: null,
  exitCity: null,
  firstEntryCountry: null,
  legs: [],
  stays: [],
  stops: [],
  isEmpty: true,
}

function nonEmpty(value: string | undefined | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * Place one leg in the journey.
 *
 * Comparison is on ISO date strings, which sort lexicographically — no parsing,
 * no timezone, no clock. Equality counts as outbound/return on purpose: the
 * flight that lands on the day the trip begins *is* the outbound flight.
 */
export function classifyLeg(
  departureDate: string | null,
  entryDate: string | null,
  exitDate: string | null
): LegDirection {
  if (!departureDate || !entryDate || !exitDate) return 'unscheduled'
  if (departureDate <= entryDate) return 'outbound'
  if (departureDate >= exitDate) return 'return'
  return 'internal'
}

/** The order a journey is read in, with what could not be placed last. */
const DIRECTION_ORDER: Record<LegDirection, number> = {
  outbound: 0,
  internal: 1,
  return: 2,
  unscheduled: 3,
}

export function buildItinerary(trip: Trip | null | undefined): Itinerary {
  if (!trip) return EMPTY

  const entryDate = nonEmpty(trip.entryDate)
  const exitDate = nonEmpty(trip.exitDate)

  const legs: ItineraryLeg[] = (trip.transportReservations ?? []).map(
    (leg, index) => {
      const departureDate = nonEmpty(leg.departureDate)
      return {
        id: `leg-${index}`,
        direction: classifyLeg(departureDate, entryDate, exitDate),
        type: leg.type,
        departureDate,
        departureTime: nonEmpty(leg.departureTime),
        departureCity: nonEmpty(leg.departureCity),
        arrivalDate: nonEmpty(leg.arrivalDate),
        arrivalTime: nonEmpty(leg.arrivalTime),
        arrivalCity: nonEmpty(leg.arrivalCity),
        carrier: nonEmpty(leg.carrier),
        reservationNumber: nonEmpty(leg.reservationNumber),
        status: leg.status,
      }
    }
  )

  // Journey order, not entry order: outbound, then movement inside the trip in
  // date order, then the way home. Ties keep the order the applicant entered.
  legs.sort((a, b) => {
    const byDirection =
      DIRECTION_ORDER[a.direction] - DIRECTION_ORDER[b.direction]
    if (byDirection !== 0) return byDirection
    return (a.departureDate ?? '').localeCompare(b.departureDate ?? '')
  })

  const stays: ItineraryStay[] = (trip.accommodationReservations ?? []).map(
    (stay, index) => ({
      id: `stay-${index}`,
      name: nonEmpty(stay.name),
      city: nonEmpty(stay.city),
      country: nonEmpty(stay.country),
      checkInDate: nonEmpty(stay.checkInDate),
      checkOutDate: nonEmpty(stay.checkOutDate),
      nights: computeNights(stay.checkInDate, stay.checkOutDate),
      reservationNumber: nonEmpty(stay.reservationNumber),
      status: stay.status,
    })
  )
  stays.sort((a, b) => (a.checkInDate ?? '').localeCompare(b.checkInDate ?? ''))

  const stops: ItineraryStop[] = (trip.route ?? []).map((stop, index) => ({
    id: `stop-${index}`,
    city: nonEmpty(stop.city),
    country: nonEmpty(stop.country),
    arrivalDate: nonEmpty(stop.arrivalDate),
    departureDate: nonEmpty(stop.departureDate),
    // Derived from the dates, like everywhere else — the stored `nights` is
    // kept in sync on write but is never the value anyone reads (ADR-024).
    nights: computeNights(stop.arrivalDate, stop.departureDate),
  }))

  const purpose = nonEmpty(trip.tripPurpose)

  return {
    purpose,
    entryDate,
    exitDate,
    entryCity: nonEmpty(trip.entryCity),
    exitCity: nonEmpty(trip.exitCity),
    firstEntryCountry: nonEmpty(trip.firstEntryCountry),
    legs,
    stays,
    stops,
    isEmpty:
      !entryDate &&
      !exitDate &&
      !purpose &&
      legs.length === 0 &&
      stays.length === 0 &&
      stops.length === 0,
  }
}
