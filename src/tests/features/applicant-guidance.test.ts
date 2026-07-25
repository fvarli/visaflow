import { describe, it, expect } from 'vitest'
import {
  deriveApplicantGuidance,
  guidanceForStep,
} from '@/features/applicant/applicant-guidance'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type {
  PreviousVisa,
  TravelHistoryEntry,
} from '@/domain/schemas/passport.schema'

/**
 * The guidance layer is pure presentation logic — no React, no validation
 * engine — so these tests exercise the thresholds directly with a fixed `now`.
 */

const NOW = new Date('2027-06-01T00:00:00.000Z')

function applicant(over: {
  issueDate?: string
  expiryDate?: string
  previousVisas?: PreviousVisa[]
  travelHistory?: TravelHistoryEntry[]
}): Applicant {
  return {
    id: 'a',
    firstName: 'Demo',
    lastName: 'User',
    dateOfBirth: '1990-01-01',
    nationality: 'TR',
    passport: {
      number: 'X0000000',
      issueDate: over.issueDate ?? '2024-01-01',
      expiryDate: over.expiryDate ?? '2034-01-01',
      issuingCountry: 'TR',
      passportType: 'ordinary',
    },
    previousPassports: [],
    previousVisas: over.previousVisas ?? [{ country: 'DE', visaType: 'C' }],
    travelHistory: over.travelHistory ?? [],
  }
}

const idsFor = (a: Applicant) =>
  deriveApplicantGuidance(a, NOW).map((h) => h.id)

describe('deriveApplicantGuidance — passport expiry', () => {
  it('flags a passport expiring within ~6 months', () => {
    expect(idsFor(applicant({ expiryDate: '2027-09-01' }))).toContain(
      'passportExpiringSoon'
    )
  })

  it('does not flag a passport valid well into the future', () => {
    expect(idsFor(applicant({ expiryDate: '2030-01-01' }))).not.toContain(
      'passportExpiringSoon'
    )
  })

  it('does not flag an already-expired passport', () => {
    expect(idsFor(applicant({ expiryDate: '2027-01-01' }))).not.toContain(
      'passportExpiringSoon'
    )
  })
})

describe('deriveApplicantGuidance — passport age', () => {
  it('flags a passport issued many years ago', () => {
    expect(idsFor(applicant({ issueDate: '2017-01-01' }))).toContain(
      'passportOld'
    )
  })

  it('does not flag a recently issued passport', () => {
    expect(idsFor(applicant({ issueDate: '2025-01-01' }))).not.toContain(
      'passportOld'
    )
  })
})

describe('deriveApplicantGuidance — history', () => {
  it('reassures when there are no previous visas', () => {
    expect(idsFor(applicant({ previousVisas: [] }))).toContain(
      'noPreviousVisas'
    )
  })

  it('does not reassure once a previous visa exists', () => {
    expect(
      idsFor(applicant({ previousVisas: [{ country: 'DE', visaType: 'C' }] }))
    ).not.toContain('noPreviousVisas')
  })

  it('notes a long travel history at the threshold', () => {
    const trips: TravelHistoryEntry[] = [
      { country: 'DE', entryDate: '2025-01-01' },
      { country: 'FR', entryDate: '2025-06-01' },
      { country: 'IT', entryDate: '2026-01-01' },
    ]
    expect(idsFor(applicant({ travelHistory: trips }))).toContain(
      'longTravelHistory'
    )
  })

  it('does not note a short travel history', () => {
    expect(
      idsFor(
        applicant({
          travelHistory: [{ country: 'DE', entryDate: '2025-01-01' }],
        })
      )
    ).not.toContain('longTravelHistory')
  })
})

describe('guidanceForStep', () => {
  it('filters hints to a single step', () => {
    const hints = deriveApplicantGuidance(
      applicant({ expiryDate: '2027-09-01', previousVisas: [] }),
      NOW
    )
    expect(guidanceForStep(hints, 'passport').map((h) => h.id)).toEqual([
      'passportExpiringSoon',
    ])
    expect(guidanceForStep(hints, 'previousVisas').map((h) => h.id)).toEqual([
      'noPreviousVisas',
    ])
    expect(guidanceForStep(hints, 'review')).toEqual([])
  })
})
