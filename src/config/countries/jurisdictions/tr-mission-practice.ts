import type { RequirementLayer } from '../../types'
import { occupationOneOf } from '../../types'

/**
 * Canonical evidence definitions observed across mission practice for
 * applications filed in Türkiye — **individually inert until a mission
 * activates one**.
 *
 * WHAT THIS LAYER IS NOT. It is not a claim that Türkiye requires these
 * documents, that every mission receiving applications in Türkiye requires
 * them, or that any particular composition requires them. It carries no
 * citations and asserts nothing, so [ADR-052a](../../../../docs/decisions.md)
 * Rule 3 stands untouched: *N missions ask for it* is still never promoted to a
 * jurisdiction rule. The shared thing here is the **definition**; the asking
 * stays with whoever publishes it.
 *
 * WHY IT EXISTS. `add` used to assert two things at once — *this is the
 * canonical definition of an evidence identity* and *this composition asks for
 * it*. With two packs nothing forced them apart. A third destination does:
 * Spain publishes six documents this repository already defines, each owned by
 * another destination's mission layer, and a `code` has exactly one owner
 * registry-wide. Minting a second code breaks one-code-one-document; promoting
 * the rows into `tr-filing` asserts them on an instrument that does not name
 * them (ADR-052d).
 *
 * THE ARITHMETIC THAT SENTENCE USED TO CARRY HAS BEEN CORRECTED, AND THE
 * CONCLUSION SURVIVES IT. It read "no such row is asked by all three missions —
 * the union is asked of nobody". For `EMPLOYER_TAX_PLATE` that is false: the
 * Greek visa centre asks for it too, which ADR-047's fourth evidence pass had
 * already captured on 2026-09-12, and ADR-052d's table then summarised
 * incorrectly. What still holds is the reason that matters — a delegated intake
 * channel is not the jurisdiction's authority, so *N missions ask for it* is
 * never promoted to a jurisdiction rule (ADR-052a Rule 3). Shared presence, not
 * shared ownership, is still the thing that was missing.
 *
 * WHY IT SHARES THE `jurisdiction` KIND. Kind decides composition order and
 * nothing else, and these definitions must compose after `tr-filing` and before
 * the mission layers that activate them. The shared kind is an implementation
 * classification and must never be read as jurisdiction-wide applicability
 * (ADR-052d decision 4). The id deliberately does not end in `-tr-mission`:
 * this is not a mission layer, and the mission-layer invariants select on that
 * suffix.
 *
 * BOTH PRODUCTION PACKS COMPOSE THIS LAYER, AND THAT IS THE POINT. If only the
 * activating pack composed it, "composing the definition home does not confer
 * the requirement" would be a claim no production composition ever tests.
 * Greece composes it, activates nothing in it, and its composed output —
 * requirements, order, ownership tally and source pool — is unchanged. That
 * unchanged output is the evidence.
 */
export const trMissionPracticeLayer: RequirementLayer = {
  id: 'tr-mission-practice',
  kind: 'jurisdiction',
  offer: [
    /**
     * Vergi Levhası — the tax registration certificate of a business.
     *
     * The first identity to live here, and it qualified by being boring: its
     * prose names the document and nothing else, no layer attaches acceptance
     * detail to it, and its contract key is the bare `EMPLOYER_TAX_PLATE@1`.
     * Moving an unchanged definition between owning layers therefore cannot
     * disturb a stored completion claim — the owning layer's id is not part of
     * the key ([ADR-051b](../../../../docs/decisions.md), ADR-052d decision 7).
     *
     * **The subject is the applicant's own business** for the population this
     * definition serves: a company owner's own firm and an independent
     * professional's own practice, which is what section 4(c) of the German
     * sheet — the only evidence any composition activates this on — describes.
     * That is the declared `ownerType`, and it is also what an unclassified
     * applicant gets: the only migration fallback holds unclassified
     * **self-employed** German applicants, whose plate is their own.
     *
     * **The population is occupational**, and narrower than the coarse status
     * it once carried. `applicabilityMigration` is what keeps that correction
     * honest: an applicant who has not said what kind of work they do is still
     * evaluated against the contract they were originally shown, until they can
     * be routed properly ([ADR-053a](../../../../docs/decisions.md)). The
     * entitlement is recorded in `APPLICABILITY_MIGRATIONS` under this `code`
     * — it belongs to the obligation's history, not to whichever layer owns the
     * code, so the migration travelled here with the definition unchanged. That
     * history is scoped: the entry's `shippedTo` names the compositions that
     * shipped the prior contract, and the composer keeps this fallback only in
     * a composition that declares it in `migrationEntitlements` — Germany
     * today. Anywhere else the row, once activated, fails closed for an
     * unclassified applicant ([ADR-053b](../../../../docs/decisions.md)).
     *
     * **No `sourceRefs`.** An offered definition asserts nothing, so there is
     * nothing for a citation to vouch for ([ADR-048](../../../../docs/decisions.md),
     * ADR-052d decision 6). The evidence that this document is asked for — and
     * the reasoning drawn from a mission's own checklist about *why* it is
     * required and *of whom* — belongs to the activating assertion, and lives
     * on `de-tr-mission`'s `activate` entry.
     */
    {
      code: 'EMPLOYER_TAX_PLATE',
      nameKey: 'visa-domain:requirements.EMPLOYER_TAX_PLATE.name',
      descriptionKey: 'visa-domain:requirements.EMPLOYER_TAX_PLATE.description',
      category: 'employment',
      ownerType: 'applicant',
      /**
       * One identity, two subjects ([ADR-049b](../../../../docs/decisions.md)).
       * On the Greek visa centre's *Çalışan* branch the company-document block
       * carrying this plate is the **employer's** — the repository's reading,
       * the one `EMPLOYER_TRADE_REGISTRY`, `COMPANY_ACTIVITY_CERTIFICATE` and
       * `EMPLOYER_SIGNATURE_CIRCULAR` already apply to the same sentence.
       *
       * **This does not ask an employee for anything.** `employee` stays out of
       * the condition below; it can reach this row only through a composition's
       * own widening, and the map is here first so that no widening can ever
       * tell an employee their own business files the plate (ADR-049b
       * decision 7). No composition declares that widening today, so the entry
       * is carried and never consulted — inert in Germany, which does not reach
       * employees (ADR-052c decision 7). It has to live on the definition: an
       * activation may not change the owner (ADR-052d decision 5).
       *
       * A map states the exceptions; the occupations that already are
       * `applicant` are deliberately not listed. Owner metadata is not the
       * acceptance bar, so the revision and the contract key do not move.
       */
      ownerByOccupation: { employee: 'employer' },
      required: true,
      conditionalOn: occupationOneOf([
        'company_owner',
        'independent_professional',
      ]),
      applicabilityMigration: {
        priorCondition: {
          field: 'employment.employmentStatus',
          operator: 'equals',
          value: 'self_employed',
        },
      },
      revision: 1,
    },
  ],
}
