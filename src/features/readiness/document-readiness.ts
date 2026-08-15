import type { Document } from '@/domain/schemas/document.schema'
import type { DocumentStatus } from '@/domain/types/common'
import {
  READINESS_CLASS,
  type DocumentReadiness,
  type ReadinessClass,
} from './readiness-types'

/**
 * The canonical document-readiness derivation — the single place VisaFlow
 * decides how prepared a dossier is.
 *
 * Before this module the product computed the same idea six different ways and
 * could show 45% and 36% for one dossier on the same screen. The definition
 * here is deliberately narrow and explainable (ADR-033):
 *
 *   numerator   = applicable required documents with status `ready`
 *   denominator = required documents that apply (status !== 'not_applicable')
 *
 * `not_applicable` leaves **both** sides, so marking a requirement irrelevant
 * never moves the percentage — it neither inflates it (as the old dashboard
 * buckets did, counting N/A as completed work) nor deflates it (as the old
 * five-bucket model did, keeping N/A in the denominator where it could never be
 * satisfied, making 100% unreachable).
 *
 * Pure: no React, no i18n, no Intl, no config layer. Validation findings never
 * enter this file — readiness is document preparation, consistency health is a
 * separate signal, and blending them would produce exactly the "mysterious
 * weighted score" the product forbids.
 */

export function classifyStatus(status: DocumentStatus): ReadinessClass {
  return READINESS_CLASS[status]
}

/** Confirmed ready for the dossier — the only status in the numerator. */
export function isDossierReady(status: DocumentStatus): boolean {
  return status === 'ready'
}

/**
 * Physically in hand — `received` **or** `ready`.
 *
 * This is a different question from `isDossierReady`, and the difference is
 * load-bearing: a preparation task like "obtain the bank statement" is finished
 * once the document is `received`, while the dossier is only *ready* when the
 * applicant has confirmed it. Both are true at once and neither is a bug.
 */
export function isObtained(status: DocumentStatus): boolean {
  return status === 'received' || status === 'ready'
}

/** Counts toward the denominator — everything except an explicit opt-out. */
export function isApplicable(status: DocumentStatus): boolean {
  return status !== 'not_applicable'
}

export interface ReadinessInput {
  documents: Document[]
  /**
   * Codes of the applicable **required** template requirements for this
   * application (see `requirement-readiness.ts`).
   *
   * Any of these without a document record counts as work not started: a
   * dossier begins with `documents: []` and is only seeded when the applicant
   * opens the Documents workspace, so without this readiness would report 100%
   * for a dossier that has collected nothing. Codes that already have a record
   * are ignored, so passing the full list is safe. Optional requirements are
   * deliberately excluded.
   */
  requiredRequirementCodes?: string[]
}

const EMPTY: DocumentReadiness = {
  requiredTotal: 0,
  applicable: 0,
  notApplicable: 0,
  ready: 0,
  obtained: 0,
  inProgress: 0,
  notStarted: 0,
  needsUpdate: 0,
  optional: 0,
  percent: 0,
  outstanding: 0,
  complete: false,
  hasApplicableWork: false,
}

export function buildDocumentReadiness(
  input: ReadinessInput
): DocumentReadiness {
  const { documents, requiredRequirementCodes = [] } = input

  const counts: Record<ReadinessClass, number> = {
    ready: 0,
    obtained: 0,
    inProgress: 0,
    notStarted: 0,
    needsUpdate: 0,
    notApplicable: 0,
  }

  let optional = 0
  const present = new Set<string>()

  for (const doc of documents) {
    present.add(doc.code)
    if (!doc.required) {
      optional += 1
      continue
    }
    counts[classifyStatus(doc.status)] += 1
  }

  // A requirement with no record at all is work that has not been started.
  for (const code of requiredRequirementCodes) {
    if (present.has(code)) continue
    counts.notStarted += 1
  }

  const applicable =
    counts.ready +
    counts.obtained +
    counts.inProgress +
    counts.notStarted +
    counts.needsUpdate

  if (applicable === 0 && counts.notApplicable === 0) {
    return { ...EMPTY, optional }
  }

  return {
    requiredTotal: applicable + counts.notApplicable,
    applicable,
    notApplicable: counts.notApplicable,
    ready: counts.ready,
    obtained: counts.obtained,
    inProgress: counts.inProgress,
    notStarted: counts.notStarted,
    needsUpdate: counts.needsUpdate,
    optional,
    percent: applicable > 0 ? Math.round((counts.ready / applicable) * 100) : 0,
    outstanding: applicable - counts.ready,
    complete: applicable > 0 && counts.ready === applicable,
    hasApplicableWork: applicable > 0,
  }
}
