import { describe, it, expect } from 'vitest'
import {
  deriveEmploymentGuidance,
  guidanceForStep,
} from '@/features/employment/employment-guidance'
import type { Employment } from '@/domain/schemas/employment.schema'

const emp = (status: Employment['employmentStatus']): Employment => ({
  employmentStatus: status,
  currency: 'EUR',
})

describe('employment guidance — info-only, status-aware', () => {
  it('produces no hints without a status', () => {
    expect(deriveEmploymentGuidance(undefined)).toEqual([])
  })

  it('guides an employed applicant on employer / income / leave / docs', () => {
    const hints = deriveEmploymentGuidance(emp('employed'))
    const ids = hints.map((h) => h.id)
    expect(ids).toContain('employerNameMatch')
    expect(ids).toContain('netVsGross')
    expect(ids).toContain('salaryConsistency')
    expect(ids).toContain('companyDocsSupporting')
    expect(ids).toContain('leaveDatesMatchTrip')
    // All hints are calm and never predictive.
    expect(hints.every((h) => h.tone === 'info' || h.tone === 'neutral')).toBe(
      true
    )
  })

  it('does not nudge a self-employed applicant about leave', () => {
    const ids = deriveEmploymentGuidance(emp('self_employed')).map((h) => h.id)
    expect(ids).toContain('employerNameMatch')
    expect(ids).not.toContain('leaveDatesMatchTrip')
  })

  it('reassures a non-employer applicant instead of nudging', () => {
    const hints = deriveEmploymentGuidance(emp('retired'))
    expect(hints.map((h) => h.id)).toEqual(['noEmployerNeeded'])
    expect(hints[0]!.tone).toBe('neutral')
  })

  it('filters hints by step', () => {
    const hints = deriveEmploymentGuidance(emp('employed'))
    expect(guidanceForStep(hints, 'income').map((h) => h.id)).toEqual([
      'netVsGross',
      'salaryConsistency',
    ])
    expect(guidanceForStep(hints, 'leave').map((h) => h.id)).toEqual([
      'leaveDatesMatchTrip',
    ])
  })
})
