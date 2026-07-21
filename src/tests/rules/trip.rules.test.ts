import { describe, it, expect } from 'vitest'
import {
  tripDatesValid,
  appointmentBeforeTrip,
  tripNotInPast,
  routeNightsMatchTotal,
} from '@/domain/rules/trip.rules'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import { addDays, format } from 'date-fns'

// Helper to create a minimal dossier for testing
function createTestDossier(overrides: Partial<Dossier> = {}): Dossier {
  return {
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    applicant: {
      id: 'test-applicant',
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1990-01-01',
      nationality: 'US',
      passport: {
        number: 'ABC123',
        issueDate: '2020-01-01',
        expiryDate: '2030-01-01',
        issuingCountry: 'US',
        passportType: 'ordinary',
      },
      previousPassports: [],
      previousVisas: [],
      travelHistory: [],
    },
    application: {
      applicationId: 'test-app',
      applicantId: 'test-applicant',
      destinationCountry: 'GR',
      visaType: 'short_stay_tourism',
      status: 'draft',
      createdAt: new Date().toISOString(),
      sponsorIds: [],
      documentIds: [],
      notes: [],
      ...overrides.application,
    },
    documents: overrides.documents ?? [],
    sponsors: overrides.sponsors ?? [],
  }
}

describe('tripDatesValid', () => {
  it('returns no findings when entry is before exit', () => {
    const dossier = createTestDossier({
      application: {
        applicationId: 'test',
        applicantId: 'test',
        destinationCountry: 'GR',
        visaType: 'short_stay_tourism',
        status: 'draft',
        createdAt: new Date().toISOString(),
        sponsorIds: [],
        documentIds: [],
        notes: [],
        trip: {
          entryDate: '2025-06-01',
          exitDate: '2025-06-10',
          firstEntryCountry: 'GR',
          mainDestinationCountry: 'GR',
          route: [],
          transportReservations: [],
          accommodationReservations: [],
          budgetCurrency: 'EUR',
        },
      },
    })

    const findings = tripDatesValid(dossier)
    expect(findings).toHaveLength(0)
  })

  it('returns error when entry is after exit', () => {
    const dossier = createTestDossier({
      application: {
        applicationId: 'test',
        applicantId: 'test',
        destinationCountry: 'GR',
        visaType: 'short_stay_tourism',
        status: 'draft',
        createdAt: new Date().toISOString(),
        sponsorIds: [],
        documentIds: [],
        notes: [],
        trip: {
          entryDate: '2025-06-10',
          exitDate: '2025-06-01',
          firstEntryCountry: 'GR',
          mainDestinationCountry: 'GR',
          route: [],
          transportReservations: [],
          accommodationReservations: [],
          budgetCurrency: 'EUR',
        },
      },
    })

    const findings = tripDatesValid(dossier)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.severity).toBe('error')
    expect(findings[0]?.id).toBe('trip-dates-invalid')
  })

  it('returns no findings when trip dates are missing', () => {
    const dossier = createTestDossier()
    const findings = tripDatesValid(dossier)
    expect(findings).toHaveLength(0)
  })
})

describe('appointmentBeforeTrip', () => {
  it('returns no findings when appointment is before trip', () => {
    const dossier = createTestDossier({
      application: {
        applicationId: 'test',
        applicantId: 'test',
        destinationCountry: 'GR',
        visaType: 'short_stay_tourism',
        status: 'draft',
        createdAt: new Date().toISOString(),
        sponsorIds: [],
        documentIds: [],
        notes: [],
        appointment: {
          date: '2025-05-01',
        },
        trip: {
          entryDate: '2025-06-01',
          exitDate: '2025-06-10',
          firstEntryCountry: 'GR',
          mainDestinationCountry: 'GR',
          route: [],
          transportReservations: [],
          accommodationReservations: [],
          budgetCurrency: 'EUR',
        },
      },
    })

    const findings = appointmentBeforeTrip(dossier)
    expect(findings).toHaveLength(0)
  })

  it('returns error when appointment is after trip start', () => {
    const dossier = createTestDossier({
      application: {
        applicationId: 'test',
        applicantId: 'test',
        destinationCountry: 'GR',
        visaType: 'short_stay_tourism',
        status: 'draft',
        createdAt: new Date().toISOString(),
        sponsorIds: [],
        documentIds: [],
        notes: [],
        appointment: {
          date: '2025-06-15',
        },
        trip: {
          entryDate: '2025-06-01',
          exitDate: '2025-06-10',
          firstEntryCountry: 'GR',
          mainDestinationCountry: 'GR',
          route: [],
          transportReservations: [],
          accommodationReservations: [],
          budgetCurrency: 'EUR',
        },
      },
    })

    const findings = appointmentBeforeTrip(dossier)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.severity).toBe('error')
    expect(findings[0]?.id).toBe('appointment-after-trip')
  })
})

