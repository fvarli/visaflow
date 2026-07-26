import { describe, it, expect } from 'vitest'
import { computeTenure } from '@/features/employment/employment-tenure'

const NOW = new Date('2027-06-15T00:00:00Z')

describe('computeTenure', () => {
  it('reports missing when there is no start date', () => {
    expect(computeTenure(undefined, NOW).isMissing).toBe(true)
    expect(computeTenure('', NOW).isMissing).toBe(true)
    expect(computeTenure('not-a-date', NOW).isMissing).toBe(true)
  })

  it('flags a future start date instead of a negative duration', () => {
    const t = computeTenure('2027-12-01', NOW)
    expect(t.isFuture).toBe(true)
    expect(t.isMissing).toBe(false)
    expect(t.years).toBe(0)
    expect(t.months).toBe(0)
  })

  it('reports less than a month as zero years and months', () => {
    const t = computeTenure('2027-06-01', NOW)
    expect(t.isFuture).toBe(false)
    expect(t.years).toBe(0)
    expect(t.months).toBe(0)
    expect(t.totalMonths).toBe(0)
  })

  it('derives whole years and remaining months', () => {
    // 2024-03-01 → 2027-06-15 = 39 months = 3 years 3 months.
    const t = computeTenure('2024-03-01', NOW)
    expect(t.years).toBe(3)
    expect(t.months).toBe(3)
    expect(t.totalMonths).toBe(39)
  })

  it('handles exact years (no remaining months)', () => {
    const t = computeTenure('2025-06-15', NOW)
    expect(t.years).toBe(2)
    expect(t.months).toBe(0)
  })
})
