import { describe, it, expect } from 'vitest'
import { passportValidAfterTrip } from '@/domain/rules/passport.rules'
import type { Dossier } from '@/domain/schemas/dossier.schema'

function createTestDossier(passportExpiry: string, tripExit: string): Dossier {
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
        expiryDate: passportExpiry,
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
      trip: {
        entryDate: '2025-06-01',
        exitDate: tripExit,
        firstEntryCountry: 'GR',
        mainDestinationCountry: 'GR',
        route: [],
        transportReservations: [],
        accommodationReservations: [],
        budgetCurrency: 'EUR',
      },
    },
    documents: [],
    sponsors: [],
  }
}

describe('passportValidAfterTrip', () => {
  it('returns no findings when passport is valid 3+ months after trip', () => {
    // Trip ends June 10, passport expires Oct 1 (more than 3 months after)
    const dossier = createTestDossier('2025-10-01', '2025-06-10')

    const findings = passportValidAfterTrip(dossier)
    expect(findings).toHaveLength(0)
  })

  it('returns error when passport expires less than 3 months after trip', () => {
    // Trip ends June 10, passport expires Aug 1 (less than 3 months after)
    const dossier = createTestDossier('2025-08-01', '2025-06-10')

    const findings = passportValidAfterTrip(dossier)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.severity).toBe('error')
    expect(findings[0]?.id).toBe('passport-validity-insufficient')
  })

  it('returns error when passport expires during trip', () => {
    // Trip ends June 10, passport expires June 5 (during trip)
    const dossier = createTestDossier('2025-06-05', '2025-06-10')

    const findings = passportValidAfterTrip(dossier)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.severity).toBe('error')
  })

  it('returns no findings when trip dates are missing', () => {
    const dossier: Dossier = {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      applicant: {
        id: 'test',
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
        applicationId: 'test',
        applicantId: 'test',
        destinationCountry: 'GR',
        visaType: 'short_stay_tourism',
        status: 'draft',
        createdAt: new Date().toISOString(),
        sponsorIds: [],
        documentIds: [],
        notes: [],
      },
      documents: [],
      sponsors: [],
    }

    const findings = passportValidAfterTrip(dossier)
    expect(findings).toHaveLength(0)
  })
})
