import { describe, it, expect } from 'vitest'
import { deriveConsistency } from '@/features/finance/finance-consistency'
import { buildFinanceDocuments } from '@/features/finance/finance-documents'
import { resolveVisaTemplate } from '@/config/countries'
import type { Application } from '@/domain/schemas/application.schema'
import type { Financing } from '@/domain/schemas/application.schema'
import type { Employment } from '@/domain/schemas/employment.schema'
import type { Document } from '@/domain/schemas/document.schema'

const template = resolveVisaTemplate('GR', 'short_stay_tourism')!

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

const docsFor = (app: Application, documents: Document[] = []) =>
  buildFinanceDocuments(documents, app, template)

const ids = (app: Application, documents: Document[] = []) =>
  deriveConsistency({
    application: app,
    documents: docsFor(app, documents),
  }).map((o) => o.id)

describe('deriveConsistency — factual, calm, non-predictive', () => {
  it('returns nothing without a source', () => {
    const app = application({}) // currency default only, no source
    // Force source undefined for this case.
    app.financing = undefined
    expect(
      deriveConsistency({ application: app, documents: docsFor(app) })
    ).toEqual([])
  })

  it('notes employment income supports self-funding', () => {
    const app = application(
      { source: 'self' },
      { employmentStatus: 'employed', monthlyNetIncome: 4000 }
    )
    expect(ids(app)).toContain('employmentIncomeSupports')
  })

  it('notes when no employment income is on record for self-funding', () => {
    const app = application({ source: 'self' })
    expect(ids(app)).toContain('noEmploymentIncomeOnRecord')
  })

  it('flags a pending bank statement for self-funding', () => {
    const app = application({ source: 'self' })
    // No instances → BANK_STATEMENTS is applicable but not ready.
    expect(ids(app)).toContain('bankStatementPending')
  })

  it('does not flag a pending bank statement once it is ready', () => {
    const app = application({ source: 'self' })
    const ready: Document = {
      id: 'b',
      code: 'BANK_STATEMENTS',
      category: 'financial',
      ownerType: 'applicant',
      ownerId: 'a1',
      required: true,
      status: 'ready',
      verified: true,
    }
    expect(ids(app, [ready])).not.toContain('bankStatementPending')
  })

  it('reminds who covers what for mixed funding', () => {
    const app = application({ source: 'mixed' })
    expect(ids(app)).toContain('mixedWhoCovers')
  })

  it('notes employer coverage for employer funding and skips personal notes', () => {
    const app = application({ source: 'employer' })
    const result = ids(app)
    expect(result).toContain('employerCovers')
    expect(result).not.toContain('bankStatementPending')
    expect(result).not.toContain('employmentIncomeSupports')
  })

  it('never carries a numeric amount or threshold in its params', () => {
    const app = application(
      { source: 'mixed', accountBalance: 99999 },
      { employmentStatus: 'employed', monthlyNetIncome: 4000 }
    )
    const observations = deriveConsistency({
      application: app,
      documents: docsFor(app),
    })
    for (const o of observations) {
      expect(o.params ?? {}).toEqual({})
    }
  })
})
