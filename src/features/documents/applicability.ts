import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Employment } from '@/domain/schemas/employment.schema'
import type {
  EmploymentStatus,
  KnownOccupationCode,
} from '@/domain/types/common'
import {
  OCCUPATIONS_BY_STATUS,
  isKnownOccupationCode,
} from '@/domain/types/common'
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
     * bounded.
     *
     * The occupational code arrives **resolved**, never raw. That is the
     * invariant, not a convenience: this is the one place a raw code becomes
     * something applicability may act on, so a contradictory or unrecognised
     * value is inert everywhere by being absent here.
     */
    employment: application?.employment
      ? {
          employmentStatus: application.employment.employmentStatus,
          occupation: resolveOccupation(application.employment),
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
 * The effective occupational code, or nothing.
 *
 * Three concepts, kept apart (ADR-053). The **raw** value is whatever
 * `employment.occupationCode` holds — an opaque string this build may not
 * recognise. **Known** means it is in `KNOWN_OCCUPATION_CODES`. **Effective**
 * means it is known *and* legal for the recorded `employmentStatus`, and it is
 * the only one of the three that applicability is allowed to see.
 *
 * WHY THIS IS THE INVARIANT, RATHER THAN A SCHEMA RULE. Enforcing the pair at
 * the persisted boundary — a discriminated union, a `superRefine` — would make
 * an inconsistent file fail its whole application slice, which is the import
 * hazard the open string exists to avoid. Normalizing at parse instead would
 * erase unknown future codes, which is the data loss it exists to avoid. So
 * enforcement is non-destructive and lives at the point of use: permissive
 * everywhere, strict here.
 *
 * One place is enough because this is the only context builder, and a source
 * scan forbids any other. That covers every route a bad pair can take — an
 * imported file, the IndexedDB payload (which is validated by a structural
 * check and never by Zod), a programmatic update, and a stale value the UI
 * failed to clear. An enforcement point in the editor would cover none of them,
 * which is exactly how the reverted first attempt shipped three required farmer
 * documents to a retiree.
 *
 * Pure, and it never mutates what it is given: the raw value stays in the
 * dossier and round-trips intact, whatever this build makes of it.
 */
export function resolveOccupation(
  employment: Employment | null | undefined
): KnownOccupationCode | undefined {
  const raw = employment?.occupationCode
  if (!isKnownOccupationCode(raw)) return undefined

  const status = employment?.employmentStatus
  const legal = status ? OCCUPATIONS_BY_STATUS[status] : undefined
  return legal?.includes(raw) ? raw : undefined
}

/**
 * What becomes of the occupational code when the applicant changes status.
 *
 * A rule, not a rendering concern, which is why it is here rather than inline
 * in the step. The two cases differ and the difference is the whole point:
 *
 *  - a **known** code the new status does not allow is a contradiction this
 *    build can see, so it goes, and the user watches it go;
 *  - an **unknown** code is kept. This build cannot tell whether it is illegal
 *    under the new status, and destroying somebody's answer on a guess is
 *    precisely what the open representation exists to prevent (ADR-053).
 *
 * Nothing depends on this for correctness. `resolveOccupation` already refuses
 * a contradictory pair, so a clear that never happens — because the value
 * arrived by import, or the applicant never revisits the step — costs nothing.
 * This is the screen agreeing with the behaviour, not the behaviour itself.
 */
export function occupationAfterStatusChange(
  employment: Employment | null | undefined,
  next: EmploymentStatus
): string | undefined {
  const raw = employment?.occupationCode
  if (raw === undefined) return undefined
  if (!isKnownOccupationCode(raw)) return raw
  return OCCUPATIONS_BY_STATUS[next]?.includes(raw) ? raw : undefined
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
