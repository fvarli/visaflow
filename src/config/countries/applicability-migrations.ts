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
 * One entry, and the gate is what makes it mean anything.
 *
 * A requirement that *quotes* a prior contract proves nothing — a row written
 * tomorrow could quote a fiction. This ledger is where the entitlement lives,
 * and an invariant cross-checks it against the pack in both directions: a
 * config claim with no entry fails, an entry with no config fails, and a prior
 * condition the two disagree about fails.
 *
 * The four other rows from the same company-document block —
 * `EMPLOYER_TRADE_REGISTRY`, `COMPANY_ACTIVITY_CERTIFICATE`,
 * `TAX_PAYMENT_STATEMENT` and `EMPLOYER_TAX_PLATE` — are still **not** listed.
 * Each needs its corrected occupational population adjudicated on its own
 * evidence first, and an entry written before that adjudication would be a
 * claim nobody had checked.
 *
 * `FARMER_CERTIFICATE` will never appear. It was authored against the
 * occupational axis and has no prior coarse contract to preserve, which is
 * exactly the case this gate exists to refuse.
 */
export const APPLICABILITY_MIGRATIONS: ApplicabilityMigrationEntry[] = [
  {
    code: 'EMPLOYER_SIGNATURE_CIRCULAR',
    priorCondition: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    reason:
      'The row asked every employed applicant for the company-document block ' +
      "on the strength of their coarse status. ADR-047's fourth evidence pass " +
      'read all five occupational branches at all four consular jurisdictions: ' +
      'the block belongs to an employee, a company owner and an independent ' +
      'professional, and not to a public servant or a farmer. Correcting it ' +
      'both adds and withdraws, so an applicant who has not yet said what kind ' +
      'of work they do must keep being held to exactly the contract they were ' +
      'shown — not to a widened one, and not to nothing.',
    retirement:
      'Remove once the corrected condition can stand alone, which means every ' +
      'dossier reaching it carries a usable occupation. VisaFlow is ' +
      'local-first with no migration telemetry, so that is a reviewed decision ' +
      'and never an elapsed interval or an assumed adoption rate. Deleting it ' +
      'early withdraws a document the source does ask of the people who have ' +
      'not answered yet.',
  },
  {
    code: 'EMPLOYER_TAX_PLATE',
    priorCondition: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    },
    reason:
      "Section 4(c) of the German mission's checklist files the tax plate " +
      'under "Firma sahipleri / Serbest meslek sahipleri" — company owners and ' +
      'independent professionals — and the row reached every self-employed ' +
      'applicant, a farmer included. Correcting it is purely subtractive, so ' +
      'the only people it can harm are the ones who have not yet said what ' +
      'kind of work they do: without this, the document would disappear from ' +
      'a self-employed dossier that had answered nothing, which the checklist ' +
      'does ask of most of them.',
    retirement:
      'Remove once every dossier reaching this row carries a usable ' +
      'occupation, which is a reviewed decision and never an elapsed interval ' +
      '— there is no migration telemetry to read it from. Until then, ' +
      'deleting it withdraws a required document from applicants the source ' +
      'has not stopped asking.',
  },
]
