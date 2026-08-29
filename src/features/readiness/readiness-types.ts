import type { DocumentStatus } from '@/domain/types/common'

/**
 * The canonical readiness vocabulary.
 *
 * VisaFlow measures three *different* things, and this module owns only the
 * first of them:
 *
 *   1. **Dossier readiness** — how much of the applicable document preparation
 *      is confirmed done. A percentage. This module.
 *   2. **Consistency health** — what the validation engine found. Counts and a
 *      verdict, never a percentage (`src/features/validation/`).
 *   3. **Appointment preparation** — the discrete appointment-day check
 *      (`src/features/timeline/`).
 *
 * They are never blended into one weighted number. Validation findings do not
 * move the readiness percentage; readiness does not soften a finding. And none
 * of them is, or may become, a prediction about a visa decision (ADR-016).
 */

/**
 * How a document status contributes to readiness. Each `DocumentStatus` maps to
 * exactly one class, and every class except `notApplicable` sits inside the
 * denominator — so the classes always partition the applicable work (ADR-033).
 */
export type ReadinessClass =
  | 'ready'
  | 'obtained'
  | 'inProgress'
  | 'notStarted'
  | 'needsUpdate'
  | 'notApplicable'

/**
 * The single canonical readiness figure for a set of documents.
 *
 * Two invariants hold for every value this module produces, and both are
 * asserted by tests:
 *
 *   ready + obtained + inProgress + notStarted + needsUpdate === applicable
 *   applicable + notApplicable === requiredTotal
 *
 * The first is what makes a segmented progress bar honest — every applicable
 * document is in exactly one visible segment, with no unexplained remainder.
 */
export interface DocumentReadiness {
  /** Every required document plus every pending requirement. */
  requiredTotal: number
  /** **The denominator.** Required work that actually applies to this applicant. */
  applicable: number
  /** Required documents explicitly marked not applicable — excluded from both sides. */
  notApplicable: number
  /** **The numerator.** Confirmed ready for the dossier. */
  ready: number
  /** In hand, but not yet confirmed dossier-ready (`received`). */
  obtained: number
  /** Requested and on its way (`requested`). */
  inProgress: number
  /** Not obtained yet, including applicable requirements with no record at all. */
  notStarted: number
  /** Obtained but needing correction or renewal (`needs_update`). */
  needsUpdate: number
  /** Non-required documents. Never in the numerator or the denominator. */
  optional: number
  /**
   * Records for requirement identities the pack has **withdrawn**.
   *
   * Informational accounting only. A retired obligation is not current work, so
   * it is outside every readiness bucket and can never move `percent`,
   * `outstanding` or `complete` — it is surfaced as its own number precisely so
   * the exclusion is stated rather than silent, and so nobody later "fixes" the
   * gap between the document count and the readiness count by counting it again
   * (ADR-050).
   *
   * Only codes in `RETIRED_REQUIREMENTS`. An unrecognised code is not the same
   * concept and is not counted here.
   */
  historical: number
  /** `round(ready / applicable * 100)`; 0 when there is no applicable work. */
  percent: number
  /** Applicable work that is not confirmed ready yet. */
  outstanding: number
  /** Every applicable document is confirmed ready. */
  complete: boolean
  /** There is applicable required work at all — distinguishes "0%" from "nothing to do". */
  hasApplicableWork: boolean
}

/** The one mapping from a stored status to its readiness meaning. */
export const READINESS_CLASS: Record<DocumentStatus, ReadinessClass> = {
  ready: 'ready',
  received: 'obtained',
  requested: 'inProgress',
  not_started: 'notStarted',
  needs_update: 'needsUpdate',
  not_applicable: 'notApplicable',
}
