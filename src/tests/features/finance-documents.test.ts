import { describe, it, expect } from 'vitest'
import {
  buildFinanceDocuments,
  financeClipboardText,
  financeDocGroup,
} from '@/features/finance/finance-documents'
import { resolveVisaTemplate } from '@/config/countries'
import type { Application } from '@/domain/schemas/application.schema'
import type { Financing } from '@/domain/schemas/application.schema'
import type { Employment } from '@/domain/schemas/employment.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { DocumentCategory } from '@/domain/types/common'

const template = resolveVisaTemplate('GR', 'short_stay_tourism')!

const doc = (partial: Partial<Document>): Document => ({
  id: 'd',
  code: 'X',
  category: 'financial',
  ownerType: 'applicant',
  ownerId: 'a1',
  required: true,
  status: 'not_started',
  verified: false,
  ...partial,
})

const application = (
  financing: Partial<Financing>,
  employment?: Partial<Employment>
): Application => ({
  applicationId: 'app1',
  applicantId: 'a1',
  destinationCountry: 'GR',
  visaType: 'short_stay_tourism',
  status: 'draft',
  createdAt: new Date().toISOString(),
  sponsorIds: [],
  documentIds: [],
  notes: [],
  financing: { currency: 'EUR', ...financing } as Financing,
  ...(employment
    ? { employment: { currency: 'EUR', ...employment } as Employment }
    : {}),
})

describe('financeDocGroup — pure grouping', () => {
  const cases: [string, DocumentCategory, 'applicant' | 'employer', unknown][] =
    [
      ['BANK_STATEMENTS', 'financial', 'applicant', 'bank'],
      ['PAYSLIPS', 'employment', 'applicant', 'income'],
      ['TAX_RETURNS', 'financial', 'applicant', 'income'], // income beats bank by code
      ['SPONSOR_LETTER', 'sponsor', 'sponsor' as 'applicant', 'sponsor'],
      ['RELATIONSHIP_PROOF', 'civil_registry', 'applicant', 'sponsor'],
      ['EMPLOYER_TAX_PLATE', 'employment', 'employer', 'employer'],
      ['PROPERTY_DEED', 'supporting', 'applicant', 'other'],
      ['PASSPORT_CURRENT', 'passport', 'applicant', null],
      ['TRAVEL_INSURANCE', 'insurance', 'applicant', null],
    ]
  it.each(cases)('%s → %s', (code, category, owner, expected) => {
    expect(financeDocGroup(code, category, owner)).toBe(expected)
  })
})

describe('buildFinanceDocuments — finance-only, reused helpers', () => {
  it('groups sponsor + bank evidence and excludes non-finance docs', () => {
    const documents: Document[] = [
      doc({ id: '1', code: 'BANK_STATEMENTS', status: 'ready' }),
      doc({
        id: '2',
        code: 'SPONSOR_LETTER',
        category: 'sponsor',
        ownerType: 'sponsor',
        status: 'not_started',
      }),
      doc({ id: '3', code: 'PASSPORT_CURRENT', category: 'passport' }),
    ]
    const app = application(
      { source: 'sponsor' },
      { employmentStatus: 'employed' }
    )
    const view = buildFinanceDocuments(documents, app, template)

    const bank = view.rows.find((r) => r.code === 'BANK_STATEMENTS')
    expect(bank?.group).toBe('bank')
    expect(bank?.status).toBe('ready')
    expect(bank?.docId).toBe('1')

    const sponsorLetter = view.rows.find((r) => r.code === 'SPONSOR_LETTER')
    expect(sponsorLetter?.group).toBe('sponsor')

    // A required requirement with no instance shows as not_instantiated.
    const sponsorBank = view.rows.find(
      (r) => r.code === 'SPONSOR_BANK_STATEMENTS'
    )
    expect(sponsorBank?.status).toBe('not_instantiated')

    // Passport is never part of the finance view.
    expect(view.rows.some((r) => r.code === 'PASSPORT_CURRENT')).toBe(false)

    // Group order and non-empty only.
    const groupIds = view.groups.map((g) => g.id)
    expect(groupIds).toContain('bank')
    expect(groupIds).toContain('sponsor')
  })

  it('does not surface sponsor docs when source is self', () => {
    const app = application(
      { source: 'self' },
      { employmentStatus: 'employed' }
    )
    const view = buildFinanceDocuments([], app, template)
    expect(view.rows.some((r) => r.group === 'sponsor')).toBe(false)
    // Bank statement is always applicable.
    expect(view.rows.some((r) => r.code === 'BANK_STATEMENTS')).toBe(true)
  })

  it('rolls missing docs into the personal / sponsor / employer gather groups', () => {
    const app = application(
      { source: 'sponsor' },
      { employmentStatus: 'employed' }
    )
    const view = buildFinanceDocuments([], app, template)
    const gatherIds = view.gather.map((g) => g.id)
    // Missing bank + income go under personal; sponsor docs under sponsor.
    expect(gatherIds).toContain('personal')
    expect(gatherIds).toContain('sponsor')
    // Ready docs never appear in gather (nothing is ready here — all missing).
    const sponsorGather = view.gather.find((g) => g.id === 'sponsor')
    expect(sponsorGather?.rows.some((r) => r.code === 'SPONSOR_LETTER')).toBe(
      true
    )
  })
})

describe('financeClipboardText — names only, grouped, privacy-safe', () => {
  const app = application(
    { source: 'sponsor' },
    { employmentStatus: 'employed' }
  )
  const view = buildFinanceDocuments([], app, template)

  it('builds grouped plain text from names only, in the active locale', () => {
    const groups = view.gather.map((g) => ({
      label: `LBL:${g.id}`,
      rows: g.rows,
    }))
    const en = financeClipboardText(groups, 'To gather:', (k) => `EN:${k}`)

    expect(en.startsWith('To gather:')).toBe(true)
    // A group heading appears with a trailing colon.
    expect(en).toContain('LBL:sponsor:')
    // Names are resolved via the injected resolver.
    expect(en).toContain('EN:')
    // Never leaks a dossier value — only labels and resolved names.
    expect(en).not.toContain('Demo')
    expect(en).not.toContain('12000')
  })

  it('produces nothing but the heading when there is nothing to gather', () => {
    expect(financeClipboardText([], 'Heading', (k) => k)).toBe('Heading')
  })
})
