import { describe, it, expect } from 'vitest'
import { resolveVisaTemplate } from '@/config/countries'
import {
  CompositionError,
  composeVisaTemplate,
  type CompositionErrorKind,
} from '@/config/composition'
import type {
  DocumentRequirement,
  RequirementLayer,
  RequirementSource,
  VisaTypeTemplate,
} from '@/config/types'

/**
 * The composer's own mechanics, tested on synthetic layers.
 *
 * Nothing here touches a production pack: this slice adds the primitives and
 * wires none of them, so these are unit tests of the machine rather than
 * statements about Greece. The fixture-driven proofs that a *second*
 * composition genuinely inherits, isolates and quarantines belong to
 * `pack-composition.test.ts`.
 *
 * Every guard gets a negative control, because a conflict detector that has
 * never been seen to fire is indistinguishable from one that cannot. Each is
 * asserted on `CompositionError.kind` rather than on message text — the message
 * is prose for a human reading a stack trace and will drift as wording
 * improves; the discriminant is the contract.
 */

const BASE: Omit<VisaTypeTemplate, 'documentRequirements'> = {
  id: 'test-template',
  visaType: 'short_stay_tourism',
  nameKey: 'test:template.name',
  preparationMilestones: [],
  templateVersion: '1.0.0',
  reviewStatus: 'unverified',
}

const req = (
  code: string,
  overrides: Partial<DocumentRequirement> = {}
): DocumentRequirement => ({
  code,
  nameKey: `test:requirements.${code}.name`,
  category: 'supporting',
  ownerType: 'applicant',
  required: true,
  revision: 1,
  ...overrides,
})

const source = (id: string): RequirementSource => ({
  id,
  authority: 'Test Authority',
  titleKey: `test:sources.${id}.title`,
  sourceType: 'government',
})

/** Named so assertions can reference the declarations directly. */
const TEST_A = req('TEST_A', { sourceRefs: ['src-eu'] })
const TEST_B = req('TEST_B')

const commonLayer: RequirementLayer = {
  id: 'test-common',
  kind: 'common',
  add: [TEST_A, TEST_B],
  sources: [source('src-eu')],
}

const destinationLayer: RequirementLayer = {
  id: 'test-dest',
  kind: 'destination',
  add: [req('TEST_C')],
}

const jurisdictionLayer: RequirementLayer = {
  id: 'test-jx',
  kind: 'jurisdiction',
  add: [req('TEST_D', { revision: 3 })],
  refine: [{ code: 'TEST_A', addSourceRefs: ['src-jx'] }],
  sources: [source('src-jx')],
}

const ALL_LAYERS = [commonLayer, destinationLayer, jurisdictionLayer]

/** Compose and assert it threw the named guard, not merely that it threw. */
function expectKind(kind: CompositionErrorKind, compose: () => unknown) {
  try {
    compose()
  } catch (error) {
    expect(error).toBeInstanceOf(CompositionError)
    expect((error as CompositionError).kind).toBe(kind)
    return
  }
  throw new Error(`Expected a CompositionError of kind "${kind}", got none`)
}

