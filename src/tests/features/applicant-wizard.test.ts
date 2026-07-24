import { describe, it, expect } from 'vitest'
import {
  WIZARD_STEP_IDS,
  deriveStepStatuses,
  isPersonalComplete,
  isPassportComplete,
} from '@/features/applicant/applicant-wizard'
import type { Applicant } from '@/domain/schemas/applicant.schema'

const emptyApplicant: Applicant = {
  id: 'a1',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  nationality: '',
  passport: {
    number: '',
    issueDate: '',
    expiryDate: '',
    issuingCountry: '',
    passportType: 'ordinary',
  },
  previousPassports: [],
  previousVisas: [],
  travelHistory: [],
}

const fullApplicant: Applicant = {
  ...emptyApplicant,
  firstName: 'Ada',
  lastName: 'Lovelace',
  dateOfBirth: '1990-01-01',
  nationality: 'TR',
  passport: {
    number: 'U1234567',
    issueDate: '2020-01-01',
    expiryDate: '2030-01-01',
    issuingCountry: 'TR',
    passportType: 'ordinary',
  },
}

describe('applicant wizard model', () => {
  it('exposes the five steps in order', () => {
    expect(WIZARD_STEP_IDS).toEqual([
      'personal',
      'passport',
      'previousVisas',
      'travelHistory',
      'review',
    ])
  })

  it('reads required-field completeness', () => {
    expect(isPersonalComplete(emptyApplicant)).toBe(false)
    expect(isPersonalComplete(fullApplicant)).toBe(true)
    expect(isPassportComplete(emptyApplicant)).toBe(false)
    expect(isPassportComplete(fullApplicant)).toBe(true)
  })

  it('marks only the active step current when nothing is filled', () => {
    expect(deriveStepStatuses(emptyApplicant, 0)).toEqual([
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
  })

  it('marks a satisfied step complete even when it is ahead', () => {
    // Personal is current; passport already has data → complete; the optional
    // lists are empty and not yet passed → upcoming.
    expect(deriveStepStatuses(fullApplicant, 0)).toEqual([
      'current',
      'complete',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
  })

  it('treats passed optional steps as complete on the review step', () => {
    expect(deriveStepStatuses(fullApplicant, 4)).toEqual([
      'complete',
      'complete',
      'complete',
      'complete',
      'current',
    ])
  })

  it('keeps an optional step with entries complete when behind the cursor', () => {
    const withVisa: Applicant = {
      ...fullApplicant,
      previousVisas: [{ country: 'GR', visaType: 'C' }],
    }
    // previousVisas has an entry → complete even though index 2 > current 1.
    expect(deriveStepStatuses(withVisa, 1)[2]).toBe('complete')
  })
})
