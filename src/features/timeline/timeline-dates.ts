import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Application } from '@/domain/schemas/application.schema'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Document } from '@/domain/schemas/document.schema'

/**
 * Key dates — the **fixed events** of the dossier (facts, not recommendations),
 * kept deliberately separate from preparation tasks. A clean chronological view
 * over appointment, approved leave, trip, itinerary, reservations, insurance,
 * passport, and document validity. Pure: stored values stay ISO; formatting and
 * labels are resolved at the UI boundary.
 */

export type KeyDateType =
  | 'appointment'
  | 'leave'
  | 'tripEntry'
  | 'tripExit'
  | 'routeStop'
  | 'transport'
  | 'accommodation'
  | 'insurance'
  | 'passportExpiry'
  | 'documentExpiry'

export interface KeyDateEvent {
  id: string
  type: KeyDateType
  /** ISO start date. */
  date: string
  /** ISO end date, for ranges (leave, accommodation, insurance, route stops). */
  endDate?: string
  status: 'past' | 'today' | 'upcoming'
  /** City, for itinerary/accommodation events. */
  city?: string
  /** Document code, for document-expiry events (label resolved in the UI). */
  documentCode?: string
}

export interface KeyDatesInput {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
}

function dayStatus(iso: string, now: Date): KeyDateEvent['status'] {
  const diff = differenceInCalendarDays(parseISO(iso), now)
  if (diff < 0) return 'past'
  if (diff === 0) return 'today'
  return 'upcoming'
}

/** All fixed dossier events, sorted ascending by date. Ranges collapse into one event. */
export function buildKeyDates(input: KeyDatesInput, now: Date): KeyDateEvent[] {
  const { applicant, application, documents } = input
  const events: KeyDateEvent[] = []
  const push = (
    partial: Omit<KeyDateEvent, 'status'> & { date: string }
  ): void => {
    events.push({ ...partial, status: dayStatus(partial.date, now) })
  }

  const appointment = application?.appointment
  if (appointment?.date) {
    push({ id: 'appointment', type: 'appointment', date: appointment.date })
  }

  const employment = application?.employment
  if (employment?.approvedLeaveStart) {
    push({
      id: 'leave',
      type: 'leave',
      date: employment.approvedLeaveStart,
      endDate: employment.approvedLeaveEnd ?? undefined,
    })
  }

  const trip = application?.trip
  if (trip?.entryDate) {
    push({ id: 'trip-entry', type: 'tripEntry', date: trip.entryDate })
  }
  if (trip?.exitDate) {
    push({ id: 'trip-exit', type: 'tripExit', date: trip.exitDate })
  }

  trip?.route?.forEach((stop, i) => {
    if (stop.arrivalDate) {
      push({
        id: `route-${i}`,
        type: 'routeStop',
        date: stop.arrivalDate,
        endDate: stop.departureDate,
        city: stop.city,
      })
    }
  })

  trip?.transportReservations?.forEach((t, i) => {
    if (t.departureDate) {
      push({ id: `transport-${i}`, type: 'transport', date: t.departureDate })
    }
  })

  trip?.accommodationReservations?.forEach((a, i) => {
    if (a.checkInDate) {
      push({
        id: `accommodation-${i}`,
        type: 'accommodation',
        date: a.checkInDate,
        endDate: a.checkOutDate,
        city: a.city,
      })
    }
  })

  const insurance = trip?.insurance
  if (insurance?.coverageStartDate) {
    push({
      id: 'insurance',
      type: 'insurance',
      date: insurance.coverageStartDate,
      endDate: insurance.coverageEndDate,
    })
  }

  if (applicant?.passport?.expiryDate) {
    push({
      id: 'passport-expiry',
      type: 'passportExpiry',
      date: applicant.passport.expiryDate,
    })
  }

  for (const doc of documents) {
    if (doc.validUntil && doc.status !== 'not_applicable') {
      push({
        id: `doc-expiry-${doc.id}`,
        type: 'documentExpiry',
        date: doc.validUntil,
        documentCode: doc.code,
      })
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date))
}
