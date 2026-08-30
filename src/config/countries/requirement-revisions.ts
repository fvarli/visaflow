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
 * THE POLICY, STATED. A revision versions the acceptance criteria this pack
 * **renders to the applicant** — not a reconstruction of what the authority had
 * always required. The governing test is directional: *could an evidence set
 * that satisfied the previously rendered criteria fail the newly rendered ones,
 * with the requirement identity unchanged?*
 *
 * Motive does not enter into it. A newly discovered official rule, a correction
 * of VisaFlow's own under-specification and a deliberate tightening all land
 * identically on somebody who ticked `ready` against the shorter list: they
 * verified what we printed, and we printed less. Unpublished intent is not a
 * contract — a criterion that sat in a locale file with no key to render it was
 * never part of any contract at all, which is exactly how SOCIAL_SECURITY
 * reached revision 3.
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
      'document. The readable-QR criterion belongs to revision 3, not here — ' +
      'it was authored at the same time but had no key to render it, so it was ' +
      'never part of what this revision asked anyone for.',
  },
  {
    code: 'BANK_STATEMENTS',
    revision: 2,
    bumpedIn: '1.2.0',
    reason:
      'The acceptance test changed kind, not just scope: "should show ' +
      'sufficient funds for the trip" became "should prove the source of a ' +
      'regular income", and the description now asks for movements. A ' +
      'statement showing a large one-off deposit — a car sale, ample for the ' +
      'trip — satisfies the first and fails the second. Recorded late, in ' +
      '1.4.0, by the audit of this ledger; the change itself shipped in 1.2.0. ' +
      'NOT bumped for 3-6 months becoming three: anyone holding 3-6 months of ' +
      'statements also holds the last three, so that narrowed nothing.',
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
  {
    code: 'SOCIAL_SECURITY',
    revision: 3,
    bumpedIn: '1.4.0',
    reason:
      'The readable-QR criterion existed in both locale files from 1.2.0 but ' +
      'the requirement carried no notesKey, and the detail panel is the only ' +
      'thing that renders requirement prose — so no applicant ever saw it. ' +
      'Wiring the key is therefore a new contract, not a copy fix: two correct ' +
      'SGK documents scanned faintly enough that their QR codes will not read ' +
      'satisfy the rendered revision 2 and fail this. The first bump in this ' +
      'ledger that is not retrospective.',
  },
]

/**
 * There is deliberately no accessor here.
 *
 * The requirement's own `revision` is the runtime authority — `document-
 * semantics.ts` reads it from the resolved template — and this file is the
 * audited record of *why* each value is what it is. An exported
 * `currentRevision(code)` existed briefly and had no production caller, which
 * is the shape ADR-050 was written about: a registry that looks authoritative,
 * is not consulted, and invites somebody to read the wrong source. The
 * registry-wide tests in `requirement-identity.test.ts` hold the two in
 * agreement instead.
 */
