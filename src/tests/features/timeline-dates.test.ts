import { describe, it, expect } from 'vitest'
import { buildKeyDates } from '@/features/timeline/timeline-dates'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'

const APPLICANT: Applicant = {
  id: 'a1',
  firstName: 'Ada',
  lastName: 'Traveller',
  dateOfBirth: '1990-01-01',
  nationality: 'TR',
  passport: {
    number: 'X1',
    issueDate: '2020-01-01',
    expiryDate: '2030-01-01',
    issuingCountry: 'TR',
    passportType: 'ordinary',
  },
  previousPassports: [],
  previousVisas: [],
  previousRefusals: [],
  travelHistory: [],
}

const application = (over: Partial<Application> = {}): Application => ({
  applicationId: 'app1',
  applicantId: 'a1',
  destinationCountry: 'GR',
  visaType: 'short_stay_tourism',
  status: 'draft',
  createdAt: new Date().toISOString(),
  sponsorIds: [],
  documentIds: [],
  notes: [],
  appointment: { date: '2027-03-15' },
  trip: {
    entryDate: '2027-05-01',
    exitDate: '2027-05-10',
    firstEntryCountry: 'GR',
    mainDestinationCountry: 'GR',
    route: [
      {
        city: 'Athens',
        country: 'GR',
        arrivalDate: '2027-05-01',
        departureDate: '2027-05-05',
        nights: 4,
      },
    ],
    transportReservations: [],
    accommodationReservations: [
      {
        type: 'hotel',
        name: 'Demo Hotel',
        city: 'Athens',
        checkInDate: '2027-05-01',
        checkOutDate: '2027-05-05',
        status: 'confirmed',
      },
    ],
    insurance: {
      provider: 'Demo',
      coverageStartDate: '2027-05-01',
      coverageEndDate: '2027-05-10',
      coverageAmount: 30000,
      currency: 'EUR',
      medicalCoverage: true,
      repatriationCoverage: true,
    },
    budgetCurrency: 'EUR',
  },
  ...over,
})

const expiringDoc: Document = {
  id: 'bank',
  code: 'BANK_STATEMENTS',
  category: 'financial',
  ownerType: 'applicant',
  ownerId: 'a1',
  required: true,
  status: 'ready',
  verified: true,
  validUntil: '2027-04-01',
}

describe('buildKeyDates — fixed events', () => {
  const now = new Date('2027-03-01')

  it('returns recorded events sorted ascending by date', () => {
    const events = buildKeyDates(
      {
        applicant: APPLICANT,
        application: application(),
        documents: [expiringDoc],
      },
      now
    )
    // Anchors with no date are appended, not interleaved — they have no place
    // in a chronology, so only the recorded ones are asserted as sorted.
    const dates = events
      .filter((e) => e.date !== null)
      .map((e) => e.date as string)
    expect([...dates]).toEqual([...dates].sort((a, b) => a.localeCompare(b)))
    expect(events.filter((e) => e.date === null).length).toBe(
      events.length - dates.length
    )
    // …and every dateless event sits after every dated one.
    const firstMissing = events.findIndex((e) => e.date === null)
    if (firstMissing !== -1) {
      expect(events.slice(firstMissing).every((e) => e.date === null)).toBe(
        true
      )
    }
  })

  it('includes the appointment, trip, and document expiry', () => {
    const events = buildKeyDates(
      {
        applicant: APPLICANT,
        application: application(),
        documents: [expiringDoc],
      },
      now
    )
    const types = events.map((e) => e.type)
    expect(types).toContain('appointment')
    expect(types).toContain('tripEntry')
    expect(types).toContain('documentExpiry')
  })

  it('collapses overnight route stops and stays into ranges', () => {
    const events = buildKeyDates(
      { applicant: APPLICANT, application: application(), documents: [] },
      now
    )
    const stop = events.find((e) => e.type === 'routeStop')
    expect(stop?.endDate).toBe('2027-05-05')
    expect(stop?.city).toBe('Athens')
    const stay = events.find((e) => e.type === 'accommodation')
    expect(stay?.endDate).toBe('2027-05-05')
  })

  it('marks past vs upcoming by the local day boundary', () => {
    const events = buildKeyDates(
      { applicant: APPLICANT, application: application(), documents: [] },
      new Date('2027-05-02')
    )
    expect(events.find((e) => e.type === 'appointment')?.status).toBe('past')
    expect(events.find((e) => e.type === 'tripExit')?.status).toBe('upcoming')
  })
})

describe('buildKeyDates — absence is an outcome, not a gap', () => {
  const now = new Date('2027-03-01')

  it('names the anchors a bare dossier has not answered yet', () => {
    const events = buildKeyDates(
      { applicant: null, application: null, documents: [] },
      now
    )

    // Silence used to be the entire behaviour here: no dates, no list, nothing
    // to say which dates were even expected (ADR-043).
    const missing = events.filter((e) => e.status === 'missing')
    expect(missing.map((e) => e.type).sort()).toEqual(
      [
        'appointment',
        'insurance',
        'passportExpiry',
        'tripEntry',
        'tripExit',
      ].sort()
    )
    expect(missing.every((e) => e.date === null)).toBe(true)
  })

  it('invents no date for anything it could not find', () => {
    const events = buildKeyDates(
      { applicant: null, application: null, documents: [] },
      now
    )
    expect(events.every((e) => e.date === null)).toBe(true)
  })

  it('stops naming an anchor once the dossier records it', () => {
    const events = buildKeyDates(
      {
        applicant: APPLICANT,
        application: application(),
        documents: [],
      },
      now
    )
    const missingTypes = events
      .filter((e) => e.status === 'missing')
      .map((e) => e.type)

    // The fixture has an appointment, trip dates and a passport expiry.
    expect(missingTypes).not.toContain('appointment')
    expect(missingTypes).not.toContain('tripEntry')
    expect(missingTypes).not.toContain('passportExpiry')
  })

  it('reports a return leg as its own arrival event', () => {
    const events = buildKeyDates(
      {
        applicant: APPLICANT,
        application: application({
          trip: {
            entryDate: '2027-04-01',
            exitDate: '2027-04-10',
            firstEntryCountry: 'GR',
            mainDestinationCountry: 'GR',
            route: [],
            accommodationReservations: [],
            transportReservations: [
              {
                type: 'flight',
                departureDate: '2027-04-01',
                departureCity: 'Istanbul',
                arrivalDate: '2027-04-10',
                arrivalCity: 'Athens',
                status: 'confirmed',
              },
            ],
            budgetCurrency: 'EUR',
          },
        }),
        documents: [],
      },
      now
    )

    const arrival = events.find((e) => e.type === 'transportArrival')
    expect(arrival?.date).toBe('2027-04-10')
    expect(arrival?.city).toBe('Athens')
  })
})
