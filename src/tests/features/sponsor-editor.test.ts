import { describe, it, expect } from 'vitest'
import {
  SPONSOR_SECTION_IDS,
  isSectionComplete,
  isFamilyRelationship,
  firstIncompleteSection,
} from '@/features/sponsors/sponsor-editor'
import type { SponsorDocumentsView } from '@/features/sponsors/sponsor-documents'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'

const EMPTY_DOCS: SponsorDocumentsView = {
  linked: [],
  eligibleUnlinked: [],
  stale: [],
  missingRequirements: [],
  linkedCount: 0,
}

const sponsor = (partial: Partial<Sponsor>): Sponsor => ({
  id: 's1',
  relationship: 'parent',
  firstName: 'Ada',
  lastName: 'Sponsor',
  currency: 'EUR',
  investments: [],
  ownedAssets: [],
  coveredExpenses: [],
  sponsorshipLetter: false,
  proofOfRelationship: false,
  documentIds: [],
  ...partial,
})

describe('sponsor-editor — sections', () => {
  it('has nine sections, review last', () => {
    expect(SPONSOR_SECTION_IDS).toHaveLength(9)
    expect(SPONSOR_SECTION_IDS[SPONSOR_SECTION_IDS.length - 1]).toBe('review')
  })

  it('identifies family relationships (mirrors the proof-of-relationship rule)', () => {
    expect(isFamilyRelationship('parent')).toBe(true)
    expect(isFamilyRelationship('spouse')).toBe(true)
    expect(isFamilyRelationship('friend')).toBe(false)
    expect(isFamilyRelationship('employer')).toBe(false)
  })

  it('marks basics complete once name and relationship are present', () => {
    expect(isSectionComplete(sponsor({}), EMPTY_DOCS, 'basics')).toBe(true)
    expect(
      isSectionComplete(sponsor({ firstName: '' }), EMPTY_DOCS, 'basics')
    ).toBe(false)
  })

  it('marks optional sections complete only when they carry data', () => {
    expect(isSectionComplete(sponsor({}), EMPTY_DOCS, 'contact')).toBe(false)
    expect(
      isSectionComplete(sponsor({ email: 'x@y.z' }), EMPTY_DOCS, 'contact')
    ).toBe(true)
    expect(isSectionComplete(sponsor({}), EMPTY_DOCS, 'financial')).toBe(false)
    expect(
      isSectionComplete(
        sponsor({ monthlyIncome: 100 }),
        EMPTY_DOCS,
        'financial'
      )
    ).toBe(true)
  })

  it('marks documents complete only when linked and nothing applicable is missing', () => {
    expect(isSectionComplete(sponsor({}), EMPTY_DOCS, 'documents')).toBe(false)
    const linked: SponsorDocumentsView = {
      ...EMPTY_DOCS,
      linkedCount: 1,
    }
    expect(isSectionComplete(sponsor({}), linked, 'documents')).toBe(true)
    const linkedButMissing: SponsorDocumentsView = {
      ...EMPTY_DOCS,
      linkedCount: 1,
      missingRequirements: [
        { code: 'SPONSOR_INCOME_PROOF', nameKey: 'x', required: true },
      ],
    }
    expect(isSectionComplete(sponsor({}), linkedButMissing, 'documents')).toBe(
      false
    )
  })

  it('opens the first incomplete section, or review when all are settled', () => {
    // Bare sponsor: basics complete, contact is the first gap.
    expect(firstIncompleteSection(sponsor({}), EMPTY_DOCS)).toBe('contact')
    // Everything filled → review.
    const full = sponsor({
      email: 'x@y.z',
      employmentStatus: 'employed',
      monthlyIncome: 100,
      investments: [{ type: 'stocks', value: 1, currency: 'EUR' }],
      coveredExpenses: ['all'],
      sponsorshipLetter: true,
    })
    const fullDocs: SponsorDocumentsView = { ...EMPTY_DOCS, linkedCount: 1 }
    expect(firstIncompleteSection(full, fullDocs)).toBe('review')
  })
})