describe('composeVisaTemplate — composing', () => {
  it('composes layers in order when no requirementOrder is given', () => {
    const { template } = composeVisaTemplate({ base: BASE, layers: ALL_LAYERS })
    expect(template.documentRequirements.map((r) => r.code)).toEqual([
      'TEST_A',
      'TEST_B',
      'TEST_C',
      'TEST_D',
    ])
  })

  it('honours an explicit requirementOrder', () => {
    const { template } = composeVisaTemplate({
      base: BASE,
      layers: ALL_LAYERS,
      requirementOrder: ['TEST_D', 'TEST_B', 'TEST_A', 'TEST_C'],
    })
    expect(template.documentRequirements.map((r) => r.code)).toEqual([
      'TEST_D',
      'TEST_B',
      'TEST_A',
      'TEST_C',
    ])
  })

  it('carries the base envelope through untouched', () => {
    const { template } = composeVisaTemplate({ base: BASE, layers: ALL_LAYERS })
    const { documentRequirements: _drop, ...envelope } = template
    expect(envelope).toEqual(BASE)
  })

  it('reports which layer owns each code', () => {
    const { ownership } = composeVisaTemplate({
      base: BASE,
      layers: ALL_LAYERS,
    })
    expect(Object.fromEntries(ownership)).toEqual({
      TEST_A: 'test-common',
      TEST_B: 'test-common',
      TEST_C: 'test-dest',
      TEST_D: 'test-jx',
    })
  })

  it('keeps ownership off the requirement itself', () => {
    // Ownership is information the composer and its invariants need; putting it
    // on the requirement would change the shape every consumer sees, and the
    // Greece pin asserts that shape exactly.
    const { template } = composeVisaTemplate({ base: BASE, layers: ALL_LAYERS })
    for (const requirement of template.documentRequirements) {
      expect(Object.keys(requirement)).not.toContain('layer')
      expect(Object.keys(requirement)).not.toContain('ownedBy')
    }
  })

  it('merges sources in layer order', () => {
    const { sources } = composeVisaTemplate({ base: BASE, layers: ALL_LAYERS })
    expect(sources.map((s) => s.id)).toEqual(['src-eu', 'src-jx'])
  })
})

describe('composeVisaTemplate — refinement is citations and nothing else', () => {
  const composed = () =>
    composeVisaTemplate({ base: BASE, layers: ALL_LAYERS }).template
      .documentRequirements

  it('appends the refining layer citation after the owner declaration', () => {
    const a = composed().find((r) => r.code === 'TEST_A')
    expect(a?.sourceRefs).toEqual(['src-eu', 'src-jx'])
  })

  it('changes nothing else about a refined requirement', () => {
    // Field-wise rather than "it has the right sourceRefs": if the refinement
    // contract is ever widened, this is what notices the extra field moving.
    const refined = composed().find((r) => r.code === 'TEST_A')
    const { sourceRefs: _a, contractKey: _key, ...refinedRest } = refined ?? {}
    const { sourceRefs: _b, ...ownerRest } = TEST_A
    expect(refinedRest).toEqual(ownerRest)
    // The key is set aside above because only the composer can write it — and
    // it must be exactly the owner's contract when nothing was attached, since
    // this refinement adds citations only.
    expect(refined?.contractKey).toBe(`TEST_A@${TEST_A.revision}`)
  })

  it('cannot change a revision — the owner keeps it', () => {
    // The property that makes a dossier portable: satisfiedRevision: N means
    // one thing in every composition (ADR-049, ADR-051).
    const withoutOverlay = composeVisaTemplate({
      base: BASE,
      layers: [commonLayer, destinationLayer],
    }).template.documentRequirements
    const withOverlay = composed()
    const revisionOf = (rs: DocumentRequirement[], code: string) =>
      rs.find((r) => r.code === code)?.revision
    expect(revisionOf(withOverlay, 'TEST_A')).toBe(
      revisionOf(withoutOverlay, 'TEST_A')
    )
  })

  it('does not duplicate a citation the owner already declares', () => {
    const { template } = composeVisaTemplate({
      base: BASE,
      layers: [
        commonLayer,
        {
          id: 'test-jy',
          kind: 'jurisdiction',
          refine: [{ code: 'TEST_A', addSourceRefs: ['src-eu'] }],
        },
      ],
    })
    expect(
      template.documentRequirements.find((r) => r.code === 'TEST_A')?.sourceRefs
    ).toEqual(['src-eu'])
  })

  it('copies an unrefined requirement faithfully, adding only its contract key', () => {
    // This used to assert referential identity with the authored object, on the
    // grounds that the resolver's output feeds a dozen useMemo dependency
    // arrays. That reason survives; the assertion could not. Every composed
    // requirement now carries a `contractKey` naming the acceptance contract
    // *this* composition renders, and a layer author cannot write it — only the
    // composer knows which fragments applied.
    //
    // What protects the useMemo consumers is that production resolves through
    // compositions built once at module load, so `resolveVisaTemplate` hands
    // back the same objects on every call. That is asserted directly below,
    // rather than inferred from this one.
    const { template } = composeVisaTemplate({ base: BASE, layers: ALL_LAYERS })
    const b = template.documentRequirements.find((r) => r.code === 'TEST_B')
    expect(b).not.toBe(TEST_B)
    expect(b).toEqual({ ...TEST_B, contractKey: `TEST_B@${TEST_B.revision}` })
  })

  it('hands the same references back on every resolve', () => {
    // The property the memoized consumers actually depend on. A composition is
    // built once at module load, so repeated resolution is free and stable.
    const a = resolveVisaTemplate('GR', 'short_stay_tourism')
    const b = resolveVisaTemplate('GR', 'short_stay_tourism')
    expect(a).toBe(b)
    expect(a?.documentRequirements[0]).toBe(b?.documentRequirements[0])
  })

  it('gives a requirement with no citations an array when refined', () => {
    const { template } = composeVisaTemplate({
      base: BASE,
      layers: [
        commonLayer,
        {
          id: 'test-jy',
          kind: 'jurisdiction',
          refine: [{ code: 'TEST_B', addSourceRefs: ['src-jy'] }],
          sources: [source('src-jy')],
        },
      ],
    })
    expect(
      template.documentRequirements.find((r) => r.code === 'TEST_B')?.sourceRefs
    ).toEqual(['src-jy'])
  })
})

