/**
 * Requirement codes this project has shipped and then retired.
 *
 * A document `code` is the identity of a persisted record (ADR-012): the
 * dossier stores the code and nothing else, and the label is resolved from it
 * at render time. So changing what a code *means* rewrites the meaning of
 * documents people already own — silently, in files already on their disk.
 *
 * That is what ADR-048 did. Three requirements were re-pointed at genuinely
 * different real-world documents while keeping their codes, and every existing
 * record relabelled itself the moment the translation changed. This registry is
 * the correction and the guard against a repeat (ADR-049).
 *
 * RETIREMENT IS NOT DELETION. A retired code:
 *  - leaves the template, so new dossiers never seed it;
 *  - keeps its **original** translation, so an existing record still shows the
 *    document its owner actually filed;
 *  - keeps every byte of user state — status, notes, dates, file references;
 *  - still parses and round-trips through import/export;
 *  - is **never** resolved to its replacement. `replacedBy` below is a note for
 *    people reading the history, and is deliberately not used by any code path.
 *    Aliasing a retired code onto a new requirement would recreate exactly the
 *    bug this file exists to prevent.
 */
export interface RetiredRequirement {
  /** The retired code, exactly as it was shipped. */
  code: string
  /** Country pack version in which it left the template. */
  retiredIn: string
  /** Why the identity could not be reused. */
  reason: string
  /**
   * Evidence read *after* retirement that bears on the reason above, with the
   * date it was read.
   *
   * Append-only, and that is the whole point: `reason` is the record as it was
   * written, and a decision made on the evidence available at the time is not
   * made wrong by evidence that arrives later — it is superseded, which is a
   * different thing and has to stay legible as one. Editing the original would
   * leave a file claiming the retirement had always rested on grounds nobody
   * held.
   *
   * Never read at runtime, for the same reason `replacedBy` is not.
   */
  amendedBy?: { readAt: string; note: string }[]
  /**
   * The requirement that took over this slot in the checklist, for humans.
   * Never read at runtime: a retired record must not inherit a new meaning.
   */
  replacedBy?: string
}

