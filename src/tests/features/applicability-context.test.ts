import { describe, it, expect } from 'vitest'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { DocumentRequirement } from '@/config/types'
import {
  buildApplicabilityContext,
  isApplicable,
} from '@/features/documents/applicability'
import { applicableRequirements } from '@/features/documents/template-sync'
import { resolveGroupSlots } from '@/features/readiness/satisfaction-groups'
import { resolveVisaTemplate } from '@/config/countries'

/**
 * What a `conditionalOn` may read, and what happens when the dossier is silent.
 *
 * Both halves are new in H4c1 and neither had coverage before, because every
 * condition in both packs used `equals` on one of two fields — so the evaluator
 * was exercised only through its safest arm. That is exactly why this file
 * exists: the operator whose behaviour changed is the one nothing was using
 * yet, and an unused operator with wrong semantics is a trap left for whoever
 * uses it first.
 */

const requirement = (
  conditionalOn: DocumentRequirement['conditionalOn']
): DocumentRequirement => ({
  code: 'TEST_DOC',
  nameKey: 'visa-domain:requirements.PHOTOS.name',
  category: 'supporting',
  ownerType: 'applicant',
  required: true,
  revision: 1,
  ...(conditionalOn ? { conditionalOn } : {}),
})

const NOT_TURKISH = requirement({
  field: 'applicant.nationality',
  operator: 'notEquals',
  value: 'TR',
})
const TURKISH = requirement({
  field: 'applicant.nationality',
  operator: 'equals',
  value: 'TR',
})

const applicant = (nationality: string): Applicant =>
  ({ id: 'a1', nationality }) as Applicant

const ctx = (nationality?: string) =>
  buildApplicabilityContext({
    applicant: nationality === undefined ? null : applicant(nationality),
    application: null,
  })

describe('applicability context — nationality is readable', () => {
  it('matches the applicant nationality it was given', () => {
    expect({
      turkishIsTurkish: isApplicable(TURKISH, ctx('TR')),
      turkishIsNotForeign: isApplicable(NOT_TURKISH, ctx('TR')),
      germanIsForeign: isApplicable(NOT_TURKISH, ctx('DE')),
      germanIsNotTurkish: isApplicable(TURKISH, ctx('DE')),
    }).toEqual({
      turkishIsTurkish: true,
      turkishIsNotForeign: false,
      germanIsForeign: true,
      germanIsNotTurkish: false,
    })
  })

  it('exposes nationality and nothing else about the applicant', () => {
    /**
     * The projection is the capability. A dossier carries passports, previous
     * visas, refusals and two deprecated identifiers nothing may consume; if
     * any of those were reachable, a pack could condition on them and no test
     * would notice until it did.
     */
    const context = buildApplicabilityContext({
      applicant: {
        id: 'a1',
        nationality: 'DE',
        dateOfBirth: '1990-01-01',
        passport: { number: 'X1' },
        previousVisas: [{ country: 'FR' }],
      } as unknown as Applicant,
      application: null,
    })
    expect(Object.keys(context.applicant ?? {})).toEqual(['nationality'])
  })

  it('omits the applicant entirely when the dossier has none', () => {
    // So "no applicant" and "no answer" reach `getNestedValue` as the same
    // thing, and no condition can tell them apart.
    expect(
      buildApplicabilityContext({ applicant: null, application: null })
    ).toEqual({ employment: undefined, financing: undefined })
  })
})

describe('applicability context — an absent value does not match', () => {
  /**
   * `notEquals` was a bare `!==`, so an unanswered field satisfied it. For a
   * checklist that fails in the wrong direction: it invents an obligation from
   * a question the applicant has not reached yet. A document nobody needs is a
   * worse error than one that appears when the profile is filled in.
   */
  it.each([
    ['no applicant at all', undefined],
    ['an applicant who has not answered', ''],
  ])('does not call %s foreign', (_label, nationality) => {
    expect(isApplicable(NOT_TURKISH, ctx(nationality))).toBe(false)
  })

  it('does not call an absent value equal either', () => {
    expect(isApplicable(TURKISH, ctx(''))).toBe(false)
  })

  it('still lets notExists fire on absence, which is what it is for', () => {
    const unanswered = requirement({
      field: 'applicant.nationality',
      operator: 'notExists',
    })
    expect({
      absent: isApplicable(unanswered, ctx('')),
      present: isApplicable(unanswered, ctx('TR')),
    }).toEqual({ absent: true, present: false })
  })

  it('applies to an unresolvable path, not only to a blank answer', () => {
    // The failure this guards is a typo in a pack: `applicant.nationalty`
    // resolves to undefined, and under the old semantics a `notEquals` on it
    // would have made the requirement apply to everyone.
    const typo = requirement({
      field: 'applicant.nationalty',
      operator: 'notEquals',
      value: 'TR',
    })
    expect(isApplicable(typo, ctx('DE'))).toBe(false)
  })
})

describe('applicability context — every consumer asks the same question', () => {
  /**
   * Before H4c1 there were three context builders and they had drifted: two
   * projected `{ employment, financing }` and the third passed the whole
   * `Application`. Nothing failed, because both packs read only the two fields
   * all three agreed on — so the divergence would have surfaced as one
   * requirement being applicable on one screen and not another, months later,
   * in whichever pack first authored a third condition.
   */
  const template = resolveVisaTemplate('GR', 'short_stay_tourism')

  const employed = {
    employment: { employmentStatus: 'employed' },
    financing: { source: 'sponsor' },
  } as Application

  it('resolves group members exactly as the requirement list does', () => {
    if (!template) throw new Error('Greece tourism template missing')
    const context = buildApplicabilityContext({
      applicant: applicant('TR'),
      application: employed,
    })

    const applicableCodes = new Set(
      applicableRequirements(template, context).map((r) => r.code)
    )
    const groupMemberCodes = resolveGroupSlots(template, [], context).flatMap(
      (slot) => slot.applicableCodes
    )

    // Every code a group considers applicable is one the requirement list also
    // considers applicable. The reverse does not hold — most requirements are
    // in no group — so this is containment, not equality.
    const disagreeing = groupMemberCodes.filter(
      (code) => !applicableCodes.has(code)
    )
    expect(disagreeing).toEqual([])
  })

  it('has groups to disagree about, so the check is not vacuous', () => {
    if (!template) throw new Error('Greece tourism template missing')
    const context = buildApplicabilityContext({
      applicant: applicant('TR'),
      application: employed,
    })
    expect(resolveGroupSlots(template, [], context).length).toBeGreaterThan(0)
  })
})