describe('composeVisaTemplate — conflict guards', () => {
  it('rejects two layers declaring the same code', () => {
    expectKind('duplicate-add', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          commonLayer,
          { id: 'test-dupe', kind: 'destination', add: [req('TEST_A')] },
        ],
      })
    )
  })

  it('rejects a refinement of a code nothing declares', () => {
    expectKind('dangling-refine', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          commonLayer,
          {
            id: 'test-jy',
            kind: 'jurisdiction',
            refine: [{ code: 'TEST_MISSING', addSourceRefs: ['src-eu'] }],
          },
        ],
      })
    )
  })

  it('rejects a layer refining a requirement it owns', () => {
    expectKind('self-refine', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          {
            id: 'test-selfish',
            kind: 'common',
            add: [req('TEST_A', { sourceRefs: ['src-eu'] })],
            refine: [{ code: 'TEST_A', addSourceRefs: ['src-eu'] }],
            sources: [source('src-eu')],
          },
        ],
      })
    )
  })

  it("rejects an earlier layer refining a later layer's requirement", () => {
    // The rule ADR-052 always stated and the composer did not enforce. The
    // two-pass design resolves refinements against every declaration, so
    // without this guard a destination layer could refine a jurisdiction-owned
    // requirement even though it composes first — which is how the Greek
    // mission citations could have ended up in the wrong layer.
    expectKind('forward-refine', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          commonLayer,
          {
            id: 'test-dest-reaching-forward',
            kind: 'destination',
            refine: [{ code: 'TEST_D', addSourceRefs: ['src-eu'] }],
          },
          jurisdictionLayer,
        ],
      })
    )
  })

  it('still allows a later layer to refine an earlier one', () => {
    // The legitimate direction, asserted positively so the new guard cannot be
    // over-tightened into rejecting the case the mechanism exists for.
    const { template } = composeVisaTemplate({
      base: BASE,
      layers: ALL_LAYERS,
    })
    expect(
      template.documentRequirements.find((r) => r.code === 'TEST_A')?.sourceRefs
    ).toEqual(['src-eu', 'src-jx'])
  })

  it('decides by position, not by kind', () => {
    // Two layers of one kind: the later may refine the earlier. Kind fixes the
    // composition order; it does not by itself say who may refine whom.
    const { template } = composeVisaTemplate({
      base: BASE,
      layers: [
        commonLayer,
        {
          id: 'test-common-2',
          kind: 'common',
          refine: [{ code: 'TEST_B', addSourceRefs: ['src-eu'] }],
        },
      ],
    })
    expect(
      template.documentRequirements.find((r) => r.code === 'TEST_B')?.sourceRefs
    ).toEqual(['src-eu'])
  })

  it('rejects a refinement carrying any key beyond code and addSourceRefs', () => {
    // The type already forbids this, so the cast is the point: it simulates a
    // future author widening CitationRefinement. The guard is what makes that
    // widening a deliberate act instead of a one-line type edit.
    const widened = {
      code: 'TEST_A',
      addSourceRefs: ['src-jx'],
      required: false,
    } as unknown as { code: string; addSourceRefs: string[] }

    expectKind('invalid-refinement', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          commonLayer,
          {
            id: 'test-jy',
            kind: 'jurisdiction',
            refine: [widened],
            sources: [source('src-jx')],
          },
        ],
      })
    )
  })

  it('rejects a citation that resolves against no composed source', () => {
    expectKind('dangling-source-ref', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          {
            id: 'test-common',
            kind: 'common',
            add: [req('TEST_A', { sourceRefs: ['src-nowhere'] })],
          },
        ],
      })
    )
  })

  it('rejects a citation appended by a layer that does not provide it', () => {
    expectKind('dangling-source-ref', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          commonLayer,
          {
            id: 'test-jy',
            kind: 'jurisdiction',
            refine: [{ code: 'TEST_A', addSourceRefs: ['src-unprovided'] }],
          },
        ],
      })
    )
  })

  it('rejects one source id meaning two different records', () => {
    expectKind('duplicate-source', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          commonLayer,
          {
            id: 'test-jy',
            kind: 'jurisdiction',
            sources: [{ ...source('src-eu'), authority: 'Someone Else' }],
          },
        ],
      })
    )
  })

  it('accepts the same source id declared identically twice', () => {
    const { sources } = composeVisaTemplate({
      base: BASE,
      layers: [
        commonLayer,
        { id: 'test-jy', kind: 'jurisdiction', sources: [source('src-eu')] },
      ],
    })
    expect(sources.map((s) => s.id)).toEqual(['src-eu'])
  })

  it('rejects layers supplied out of composition order', () => {
    expectKind('layer-order', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [jurisdictionLayer, commonLayer],
      })
    )
  })

  it('accepts several layers of the same kind', () => {
    const { ownership } = composeVisaTemplate({
      base: BASE,
      layers: [
        commonLayer,
        { id: 'test-common-2', kind: 'common', add: [req('TEST_E')] },
      ],
    })
    expect(ownership.get('TEST_E')).toBe('test-common-2')
  })
})

