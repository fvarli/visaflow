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
  travelHistory: [],
}

const application = (): Application => ({
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

  it('returns events sorted ascending by date', () => {
    const events = buildKeyDates(
      {
        applicant: APPLICANT,
        application: application(),
        documents: [expiringDoc],
      },
      now
    )
    const dates = events.map((e) => e.date)
    expect([...dates]).toEqual([...dates].sort((a, b) => a.localeCompare(b)))
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
