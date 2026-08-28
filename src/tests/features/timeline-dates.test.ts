import { describe, it, expect } from 'vitest'
import {
  buildKeyDates,
  groupKeyDatesByDay,
} from '@/features/timeline/timeline-dates'
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

describe('buildKeyDates — one fact, one row', () => {
  const now = new Date('2027-03-01')

  const passportDoc = (validUntil: string) => ({
    id: 'p-doc',
    code: 'PASSPORT_CURRENT',
    category: 'passport' as const,
    ownerType: 'applicant' as const,
    ownerId: 'a1',
    required: true,
    status: 'ready' as const,
    verified: true,
    validUntil,
  })

  it('does not print the passport expiry twice', () => {
    // `applicant.passport.expiryDate` and the current passport document's
    // `validUntil` are the same fact in two editable places (ADR-045).
    const events = buildKeyDates(
      {
        applicant: APPLICANT,
        application: application(),
        documents: [passportDoc(APPLICANT.passport.expiryDate)],
      },
      now
    )
    const onThatDay = events.filter(
      (e) => e.date === APPLICANT.passport.expiryDate
    )
    expect(onThatDay).toHaveLength(1)
    expect(onThatDay[0]?.type).toBe('passportExpiry')
  })

  it('keeps both when the two dates actually disagree', () => {
    // Divergence between two separately-edited fields is a real problem the
    // applicant should see — suppressing it would be the worse bug.
    const events = buildKeyDates(
      {
        applicant: APPLICANT,
        application: application(),
        documents: [passportDoc('2029-01-01')],
      },
      now
    )
    expect(events.filter((e) => e.type === 'passportExpiry')).toHaveLength(1)
    expect(events.filter((e) => e.type === 'documentExpiry')).toHaveLength(1)
  })

  it('never suppresses any other document’s validity', () => {
    const events = buildKeyDates(
      {
        applicant: APPLICANT,
        application: application(),
        documents: [
          { ...passportDoc('2028-05-05'), id: 'ins', code: 'TRAVEL_INSURANCE' },
        ],
      },
      now
    )
    expect(events.some((e) => e.type === 'documentExpiry')).toBe(true)
  })

  it('carries the document id so the row can open that document', () => {
    const events = buildKeyDates(
      {
        applicant: APPLICANT,
        application: application(),
        documents: [
          { ...passportDoc('2028-05-05'), id: 'ins', code: 'TRAVEL_INSURANCE' },
        ],
      },
      now
    )
    expect(events.find((e) => e.type === 'documentExpiry')?.documentId).toBe(
      'ins'
    )
  })
})

describe('groupKeyDatesByDay', () => {
  const now = new Date('2027-03-01')

  it('gives a busy day one heading instead of one per event', () => {
    const events = buildKeyDates(
      { applicant: APPLICANT, application: application(), documents: [] },
      now
    )
    const groups = groupKeyDatesByDay(events)
    // Each day appears exactly once.
    expect(new Set(groups.map((g) => g.date)).size).toBe(groups.length)
    // …and every dated event is still present, none dropped.
    const dated = events.filter((e) => e.date !== null)
    expect(groups.reduce((n, g) => n + g.events.length, 0)).toBe(dated.length)
  })

  it('reads outward from the trip, not in dossier-construction order', () => {
    // Six things land on the day a trip begins. Their order must be a decision,
    // not whatever order `buildKeyDates` happened to push them in — a stable
    // sort would otherwise preserve emission order and look deterministic
    // while being arbitrary (ADR-045).
    const day = '2027-04-01'
    const events = buildKeyDates(
      {
        applicant: APPLICANT,
        application: application({
          appointment: undefined,
          employment: {
            employmentStatus: 'employed',
            currency: 'EUR',
            approvedLeaveStart: day,
            approvedLeaveEnd: '2027-04-10',
          },
          trip: {
            entryDate: day,
            exitDate: '2027-04-10',
            firstEntryCountry: 'GR',
            mainDestinationCountry: 'GR',
            budgetCurrency: 'EUR',
            route: [
              {
                city: 'Athens',
                country: 'GR',
                arrivalDate: day,
                departureDate: '2027-04-10',
                nights: 9,
              },
            ],
            transportReservations: [
              {
                type: 'flight',
                departureDate: day,
                departureCity: 'Warsaw',
                arrivalCity: 'Athens',
                status: 'confirmed',
              },
            ],
            accommodationReservations: [
              {
                type: 'hotel',
                name: 'Hotel',
                city: 'Athens',
                checkInDate: day,
                checkOutDate: '2027-04-10',
                status: 'confirmed',
              },
            ],
            insurance: {
              provider: 'X',
              coverageStartDate: day,
              coverageEndDate: '2027-04-10',
              currency: 'EUR',
              medicalCoverage: true,
              repatriationCoverage: false,
            },
          },
        }),
        documents: [],
      },
      now
    )
    const onDay = events.filter((e) => e.date === day).map((e) => e.type)
    expect(onDay).toEqual([
      'tripEntry',
      'leave',
      'routeStop',
      'transport',
      'accommodation',
      'insurance',
    ])
  })

  it('is deterministic — the same dossier renders identically', () => {
    const input = {
      applicant: APPLICANT,
      application: application(),
      documents: [],
    }
    const a = groupKeyDatesByDay(buildKeyDates(input, now))
    const b = groupKeyDatesByDay(buildKeyDates(input, now))
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b))
  })

  it('orders days ascending, including across a year boundary', () => {
    const events = buildKeyDates(
      {
        applicant: APPLICANT,
        application: application({
          appointment: { date: '2027-12-28' },
          trip: {
            entryDate: '2028-01-03',
            exitDate: '2028-01-10',
            firstEntryCountry: 'GR',
            mainDestinationCountry: 'GR',
            route: [],
            transportReservations: [],
            accommodationReservations: [],
            budgetCurrency: 'EUR',
          },
        }),
        documents: [],
      },
      now
    )
    const days = groupKeyDatesByDay(events).map((g) => g.date)
    expect(days).toEqual([...days].sort((a, b) => a.localeCompare(b)))
    expect(days).toContain('2027-12-28')
    expect(days).toContain('2028-01-03')
    expect(days.indexOf('2027-12-28')).toBeLessThan(days.indexOf('2028-01-03'))
  })

  it('leaves dateless anchors out — they belong to no day', () => {
    const groups = groupKeyDatesByDay(
      buildKeyDates({ applicant: null, application: null, documents: [] }, now)
    )
    expect(groups).toEqual([])
  })

  it('carries the day’s status, so today can be told apart', () => {
    const groups = groupKeyDatesByDay(
      buildKeyDates(
        {
          applicant: APPLICANT,
          application: application({ appointment: { date: '2027-03-01' } }),
          documents: [],
        },
        now
      )
    )
    const today = groups.find((g) => g.date === '2027-03-01')
    expect(today?.status).toBe('today')
    expect(
      groups
        .filter((g) => g.status === 'past')
        .every((g) => g.date < '2027-03-01')
    ).toBe(true)
  })
})