export const RETIRED_REQUIREMENTS: RetiredRequirement[] = [
  /**
   * The three the E1 fidelity audit found no authority for, at any level.
   *
   * They are retired rather than quarantined, and the difference is the point.
   * Quarantine holds a requirement whose evidence we cannot reach — the Greek
   * mission's own pages were unreachable for weeks, and while that was true
   * removing anything would have been a deletion on the strength of a network
   * failure. Those pages were then retrieved first-hand: the Visa Code,
   * Commission Annex III and the mission's own published requirements are all
   * silent on these three, and the one channel still blocked carries no
   * requirement-specific signal for any of them.
   *
   * No `replacedBy`: nothing replaces them. They were asks this project made
   * and could not support. `ID_CARD_COPY` mattered most — it was `required`,
   * so every Greek applicant was told to obtain a national identity card copy
   * that no authority in the file asks for, and readiness withheld completion
   * until they did.
   *
   * THE CHANNEL WAS OPENED ON 2026-09-09, AND IT ASKS FOR ALL THREE. Each
   * carries the dated amendment in `amendedBy`; the reasons above are left
   * exactly as written. What is superseded is the *evidence-absence* premise,
   * not the retirement — the codes stay retired, because an identity that has
   * shipped is never re-pointed at a new contract (ADR-049). Whether these
   * obligations should return, and under what identities, is a separate
   * question this file does not answer.
   */
  {
    code: 'ID_CARD_COPY',
    retiredIn: '1.6.0',
    reason:
      'Mandatory and cited by nothing. Absent from Visa Code Annex II sections ' +
      'A, B and C, from Commission Annex III for Türkiye, and from the Greek ' +
      "mission's own published requirements — all read first-hand. The German " +
      'mission asks for the barcoded civil-registry extract and no identity ' +
      'card, which is what settled the question ADR-052 had left open.',
    amendedBy: [
      {
        readAt: '2026-09-09',
        note:
          "The Greek visa centre's tourism checklist — the one channel " +
          'this retirement recorded as unreachable — was read on this ' +
          'date and does ask for a photocopy of the national identity ' +
          'card — "Nüfus cüzdanı: (Kimlik) fotokopisi", with no qualifier ' +
          'attached, in all four consular jurisdictions and on every ' +
          'occupational branch sampled. The evidence-absence rationale ' +
          'above is therefore superseded. The code stays retired ' +
          'regardless: a retired identity is never reused (ADR-049), so ' +
          'restoring the obligation would take a new code and a contract ' +
          'argued on its own evidence, and this is the only one of the ' +
          'three whose applicability the current model could express, ' +
          'since it carries no condition at all.',
      },
    ],
  },
  {
    code: 'PASSPORT_PREVIOUS',
    retiredIn: '1.6.0',
    reason:
      'Old passports as such appear in no instrument this project holds. The ' +
      'German mission asks for a copy of the passport carrying the visas it ' +
      'wants to see — a narrower ask it states as its own requirement — and the ' +
      'Greek mission asks for nothing of the kind.',
    amendedBy: [
      {
        readAt: '2026-09-09',
        note:
          "The Greek visa centre's tourism checklist — the one channel " +
          'this retirement recorded as unreachable — was read on this ' +
          'date and does ask for the previous passport — "Eski pasaport: ' +
          'Var ise bir önceki pasaport ve vize fotokopileri ' +
          'sunulmalıdır", in all four consular jurisdictions and on every ' +
          'occupational branch sampled. The evidence-absence rationale ' +
          'above is therefore superseded. The code stays retired ' +
          'regardless: a retired identity is never reused (ADR-049), so ' +
          'restoring the obligation would take a new code and a contract ' +
          'argued on its own evidence. Note the ask is conditional on ' +
          'holding one, and the applicability projection carries no ' +
          'previous-passport data — H4c1 added nationality to it and nothing ' +
          'else.',
      },
    ],
  },
  {
    code: 'PREVIOUS_VISAS',
    retiredIn: '1.6.0',
    reason:
      'No Annex II basis, absent from Annex III, and absent from the Greek ' +
      "mission's own list. Article 21(2) has the consulate consult the VIS for " +
      'each application, so prior Schengen history is retrieved rather than ' +
      'collected — though that alone was never the argument, since the German ' +
      'mission does ask for copies and states so.',
    amendedBy: [
      {
        readAt: '2026-09-09',
        note:
          "The Greek visa centre's tourism checklist — the one channel " +
          'this retirement recorded as unreachable — was read on this ' +
          'date and does ask for copies of previously issued visas — and ' +
          'asks more broadly than this code ever did, naming visas from ' +
          'any country rather than Schengen alone, in all four consular ' +
          'jurisdictions and on every occupational branch sampled. The ' +
          'evidence-absence rationale above is therefore superseded. The ' +
          'code stays retired regardless: a retired identity is never ' +
          'reused (ADR-049), so restoring the obligation would take a new ' +
          'code and a contract argued on its own evidence. The ask is ' +
          'conditional on having them, which the applicability context ' +
          'cannot currently express.',
      },
    ],
  },

  {
    code: 'TAX_RETURNS',
    retiredIn: '1.2.0',
    reason:
      'Described "recent tax returns" — a filing the applicant submits. The ' +
      'Türkiye harmonised list asks company owners for a statement of taxes ' +
      'payment, which is proof of settlement. Different documents; a filed ' +
      'return does not evidence payment.',
    replacedBy: 'TAX_PAYMENT_STATEMENT',
  },
  {
    code: 'PENSION_STATEMENT',
    retiredIn: '1.2.0',
    reason:
      'Described "recent pension payment statements" — periodic printouts. ' +
      'The harmonised list asks for the pensioner booklet, an identity ' +
      'document. Holding one is no evidence of holding the other.',
    replacedBy: 'PENSIONER_BOOKLET',
  },
  {
    code: 'BUSINESS_LICENSE',
    retiredIn: '1.2.0',
    reason:
      'Described a business registration or operating licence. The harmonised ' +
      'list asks for the company activity certificate (Faaliyet Belgesi). The ' +
      'old wording was arguably broad enough to contain the new document, ' +
      'which is exactly why it was retired: an applicant could have satisfied ' +
      'it with a different artifact and then been shown as satisfying this one.',
    replacedBy: 'COMPANY_ACTIVITY_CERTIFICATE',
  },
]

const RETIRED_CODES = new Set(RETIRED_REQUIREMENTS.map((r) => r.code))

/** True when a code was shipped and later retired from every template. */
export function isRetiredRequirement(code: string): boolean {
  return RETIRED_CODES.has(code)
}
