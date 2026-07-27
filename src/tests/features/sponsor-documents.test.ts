import { describe, it, expect } from 'vitest'
import {
  buildSponsorDocuments,
  isSponsorEvidence,
} from '@/features/sponsors/sponsor-documents'
import { resolveVisaTemplate } from '@/config/countries'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'

const template = resolveVisaTemplate('GR', 'short_stay_tourism')!

const doc = (partial: Partial<Document>): Document => ({
  id: 'd',
  code: 'X',
  category: 'sponsor',
  ownerType: 'sponsor',
  ownerId: 'owner',
  required: true,
  status: 'not_started',
  verified: false,
  ...partial,
})

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

describe('isSponsorEvidence — eligibility', () => {
  it('accepts the sponsor category and the classified relationship-proof code', () => {
    expect(isSponsorEvidence('SPONSOR_LETTER', 'sponsor')).toBe(true)
    expect(isSponsorEvidence('RELATIONSHIP_PROOF', 'civil_registry')).toBe(true)
  })
  it('rejects arbitrary passport / employment / trip documents', () => {
    expect(isSponsorEvidence('PASSPORT_CURRENT', 'passport')).toBe(false)
    expect(isSponsorEvidence('PAYSLIPS', 'employment')).toBe(false)
    expect(isSponsorEvidence('BANK_STATEMENTS', 'financial')).toBe(false)
  })
})

describe('buildSponsorDocuments — associations', () => {
  const letter = doc({ id: 'l1', code: 'SPONSOR_LETTER', status: 'requested' })
  const bank = doc({ id: 'b1', code: 'SPONSOR_BANK_STATEMENTS' })
  const passport = doc({
    id: 'p1',
    code: 'PASSPORT_CURRENT',
    category: 'passport',
    ownerType: 'applicant',
  })
  const documents = [letter, bank, passport]

  it('resolves a linked eligible document', () => {
    const view = buildSponsorDocuments(
      sponsor({ documentIds: ['l1'] }),
      documents,
      application('sponsor'),
      template
    )
    expect(view.linked.map((r) => r.docId)).toEqual(['l1'])
    expect(view.linkedCount).toBe(1)
    // The other eligible sponsor doc is offered for linking.
    expect(view.eligibleUnlinked.map((r) => r.code)).toContain(
      'SPONSOR_BANK_STATEMENTS'
    )
    // The passport is never eligible.
    expect(
      [...view.linked, ...view.eligibleUnlinked].some(
        (r) => r.code === 'PASSPORT_CURRENT'
      )
    ).toBe(false)
  })

  it('surfaces an unknown id as a stale link, never crashing', () => {
    const view = buildSponsorDocuments(
      sponsor({ documentIds: ['ghost', 'l1'] }),
      documents,
      application('sponsor'),
      template
    )
    expect(view.stale).toEqual(['ghost'])
    expect(view.linked.map((r) => r.docId)).toEqual(['l1'])
  })

  it('treats a link to an ineligible document as stale', () => {
    const view = buildSponsorDocuments(
      sponsor({ documentIds: ['p1'] }),
      documents,
      application('sponsor'),
      template
    )
    expect(view.stale).toEqual(['p1'])
    expect(view.linkedCount).toBe(0)
  })

  it('reports required sponsor requirements with no instance as missing', () => {
    // Only the letter exists; income proof requirement has no instance.
    const view = buildSponsorDocuments(
      sponsor({ documentIds: ['l1'] }),
      [letter],
      application('sponsor'),
      template
    )
    const missing = view.missingRequirements.map((r) => r.code)
    expect(missing).toContain('SPONSOR_INCOME_PROOF')
    // The letter exists, so it is not "missing".
    expect(missing).not.toContain('SPONSOR_LETTER')
  })

  it('does not flag missing requirements when funding is not sponsor-based', () => {
    const view = buildSponsorDocuments(
      sponsor({}),
      [],
      application('self'),
      template
    )
    expect(view.missingRequirements).toEqual([])
  })

  it('allows the same document to be linked to more than one sponsor', () => {
    const a = buildSponsorDocuments(
      sponsor({ id: 's1', documentIds: ['l1'] }),
      documents,
      application('sponsor'),
      template
    )
    const b = buildSponsorDocuments(
      sponsor({ id: 's2', documentIds: ['l1'] }),
      documents,
      application('sponsor'),
      template
    )
    expect(a.linked.map((r) => r.docId)).toEqual(['l1'])
    expect(b.linked.map((r) => r.docId)).toEqual(['l1'])
  })

  it('keeps an imported documentIds list valid and readable', () => {
    const view = buildSponsorDocuments(
      sponsor({ documentIds: ['l1', 'b1'] }),
      documents,
      application('sponsor'),
      template
    )
    expect(view.linkedCount).toBe(2)
    expect(view.stale).toEqual([])
  })
})
