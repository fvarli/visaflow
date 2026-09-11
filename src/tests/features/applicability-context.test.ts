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

/**
 * `oneOf` — is the scalar at `field` one of an authored set?
 *
 * Added with no production caller (H4c2d1). Two rows need it — the Greek
 * signature circular reaches three occupational categories and the German tax
 * plate two — but narrowing either is blocked until the occupational question
 * is one an applicant is actually asked, so the operator ships first and alone.
 *
 * The semantics that matter are the refusals. An operator that answered `true`
 * on an unanswered field, or coerced `'1'` into `1`, would put documents in
 * front of people the source never named — which is the failure the whole
 * applicability capability is built around.
 */
describe('applicability — oneOf matches a scalar against an authored set', () => {
  const oneOf = (
    values: readonly [
      string | number | boolean,
      ...(string | number | boolean)[],
    ],
    field = 'applicant.nationality'
  ): DocumentRequirement => requirement({ field, operator: 'oneOf', values })

  it('matches a member, wherever it sits in the set', () => {
    expect({
      first: isApplicable(oneOf(['TR', 'DE', 'FR']), ctx('TR')),
      last: isApplicable(oneOf(['TR', 'DE', 'FR']), ctx('FR')),
      single: isApplicable(oneOf(['TR']), ctx('TR')),
    }).toEqual({ first: true, last: true, single: true })
  })

  it('does not match a value outside the set', () => {
    expect(isApplicable(oneOf(['TR', 'DE']), ctx('FR'))).toBe(false)
  })

  it.each([
    ['no value at all', undefined],
    ['an unanswered field', ''],
  ])('does not match %s', (_label, nationality) => {
    // The same rule `equals` follows. It is also why an unknown or
    // contradictory occupational code is inert without this operator knowing
    // occupation exists: the context carries a resolved value or nothing.
    expect(isApplicable(oneOf(['TR', 'DE']), ctx(nationality))).toBe(false)
  })

  it('does not match an unresolvable path', () => {
    expect(isApplicable(oneOf(['TR'], 'applicant.nationalty'), ctx('TR'))).toBe(
      false
    )
  })

  it('compares strictly, and never coerces', () => {
    /**
     * `'1'` must not match `1`. A coercing set is how a condition written for
     * one vocabulary quietly starts matching another — and the authored side is
     * literal text a maintainer typed, so there is no case where coercion is
     * the kind thing to do.
     */
    const numeric = requirement({
      field: 'employment.employmentStatus',
      operator: 'oneOf',
      values: [1, true],
    })
    const stringly = buildApplicabilityContext({
      applicant: null,
      application: {
        employment: { employmentStatus: '1' },
      } as unknown as Application,
    })
    expect(isApplicable(numeric, stringly)).toBe(false)
  })

  it('matches booleans and numbers by identity', () => {
    const numeric = requirement({
      field: 'employment.employmentStatus',
      operator: 'oneOf',
      values: [1, 2],
    })
    const one = buildApplicabilityContext({
      applicant: null,
      application: {
        employment: { employmentStatus: 1 },
      } as unknown as Application,
    })
    expect(isApplicable(numeric, one)).toBe(true)
  })

  it('reads a nested path exactly as the other operators do', () => {
    expect(
      isApplicable(
        oneOf(['employed', 'self_employed'], 'employment.employmentStatus'),
        buildApplicabilityContext({
          applicant: null,
          application: {
            employment: { employmentStatus: 'self_employed' },
          } as unknown as Application,
        })
      )
    ).toBe(true)
  })

  it('is not includes, and does not become it', () => {
    /**
     * The mirror image, and the confusion worth pinning. `includes` wants the
     * *field* to be the array and the authored value to be the needle; `oneOf`
     * wants the field to be a single value and the set to be authored. A field
     * that happens to hold an array satisfies neither reading of `oneOf`.
     */
    const arrayField = buildApplicabilityContext({
      applicant: null,
      application: {
        employment: { employmentStatus: ['employed'] },
      } as unknown as Application,
    })
    expect(
      isApplicable(
        oneOf(['employed'], 'employment.employmentStatus'),
        arrayField
      )
    ).toBe(false)
  })

  it('still lets includes behave exactly as it did', () => {
    // Guards the other half: adding an operator must not disturb the one it is
    // most easily confused with.
    const needle = requirement({
      field: 'employment.employmentStatus',
      operator: 'includes',
      value: 'employed',
    })
    const arrayField = buildApplicabilityContext({
      applicant: null,
      application: {
        employment: { employmentStatus: ['employed', 'student'] },
      } as unknown as Application,
    })
    expect({
      arrayContainsNeedle: isApplicable(needle, arrayField),
      scalarDoesNot: isApplicable(
        needle,
        buildApplicabilityContext({
          applicant: null,
          application: {
            employment: { employmentStatus: 'employed' },
          } as unknown as Application,
        })
      ),
    }).toEqual({ arrayContainsNeedle: true, scalarDoesNot: false })
  })

  it('refuses an empty set at compile time', () => {
    /**
     * A set that matches nothing is never what an author meant, and it is
     * invisible when it happens — the requirement simply stops appearing. The
     * non-empty tuple makes it a type error rather than something a runtime
     * guard has to notice.
     */
    const empty: DocumentRequirement['conditionalOn'] = {
      field: 'applicant.nationality',
      operator: 'oneOf',
      // @ts-expect-error an authored oneOf set may not be empty
      values: [],
    }
    expect(empty).toBeDefined()
  })

  it('refuses a scalar value on oneOf, and a set on equals', () => {
    const scalarOnOneOf: DocumentRequirement['conditionalOn'] = {
      field: 'applicant.nationality',
      operator: 'oneOf',
      values: ['TR'],
      // @ts-expect-error oneOf carries a set, never a scalar
      value: 'TR',
    }
    const setOnEquals: DocumentRequirement['conditionalOn'] = {
      field: 'applicant.nationality',
      operator: 'equals',
      value: 'TR',
      // @ts-expect-error equals carries a scalar, never a set
      values: ['TR'],
    }
    expect([scalarOnOneOf, setOnEquals]).toHaveLength(2)
  })
})
