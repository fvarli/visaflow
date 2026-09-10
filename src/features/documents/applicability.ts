import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { ApplicabilityContext, DocumentRequirement } from '@/config/types'
import { isRequirementApplicable } from '@/config/types'

/**
 * The one place an applicability context is built, and the one place the
 * evaluator is called.
 *
 * WHY IT IS A MODULE AND NOT AN OBJECT LITERAL AT EACH CALL SITE. There were
 * three literals before H4c1 and they had already drifted: `template-sync` and
 * `document-semantics` each built `{ employment, financing }`, while
 * `satisfaction-groups` cast the whole `Application` and could therefore resolve
 * paths the other two could not. Nothing failed, because every condition in both
 * packs read one of two fields that all three happened to agree on — so the
 * divergence was invisible and would have stayed invisible until the first pack
 * authored a condition on a third field, at which point one requirement would
 * have been applicable on the Documents screen and inapplicable in readiness.
 *
 * A test forbids any other production file from importing the evaluator. That
 * is deliberately a guard on the *callee* rather than on the shape: a context is
 * just an object literal and greps for shapes are brittle, but you cannot build
 * a context you have nothing to hand it to.
 */

export interface ApplicabilityInput {
  applicant: Applicant | null | undefined
  application: Application | null | undefined
}

/**
 * Project the dossier down to what a `conditionalOn` may read.
 *
 * The projection is the capability. Everything absent from `ApplicabilityContext`
 * is unreachable from pack configuration by construction, which is why this
 * takes the applicant apart rather than passing it whole: a dossier carries
 * passports, previous visas, refusals and two deprecated identifiers that
 * nothing may consume, and handing them over because they are in scope is how a
 * bounded capability stops being bounded.
 */
export function buildApplicabilityContext({
  applicant,
  application,
}: ApplicabilityInput): ApplicabilityContext {
  return {
    /**
     * Taken apart rather than passed whole, for the same reason the applicant
     * is: `Employment` carries an employer's name and address, an income
     * figure, a bank and two deprecated identifiers, and handing them over
     * because they are in scope is how a bounded capability stops being
     * bounded. Two fields are readable; the rest are unreachable by
     * construction.
     */
    employment: application?.employment
      ? {
          employmentStatus: application.employment.employmentStatus,
          occupationalCategory: application.employment.occupationalCategory,
        }
      : undefined,
    financing: application?.financing,
    /**
     * Omitted rather than `{ nationality: undefined }` when there is no
     * applicant, so the two spell the same thing to `getNestedValue` and no
     * caller can tell the difference between "no applicant" and "no answer".
     * Both mean the dossier has not said, and both fail a value comparison.
     */
    ...(applicant ? { applicant: { nationality: applicant.nationality } } : {}),
  }
}

/**
 * Does this requirement apply, given a context built above?
 *
 * A thin wrapper on purpose: it exists so that the evaluator has exactly one
 * importer, which is what makes the drift guard expressible.
 */
export function isApplicable(
  requirement: DocumentRequirement,
  context: ApplicabilityContext
): boolean {
  return isRequirementApplicable(requirement, context)
}
