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
  /**
   * The refining layer whose acceptance-detail fragment moved this number, for
   * a move that happens in some compositions and not others.
   *
   * Absent means the owner's own declaration moved, so every composition of the
   * code sees it — that is every entry written before C1. Present means only
   * the compositions that include this layer are affected: Germany's mission
   * adds an e-Devlet bar to the civil-registry extract, and a Greek applicant's
   * claim must not be superseded by it.
   */
  viaLayer?: string
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
  {
    code: 'APPLICATION_FORM',
    revision: 2,
    bumpedIn: '1.5.0',
    reason:
      'Article 11(1) also requires that "persons included in the applicant\'s ' +
      'travel document shall submit a separate application form". A family ' +
      'travelling on one passport satisfied the earlier wording with a single ' +
      'form and fails this. Found by the E1/E2 fidelity audit against the ' +
      'official consolidated text, not against a paraphrase.',
  },
  {
    code: 'TRAVEL_INSURANCE',
    revision: 3,
    bumpedIn: '1.5.0',
    reason:
      'Article 15(1) names cover for "repatriation for medical reasons, urgent ' +
      'medical attention and/or emergency hospital treatment or death". The ' +
      'notes said only "repatriation", and insurers price medical repatriation ' +
      'and repatriation of remains separately — so a policy that satisfied the ' +
      'earlier wording can fail this one.',
  },
  {
    code: 'EMPLOYMENT_LETTER',
    revision: 2,
    bumpedIn: '1.5.0',
    reason:
      'Annex III I.5(a) requires the letter to state which consulate it is ' +
      'addressed to and the name and position of the person signing it. Both ' +
      'were missing from the rendered contract; a letter without them satisfied ' +
      'the old description and is refused at the counter.',
  },
  {
    code: 'APPROVED_LEAVE',
    revision: 2,
    bumpedIn: '1.5.0',
    reason:
      'The same two I.5(a) elements. The clause lists its content bullets once ' +
      'for "letter from employer and/or approval for leave", so they attach to ' +
      'whichever document the applicant submits.',
  },

  /**
   * C1 entries. Each is a composition-scoped move: an acceptance-detail
   * fragment tightened what one pack renders, so `viaLayer` names the layer
   * that attached it and `bumpedIn` names that pack's version. Both `PHOTOS`
   * entries are revision 2 and neither supersedes the other's applicants —
   * the two compositions reach the same number by different routes, which is
   * why the number is only compared within a composition.
   */
  {
    code: 'PHOTOS',
    revision: 2,
    bumpedIn: 'GR 1.9.0',
    viaLayer: 'gr-tr-mission',
    reason:
      'The consulate asks for a *recent* photograph. Article 13 sets no age at ' +
      'all, so a photograph taken years ago satisfied the shared contract and ' +
      'fails this one.',
  },
  {
    code: 'PHOTOS',
    revision: 2,
    bumpedIn: 'DE 1.5.0',
    viaLayer: 'de-tr-mission',
    reason:
      'The mission states 35 x 45 mm, not older than six months, full-face ' +
      'with nothing covering the head or eyes. A conforming ICAO photograph of ' +
      'another size or age satisfied the shared contract and fails this one.',
  },
  {
    code: 'PHOTOS',
    revision: 3,
    bumpedIn: 'DE 1.6.0',
    viaLayer: 'de-tr-mission',
    reason:
      'The tourism checklist asks for one photograph — "1 adet biyometrik ' +
      'vesikalık" — which the general page the other criteria come from does ' +
      'not state. Somebody who brought two met revision 2.',
  },
  {
    code: 'PASSPORT_CURRENT',
    revision: 3,
    bumpedIn: 'DE 1.5.0',
    viaLayer: 'de-tr-mission',
    reason:
      'Extensions are not accepted. A passport issued within ten years whose ' +
      'validity was extended rather than reissued met revision 2 and does not ' +
      'meet this one.',
  },
  {
    code: 'TRAVEL_INSURANCE',
    revision: 4,
    bumpedIn: 'DE 1.5.0',
    viaLayer: 'de-tr-mission',
    reason:
      'The original policy plus a copy, not retroactive-only, with no ' +
      'age-based limit below the minimum, and an AT11 form is not sufficient. ' +
      'An AT11 policy satisfied every earlier revision.',
  },
  {
    code: 'CIVIL_REGISTRY_EXTRACT',
    revision: 2,
    bumpedIn: 'DE 1.5.0',
    viaLayer: 'de-tr-mission',
    reason:
      'It must carry an e-Devlet barcode or QR code. A counter-issued extract ' +
      'satisfied revision 1 and is refused here.',
  },
  {
    code: 'SOCIAL_SECURITY',
    revision: 4,
    bumpedIn: 'DE 1.5.0',
    viaLayer: 'de-tr-mission',
    reason:
      'Both documents, obtained through e-Devlet with its barcode or QR code. ' +
      'Revision 3 asked for a readable QR but not for the issuing channel.',
  },
  {
    code: 'EMPLOYMENT_LETTER',
    revision: 3,
    bumpedIn: 'DE 1.5.0',
    viaLayer: 'de-tr-mission',
    reason:
      'The original, prepared by the employer in Türkiye. A scan or a letter ' +
      'from an employer abroad met revision 2.',
  },
  {
    code: 'APPROVED_LEAVE',
    revision: 3,
    bumpedIn: 'DE 1.5.0',
    viaLayer: 'de-tr-mission',
    reason:
      'The original, from the employer in Türkiye, and the mission asks for ' +
      'one letter carrying both this and the employment details.',
  },
  {
    code: 'EMPLOYER_TRADE_REGISTRY',
    revision: 3,
    bumpedIn: 'DE 1.5.0',
    viaLayer: 'de-tr-mission',
    reason:
      'The chamber copy must be no older than six months. An older registry ' +
      'extract satisfied revision 2.',
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