describe('composeVisaTemplate — the order contract', () => {
  it('rejects an order that omits a composed code', () => {
    expectKind('order-mismatch', () =>
      composeVisaTemplate({
        base: BASE,
        layers: ALL_LAYERS,
        requirementOrder: ['TEST_A', 'TEST_B', 'TEST_C'],
      })
    )
  })

  it('rejects an order naming a code nothing composed', () => {
    expectKind('order-mismatch', () =>
      composeVisaTemplate({
        base: BASE,
        layers: ALL_LAYERS,
        requirementOrder: [
          'TEST_A',
          'TEST_B',
          'TEST_C',
          'TEST_D',
          'TEST_GHOST',
        ],
      })
    )
  })

  it('rejects an order that repeats a code', () => {
    expectKind('order-mismatch', () =>
      composeVisaTemplate({
        base: BASE,
        layers: ALL_LAYERS,
        requirementOrder: ['TEST_A', 'TEST_A', 'TEST_B', 'TEST_C', 'TEST_D'],
      })
    )
  })

  it('names both directions of a mismatch in one message', () => {
    // A move usually produces one of each, and reporting only half sends the
    // reader looking for the wrong mistake.
    try {
      composeVisaTemplate({
        base: BASE,
        layers: ALL_LAYERS,
        requirementOrder: ['TEST_A', 'TEST_B', 'TEST_C', 'TEST_GHOST'],
      })
      throw new Error('expected a CompositionError')
    } catch (error) {
      const message = (error as CompositionError).message
      expect(message).toContain('TEST_GHOST')
      expect(message).toContain('TEST_D')
    }
  })
})

