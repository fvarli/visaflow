import { describe, it, expect } from 'vitest'
import { buildApplicationSummary } from '@/features/review/review-summary'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'

const APPLICANT: Applicant = {
  id: 'a1',
  firstName: 'Ada',
  lastName: 'Traveller',
  dateOfBirth: '1990-01-01',
  nationality: 'TR',
  passport: {
    number: 'X1234567',
    issueDate: '2020-01-01',
    expiryDate: '2035-01-01',
    issuingCountry: 'TR',
    passportType: 'ordinary',
  },
  previousPassports: [],
  previousVisas: [],
  travelHistory: [],
}

const application = (over: Partial<Application> = {}): Application => ({
  applicationId: 'app1',
  applicantId: 'a1',
  destinationCountry: 'GR',
  visaType: 'short_stay_tourism',
  status: 'draft',
  createdAt: '2026-01-01T00:00:00.000Z',
  sponsorIds: [],
  documentIds: [],
  notes: [],
  ...over,
})

const sponsor = (id: string): Sponsor =>
  ({
    id,
    firstName: 'Sam',
    lastName: 'Sponsor',
    relationship: 'parent',
    documentIds: [],
  }) as unknown as Sponsor

describe('review-summary', () => {
  it('returns honest nulls for an empty dossier', () => {
    const summary = buildApplicationSummary(null, null, [])
    expect(summary.applicantName).toBeNull()
    expect(summary.passportNumber).toBeNull()
    expect(summary.destinationCountry.value).toBeNull()
    expect(summary.visaType.value).toBeNull()
    expect(summary.nights).toBeNull()
    expect(summary.appointment.date).toBeNull()
    expect(summary.funding.value).toBeNull()
    expect(summary.sponsorCount).toBeNull()
  })

  it('assembles the cover-sheet facts from a populated dossier', () => {
    const summary = buildApplicationSummary(
      APPLICANT,
      application({
        trip: {
          entryDate: '2026-09-01',
          exitDate: '2026-09-08',
          budgetCurrency: 'EUR',
        } as Application['trip'],
        appointment: {
          date: '2026-08-20',
          time: '09:30',
          location: 'Istanbul',
          confirmationNumber: 'ABC-1',
        },
        financing: { source: 'self', currency: 'EUR' },
        employment: { employmentStatus: 'employed', currency: 'EUR' },
      }),
      []
    )

    expect(summary.applicantName).toBe('Ada Traveller')
    expect(summary.passportNumber).toBe('X1234567')
    expect(summary.destinationCountry.value).toBe('GR')
    expect(summary.visaType.value).toBe('short_stay_tourism')
    expect(summary.nights).toBe(7)
    expect(summary.appointment.time).toBe('09:30')
    expect(summary.appointment.confirmationNumber).toBe('ABC-1')
    expect(summary.funding.value).toBe('self')
    expect(summary.employmentStatus.value).toBe('employed')
  })

  it('derives nights from the canonical date pair only', () => {
    const oneWay = buildApplicationSummary(
      null,
      application({
        trip: {
          entryDate: '2026-09-01',
          budgetCurrency: 'EUR',
        } as Application['trip'],
      }),
      []
    )
    expect(oneWay.nights).toBeNull()
  })

  it('omits sponsors entirely for a self-funded application with none', () => {
    const summary = buildApplicationSummary(
      APPLICANT,
      application({ financing: { source: 'self', currency: 'EUR' } }),
      []
    )
    expect(summary.sponsorCount).toBeNull()
  })

  it('surfaces sponsors when the funding is sponsored, even before any exist', () => {
    const summary = buildApplicationSummary(
      APPLICANT,
      application({ financing: { source: 'sponsor', currency: 'EUR' } }),
      []
    )
    expect(summary.sponsorCount?.value).toBe(0)
    expect(summary.sponsorCount?.to).toBe('/sponsors')
  })

  it('surfaces sponsors whenever any are recorded, whatever the funding source', () => {
    const summary = buildApplicationSummary(
      APPLICANT,
      application({ financing: { source: 'self', currency: 'EUR' } }),
      [sponsor('s1'), sponsor('s2')]
    )
    expect(summary.sponsorCount?.value).toBe(2)
  })

  it('treats blank strings as absent rather than as recorded values', () => {
    const summary = buildApplicationSummary(
      { ...APPLICANT, firstName: '  ', lastName: '  ' },
      application({ appointment: { date: '2026-08-20', location: '   ' } }),
      []
    )
    expect(summary.applicantName).toBeNull()
    expect(summary.appointment.location).toBeNull()
  })

  it('points every fact at the workspace that owns it', () => {
    const summary = buildApplicationSummary(APPLICANT, application(), [])
    expect(summary.applicantTo).toBe('/applicant')
    expect(summary.destinationCountry.to).toBe('/trip')
    expect(summary.tripTo).toBe('/trip?step=dates')
    expect(summary.funding.to).toBe('/finance?step=source')
    expect(summary.employmentStatus.to).toBe('/employment?step=status')
  })
})