describe('tripNotInPast', () => {
  it('returns no findings for future trip', () => {
    const futureDate = format(addDays(new Date(), 30), 'yyyy-MM-dd')
    const dossier = createTestDossier({
      application: {
        applicationId: 'test',
        applicantId: 'test',
        destinationCountry: 'GR',
        visaType: 'short_stay_tourism',
        status: 'draft',
        createdAt: new Date().toISOString(),
        sponsorIds: [],
        documentIds: [],
        notes: [],
        trip: {
          entryDate: futureDate,
          exitDate: format(addDays(new Date(), 40), 'yyyy-MM-dd'),
          firstEntryCountry: 'GR',
          mainDestinationCountry: 'GR',
          route: [],
          transportReservations: [],
          accommodationReservations: [],
          budgetCurrency: 'EUR',
        },
      },
    })

    const findings = tripNotInPast(dossier)
    expect(findings).toHaveLength(0)
  })

  it('returns error for past trip', () => {
    const dossier = createTestDossier({
      application: {
        applicationId: 'test',
        applicantId: 'test',
        destinationCountry: 'GR',
        visaType: 'short_stay_tourism',
        status: 'draft',
        createdAt: new Date().toISOString(),
        sponsorIds: [],
        documentIds: [],
        notes: [],
        trip: {
          entryDate: '2020-01-01',
          exitDate: '2020-01-10',
          firstEntryCountry: 'GR',
          mainDestinationCountry: 'GR',
          route: [],
          transportReservations: [],
          accommodationReservations: [],
          budgetCurrency: 'EUR',
        },
      },
    })

    const findings = tripNotInPast(dossier)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.severity).toBe('error')
    expect(findings[0]?.id).toBe('trip-in-past')
  })
})

describe('routeNightsMatchTotal', () => {
  it('returns no findings when route nights match trip duration', () => {
    const dossier = createTestDossier({
      application: {
        applicationId: 'test',
        applicantId: 'test',
        destinationCountry: 'GR',
        visaType: 'short_stay_tourism',
        status: 'draft',
        createdAt: new Date().toISOString(),
        sponsorIds: [],
        documentIds: [],
        notes: [],
        trip: {
          entryDate: '2025-06-01',
          exitDate: '2025-06-10',
          firstEntryCountry: 'GR',
          mainDestinationCountry: 'GR',
          route: [
            {
              city: 'Athens',
              country: 'GR',
              arrivalDate: '2025-06-01',
              departureDate: '2025-06-05',
              nights: 4,
            },
            {
              city: 'Santorini',
              country: 'GR',
              arrivalDate: '2025-06-05',
              departureDate: '2025-06-10',
              nights: 5,
            },
          ],
          transportReservations: [],
          accommodationReservations: [],
          budgetCurrency: 'EUR',
        },
      },
    })

    const findings = routeNightsMatchTotal(dossier)
    expect(findings).toHaveLength(0)
  })

  it('returns warning when route nights do not match', () => {
    const dossier = createTestDossier({
      application: {
        applicationId: 'test',
        applicantId: 'test',
        destinationCountry: 'GR',
        visaType: 'short_stay_tourism',
        status: 'draft',
        createdAt: new Date().toISOString(),
        sponsorIds: [],
        documentIds: [],
        notes: [],
        trip: {
          entryDate: '2025-06-01',
          exitDate: '2025-06-10',
          firstEntryCountry: 'GR',
          mainDestinationCountry: 'GR',
          route: [
            {
              city: 'Athens',
              country: 'GR',
              arrivalDate: '2025-06-01',
              departureDate: '2025-06-05',
              nights: 3, // Wrong - should be 4
            },
          ],
          transportReservations: [],
          accommodationReservations: [],
          budgetCurrency: 'EUR',
        },
      },
    })

    const findings = routeNightsMatchTotal(dossier)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.severity).toBe('warning')
    expect(findings[0]?.id).toBe('route-nights-mismatch')
  })
})