/**
 * `offer` / `activate` — ownership and presence, separated (ADR-052d).
 *
 * Synthetic throughout, like everything else in this file, and deliberately so:
 * this slice adds the capability and migrates no production requirement, so
 * there is nothing here that claims anything about Greece, Germany or Spain.
 * The pilot that moves one real identity is a separate slice with its own
 * evidence.
 *
 * The rule every assertion below serves, stated once:
 *
 * > An offered requirement asserts no applicability, presence, requiredness or
 * > authority in any production composition until an authorized later layer
 * > activates it.
 */

/** The neutral definition home: owns the identity, asks nobody for it. */
const practiceLayer: RequirementLayer = {
  id: 'test-practice',
  kind: 'jurisdiction',
  offer: [req('TEST_OFFERED')],
}

/** A mission that does ask for it, on its own evidence. */
const missionLayer: RequirementLayer = {
  id: 'test-mission',
  kind: 'jurisdiction',
  activate: [{ code: 'TEST_OFFERED', addSourceRefs: ['src-mission'] }],
  sources: [source('src-mission')],
}

const OFFERED_LAYERS = [commonLayer, destinationLayer, practiceLayer]
const ACTIVATED_LAYERS = [...OFFERED_LAYERS, missionLayer]

describe('composeVisaTemplate — an offered definition asks nobody', () => {
  const composed = () =>
    composeVisaTemplate({ base: BASE, layers: OFFERED_LAYERS })

  it('keeps an unactivated offer out of the composed template', () => {
    // The normative rule itself. Everything downstream — seeding, readiness,
    // the next-document recommendation, the review checklist — reads this list,
    // so absence here is absence everywhere.
    expect(composed().template.documentRequirements.map((r) => r.code)).toEqual(
      ['TEST_A', 'TEST_B', 'TEST_C']
    )
  })

  it('reports it as offered, not as owned', () => {
    // Two maps because the two questions are different. `ownership` answers
    // "what composed, and whose is it" — which the registry invariants read to
    // decide whether a layer is dead configuration — and an inert definition
    // did not compose. `offered` is how that same reader can still see it.
    const { ownership, offered, activations } = composed()
    expect(ownership.has('TEST_OFFERED')).toBe(false)
    expect(offered.get('TEST_OFFERED')).toBe('test-practice')
    expect(activations.has('TEST_OFFERED')).toBe(false)
  })

  it('still owns the code registry-wide, so nothing else may declare it', () => {
    // Inert is not unclaimed. ADR-052d relaxes neither half of one-code-one-
    // owner; the whole point was to satisfy a third destination *without*
    // relaxing it.
    expectKind('duplicate-offer', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          practiceLayer,
          {
            id: 'test-mission',
            kind: 'jurisdiction',
            add: [req('TEST_OFFERED')],
          },
        ],
      })
    )
  })

  it('refuses a second offer of the same code', () => {
    expectKind('duplicate-offer', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          practiceLayer,
          {
            id: 'test-practice-2',
            kind: 'jurisdiction',
            offer: [req('TEST_OFFERED')],
          },
        ],
      })
    )
  })

  it('refuses an offer of a code an earlier layer adds', () => {
    // The other direction of the same collision, because the fix differs: here
    // somebody is defining an identity that already has a home.
    expectKind('duplicate-offer', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          commonLayer,
          { id: 'test-practice', kind: 'jurisdiction', offer: [req('TEST_A')] },
        ],
      })
    )
  })

  it('refuses a citation attached to something nobody asks for', () => {
    // An inert definition asserts nothing, so there is nothing for a citation
    // to vouch for (ADR-048, ADR-052d decision 6). Reported as its own kind:
    // "no layer declares it" would send the author to the wrong file.
    expectKind('refine-inactive', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          ...OFFERED_LAYERS,
          {
            id: 'test-mission',
            kind: 'jurisdiction',
            refine: [{ code: 'TEST_OFFERED', addSourceRefs: ['src-mission'] }],
            sources: [source('src-mission')],
          },
        ],
      })
    )
  })

  it('refuses a satisfaction group routed through it', () => {
    // A group naming an inert member promises the applicant a route the
    // composition does not carry.
    expectKind('invalid-group', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          ...OFFERED_LAYERS,
          {
            id: 'test-mission',
            kind: 'jurisdiction',
            groups: [
              {
                id: 'test-group',
                labelKey: 'test:groups.test-group.label',
                anyOf: ['TEST_A', 'TEST_OFFERED'],
              },
            ],
          },
        ],
      })
    )
  })

  it('refuses a pinned order that names it', () => {
    expectKind('order-mismatch', () =>
      composeVisaTemplate({
        base: BASE,
        layers: OFFERED_LAYERS,
        requirementOrder: ['TEST_A', 'TEST_B', 'TEST_C', 'TEST_OFFERED'],
      })
    )
  })
})

