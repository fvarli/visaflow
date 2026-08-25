import { describe, it, expect } from 'vitest'
import { buildSponsorsModel } from '@/features/sponsors/sponsor-model'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'

const APPLICANT: Applicant = {
  id: 'a1',
  firstName: 'Ada',
  lastName: 'Traveller',
  dateOfBirth: '1990-01-01',
  nationality: 'TR',
  passport: {
    number: 'X1',
    issueDate: '2020-01-01',
    expiryDate: '2035-01-01',
    issuingCountry: 'TR',
    passportType: 'ordinary',
  },
  previousPassports: [],
  previousVisas: [],
  previousRefusals: [],
  travelHistory: [],
}

const LETTER: Document = {
  id: 'l1',
  code: 'SPONSOR_LETTER',
  category: 'sponsor',
  ownerType: 'sponsor',
  ownerId: 's1',
  required: true,
  status: 'ready',
  verified: true,
}

const sponsor = (partial: Partial<Sponsor>): Sponsor => ({
  id: 's1',
  relationship: 'friend',
  firstName: 'Bora',
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

const application = (source: 'self' | 'sponsor'): Application => ({
  applicationId: 'app1',
  applicantId: 'a1',
  destinationCountry: 'GR',
  visaType: 'short_stay_tourism',
  status: 'draft',
  createdAt: new Date().toISOString(),
  sponsorIds: [],
  documentIds: [],
  notes: [],
  financing: { source, currency: 'EUR' },
})

const build = (
  sponsors: Sponsor[],
  source: 'self' | 'sponsor' = 'self',
  documents: Document[] = [LETTER]
) =>
  buildSponsorsModel({
    applicant: APPLICANT,
    application: application(source),
    documents,
    sponsors,
  })

describe('buildSponsorsModel — readiness', () => {
  it('is ready when a non-family sponsor has finance info and a linked document', () => {
    const model = build([sponsor({ monthlyIncome: 5000, documentIds: ['l1'] })])
    const card = model.sponsors[0]!
    expect(card.findings).toHaveLength(0)
    expect(card.readiness).toBe('ready')
  })

  it('resolves the sponsor.hasDocuments finding once a document is linked', () => {
    const noDocs = build([sponsor({ monthlyIncome: 5000, documentIds: [] })])
    expect(noDocs.sponsors[0]!.findings.map((f) => f.ruleId)).toContain(
      'sponsor.hasDocuments'
    )
    expect(noDocs.sponsors[0]!.readiness).toBe('needsAttention')

    // Same sponsor, now with the document linked — the finding is gone.
    const linked = build([
      sponsor({ monthlyIncome: 5000, documentIds: ['l1'] }),
    ])
    expect(linked.sponsors[0]!.findings.map((f) => f.ruleId)).not.toContain(
      'sponsor.hasDocuments'
    )
  })

  it('is incomplete for a bare sponsor with nothing recorded', () => {
    const model = build([sponsor({})])
    expect(model.sponsors[0]!.readiness).toBe('incomplete')
  })

  it('needs attention for a family sponsor missing proof of relationship', () => {
    const model = build([sponsor({ relationship: 'parent' })])
    const card = model.sponsors[0]!
    expect(card.findings.map((f) => f.ruleId)).toContain(
      'sponsor.relationshipProof'
    )
    expect(card.readiness).toBe('needsAttention')
  })
})

describe('buildSponsorsModel — missing evidence and next action', () => {
  it('enumerates the missing evidence reasons', () => {
    const model = build([sponsor({})])
    const ids = model.sponsors[0]!.missing.map((m) => m.id)
    expect(ids).toContain('financeInfo')
    expect(ids).toContain('sponsorshipLetter')
    expect(ids).toContain('noLinkedDocuments')
    // A friend is not family → no relationship-proof reason.
    expect(ids).not.toContain('relationshipProof')
  })

  it('flags stale document links as needing attention', () => {
    const model = build([sponsor({ documentIds: ['ghost'] })])
    const card = model.sponsors[0]!
    expect(card.hasStale).toBe(true)
    expect(card.readiness).toBe('needsAttention')
    expect(card.nextAction?.id).toBe('reviewStale')
  })
})

describe('buildSponsorsModel — funding context', () => {
  it('flags sponsor funding selected with no sponsor', () => {
    const model = build([], 'sponsor')
    expect(model.needsSponsorButNone).toBe(true)
    expect(model.fundingApplies).toBe(true)
    expect(model.count).toBe(0)
  })

  it('does not nudge when funding is self-based', () => {
    const model = build([], 'self')
    expect(model.needsSponsorButNone).toBe(false)
  })

  it('supports multiple sponsors independently', () => {
    const model = build([
      sponsor({ id: 's1', monthlyIncome: 5000, documentIds: ['l1'] }),
      sponsor({ id: 's2', relationship: 'parent' }),
    ])
    expect(model.count).toBe(2)
    expect(model.sponsors[0]!.readiness).toBe('ready')
    expect(model.sponsors[1]!.readiness).toBe('needsAttention')
  })
})
