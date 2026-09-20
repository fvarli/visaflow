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
     * definition currently serves: a company owner's own firm and an
     * independent professional's own practice, which is what section 4(c) of
     * the German sheet — the only evidence any composition activates this on —
     * describes. The static `ownerType` is truthful for that population and is
     * not changed here.
     *
     * **IT IS NOT SUFFICIENT FOR AN EMPLOYEE, AND THAT CELL IS NOW EVIDENCED.**
     * The argument at `2ebd877` was "there is no cell where the subject
     * differs". ADR-047's fourth pass records otherwise for the Greek visa
     * centre's company-document block, which carries this same document: on the
     * *Çalışan* branch the block is the **employer's** company, and on *Şirket
     * Sahibi* and *Serbest Meslek* it is the applicant's own. Spain's intake
     * checklists put employees in the same block and name the subject outright
     * — *"İş yerinin"*, the workplace's. Nothing in this repository composes
     * that population for this code today, so nothing is wrong in production;
     * what is wrong is the reasoning that no such cell could exist.
     *
     * The shape the answer will probably take is already in the tree twice:
     * `EMPLOYER_TRADE_REGISTRY` and `EMPLOYER_SIGNATURE_CIRCULAR` both carry
     * `ownerByOccupation: { employee: 'employer' }` from this same source and,
     * in the circular's case, from this same sentence (ADR-049a, ADR-052b).
     * **This file does not make that change**: widening the population,
     * revising the owner model, and deciding whether delegated intake evidence
     * may activate this identity are separate decisions on their own evidence.
     *
     * **The population is occupational**, and narrower than the coarse status
     * it once carried. `applicabilityMigration` is what keeps that correction
     * honest: an applicant who has not said what kind of work they do is still
     * evaluated against the contract they were originally shown, until they can
     * be routed properly ([ADR-053a](../../../../docs/decisions.md)). The
     * entitlement is recorded in `APPLICABILITY_MIGRATIONS` and keyed by `code`
     * alone — it belongs to the obligation's history, not to whichever layer
     * owns the code, so it travelled here unchanged.
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
