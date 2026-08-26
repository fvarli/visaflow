import type { Application } from '@/domain/schemas/application.schema'
import type { FinanceDocumentsView } from '@/features/finance/finance-documents'
import {
  personalApplies,
  employerApplies,
} from '@/features/finance/finance-wizard'

/**
 * Factual, calm consistency observations for the finance flow.
 *
 * These describe **relationships between sections** the applicant has already
 * filled in — never a judgement. Anything that is a validation rule
 * (sponsor-funded but no sponsor, a sponsor without documents, …) is surfaced by
 * the model straight from `runValidation` findings and is NOT re-derived here.
 * This module adds only *net-new factual* notes that no rule expresses, and it
 * never mentions a threshold, a minimum balance, a "strength" score, or an
 * approval outcome (ADR-016).
 */

export type ConsistencyTone = 'ok' | 'attention' | 'neutral'

export interface ConsistencyObservation {
  /** Stable id — the i18n suffix (`finance:consistency.<id>`). */
  id: string
  tone: ConsistencyTone
  messageKey: string
  params?: Record<string, string | number>
}

export interface ConsistencyInput {
  application: Application | null
  documents: FinanceDocumentsView
}

/**
 * Does the declared split add up to the declared budget?
 *
 * Deliberately the *only* arithmetic in this module, and deliberately not a
 * judgement. It compares two numbers the applicant typed against each other —
 * it never looks at `accountBalance`, never names a minimum, and never says a
 * trip is affordable. "Your parts add up to 1 800 of a 2 000 budget" is a
 * proof-reading service; "you do not have enough money" is a prediction, and
 * VisaFlow does not make those (ADR-016, ADR-044).
 *
 * Returns `null` when the question does not arise: no budget, or no amounts.
 * A silent observation is better than one that fires on an empty form.
 */
function budgetSplit(application: Application | null): {
  declared: number
  budget: number
  currency: string | null
} | null {
  const budget = application?.trip?.estimatedBudget
  const self = application?.financing?.selfFundedAmount
  const sponsored = application?.financing?.sponsoredAmount
  if (budget === undefined || budget <= 0) return null
  if (self === undefined && sponsored === undefined) return null

  // Currencies must match to be comparable at all. VisaFlow holds no rates and
  // will not invent one.
  const budgetCurrency = application?.trip?.budgetCurrency
  const fundingCurrency = application?.financing?.currency
  if (budgetCurrency && fundingCurrency && budgetCurrency !== fundingCurrency) {
    return null
  }

  return {
    declared: (self ?? 0) + (sponsored ?? 0),
    budget,
    currency: budgetCurrency ?? fundingCurrency ?? null,
  }
}

function bankStatementReady(documents: FinanceDocumentsView): boolean {
  const bank = documents.rows.find((r) => r.code === 'BANK_STATEMENTS')
  return bank ? bank.status === 'ready' || bank.status === 'received' : false
}

function bankStatementApplicable(documents: FinanceDocumentsView): boolean {
  return documents.rows.some((r) => r.code === 'BANK_STATEMENTS')
}

/**
 * Derive the factual observations for the current funding situation. Order is
 * stable; each observation appears at most once.
 */
export function deriveConsistency(
  input: ConsistencyInput
): ConsistencyObservation[] {
  const { application, documents } = input
  const financing = application?.financing
  const source = financing?.source
  if (!source) return []

  const observations: ConsistencyObservation[] = []
  const employment = application?.employment
  const hasEmploymentIncome = employment?.monthlyNetIncome != null

  if (personalApplies(source)) {
    if (hasEmploymentIncome) {
      observations.push({
        id: 'employmentIncomeSupports',
        tone: 'ok',
        messageKey: 'finance:consistency.employmentIncomeSupports',
      })
    } else {
      observations.push({
        id: 'noEmploymentIncomeOnRecord',
        tone: 'neutral',
        messageKey: 'finance:consistency.noEmploymentIncomeOnRecord',
      })
    }

    if (bankStatementApplicable(documents) && !bankStatementReady(documents)) {
      observations.push({
        id: 'bankStatementPending',
        tone: 'attention',
        messageKey: 'finance:consistency.bankStatementPending',
      })
    }
  }

  if (source === 'mixed') {
    observations.push({
      id: 'mixedWhoCovers',
      tone: 'neutral',
      messageKey: 'finance:consistency.mixedWhoCovers',
    })
  }

  // The split against the budget. Guidance, never a gate: nothing here reaches
  // readiness, and both outcomes are stated as arithmetic rather than verdict.
  const split = budgetSplit(application)
  if (split) {
    const matches = split.declared === split.budget
    observations.push({
      id: matches
        ? 'fundingSplitMatchesBudget'
        : 'fundingSplitDiffersFromBudget',
      tone: matches ? 'ok' : 'attention',
      messageKey: matches
        ? 'finance:consistency.fundingSplitMatchesBudget'
        : 'finance:consistency.fundingSplitDiffersFromBudget',
      // Raw numbers plus a currency code: this module holds no Intl, so the
      // UI formats them at the boundary like every other value (ADR-023).
      params: {
        declared: split.declared,
        budget: split.budget,
        currency: split.currency ?? '',
      },
    })
  }

  if (employerApplies(source)) {
    observations.push({
      id: 'employerCovers',
      tone: 'neutral',
      messageKey: 'finance:consistency.employerCovers',
    })
  }

  return observations
}
