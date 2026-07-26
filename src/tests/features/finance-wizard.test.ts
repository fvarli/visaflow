import { describe, it, expect } from 'vitest'
import {
  FINANCE_STEP_IDS,
  personalApplies,
  sponsorApplies,
  employerApplies,
  isSourceComplete,
  hasPersonalData,
  deriveStepStatuses,
} from '@/features/finance/finance-wizard'
import type { Application } from '@/domain/schemas/application.schema'
import type { Financing } from '@/domain/schemas/application.schema'
import type { FinancingSource } from '@/domain/types/common'

const application = (financing?: Partial<Financing>): Application => ({
  applicationId: 'app1',
  applicantId: 'a1',
  destinationCountry: 'GR',
  visaType: 'short_stay_tourism',
  status: 'draft',
  createdAt: new Date().toISOString(),
  sponsorIds: [],
  documentIds: [],
  notes: [],
  ...(financing
    ? { financing: { currency: 'EUR', ...financing } as Financing }
    : {}),
})

describe('finance-wizard — source-aware applicability', () => {
  it('has the six steps in order', () => {
    expect(FINANCE_STEP_IDS).toEqual([
      'source',
      'personal',
      'sponsors',
      'documents',
      'consistency',
      'review',
    ])
  })

  it('personal applies only to self and mixed', () => {
    const cases: [FinancingSource, boolean][] = [
      ['self', true],
      ['mixed', true],
      ['sponsor', false],
      ['employer', false],
    ]
    for (const [source, expected] of cases) {
      expect(personalApplies(source)).toBe(expected)
    }
    expect(personalApplies(undefined)).toBe(false)
  })

  it('sponsors apply only to sponsor and mixed', () => {
    expect(sponsorApplies('sponsor')).toBe(true)
    expect(sponsorApplies('mixed')).toBe(true)
    expect(sponsorApplies('self')).toBe(false)
    expect(sponsorApplies('employer')).toBe(false)
  })

  it('employer context applies only to employer', () => {
    expect(employerApplies('employer')).toBe(true)
    expect(employerApplies('self')).toBe(false)
    expect(employerApplies('mixed')).toBe(false)
  })

  it('source completeness follows the stored source', () => {
    expect(isSourceComplete(undefined)).toBe(false)
    expect(isSourceComplete({ source: 'self', currency: 'EUR' })).toBe(true)
  })

  it('personal data is present when any figure is recorded', () => {
    expect(hasPersonalData({ source: 'self', currency: 'EUR' })).toBe(false)
    expect(
      hasPersonalData({ source: 'self', currency: 'EUR', bankName: 'X' })
    ).toBe(true)
    expect(
      hasPersonalData({ source: 'self', currency: 'EUR', accountBalance: 0 })
    ).toBe(true)
  })
})

describe('finance-wizard — deriveStepStatuses', () => {
  it('marks non-applicable steps complete so the rail never nags (self)', () => {
    const statuses = deriveStepStatuses(application({ source: 'self' }), 0)
    // [source, personal, sponsors, documents, consistency, review]
    expect(statuses[0]).toBe('current')
    // sponsors don't apply to self → counts as complete.
    expect(statuses[2]).toBe('complete')
    // personal applies but has no data yet and isn't passed → upcoming.
    expect(statuses[1]).toBe('upcoming')
    expect(statuses[5]).toBe('upcoming') // review is terminal
  })

  it('nudges for a sponsor when sponsor-funded with none added', () => {
    const noSponsor = deriveStepStatuses(
      application({ source: 'sponsor' }),
      0,
      0
    )
    expect(noSponsor[2]).toBe('upcoming') // sponsors step not satisfied
    // personal doesn't apply to sponsor-funded → complete.
    expect(noSponsor[1]).toBe('complete')

    const withSponsor = deriveStepStatuses(
      application({ source: 'sponsor' }),
      0,
      1
    )
    expect(withSponsor[2]).toBe('complete')
  })

  it('treats a null application as nothing satisfied but not current-crashing', () => {
    const statuses = deriveStepStatuses(null, 0)
    expect(statuses[0]).toBe('current')
    expect(statuses).toHaveLength(FINANCE_STEP_IDS.length)
  })
})
