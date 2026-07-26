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

  if (employerApplies(source)) {
    observations.push({
      id: 'employerCovers',
      tone: 'neutral',
      messageKey: 'finance:consistency.employerCovers',
    })
  }

  return observations
}
