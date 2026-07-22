import { parseISO, isBefore, differenceInDays } from 'date-fns'
import type { Dossier } from '../schemas/dossier.schema'
import type { ValidationFinding, ValidationRule } from './types'

/**
 * Rule 1: Trip entry date must be before exit date
 */
export const tripDatesValid: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const trip = dossier.application.trip
  if (!trip?.entryDate || !trip?.exitDate) return []

  const entryDate = parseISO(trip.entryDate)
  const exitDate = parseISO(trip.exitDate)

  if (!isBefore(entryDate, exitDate)) {
    return [
      {
        id: 'trip-dates-invalid',
        ruleId: 'trip.datesValid',
        severity: 'error',
        messageKey: 'findings.tripDatesInvalid',
        messageParams: {
          dates: { entryDate: trip.entryDate, exitDate: trip.exitDate },
        },
        relatedFields: ['trip.entryDate', 'trip.exitDate'],
      },
    ]
  }

  return []
}

/**
 * Rule 2: Appointment date must be before trip entry date
 */
export const appointmentBeforeTrip: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const appointment = dossier.application.appointment
  const trip = dossier.application.trip

  if (!appointment?.date || !trip?.entryDate) return []

  const appointmentDate = parseISO(appointment.date)
  const entryDate = parseISO(trip.entryDate)

  if (!isBefore(appointmentDate, entryDate)) {
    return [
      {
        id: 'appointment-after-trip',
        ruleId: 'trip.appointmentBeforeTrip',
        severity: 'error',
        messageKey: 'findings.appointmentAfterTrip',
        messageParams: {
          dates: {
            appointmentDate: appointment.date,
            entryDate: trip.entryDate,
          },
        },
        relatedFields: ['appointment.date', 'trip.entryDate'],
      },
    ]
  }

  return []
}

/**
 * Rule 11: Past trip date must produce an error
 */
export const tripNotInPast: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const trip = dossier.application.trip
  if (!trip?.entryDate) return []

  const entryDate = parseISO(trip.entryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isBefore(entryDate, today)) {
    return [
      {
        id: 'trip-in-past',
        ruleId: 'trip.notInPast',
        severity: 'error',
        messageKey: 'findings.tripInPast',
        messageParams: { dates: { entryDate: trip.entryDate } },
        relatedFields: ['trip.entryDate'],
      },
    ]
  }

  return []
}

/**
 * Rule 13: Route nights must equal total trip nights
 */
export const routeNightsMatchTotal: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const trip = dossier.application.trip
  if (!trip?.entryDate || !trip?.exitDate || !trip?.route?.length) return []

  const entryDate = parseISO(trip.entryDate)
  const exitDate = parseISO(trip.exitDate)
  const totalNights = differenceInDays(exitDate, entryDate)

  const routeNights = trip.route.reduce((sum, stop) => sum + stop.nights, 0)

  if (routeNights !== totalNights) {
    return [
      {
        id: 'route-nights-mismatch',
        ruleId: 'trip.routeNightsMatchTotal',
        severity: 'warning',
        messageKey: 'findings.routeNightsMismatch',
        messageParams: { values: { routeNights, totalNights } },
        relatedFields: ['trip.route', 'trip.entryDate', 'trip.exitDate'],
      },
    ]
  }

  return []
}

/**
 * Rule 7: Main destination must match the longest stay
 */
export const mainDestinationMatchesLongestStay: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const trip = dossier.application.trip
  if (!trip?.route?.length || !trip?.mainDestinationCountry) return []

  // Find the country with the most nights
  const nightsByCountry = trip.route.reduce<Record<string, number>>(
    (acc, stop) => {
      const country = stop.country
      acc[country] = (acc[country] ?? 0) + stop.nights
      return acc
    },
    {}
  )

  let longestStayCountry = ''
  let maxNights = 0
  for (const [country, nights] of Object.entries(nightsByCountry)) {
    if (nights > maxNights) {
      maxNights = nights
      longestStayCountry = country
    }
  }

  if (
    longestStayCountry &&
    longestStayCountry !== trip.mainDestinationCountry
  ) {
    return [
      {
        id: 'main-destination-mismatch',
        ruleId: 'trip.mainDestinationMatchesLongestStay',
        severity: 'warning',
        messageKey: 'findings.mainDestinationMismatch',
        messageParams: {
          values: {
            declared: trip.mainDestinationCountry,
            longest: longestStayCountry,
            nights: maxNights,
          },
        },
        relatedFields: ['trip.mainDestinationCountry', 'trip.route'],
      },
    ]
  }

  return []
}

/**
 * Rule 14: First entry country and transport itinerary should not conflict
 */
export const firstEntryMatchesRoute: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const trip = dossier.application.trip
  if (!trip?.firstEntryCountry || !trip?.transportReservations?.length)
    return []

  // Find first transport that arrives in Schengen area
  const firstTransport = trip.transportReservations.find(
    (t) => t.arrivalCountry === trip.firstEntryCountry
  )

  if (!firstTransport && trip.transportReservations.length > 0) {
    const firstArrival = trip.transportReservations[0]
    if (
      firstArrival?.arrivalCountry &&
      firstArrival.arrivalCountry !== trip.firstEntryCountry
    ) {
      return [
        {
          id: 'first-entry-transport-mismatch',
          ruleId: 'trip.firstEntryMatchesRoute',
          severity: 'warning',
          messageKey: 'findings.firstEntryTransportMismatch',
          messageParams: {
            values: {
              declared: trip.firstEntryCountry,
              actual: firstArrival.arrivalCountry,
            },
          },
          relatedFields: [
            'trip.firstEntryCountry',
            'trip.transportReservations',
          ],
        },
      ]
    }
  }

  return []
}

// Export all trip rules
export const tripRules: ValidationRule[] = [
  tripDatesValid,
  appointmentBeforeTrip,
  tripNotInPast,
  routeNightsMatchTotal,
  mainDestinationMatchesLongestStay,
  firstEntryMatchesRoute,
]
