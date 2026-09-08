import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import { composeVisaTemplate, CompositionError } from '@/config/composition'
import { greeceTourismComposition } from '@/config/countries/greece/tourism'
import { germanyTourismComposition } from '@/config/countries/germany/tourism'
import { ALL_REQUIREMENT_LAYERS } from '@/config/countries/layers'
import { PRODUCTION_COMPOSITIONS } from '@/tests/support/production-compositions'
import { dynamicT } from '@/lib/i18n-dynamic'
import type {
  DocumentRequirement,
  RequirementLayer,
  RequirementSource,
} from '@/config/types'

/**
 * C1 — composition-scoped acceptance detail.
 *
 * A refining layer may attach applicant-facing criteria to a requirement it does
 * not own. That is the one thing ADR-052 said it would not build, so this file
 * is where the boundary it replaced is written down: the capability is additive,
 * and everything it was forbidden from doing it must still be unable to do.
 *
 * The synthetic layers below are deliberately not the production ones. Proving
 * "German detail does not reach Greece" against the real packs proves it for the
 * fragments that happen to exist today; proving it against a layer built to leak
 * proves it for the mechanism.
 */

const source = (id: string): RequirementSource => ({
  id,
  authority: 'Test authority',
  titleKey: 'visa-domain:sources.test.title',
  url: `https://example.invalid/${id}`,
  sourceType: 'government',
  jurisdiction: 'TR',
  language: 'en',
})

const shared: DocumentRequirement = {
  code: 'SHARED_DOC',
  nameKey: 'visa-domain:requirements.PHOTOS.name',
  category: 'identity',
  ownerType: 'applicant',
  required: true,
  revision: 1,
}

const common: RequirementLayer = {
  id: 'test-common',
  kind: 'common',
  add: [shared],
  sources: [source('test-common-source')],
}

/** Two mission layers that both refine the same shared requirement. */
const missionA: RequirementLayer = {
  id: 'test-mission-a',
  kind: 'jurisdiction',
  refine: [
    {
      code: 'SHARED_DOC',
      addDetail: { detailKeys: ['test:detail.a'], revision: 1 },
    },
  ],
}
const missionB: RequirementLayer = {
  id: 'test-mission-b',
  kind: 'jurisdiction',
  refine: [
    {
      code: 'SHARED_DOC',
      addDetail: { detailKeys: ['test:detail.b'], revision: 1 },
    },
  ],
}

const base = {
  id: 'test-template',
  visaType: 'short_stay_tourism' as const,
  nameKey: 'visa-domain:visaTypes.schengen-short-stay-tourism',
  templateVersion: '1.0.0',
  reviewStatus: 'unverified' as const,
  preparationMilestones: [],
}

function compose(layers: RequirementLayer[]) {
  return composeVisaTemplate({ base, layers })
}

const only = (result: ReturnType<typeof compose>) =>
  result.template.documentRequirements[0]!

describe('acceptance detail is scoped to the composition that declares it', () => {
  it('gives each composition only its own detail', () => {
    expect(only(compose([common, missionA])).detailKeys).toEqual([
      'test:detail.a',
    ])
    expect(only(compose([common, missionB])).detailKeys).toEqual([
      'test:detail.b',
    ])
  })

  it('leaves a composition that includes neither layer with no detail at all', () => {
    // Absent, not empty. A requirement nobody refined must be indistinguishable
    // from one composed before the capability existed.
    expect(only(compose([common])).detailKeys).toBeUndefined()
  })

  it('does not mutate the owner’s declaration', () => {
    // The leak that would be hardest to see: composition rewriting the shared
    // array in place, so the second pack to compose inherits the first's
    // detail. Both compositions are built, then the source object is checked.
    compose([common, missionA])
    compose([common, missionB])
    expect(shared.detailKeys).toBeUndefined()
    expect(shared.revision).toBe(1)
    expect(common.add?.[0]?.detailKeys).toBeUndefined()
  })

  it('accumulates rather than replaces when two layers both refine', () => {
    const both = only(compose([common, missionA, missionB]))
    expect(both.detailKeys).toEqual(['test:detail.a', 'test:detail.b'])
    // 1 + 1 + 1: the owner's revision plus both fragments.
    expect(both.revision).toBe(3)
  })

  it('moves the composed revision only for the composition that got the detail', () => {
    expect(only(compose([common])).revision).toBe(1)
    expect(only(compose([common, missionA])).revision).toBe(2)
  })
})

describe('acceptance detail cannot become an override', () => {
  const refuse = (refinement: Record<string, unknown>) => () =>
    compose([
      common,
      {
        id: 'test-bad',
        kind: 'jurisdiction',
        refine: [refinement as never],
      },
    ])

  it.each([
    ['required', { code: 'SHARED_DOC', required: false }],
    ['conditionalOn', { code: 'SHARED_DOC', conditionalOn: {} }],
    ['descriptionKey', { code: 'SHARED_DOC', descriptionKey: 'x' }],
    ['revision', { code: 'SHARED_DOC', revision: 9 }],
    ['category', { code: 'SHARED_DOC', category: 'travel' }],
  ])('refuses a refinement carrying %s', (_field, refinement) => {
    expect(refuse(refinement)).toThrow(CompositionError)
    expect(refuse(refinement)).toThrow(/must own the requirement instead/)
  })

  it.each([
    ['required', { required: false }],
    ['descriptionKey', { descriptionKey: 'x' }],
    ['nameKey', { nameKey: 'x' }],
  ])('refuses %s smuggled inside the detail fragment', (_field, extra) => {
    // The cheaper attack: the fragment is a nested object, so a field hidden
    // there would pass a guard that only looked at the refinement's own keys.
    expect(
      refuse({
        code: 'SHARED_DOC',
        addDetail: { detailKeys: ['test:detail.a'], revision: 1, ...extra },
      })
    ).toThrow(/must own the requirement instead/)
  })

  it('refuses a fragment that renders nothing but still moves the revision', () => {
    expect(
      refuse({ code: 'SHARED_DOC', addDetail: { detailKeys: [], revision: 1 } })
    ).toThrow(/supersede claims over nothing/)
  })

  it('refuses a fragment whose revision does not start at 1', () => {
    expect(
      refuse({
        code: 'SHARED_DOC',
        addDetail: { detailKeys: ['test:detail.a'], revision: 0 },
      })
    ).toThrow(/Fragments start at 1/)
  })

  it('cannot reach a requirement no earlier layer declared', () => {
    // Detail is not a way around the direction rule: a fragment aimed at an
    // unknown code is still a dangling refinement.
    expect(
      refuse({
        code: 'NOT_DECLARED',
        addDetail: { detailKeys: ['test:detail.a'], revision: 1 },
      })
    ).toThrow(/which no layer in this composition declares/)
  })
})

