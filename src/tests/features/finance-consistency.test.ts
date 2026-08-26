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
  employment?: Partial<Employment>,
  trip?: { estimatedBudget?: number; budgetCurrency?: string }
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
  ...(trip
    ? {
        trip: {
          entryDate: '2027-04-01',
          exitDate: '2027-04-10',
          firstEntryCountry: 'GR',
          mainDestinationCountry: 'GR',
          route: [],
          transportReservations: [],
          accommodationReservations: [],
          budgetCurrency: 'EUR',
          ...trip,
        } as Application['trip'],
      }
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

describe('the funding split against the trip budget', () => {
  const split = (
    financing: Partial<Financing>,
    trip?: { estimatedBudget?: number; budgetCurrency?: string }
  ) => ids(application(financing, undefined, trip))

  it('says so when the parts add up', () => {
    expect(
      split(
        { source: 'mixed', selfFundedAmount: 1200, sponsoredAmount: 800 },
        { estimatedBudget: 2000 }
      )
    ).toContain('fundingSplitMatchesBudget')
  })

  it('states the difference without calling either number wrong', () => {
    const result = deriveConsistency({
      application: application(
        { source: 'mixed', selfFundedAmount: 1200, sponsoredAmount: 500 },
        undefined,
        { estimatedBudget: 2000 }
      ),
      documents: docsFor(
        application({ source: 'mixed' }, undefined, { estimatedBudget: 2000 })
      ),
    })
    const observation = result.find(
      (o) => o.id === 'fundingSplitDiffersFromBudget'
    )
    expect(observation).toBeDefined()
    // Guidance, not a gate: the strongest tone available is `attention`.
    expect(observation?.tone).toBe('attention')
    expect(observation?.params).toEqual({
      declared: 1700,
      budget: 2000,
      currency: 'EUR',
    })
  })

  it('counts a single declared amount rather than demanding both', () => {
    expect(
      split(
        { source: 'self', selfFundedAmount: 2000 },
        { estimatedBudget: 2000 }
      )
    ).toContain('fundingSplitMatchesBudget')
  })

  it('stays silent when there is no budget to compare against', () => {
    const result = split({ source: 'self', selfFundedAmount: 2000 })
    expect(result).not.toContain('fundingSplitMatchesBudget')
    expect(result).not.toContain('fundingSplitDiffersFromBudget')
  })

  it('stays silent when no amount has been declared', () => {
    const result = split({ source: 'self' }, { estimatedBudget: 2000 })
    expect(result).not.toContain('fundingSplitMatchesBudget')
    expect(result).not.toContain('fundingSplitDiffersFromBudget')
  })

  it('refuses to compare across currencies rather than inventing a rate', () => {
    const result = split(
      { source: 'self', selfFundedAmount: 2000, currency: 'USD' },
      { estimatedBudget: 2000, budgetCurrency: 'EUR' }
    )
    expect(result).not.toContain('fundingSplitMatchesBudget')
    expect(result).not.toContain('fundingSplitDiffersFromBudget')
  })

  it('never mentions the account balance', () => {
    // The whole point of the boundary: this compares two declared intentions,
    // never funds against cost, which would be a sufficiency verdict (ADR-016).
    const observations = deriveConsistency({
      application: application(
        {
          source: 'self',
          selfFundedAmount: 100,
          accountBalance: 1_000_000,
        },
        undefined,
        { estimatedBudget: 2000 }
      ),
      documents: docsFor(application({ source: 'self' })),
    })
    const differs = observations.find(
      (o) => o.id === 'fundingSplitDiffersFromBudget'
    )
    expect(differs?.params).toEqual({
      declared: 100,
      budget: 2000,
      currency: 'EUR',
    })
    expect(JSON.stringify(observations)).not.toContain('1000000')
  })
})
