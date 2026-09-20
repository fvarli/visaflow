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
 * them, and no such row is asked by all three missions — the union is asked of
 * nobody (ADR-052d).
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
     * **The subject is the applicant's own business**, which is what every
     * source consulted describes: a company owner's own firm and an independent
     * professional's own practice. Static rather than per-occupation, because
     * there is no cell where the subject differs — a farmer's tax plate would
     * equally be their own — so a map would be using the capability because it
     * exists rather than because a source asks for it.
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
