import { describe, it, expect } from 'vitest'
import type { Application } from '@/domain/schemas/application.schema'
import type { DocumentRequirement, RequirementLayer } from '@/config/types'
import { composeVisaTemplate, CompositionError } from '@/config/composition'
import type { CompositionErrorKind } from '@/config/composition'
import {
  isApplicable,
  effectiveOwner,
} from '@/features/documents/applicability'
import { financeDocGroup } from '@/features/finance/finance-documents'
import { ALL_REQUIREMENT_LAYERS } from '@/config/countries/layers'
import { ctxFor } from '@/tests/support/applicability'
import type { EmploymentStatus } from '@/domain/types/common'

/**
 * A composition may ask a requirement of occupations its owner did not name.
 *
 * ADR-052c authorised it for one shape the model could not hold: a mission
 * asking a *jurisdiction-owned* row of a wider population than the instrument
 * names. Article 14(3) leaves the harmonised list non-exhaustive, so this is
 * ordinary rather than exotic — the Greek visa centre publishes the
 * company-document block to employees, owners and freelancers alike while Annex
 * III files it under company owners.
 *
 * Built here, used by nothing. The rows that motivated it are untouched.
 */

const BASE = {
  countryCode: 'XX',
  visaType: 'short_stay_tourism',
  templateVersion: '1.0.0',
  preparationMilestones: [],
  reviewStatus: 'unverified',
} as never

/** A jurisdiction row routed on one occupation, with a migration behind it. */
const OWNED: DocumentRequirement = {
  code: 'TEST_COMPANY_DOC',
  nameKey: 'visa-domain:requirements.TEST_COMPANY_DOC.name',
  category: 'employment',
  ownerType: 'applicant',
  ownerByOccupation: { employee: 'employer' },
  required: true,
  conditionalOn: {
    field: 'employment.occupation',
    operator: 'equals',
    value: 'company_owner',
  },
  applicabilityMigration: {
    priorCondition: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    },
  },
  revision: 1,
}

const owner = (add?: DocumentRequirement[]): RequirementLayer => ({
  id: 'test-jurisdiction',
  kind: 'jurisdiction',
  add: add ?? [OWNED],
})

const wideningLayer = (
  occupations: readonly string[],
  code = OWNED.code
): RequirementLayer =>
  ({
    id: 'test-mission',
    // Jurisdiction-kind, like `gr-tr-mission`: a mission layer scoped to one
    // destination in one filing jurisdiction, composing after the shared
    // Türkiye layer it refines.
    kind: 'jurisdiction',
    refine: [{ code, addApplicableOccupations: occupations }],
  }) as unknown as RequirementLayer

const compose = (layers: RequirementLayer[]) =>
  composeVisaTemplate({ base: BASE, layers })

/**
 * Throws rather than returning `undefined`, the way `compositionFor` does: a
 * missing requirement means the composition under test is not the one the
 * assertion below thinks it is, and that must be loud rather than optional.
 */
function requirementIn(
  layers: RequirementLayer[],
  code = OWNED.code
): DocumentRequirement {
  const found = compose(layers).template.documentRequirements.find(
    (r) => r.code === code
  )
  if (!found) throw new Error(`"${code}" is not in this composition`)
  return found
}

function ctx(employmentStatus: EmploymentStatus, occupationCode?: string) {
  return ctxFor({
    destinationCountry: 'XX',
    visaType: 'short_stay_tourism',
    employment: {
      employmentStatus,
      ...(occupationCode ? { occupationCode } : {}),
    },
  } as unknown as Application)
}

/** Composed with Greece's shape: base + a two-occupation widening. */
const WIDENED = requirementIn([
  owner(),
  wideningLayer(['employee', 'independent_professional']),
])
/** Composed without it, the way a pack that does not widen sees the same row. */
const PLAIN = requirementIn([owner()])

const applies = (
  req: DocumentRequirement,
  status: EmploymentStatus,
  occupation?: string
) => isApplicable(req, ctx(status, occupation))

