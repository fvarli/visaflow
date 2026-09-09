import type { Document } from '@/domain/schemas/document.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { VisaTypeTemplate } from '@/config/types'
import { resolveDocumentSemantics } from '@/features/documents/document-semantics'
import type { DocumentStatus } from '@/domain/types/common'
import {
  READINESS_CLASS,
  type DocumentReadiness,
  type ReadinessClass,
} from './readiness-types'
import { groupedCodes } from './satisfaction-groups'
import { resolveObligations } from './obligations'

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
   * The resolved template, so requiredness and applicability come from the
   * pack as it stands today rather than from the copy frozen into each record
   * when it was seeded (ADR-049).
   *
   * Optional only so the documents filter — which deliberately counts every
   * record regardless of the template — can keep its existing behaviour.
   * Production surfaces that report readiness must pass it.
   */
  template?: VisaTypeTemplate
  /** Needed to evaluate applicability; without it every known code applies. */
  application?: Application | null
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
  historical: 0,
  percent: 0,
  outstanding: 0,
  complete: false,
  hasApplicableWork: false,
}

export function buildDocumentReadiness(
  input: ReadinessInput
): DocumentReadiness {
  const {
    documents,
    requiredRequirementCodes = [],
    template,
    application,
  } = input

  const counts: Record<ReadinessClass, number> = {
    ready: 0,
    obtained: 0,
    inProgress: 0,
    notStarted: 0,
    needsUpdate: 0,
    notApplicable: 0,
  }

  let optional = 0
  let historical = 0
  const grouped = groupedCodes(template)

  /**
   * The obligations this dossier owes, resolved once (`resolveObligations`).
   *
   * This loop used to compute them inline, and the Documents category caption
   * grew a second implementation that counted required *requirements* — so the
   * caption read "1/4" under a hero reading "1 of 11" for an obligation the
   * authority states as one-of-two. One list, every consumer.
   */
  for (const obligation of resolveObligations({
    documents,
    requiredRequirementCodes,
    template,
    application,
  })) {
    counts[obligation.status] += 1
  }

  /**
   * The two axes that are not obligations, and are therefore still counted here.
   *
   * `historical` is a retired record — real work somebody did, for a
   * requirement nobody asks for now. `optional` is a requirement the pack does
   * not require, or a custom document the applicant added themselves. Neither
   * is work this dossier owes, so neither may reach the percentage; both are
   * still worth showing.
   */
  for (const doc of documents) {
    const semantics = resolveDocumentSemantics(doc, template, application)

    if (semantics.membership === 'retired') {
      historical += 1
      continue
    }
    if (template) {
      if (semantics.membership === 'unknown') continue
      if (semantics.membership === 'custom') {
        // `required` defaults to `true` on import, so this must not be
        // conditional on the stored flag.
        optional += 1
        continue
      }
    }
    if (!semantics.isApplicable) continue
    // A grouped member is not "optional" either — its group carries the
    // obligation, and calling it optional would put it in a bucket the
    // applicant reads as "nice to have".
    if (!semantics.required && !grouped.has(doc.code)) optional += 1
  }

  const applicable =
    counts.ready +
    counts.obtained +
    counts.inProgress +
    counts.notStarted +
    counts.needsUpdate

  if (applicable === 0 && counts.notApplicable === 0) {
    return { ...EMPTY, optional, historical }
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
    historical,
    percent: applicable > 0 ? Math.round((counts.ready / applicable) * 100) : 0,
    outstanding: applicable - counts.ready,
    complete: applicable > 0 && counts.ready === applicable,
    hasApplicableWork: applicable > 0,
  }
}
