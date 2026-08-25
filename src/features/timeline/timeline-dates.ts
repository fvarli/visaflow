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
 *
 * **An absent date is a result, not a gap in the list.** This originally pushed
 * an event only when a date existed, so a dossier with no trip and no
 * appointment simply rendered a shorter timeline — indistinguishable from one
 * where those things genuinely do not apply. The anchors a short-stay
 * application always has are now emitted with `date: null` when the dossier
 * does not record them yet, so the view can say *"not recorded"* and link to
 * the editor rather than quietly leaving them out (ADR-043). Nothing here ever
 * invents a date.
 */

export type KeyDateType =
  | 'appointment'
  | 'leave'
  | 'tripEntry'
  | 'tripExit'
  | 'routeStop'
  | 'transport'
  | 'transportArrival'
  | 'accommodation'
  | 'insurance'
  | 'passportExpiry'
  | 'documentExpiry'

export interface KeyDateEvent {
  id: string
  type: KeyDateType
  /** ISO start date, or `null` when the dossier does not record it yet. */
  date: string | null
  /** ISO end date, for ranges (leave, accommodation, insurance, route stops). */
  endDate?: string
  /** `missing` is its own outcome — never sorted or rendered as if it had a date. */
  status: 'past' | 'today' | 'upcoming' | 'missing'
  /** City, for itinerary/accommodation events. */
  city?: string
  /** Document code, for document-expiry events (label resolved in the UI). */
  documentCode?: string
}

/**
 * The anchors a short-stay application always has, whether or not they are
 * filled in. Deliberately short: these are the dates every applicant will end
 * up with, so their absence is information. Optional things a particular trip
 * may genuinely not involve — a route, extra transport legs, more accommodation
 * — are *not* here, because "no second hotel" is not a gap.
 */
const EXPECTED_ANCHORS: readonly KeyDateType[] = [
  'appointment',
  'tripEntry',
  'tripExit',
  'insurance',
  'passportExpiry',
]

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

/**
 * All fixed dossier events: recorded ones sorted ascending by date, followed by
 * the expected anchors that are not recorded yet. Ranges collapse into one
 * event.
 */
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
      push({
        id: `transport-${i}`,
        type: 'transport',
        date: t.departureDate,
        city: t.departureCity || undefined,
      })
    }
    // The return leg is a date the applicant is just as likely to be checking,
    // and it was already stored and shown in the trip workspace — it simply
    // never reached the timeline.
    if (t.arrivalDate && t.arrivalDate !== t.departureDate) {
      push({
        id: `transport-${i}-arrival`,
        type: 'transportArrival',
        date: t.arrivalDate,
        city: t.arrivalCity || undefined,
      })
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

  const recorded = events.sort((a, b) =>
    (a.date ?? '').localeCompare(b.date ?? '')
  )

  // Anchors the dossier has not answered yet, appended rather than interleaved:
  // they have no place in a chronology.
  const present = new Set(recorded.map((event) => event.type))
  const missing: KeyDateEvent[] = EXPECTED_ANCHORS.filter(
    (type) => !present.has(type)
  ).map((type) => ({
    id: `missing-${type}`,
    type,
    date: null,
    status: 'missing' as const,
  }))

  return [...recorded, ...missing]
}
