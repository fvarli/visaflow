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
   * The requirement that took over this slot in the checklist, for humans.
   * Never read at runtime: a retired record must not inherit a new meaning.
   */
  replacedBy?: string
}

export const RETIRED_REQUIREMENTS: RetiredRequirement[] = [
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
