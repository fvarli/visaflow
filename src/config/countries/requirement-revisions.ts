/**
 * The acceptance-contract ledger.
 *
 * `DocumentRequirement.revision` answers one question and only one: *if a
 * person already claimed this requirement was satisfied, could that claim still
 * be sufficient?* It is not a content version. Wording improves, translations
 * get corrected and citations get attached without the answer changing, and
 * none of those may invalidate somebody's completed work (ADR-051).
 *
 * WHY A LEDGER RATHER THAN A HASH. Acceptance criteria in this project live
 * only in translated prose — "two SGK documents, both with a readable QR code"
 * is a `notesKey`, not a structured field. So nothing can compute the
 * difference between a tightened contract and a copy edit. The revision integer
 * is the only machine-readable statement of the contract, and this file is the
 * record of every time a human decided it moved.
 *
 * Same shape as `RETIRED_REQUIREMENTS` and the shipped-codes ledger, for the
 * same reason: a guard that forces an acknowledgement beats one that tries to
 * infer meaning and quietly gets it wrong.
 *
 * WHEN TO BUMP — the ADR-049 taxonomy, applied:
 *
 *   translation or copy cleanup ............................ no
 *   attaching a source, or a stronger citation ............. no
 *   clarification that does not change what to produce ..... no
 *   loosening ............................................. no (a claim that
 *                                                            met a stricter bar
 *                                                            still meets this)
 *   applicability only .................................... no (a separate
 *                                                            axis; see
 *                                                            `isApplicable`)
 *   STRICTER same-identity evidence ....................... YES
 *   semantic replacement .................................. n/a — new code,
 *                                                            starts at 1
 */
export interface RequirementRevision {
  /** The requirement code whose acceptance contract moved. */
  code: string
  /** The revision it moved to. */
  revision: number
  /** Country-pack version that shipped the change. */
  bumpedIn: string
  /** What a previously-sufficient claim would now be missing. */
  reason: string
}

/**
 * Every bump, in order.
 *
 * The four entries below are retrospective: they record tightenings that
 * shipped in ADR-047 and ADR-048, before provenance existed. **They change no
 * behaviour** — no dossier written before this sprint carries a claim stamp, so
 * there is nothing for these numbers to be compared against. They are here so
 * the ledger is truthful from its first commit rather than pretending the pack's
 * history began today.
 */
export const REQUIREMENT_REVISIONS: RequirementRevision[] = [
  {
    code: 'PASSPORT_CURRENT',
    revision: 2,
    bumpedIn: '1.2.0',
    reason:
      'Gained Visa Code Article 12(c): the passport must have been issued ' +
      'within the previous 10 years. A passport that satisfied the earlier ' +
      'wording — three months of validity and two blank pages — can fail this.',
  },
  {
    code: 'TRAVEL_INSURANCE',
    revision: 2,
    bumpedIn: '1.2.0',
    reason:
      'Gained the other two criteria of Article 15(3): validity throughout the ' +
      'territory of the Member States, and cover for the entire intended stay. ' +
      'A policy meeting only the EUR 30,000 minimum can fail both.',
  },
  {
    code: 'SOCIAL_SECURITY',
    revision: 2,
    bumpedIn: '1.2.0',
    reason:
      'One SGK service record no longer suffices: the harmonised list asks for ' +
      'the employment-entry statement *and* the registration and service ' +
      'document, both carrying a readable QR code.',
  },
  {
    code: 'EMPLOYER_TRADE_REGISTRY',
    revision: 2,
    bumpedIn: '1.2.0',
    reason:
      'Now also asks for the chamber-of-commerce registration alongside the ' +
      'trade register bulletin. Bumped for that added content — NOT for the ' +
      'employed-to-self-employed applicability correction, which changes who ' +
      'is asked rather than what satisfies the ask.',
  },
]

/** The current acceptance-contract revision for a code. Unbumped codes are 1. */
export function currentRevision(code: string): number {
  return REQUIREMENT_REVISIONS.filter((entry) => entry.code === code).reduce(
    (highest, entry) => Math.max(highest, entry.revision),
    1
  )
}
