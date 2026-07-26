import { describe, it, expect } from 'vitest'
import {
  deriveFinanceGuidance,
  guidanceForStep,
} from '@/features/finance/finance-guidance'
import type { Financing } from '@/domain/schemas/application.schema'

const financing = (source: Financing['source']): Financing => ({
  source,
  currency: 'EUR',
})

const ids = (source: Financing['source']) =>
  deriveFinanceGuidance(financing(source)).map((h) => h.id)

describe('deriveFinanceGuidance — info-only, source-aware', () => {
  it('returns nothing without a source', () => {
    expect(deriveFinanceGuidance(undefined)).toEqual([])
  })

  it('gives personal-evidence hints for self-funding', () => {
    const result = ids('self')
    expect(result).toContain('bankStatementDemonstrates')
    expect(result).toContain('salaryAccountConsistency')
    expect(result).toContain('evidenceFromDocuments')
    expect(result).not.toContain('sponsorLetterDemonstrates')
  })

  it('gives a sponsor hint for sponsor-funding', () => {
    const result = ids('sponsor')
    expect(result).toContain('sponsorLetterDemonstrates')
    expect(result).not.toContain('bankStatementDemonstrates')
  })

  it('gives both personal and sponsor hints for mixed', () => {
    const result = ids('mixed')
    expect(result).toContain('bankStatementDemonstrates')
    expect(result).toContain('sponsorLetterDemonstrates')
  })

  it('gives employer context for employer-funding', () => {
    const result = ids('employer')
    expect(result).toContain('employerCoverageContext')
  })

  it('every hint is info or neutral (never a warning)', () => {
    for (const source of ['self', 'sponsor', 'employer', 'mixed'] as const) {
      for (const hint of deriveFinanceGuidance(financing(source))) {
        expect(['info', 'neutral']).toContain(hint.tone)
      }
    }
  })

  it('filters hints by step', () => {
    const hints = deriveFinanceGuidance(financing('mixed'))
    const personal = guidanceForStep(hints, 'personal')
    expect(personal.every((h) => h.step === 'personal')).toBe(true)
    expect(personal.length).toBeGreaterThan(0)
  })
})
