import { describe, it, expect } from 'vitest'
import {
  computeVerificationCoverage,
  deriveReviewStatus,
  isReviewStatusSupported,
} from '@/config/countries/verification-coverage'
import type {
  CountryConfig,
  DocumentRequirement,
  RequirementSource,
  VisaTypeTemplate,
} from '@/config/types'

/**
 * The arithmetic behind an honest `reviewStatus` (ADR-047).
 *
 * These are deliberately synthetic. The registry-wide invariants in
 * `country-pack-provenance.test.ts` hold the real packs to this contract; here
 * the point is to pin the edges a single real pack cannot exercise — an
 * undated source, a citation that does not resolve, a template with nothing in
 * it — because those are the shapes that would quietly inflate coverage.
 */

const dated: RequirementSource = {
  id: 'dated',
  authority: 'Example Ministry',
  titleKey: 'x',
  sourceType: 'government',
  lastVerifiedAt: '2026-01-01',
}

const undated: RequirementSource = {
  id: 'undated',
  authority: 'Example Ministry',
  titleKey: 'x',
  sourceType: 'government',
}

function requirement(code: string, sourceRefs?: string[]): DocumentRequirement {
  return {
    code,
    nameKey: 'x',
    category: 'supporting',
    ownerType: 'applicant',
    required: true,
    ...(sourceRefs ? { sourceRefs } : {}),
  }
}

function pack(
  requirements: DocumentRequirement[],
  sources: RequirementSource[] = [dated, undated]
): [CountryConfig, VisaTypeTemplate] {
  const template: VisaTypeTemplate = {
    id: 't',
    visaType: 'short_stay_tourism',
    nameKey: 'x',
    documentRequirements: requirements,
    preparationMilestones: [],
    templateVersion: '1.0.0',
    reviewStatus: 'unverified',
  }
  return [
    {
      countryCode: 'ZZ',
      nameKey: 'x',
      schengenMember: false,
      visaTypes: [template],
      sources,
    },
    template,
  ]
}

describe('verification coverage — what counts as evidence', () => {
  it('counts a requirement citing a dated source', () => {
    expect(
      computeVerificationCoverage(...pack([requirement('A', ['dated'])]))
    ).toEqual({ total: 1, verified: 1, isComplete: true })
  })

  it('does not count a source that carries no verification date', () => {
    // The whole point of `lastVerifiedAt` being optional: a record can exist
    // without anyone having checked it.
    expect(
      computeVerificationCoverage(...pack([requirement('A', ['undated'])]))
    ).toEqual({ total: 1, verified: 0, isComplete: false })
  })

  it('does not count a citation that does not resolve', () => {
    // `getSourcesForRefs` drops unknown ids silently, so a typo must not read
    // as evidence here either.
    expect(
      computeVerificationCoverage(...pack([requirement('A', ['typo'])]))
    ).toEqual({ total: 1, verified: 0, isComplete: false })
  })

  it('counts a requirement once even when it cites several sources', () => {
    expect(
      computeVerificationCoverage(
        ...pack([requirement('A', ['undated', 'dated'])])
      )
    ).toEqual({ total: 1, verified: 1, isComplete: true })
  })

  it('counts optional and conditional requirements in the denominator', () => {
    // Verification describes the pack definition, not one applicant. A
    // requirement that only appears for the self-employed is still a claim.
    const [config, template] = pack([
      requirement('A', ['dated']),
      { ...requirement('B'), required: false },
      {
        ...requirement('C'),
        conditionalOn: {
          field: 'employment.employmentStatus',
          operator: 'equals',
          value: 'student',
        },
      },
    ])
    expect(computeVerificationCoverage(config, template)).toEqual({
      total: 3,
      verified: 1,
      isComplete: false,
    })
  })

  it('treats an empty template as incomplete, not as verified', () => {
    // Vacuous truth would make a pack with no requirements the most verified
    // pack in the registry.
    expect(computeVerificationCoverage(...pack([]))).toEqual({
      total: 0,
      verified: 0,
      isComplete: false,
    })
  })
})

describe('verification coverage — the status it supports', () => {
  it('derives the status from the numbers', () => {
    expect(
      deriveReviewStatus({ total: 3, verified: 0, isComplete: false })
    ).toBe('unverified')
    expect(
      deriveReviewStatus({ total: 3, verified: 1, isComplete: false })
    ).toBe('partially_verified')
    expect(
      deriveReviewStatus({ total: 3, verified: 3, isComplete: true })
    ).toBe('verified')
  })

  it('rejects a verified claim while any requirement is unsourced', () => {
    const coverage = { total: 27, verified: 26, isComplete: false }
    expect(isReviewStatusSupported('verified', coverage)).toBe(false)
    expect(isReviewStatusSupported('partially_verified', coverage)).toBe(true)
  })

  it('rejects a partial claim when there is no evidence at all', () => {
    const coverage = { total: 27, verified: 0, isComplete: false }
    expect(isReviewStatusSupported('partially_verified', coverage)).toBe(false)
  })

  it('rejects a partial claim when the pack is actually complete', () => {
    // Understating is honest; mislabelling is not, and "partially" on a
    // complete pack hides finished work behind a hedge.
    const coverage = { total: 27, verified: 27, isComplete: true }
    expect(isReviewStatusSupported('partially_verified', coverage)).toBe(false)
  })

  it('always allows unverified and needs_review', () => {
    const coverage = { total: 27, verified: 4, isComplete: false }
    expect(isReviewStatusSupported('unverified', coverage)).toBe(true)
    // Staleness is a maintainer's signal, not a coverage claim.
    expect(isReviewStatusSupported('needs_review', coverage)).toBe(true)
  })
})
