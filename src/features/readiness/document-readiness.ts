import type { Document } from '@/domain/schemas/document.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { VisaTypeTemplate } from '@/config/types'
import {
  resolveDocumentSemantics,
  effectiveStatus,
} from '@/features/documents/document-semantics'
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
  const present = new Set<string>()

  for (const doc of documents) {
    present.add(doc.code)
    const semantics = resolveDocumentSemantics(doc, template, application)

    /**
     * Only an active requirement is current work (ADR-050).
     *
     * Persisted `required` is not authority for a code the template no longer
     * lists. Trusting it is how a withdrawn obligation ended up in both the
     * numerator and the denominator, raising the percentage because the
     * applicant had once collected something nobody asks for now.
     */
    // Retirement is a registry fact, true with or without a template.
    if (semantics.membership === 'retired') {
      historical += 1
      continue
    }

    /**
     * Activeness, unlike retirement, cannot be judged without a template —
     * every code looks unresolved. Callers that deliberately omit it (the
     * documents filter's own counting, the dashboard snapshot) keep the older
     * behaviour of trusting the record, which is correct for them: they are
     * counting records the user can see, not obligations.
     */
    if (template) {
      if (semantics.membership === 'unknown') continue
      if (semantics.membership === 'custom') {
        // Real work someone chose to do, never an authoritative requirement —
        // whatever a hand-edited file claims. `required` defaults to `true` on
        // import, so this must not be conditional on the stored flag.
        optional += 1
        continue
      }
    }

    // A record left behind by an applicability change keeps its user state and
    // stays visible, but it is not work this dossier still owes (ADR-049).
    if (!semantics.isApplicable) continue

    if (!semantics.required) {
      optional += 1
      continue
    }

    /**
     * A claim made against an older, laxer definition is not a satisfied
     * requirement today (ADR-051).
     *
     * The persisted `status` is untouched — it is what the user asserted, and
     * theirs to change. What moves is the derived answer, and `effectiveStatus`
     * is where that move is defined, so the Documents filter reaches the same
     * conclusion instead of reading the raw field. An unrecorded claim is left
     * alone: no stamp is not evidence of staleness.
     */
    counts[classifyStatus(effectiveStatus(doc, template))] += 1
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