describe('composeVisaTemplate — activation is the assertion that asks', () => {
  const composed = () =>
    composeVisaTemplate({ base: BASE, layers: ACTIVATED_LAYERS })

  it('makes the offered requirement present', () => {
    expect(composed().template.documentRequirements.map((r) => r.code)).toEqual(
      ['TEST_A', 'TEST_B', 'TEST_C', 'TEST_OFFERED']
    )
  })

  it('leaves ownership with the layer that offered it', () => {
    // Activation is authority, not ownership. If the activating layer owned the
    // row, one destination's retirement would become another's build failure —
    // the inversion ADR-052d weighed and refused.
    const { ownership, activations } = composed()
    expect(ownership.get('TEST_OFFERED')).toBe('test-practice')
    expect(activations.get('TEST_OFFERED')).toBe('test-mission')
  })

  it('carries the activating layer own citations', () => {
    const activated = composed().template.documentRequirements.find(
      (r) => r.code === 'TEST_OFFERED'
    )
    expect(activated?.sourceRefs).toEqual(['src-mission'])
  })

  it('changes nothing else about the definition', () => {
    // Field-wise, like the refinement proof above: if activation is ever
    // widened into something contract-bearing, this is what notices.
    const activated = composed().template.documentRequirements.find(
      (r) => r.code === 'TEST_OFFERED'
    )
    const { sourceRefs: _refs, contractKey: _key, ...rest } = activated ?? {}
    expect(rest).toEqual(req('TEST_OFFERED'))
  })

  it('does not move the contract key', () => {
    // ADR-052d decision 5: activation changes whether you are asked, not what
    // satisfies the ask — the same rule ADR-052c applies to a widening. A claim
    // stored against `TEST_OFFERED@1` in one composition still reads as
    // satisfied in the composition that activates it.
    const activated = composed().template.documentRequirements.find(
      (r) => r.code === 'TEST_OFFERED'
    )
    expect(activated?.contractKey).toBe('TEST_OFFERED@1')
    expect(activated?.revision).toBe(1)
  })

  it('moves the key when the activating layer attaches acceptance detail', () => {
    // The other half of decision 5, and the reason it is not simply "activation
    // never moves the key": detail attached *by* the activating layer is a
    // fragment like any other, and a fragment moves the key.
    const { template } = composeVisaTemplate({
      base: BASE,
      layers: [
        ...OFFERED_LAYERS,
        {
          id: 'test-mission',
          kind: 'jurisdiction',
          activate: [
            {
              code: 'TEST_OFFERED',
              addSourceRefs: ['src-mission'],
              addDetail: {
                detailKeys: ['test:requirements.TEST_OFFERED.detail'],
                revision: 1,
              },
            },
          ],
          sources: [source('src-mission')],
        },
      ],
    })
    const activated = template.documentRequirements.find(
      (r) => r.code === 'TEST_OFFERED'
    )
    expect(activated?.contractKey).toBe('TEST_OFFERED@1+test-mission:1')
    expect(activated?.detailKeys).toEqual([
      'test:requirements.TEST_OFFERED.detail',
    ])
    // Still the owner's revision. A fragment never supersedes it (ADR-051b).
    expect(activated?.revision).toBe(1)
  })

  it('stays key-neutral when the activating layer widens the population', () => {
    const occupational = req('TEST_OFFERED', {
      conditionalOn: {
        field: 'employment.occupation',
        operator: 'equals',
        value: 'company_owner',
      },
    })
    const { template } = composeVisaTemplate({
      base: BASE,
      layers: [
        { id: 'test-practice', kind: 'jurisdiction', offer: [occupational] },
        {
          id: 'test-mission',
          kind: 'jurisdiction',
          activate: [
            {
              code: 'TEST_OFFERED',
              addApplicableOccupations: ['independent_professional'],
            },
          ],
        },
      ],
    })
    const activated = template.documentRequirements.find(
      (r) => r.code === 'TEST_OFFERED'
    )
    expect(activated?.applicableOccupations).toEqual([
      'independent_professional',
    ])
    expect(activated?.contractKey).toBe('TEST_OFFERED@1')
  })

  it('applies the widening guards to an activation too', () => {
    // The prohibition list is shared, not re-derived: an activation may do
    // nothing a refinement may not do (ADR-052b decision 6, unamended). Here
    // the base does not route on occupation at all.
    expectKind('invalid-widening', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          practiceLayer,
          {
            id: 'test-mission',
            kind: 'jurisdiction',
            activate: [
              {
                code: 'TEST_OFFERED',
                addApplicableOccupations: ['company_owner'],
              },
            ],
          },
        ],
      })
    )
  })

  it('lets a later layer cite what an earlier one activated', () => {
    // The legitimate direction, asserted positively so the new guards cannot be
    // over-tightened into rejecting the case the mechanism exists for.
    const { template } = composeVisaTemplate({
      base: BASE,
      layers: [
        ...ACTIVATED_LAYERS,
        {
          id: 'test-later',
          kind: 'jurisdiction',
          refine: [{ code: 'TEST_OFFERED', addSourceRefs: ['src-later'] }],
          sources: [source('src-later')],
        },
      ],
    })
    expect(
      template.documentRequirements.find((r) => r.code === 'TEST_OFFERED')
        ?.sourceRefs
    ).toEqual(['src-mission', 'src-later'])
  })

  it('pins the activation in a requirementOrder like any other row', () => {
    // What makes an activation a reviewed line in a diff rather than a side
    // effect: a pack that pins its order cannot gain a requirement without the
    // order changing too.
    const { template } = composeVisaTemplate({
      base: BASE,
      layers: ACTIVATED_LAYERS,
      requirementOrder: ['TEST_OFFERED', 'TEST_A', 'TEST_B', 'TEST_C'],
    })
    expect(template.documentRequirements.map((r) => r.code)).toEqual([
      'TEST_OFFERED',
      'TEST_A',
      'TEST_B',
      'TEST_C',
    ])
  })

  it('refuses a pinned order that omits what it activated', () => {
    expectKind('order-mismatch', () =>
      composeVisaTemplate({
        base: BASE,
        layers: ACTIVATED_LAYERS,
        requirementOrder: ['TEST_A', 'TEST_B', 'TEST_C'],
      })
    )
  })
})

