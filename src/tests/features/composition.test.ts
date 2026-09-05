import { describe, it, expect } from 'vitest'
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
    const { sourceRefs: _a, ...refinedRest } = refined ?? {}
    const { sourceRefs: _b, ...ownerRest } = TEST_A
    expect(refinedRest).toEqual(ownerRest)
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

  it('returns an unrefined requirement by identity', () => {
    // Composition should create the minimum number of new object references,
    // because the resolver's output feeds a dozen useMemo dependency arrays.
    const { template } = composeVisaTemplate({ base: BASE, layers: ALL_LAYERS })
    const b = template.documentRequirements.find((r) => r.code === 'TEST_B')
    expect(b).toBe(TEST_B)
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