describe('widening — the classified population', () => {
  it.each([
    ['self_employed', 'company_owner', true, 'its own condition'],
    ['employed', 'employee', true, 'the widening'],
    ['self_employed', 'independent_professional', true, 'the widening'],
    ['self_employed', 'farmer', false, 'nothing'],
    ['employed', 'public_servant', false, 'nothing'],
  ] as const)('%s + %s → %s, by %s', (status, occupation, expected, _by) => {
    expect(applies(WIDENED, status, occupation)).toBe(expected)
  })

  it('and the same row without the widening asks only its own population', () => {
    expect(applies(PLAIN, 'self_employed', 'company_owner')).toBe(true)
    expect(applies(PLAIN, 'employed', 'employee')).toBe(false)
    expect(applies(PLAIN, 'self_employed', 'independent_professional')).toBe(
      false
    )
  })
})

describe('widening — it never reaches the migration fallback', () => {
  /**
   * The distinction ADR-052c decision 6 exists for. Preserving an old contract
   * and extending a new one are different entitlements: an unclassified
   * applicant is held to exactly what their own dossier was shown, and a widened
   * occupation is a *new* obligation for that population, so it fails closed
   * until they answer.
   */
  it.each([
    ['self_employed', undefined],
    ['self_employed', 'crypto_farmer_2031'], // unknown to this build
    ['self_employed', 'employee'], // known, illegal for the status
  ] as const)(
    'self-employed + %s / %s keeps the row through the prior condition',
    (status, occupation) => {
      expect(applies(WIDENED, status, occupation)).toBe(true)
    }
  )

  it.each([
    ['employed', undefined],
    ['employed', 'crypto_farmer_2031'],
    ['employed', 'farmer'],
  ] as const)(
    'employed + %s / %s gains nothing, though employee is widened in',
    (status, occupation) => {
      expect(applies(WIDENED, status, occupation)).toBe(false)
    }
  )

  it('the three unclassified causes are one state, not three behaviours', () => {
    // Absent, unknown-to-this-build and status-stale all reach the evaluator as
    // `occupation === undefined`, which is why the widening cannot see them.
    const results = [undefined, 'crypto_farmer_2031', 'farmer'].map((o) =>
      applies(WIDENED, 'employed', o)
    )
    expect(new Set(results).size).toBe(1)
  })
})

describe('widening — the contract key does not move', () => {
  /**
   * ADR-052c's sharpest rule, and it holds by construction rather than by an
   * assertion: the key is built from acceptance fragments alone, and a widening
   * registers none. `EMPLOYER_TRADE_REGISTRY` is why it matters — it already
   * carries a German acceptance fragment, so folding a widening into `addDetail`
   * would bump that fragment and ask every German applicant who had marked the
   * document ready to check it again, for a change to who is asked.
   */
  it('two compositions differing only by a widening render one key', () => {
    expect(WIDENED.contractKey).toBe(PLAIN.contractKey)
    expect(WIDENED.revision).toBe(PLAIN.revision)
    expect(WIDENED.contractKey).toBe('TEST_COMPANY_DOC@1')
  })

  it('and they still ask different people, which is the whole point', () => {
    expect(applies(WIDENED, 'employed', 'employee')).not.toBe(
      applies(PLAIN, 'employed', 'employee')
    )
  })

  it('an acceptance fragment beside a widening keeps its own revision', () => {
    const withBoth = requirementIn([
      owner(),
      {
        id: 'test-mission',
        kind: 'jurisdiction',
        refine: [
          {
            code: OWNED.code,
            addApplicableOccupations: ['employee'],
            addDetail: {
              detailKeys: [
                'visa-domain:detail.test-mission.TEST_COMPANY_DOC.x',
              ],
              revision: 1,
            },
          },
        ],
      } as unknown as RequirementLayer,
    ])
    // The fragment contributes its layer and revision; the widening beside it
    // contributes nothing to the key.
    expect(withBoth.contractKey).toBe('TEST_COMPANY_DOC@1+test-mission:1')
    expect(withBoth.applicableOccupations).toEqual(['employee'])
  })
})