describe('composeVisaTemplate — activation guards', () => {
  const mission = (
    activate: RequirementLayer['activate'],
    extra: Partial<RequirementLayer> = {}
  ): RequirementLayer => ({
    id: 'test-mission',
    kind: 'jurisdiction',
    activate,
    ...extra,
  })

  it('rejects activating a code nothing declares', () => {
    expectKind('dangling-activate', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [commonLayer, mission([{ code: 'TEST_MISSING' }])],
      })
    )
  })

  it('rejects activating a code an earlier layer added', () => {
    // A different mistake from the one above and from the one below: the code
    // is already asked for by every composition that includes its layer, so
    // there is nothing to activate.
    expectKind('activate-not-offered', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [commonLayer, mission([{ code: 'TEST_A' }])],
      })
    )
  })

  it('rejects two layers activating one offer', () => {
    // Asking twice for one document would count its readiness twice.
    expectKind('duplicate-activate', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          practiceLayer,
          missionLayer,
          {
            id: 'test-mission-2',
            kind: 'jurisdiction',
            activate: [{ code: 'TEST_OFFERED' }],
          },
        ],
      })
    )
  })

  it('rejects one layer activating the same offer twice', () => {
    expectKind('duplicate-activate', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          practiceLayer,
          mission([{ code: 'TEST_OFFERED' }, { code: 'TEST_OFFERED' }]),
        ],
      })
    )
  })

  it('rejects a layer activating its own offer', () => {
    // An offer exists precisely to be asked for by somebody else, on their
    // evidence. A layer that wants its own definition asked for has `add`.
    expectKind('self-activate', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          {
            id: 'test-practice',
            kind: 'jurisdiction',
            offer: [req('TEST_OFFERED')],
            activate: [{ code: 'TEST_OFFERED' }],
          },
        ],
      })
    )
  })

  it('rejects activation reaching a later layer offer', () => {
    // Activation travels backwards exactly as refinement does.
    expectKind('forward-activate', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          {
            id: 'test-early',
            kind: 'common',
            activate: [{ code: 'TEST_OFFERED' }],
          },
          practiceLayer,
        ],
      })
    )
  })

  it('rejects a refinement wedged between the offer and its activation', () => {
    // Presence can now arrive later than ownership, and the direction rule has
    // to follow presence: a citation attached here would vouch for an assertion
    // that has not been made yet, which is how one mission authority ends up
    // decorating another ask (ADR-052d decision 6).
    expectKind('forward-refine', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          practiceLayer,
          {
            id: 'test-between',
            kind: 'jurisdiction',
            refine: [{ code: 'TEST_OFFERED', addSourceRefs: ['src-between'] }],
            sources: [source('src-between')],
          },
          missionLayer,
        ],
      })
    )
  })

  it('rejects a layer that both activates and refines one code', () => {
    // One assertion, one line. The same reasoning that refuses a layer refining
    // what it owns: two ways to say a thing is how one of them gets forgotten,
    // and a forgotten citation renders as no provenance at all.
    expectKind('invalid-activation', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          practiceLayer,
          mission([{ code: 'TEST_OFFERED', addSourceRefs: ['src-mission'] }], {
            refine: [{ code: 'TEST_OFFERED', addSourceRefs: ['src-mission'] }],
            sources: [source('src-mission')],
          }),
        ],
      })
    )
  })

  it('rejects an activation carrying a contract-bearing key', () => {
    // The cast simulates a future author widening RequirementActivation. The
    // guard is what makes that widening a deliberate act rather than a one-line
    // type edit — and it is the *same* guard the refinement path uses, so the
    // two cannot drift apart in the permissive direction.
    const widened = {
      code: 'TEST_OFFERED',
      required: false,
    } as unknown as { code: string }

    expectKind('invalid-activation', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [practiceLayer, mission([widened])],
      })
    )
  })

  it('rejects an activation smuggling an override through its fragment', () => {
    const widened = {
      code: 'TEST_OFFERED',
      addDetail: {
        detailKeys: ['test:requirements.TEST_OFFERED.detail'],
        revision: 1,
        descriptionKey: 'test:requirements.TEST_OFFERED.description',
      },
    } as unknown as { code: string }

    expectKind('invalid-activation', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [practiceLayer, mission([widened])],
      })
    )
  })

  it('rejects an activation attaching an empty fragment', () => {
    expectKind('invalid-activation', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          practiceLayer,
          mission([
            {
              code: 'TEST_OFFERED',
              addDetail: { detailKeys: [], revision: 1 },
            },
          ]),
        ],
      })
    )
  })

  it('rejects an activation citing a source no composed layer provides', () => {
    // Provenance belongs to the activating assertion, so an unresolvable
    // citation on an activation is the same failure as anywhere else: it
    // renders as no provenance at all, which reads as "unverified" (ADR-046).
    expectKind('dangling-source-ref', () =>
      composeVisaTemplate({
        base: BASE,
        layers: [
          practiceLayer,
          mission([{ code: 'TEST_OFFERED', addSourceRefs: ['src-nowhere'] }]),
        ],
      })
    )
  })
})
