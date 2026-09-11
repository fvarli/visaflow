import type { ConditionalRequirement } from '../types'

/**
 * The applicability-migration ledger — who is entitled to preserve an older
 * contract, and why.
 *
 * A requirement whose applicability moves from the coarse employment axis to
 * the occupational one cannot simply take its new condition: every dossier has
 * answered `employmentStatus`, and almost none has answered `occupationCode`.
 * Narrowing outright would withdraw documents from applicants who were never
 * asked the new question — measured at three required rows in Greece and four
 * in Germany, with readiness *rising* as the denominator shrank. So a migrated
 * requirement keeps answering with its prior contract until the applicant
 * classifies themselves (ADR-053a).
 *
 * WHY THE LEDGER IS THE GATE AND THE CONFIG IS NOT. `ApplicabilityMigration` on
 * a requirement is executable, and executable is not the same as authorised: a
 * row written tomorrow could carry a `priorCondition` it never had and quietly
 * grant itself a compatibility route. Entitlement is a historical fact about a
 * contract this project already shipped, so it lives in a record a human wrote
 * and a reviewer reads, and the invariant holds the two in agreement both ways
 * — neither a config claim without an entry nor an entry without a config claim.
 *
 * Same shape and same reason as `REQUIREMENT_REVISIONS`, including the absence
 * of a runtime accessor. Nothing imports this to decide applicability; the
 * evaluator reads the requirement, and the tests refuse to let the requirement
 * and this file disagree.
 *
 * COMPATIBILITY IS TEMPORARY BY CONSTRUCTION. Every entry carries what would
 * retire it. No date or adoption threshold appears here, and none should be
 * invented: VisaFlow is local-first with no migration telemetry, so "once
 * adoption reaches X" is not a sentence this project can honestly write.
 * Retiring an entry takes a reviewed decision, and having no signal is never
 * licence to delete one.
 */
export interface ApplicabilityMigrationEntry {
  /** The requirement whose applicability is migrating. */
  code: string
  /**
   * The accepted coarse condition it applied under before the move — the same
   * object the requirement carries, and the invariant compares them
   * structurally rather than trusting either alone.
   */
  priorCondition: ConditionalRequirement
  /** Why this requirement is entitled to preserve it. */
  reason: string
  /** What would end the compatibility route. Never a date. */
  retirement: string
}

/**
 * **Deliberately empty.**
 *
 * H4c2d4c built the capability and migrated nothing, so no requirement is
 * entitled yet and none carries `applicabilityMigration`. The five motivating
 * rows — `EMPLOYER_SIGNATURE_CIRCULAR`, `EMPLOYER_TRADE_REGISTRY`,
 * `COMPANY_ACTIVITY_CERTIFICATE`, `TAX_PAYMENT_STATEMENT` and
 * `EMPLOYER_TAX_PLATE` — are **not** listed here: each needs its corrected
 * occupational population adjudicated on its own evidence first, and an entry
 * written before that adjudication would be a claim nobody had checked.
 *
 * `FARMER_CERTIFICATE` will never appear. It was authored against the
 * occupational axis and has no prior coarse contract to preserve, which is
 * exactly the case the entitlement gate exists to refuse.
 *
 * An empty ledger makes the production half of the two-way invariant vacuous,
 * so the invariant is exercised against fixtures instead — weakening it to suit
 * the emptiness would defeat the reason it exists.
 */
export const APPLICABILITY_MIGRATIONS: ApplicabilityMigrationEntry[] = []