describe('the production packs render their own detail and nobody else’s', () => {
  const detailOf = (
    code: string,
    composition: (typeof PRODUCTION_COMPOSITIONS)[number]['composition']
  ) =>
    composition.template.documentRequirements.find((r) => r.code === code)
      ?.detailKeys ?? []

  it('attaches German detail to eight inherited requirements', () => {
    const withDetail = germanyTourismComposition.template.documentRequirements
      .filter((r) => (r.detailKeys ?? []).length > 0)
      .map((r) => r.code)
    expect(withDetail).toEqual([
      'PASSPORT_CURRENT',
      'PHOTOS',
      'TRAVEL_INSURANCE',
      'CIVIL_REGISTRY_EXTRACT',
      'EMPLOYMENT_LETTER',
      'APPROVED_LEAVE',
      'SOCIAL_SECURITY',
      'EMPLOYER_TRADE_REGISTRY',
    ])
    // Every one is inherited, not owned. A layer's own requirement carries its
    // criteria in its own contract, so detail on a code you own would be two
    // ways of saying one thing.
    for (const code of withDetail) {
      expect(germanyTourismComposition.ownership.get(code)).not.toBe(
        'de-tr-mission'
      )
    }
  })

  it('attaches exactly one Greek fragment, to the photograph', () => {
    const withDetail = greeceTourismComposition.template.documentRequirements
      .filter((r) => (r.detailKeys ?? []).length > 0)
      .map((r) => r.code)
    expect(withDetail).toEqual(['PHOTOS'])
  })

  it('lets no fragment key cross into the other pack', () => {
    // The property in its strongest form: a key naming one mission layer must
    // not appear anywhere in a composition that does not include that layer.
    for (const { countryCode, composition } of PRODUCTION_COMPOSITIONS) {
      const foreign = countryCode === 'GR' ? 'de-tr-mission' : 'gr-tr-mission'
      const leaked = composition.template.documentRequirements
        .filter((r) =>
          (r.detailKeys ?? []).some((k) => k.includes(`detail.${foreign}.`))
        )
        .map((r) => r.code)
      expect({ countryCode, leaked }).toEqual({ countryCode, leaked: [] })
    }
  })

  it('keeps the two photograph contracts sharing a base and nothing else', () => {
    expect(detailOf('PHOTOS', greeceTourismComposition)).not.toEqual(
      detailOf('PHOTOS', germanyTourismComposition)
    )
    const gr = greeceTourismComposition.template.documentRequirements.find(
      (r) => r.code === 'PHOTOS'
    )
    const de = germanyTourismComposition.template.documentRequirements.find(
      (r) => r.code === 'PHOTOS'
    )
    expect(gr?.descriptionKey).toBe(de?.descriptionKey)
    expect(gr?.required).toBe(de?.required)
    expect(gr?.conditionalOn).toEqual(de?.conditionalOn)
  })

  it('renders every fragment key in both locales', async () => {
    // The ADR-051a rule, applied to the new field: a criterion the pack holds
    // but cannot show an applicant was never part of any contract, and it
    // would be versioned here as though it were.
    const keys = [
      ...new Set(
        PRODUCTION_COMPOSITIONS.flatMap(({ composition }) =>
          composition.template.documentRequirements.flatMap(
            (r) => r.detailKeys ?? []
          )
        )
      ),
    ]
    expect(keys.length).toBe(15)

    for (const locale of ['en', 'tr'] as const) {
      await i18n.changeLanguage(locale)
      const td = dynamicT(i18n.t.bind(i18n))
      for (const key of keys) {
        const text = td(key, { defaultValue: '' })
        // Resolved to real prose, not to the key itself and not to the empty
        // default that a missing translation returns.
        expect({
          key,
          locale,
          resolved: text !== key && text.length > 10,
        }).toEqual({ key, locale, resolved: true })
      }
    }
    await i18n.changeLanguage('tr')
  })

  it('is declared only by layers that refine, never by an owner', () => {
    // Registry-wide: no `add` anywhere may ship `detailKeys`. Detail is
    // something a *later* layer contributes, and an owner writing it directly
    // would produce a requirement whose base contract already contains the
    // thing the composed revision is supposed to be versioning.
    const owned = ALL_REQUIREMENT_LAYERS.flatMap((layer) =>
      (layer.add ?? [])
        .filter((r) => r.detailKeys !== undefined)
        .map((r) => `${layer.id}:${r.code}`)
    )
    expect(owned).toEqual([])
  })
})
