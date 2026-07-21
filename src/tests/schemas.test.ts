import { describe, it, expect } from 'vitest'
import { ApplicantSchema } from '@/domain/schemas/applicant.schema'
import { DocumentSchema } from '@/domain/schemas/document.schema'
import { TripSchema } from '@/domain/schemas/trip.schema'
import { DossierSchema } from '@/domain/schemas/dossier.schema'

describe('ApplicantSchema', () => {
  it('validates a correct applicant', () => {
    const validApplicant = {
      id: 'test-123',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-05-15',
      nationality: 'US',
      passport: {
        number: 'AB1234567',
        issueDate: '2020-01-01',
        expiryDate: '2030-01-01',
        issuingCountry: 'US',
        passportType: 'ordinary',
      },
      previousPassports: [],
      previousVisas: [],
      travelHistory: [],
    }

    const result = ApplicantSchema.safeParse(validApplicant)
    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const invalidApplicant = {
      id: 'test-123',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '15/05/1990', // Wrong format
      nationality: 'US',
      passport: {
        number: 'AB1234567',
        issueDate: '2020-01-01',
        expiryDate: '2030-01-01',
        issuingCountry: 'US',
        passportType: 'ordinary',
      },
    }

    const result = ApplicantSchema.safeParse(invalidApplicant)
    expect(result.success).toBe(false)
  })

  it('rejects empty required fields', () => {
    const invalidApplicant = {
      id: 'test-123',
      firstName: '',
      lastName: 'Doe',
      dateOfBirth: '1990-05-15',
      nationality: 'US',
      passport: {
        number: 'AB1234567',
        issueDate: '2020-01-01',
        expiryDate: '2030-01-01',
        issuingCountry: 'US',
        passportType: 'ordinary',
      },
    }

    const result = ApplicantSchema.safeParse(invalidApplicant)
    expect(result.success).toBe(false)
  })
})

describe('DocumentSchema', () => {
  it('validates a correct document', () => {
    const validDocument = {
      id: 'doc-001',
      code: 'PASSPORT_CURRENT',
      name: 'Current Passport',
      category: 'passport',
      ownerType: 'applicant',
      ownerId: 'applicant-001',
      required: true,
      status: 'ready',
      verified: true,
    }

    const result = DocumentSchema.safeParse(validDocument)
    expect(result.success).toBe(true)
  })

  it('accepts all valid status values', () => {
    const statuses = [
      'not_started',
      'requested',
      'received',
      'needs_update',
      'ready',
      'not_applicable',
    ]

    for (const status of statuses) {
      const doc = {
        id: 'doc-001',
        code: 'TEST',
        name: 'Test Document',
        category: 'identity',
        ownerType: 'applicant',
        ownerId: 'test',
        required: true,
        status,
        verified: false,
      }

      const result = DocumentSchema.safeParse(doc)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status value', () => {
    const invalidDocument = {
      id: 'doc-001',
      code: 'TEST',
      name: 'Test Document',
      category: 'identity',
      ownerType: 'applicant',
      ownerId: 'test',
      required: true,
      status: 'invalid_status',
      verified: false,
    }

    const result = DocumentSchema.safeParse(invalidDocument)
    expect(result.success).toBe(false)
  })
})

describe('TripSchema', () => {
  it('validates a minimal trip', () => {
    const validTrip = {
      entryDate: '2025-06-01',
      exitDate: '2025-06-10',
      firstEntryCountry: 'GR',
      mainDestinationCountry: 'GR',
    }

    const result = TripSchema.safeParse(validTrip)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.route).toEqual([])
      expect(result.data.transportReservations).toEqual([])
      expect(result.data.accommodationReservations).toEqual([])
    }
  })

  it('validates a complete trip with reservations', () => {
    const fullTrip = {
      entryDate: '2025-06-01',
      exitDate: '2025-06-10',
      firstEntryCountry: 'GR',
      mainDestinationCountry: 'GR',
      entryCity: 'Athens',
      exitCity: 'Athens',
      route: [
        {
          city: 'Athens',
          country: 'GR',
          arrivalDate: '2025-06-01',
          departureDate: '2025-06-10',
          nights: 9,
        },
      ],
      transportReservations: [
        {
          type: 'flight',
          departureDate: '2025-06-01',
          departureCity: 'New York',
          arrivalCity: 'Athens',
          status: 'confirmed',
        },
      ],
      accommodationReservations: [
        {
          name: 'Athens Hotel',
          city: 'Athens',
          checkInDate: '2025-06-01',
          checkOutDate: '2025-06-10',
        },
      ],
      insurance: {
        provider: 'Allianz',
        coverageStartDate: '2025-06-01',
        coverageEndDate: '2025-06-10',
      },
    }

    const result = TripSchema.safeParse(fullTrip)
    expect(result.success).toBe(true)
  })
})

describe('DossierSchema', () => {
  it('validates a complete dossier', () => {
    const validDossier = {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      applicant: {
        id: 'test-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-05-15',
        nationality: 'US',
        passport: {
          number: 'AB1234567',
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
        applicationId: 'app-001',
        applicantId: 'test-123',
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

    const result = DossierSchema.safeParse(validDossier)
    expect(result.success).toBe(true)
  })

  it('rejects invalid schema version', () => {
    const invalidDossier = {
      schemaVersion: '2.0.0', // Invalid version
      exportedAt: new Date().toISOString(),
      applicant: {
        id: 'test',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-05-15',
        nationality: 'US',
        passport: {
          number: 'AB123',
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
        applicationId: 'app',
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

    const result = DossierSchema.safeParse(invalidDossier)
    expect(result.success).toBe(false)
  })
})
