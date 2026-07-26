import { describe, it, expect } from 'vitest'
import { buildFinanceModel } from '@/features/finance/finance-model'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Financing } from '@/domain/schemas/application.schema'
import type { Employment } from '@/domain/schemas/employment.schema'
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
  travelHistory: [],
}

const sponsor = (partial: Partial<Sponsor>): Sponsor => ({
  id: 's1',
  relationship: 'parent',
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

const build = (
  financing: Partial<Financing>,
  opts: { employment?: Partial<Employment>; sponsors?: Sponsor[] } = {}
) =>
  buildFinanceModel({
    applicant: APPLICANT,
    application: application(financing, opts.employment),
    documents: [],
    sponsors: opts.sponsors ?? [],
  })

const status = (model: ReturnType<typeof buildFinanceModel>, id: string) =>
  model.review.find((s) => s.id === id)?.status

describe('buildFinanceModel — self funding', () => {
  const model = build(
    { source: 'self', bankName: 'Demo Bank' },
    { employment: { employmentStatus: 'employed', monthlyNetIncome: 4200 } }
  )

  it('marks sponsors not-applicable and personal applicable', () => {
    expect(model.sponsors.applicable).toBe(false)
    expect(model.personal.applicable).toBe(true)
    expect(status(model, 'sponsors')).toBe('notApplicable')
    expect(status(model, 'personal')).toBe('captured')
  })

  it('reads employment income without copying it', () => {
    expect(model.income.hasEmployment).toBe(true)
    expect(model.income.monthlyNetIncome).toBe(4200)
    expect(model.income.status).toBe('employed')
  })

  it('produces no money findings', () => {
    expect(model.findings).toHaveLength(0)
  })
})

describe('buildFinanceModel — sponsor funding', () => {
  it('surfaces the funding-strategy finding when no sponsor exists', () => {
    const model = build({ source: 'sponsor' })
    expect(model.sponsors.hasNone).toBe(true)
    expect(model.consistency.findings.map((f) => f.id)).toContain(
      'sponsored-no-sponsor'
    )
    expect(status(model, 'sponsors')).toBe('needsReview')
  })

  it('attaches per-sponsor findings to the sponsor, not the consistency list', () => {
    const model = build(
      { source: 'sponsor' },
      { sponsors: [sponsor({ id: 's1', monthlyIncome: 5000 })] }
    )
    const s = model.sponsors.list[0]!
    expect(s.findings.map((f) => f.ruleId)).toContain('sponsor.hasDocuments')
    // Per-sponsor findings never appear as dossier-level consistency findings.
    expect(model.consistency.findings.some((f) => f.id.includes('s1'))).toBe(
      false
    )
  })
})

describe('buildFinanceModel — employer funding', () => {
  const model = build({ source: 'employer' })

  it('marks personal and sponsors not-applicable', () => {
    expect(status(model, 'personal')).toBe('notApplicable')
    expect(status(model, 'sponsors')).toBe('notApplicable')
  })

  it('adds the employer-covers observation', () => {
    expect(model.consistency.observations.map((o) => o.id)).toContain(
      'employerCovers'
    )
  })
})

describe('buildFinanceModel — imported employer dossier stays editable', () => {
  it('keeps the source and remains a full model', () => {
    // Simulates an imported dossier whose source is the fourth enum value.
    const model = build({ source: 'employer', bankName: 'Legacy Bank' })
    expect(model.source).toBe('employer')
    // Data entered under a previous source is never dropped by the model.
    expect(model.personal.bankName).toBe('Legacy Bank')
    expect(model.hasData).toBe(true)
  })
})