describe('widening — ownership stays an independent axis', () => {
  /**
   * `ownerByOccupation` may name an occupation the base never reaches. It is
   * inert where nobody widens and correct where somebody does, and neither
   * mechanism derives the other.
   */
  it('the employee mapping is inert while the row never reaches an employee', () => {
    expect(PLAIN.ownerByOccupation).toEqual({ employee: 'employer' })
    expect(applies(PLAIN, 'employed', 'employee')).toBe(false)
  })

  it('and becomes the answer once a composition widens to that occupation', () => {
    expect(applies(WIDENED, 'employed', 'employee')).toBe(true)
    expect(effectiveOwner(WIDENED, ctx('employed', 'employee'))).toBe(
      'employer'
    )
  })

  it('an occupation added without an owner mapping keeps the declared subject', () => {
    expect(
      effectiveOwner(WIDENED, ctx('self_employed', 'independent_professional'))
    ).toBe('applicant')
  })
})

describe('widening — compositions do not leak into one another', () => {
  it('the pack that does not widen sees nothing of the one that does', () => {
    expect(PLAIN.applicableOccupations).toBeUndefined()
    expect(WIDENED.applicableOccupations).toEqual([
      'employee',
      'independent_professional',
    ])
  })

  it('and the authored requirement object is never mutated', () => {
    expect(OWNED).not.toHaveProperty('applicableOccupations')
    expect(OWNED.conditionalOn).toEqual({
      field: 'employment.occupation',
      operator: 'equals',
      value: 'company_owner',
    })
  })

  it('composing in either order gives the same answer', () => {
    const again = requirementIn([owner()])
    expect(again.applicableOccupations).toBeUndefined()
    expect(again.contractKey).toBe(PLAIN.contractKey)
  })
})

describe('widening — a delta, and the composer refuses anything else', () => {
  const expectKind = (kind: CompositionErrorKind, compose: () => unknown) => {
    try {
      compose()
    } catch (error) {
      expect(error).toBeInstanceOf(CompositionError)
      expect((error as CompositionError).kind).toBe(kind)
      return
    }
    throw new Error(`Expected a CompositionError of kind "${kind}", got none`)
  }

  it('refuses an empty list', () => {
    expectKind('invalid-widening', () => compose([owner(), wideningLayer([])]))
  })

  it('refuses a repeated occupation', () => {
    expectKind('invalid-widening', () =>
      compose([owner(), wideningLayer(['employee', 'employee'])])
    )
  })

  it('refuses a restatement of the base population', () => {
    expectKind('invalid-widening', () =>
      compose([owner(), wideningLayer(['company_owner'])])
    )
  })

  it('refuses a base that does not route on occupation', () => {
    const coarse: DocumentRequirement = {
      ...OWNED,
      conditionalOn: {
        field: 'employment.employmentStatus',
        operator: 'equals',
        value: 'self_employed',
      },
    }
    expectKind('invalid-widening', () =>
      compose([owner([coarse]), wideningLayer(['employee'])])
    )
  })

  it('refuses a base routed on some other field entirely', () => {
    const byNationality: DocumentRequirement = {
      ...OWNED,
      conditionalOn: {
        field: 'applicant.nationality',
        operator: 'notEquals',
        value: 'TR',
      },
    }
    expectKind('invalid-widening', () =>
      compose([owner([byNationality]), wideningLayer(['employee'])])
    )
  })

  it('accepts a oneOf base, and unions against every member', () => {
    const multi: DocumentRequirement = {
      ...OWNED,
      conditionalOn: {
        field: 'employment.occupation',
        operator: 'oneOf',
        values: ['company_owner', 'farmer'],
      },
    }
    const req = requirementIn([owner([multi]), wideningLayer(['employee'])])
    expect(req.applicableOccupations).toEqual(['employee'])
    expectKind('invalid-widening', () =>
      compose([owner([multi]), wideningLayer(['farmer'])])
    )
  })
})

describe('widening — nothing in production uses it, and Finance cannot see it', () => {
  it('no production refinement declares one', () => {
    // Written to fail in the slice that adds the first use, which then replaces
    // it with an explicit census — the shape every capability guard in this
    // track has had.
    const declaring = ALL_REQUIREMENT_LAYERS.flatMap((layer) =>
      (layer.refine ?? [])
        .filter((r) => r.addApplicableOccupations !== undefined)
        .map((r) => `${layer.id} -> ${r.code}`)
    )
    expect(declaring).toEqual([])
  })

  it('the finance classifier still takes a code and a category', () => {
    expect(financeDocGroup.length).toBe(2)
    expect(financeDocGroup(OWNED.code, 'employment')).toBeNull()
  })
})
