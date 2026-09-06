import { describe, it, expect } from 'vitest'
import { composeVisaTemplate } from '@/config/composition'
import { getAllCountryConfigs } from '@/config/countries'
import { greeceTourismComposition } from '@/config/countries/greece/tourism'
import {
  soleForeignAuthorityCodes,
  type PublishingAuthority,
} from '@/tests/support/source-authority'
import type {
  RequirementLayer,
  RequirementSource,
  VisaTypeTemplate,
} from '@/config/types'

/**
 * A pack must not rest on another state's authority.
 *
 * The quarantine compares a source's `jurisdiction` against the jurisdictions a
 * composition contributes, and that is blind to the failure Slice A repaired:
 * the Commission's harmonised list for Türkiye and the Greek mission's
 * rendering of it both carry `jurisdiction: 'TR'`, so a German pack citing the
 * Greek mission for SGK documents would have satisfied every check this project
 * had. The missing axis is who *published* the source.
 *
 * ON PRODUCTION TODAY THIS IS AN EASY TEST, AND SAYING SO MATTERS. Greece's
 * destination is `GR` and every destination-published source it cites is Greek,
 * so nothing is foreign and the production assertion below cannot currently
 * fail. The synthetic proofs are what establish that the invariant works; the
 * production one becomes load-bearing the day a second pack registers, which is
 * exactly when it is needed. A guard that has only ever been observed passing
 * is indistinguishable from one that cannot fail, so the synthetic scope
 * carries the burden until then.
 */

/**
 * Who published each production source.
 *
 * Stated per source rather than derived from any field, and living beside the
 * production assertions rather than in the shared helper, so the synthetic
 * proofs and the production invariant never take their truth from each other.
 */
const PRODUCTION_PUBLISHER: Record<string, PublishingAuthority> = {
  // The Union's own instruments. Neutral by their nature: no member state
  // publishes them and every member state's consulates apply them.
  'eu-visa-code-art11': { kind: 'supranational' },
  'eu-visa-code-art12': { kind: 'supranational' },
  'eu-visa-code-art15': { kind: 'supranational' },
  'eu-visa-code-annex2': { kind: 'supranational' },
  // Commission Implementing Decision C(2021) 5156 — adopted by the Commission
  // for the Türkiye jurisdiction, so it governs `TR` while belonging to no
  // destination. This entry is the whole point of the distinction.
  'eu-c2021-5156-turkey-annex3': { kind: 'supranational' },
  // Hellenic Republic publications. All three govern applications for Greece
  // or lodged in Türkiye, and all three are Greece's to cite.
  'gr-mfa-general': { kind: 'destination', countryCode: 'GR' },
  'gr-tr-harmonised-list': { kind: 'destination', countryCode: 'GR' },
  'gr-mfa-tr-visa-page': { kind: 'destination', countryCode: 'GR' },
}

const publisherOf = (id: string) => PRODUCTION_PUBLISHER[id]

const PRODUCTION_PACKS = getAllCountryConfigs().map((pack) => ({
  countryCode: pack.countryCode,
  sources: pack.sources ?? [],
  composition: greeceTourismComposition,
}))

describe('provenance authority — production packs', () => {
  it('classifies every source a pack composes', () => {
    // A new source cannot slip past the invariant by simply not being listed:
    // `soleForeignAuthorityCodes` treats an unclassified citation as unable to
    // vouch for anything, and this is what names it.
    const unclassified = PRODUCTION_PACKS.flatMap((pack) =>
      pack.sources.map((s) => s.id).filter((id) => !publisherOf(id))
    )
    expect(unclassified).toEqual([])
  })

  it('has both kinds of authority to distinguish', () => {
    // Without one of each the classification says nothing, and every assertion
    // below would pass for the wrong reason.
    const kinds = Object.values(PRODUCTION_PUBLISHER).map((p) => p.kind)
    expect(kinds).toContain('supranational')
    expect(kinds).toContain('destination')
  })

  it.each(PRODUCTION_PACKS.map((p) => [p.countryCode, p] as const))(
    '%s rests on no other destination’s authority alone',
    (_code, pack) => {
      expect(
        soleForeignAuthorityCodes(
          pack.composition,
          pack.countryCode,
          publisherOf
        )
      ).toEqual([])
    }
  )

  it('the neutral instrument is valid for a destination that is not Greece', () => {
    // The property that lets a future Germany compose `tr-filing` at all: the
    // Commission act vouches for a requirement regardless of destination.
    const commission = publisherOf('eu-c2021-5156-turkey-annex3')
    expect(commission).toEqual({ kind: 'supranational' })

    // Evaluated against a destination that is deliberately not GR, every Greek
    // mission citation stops vouching for anything — and the result is still
    // empty, because Slice A gave each of those requirements the Commission
    // act as well.
    //
    // This is the strongest real statement available: the Türkiye layer is now
    // genuinely reusable. Before Slice A the same evaluation named **ten**
    // requirements — every one whose sole authority was the Greek mission.
    // `BANK_STATEMENTS` was the eleventh to gain the Commission citation but
    // would have passed regardless, because it already cited Annex II. The
    // number is measured by reverting the citations and re-running, not
    // reasoned from the count of requirements that changed.
    expect(
      soleForeignAuthorityCodes(greeceTourismComposition, 'DE', publisherOf)
    ).toEqual([])
  })
})

/**
 * The proofs that actually establish the invariant, on synthetic packs with
 * their own classification.
 *
 * Two destinations, each with its own mission source, plus one neutral
 * instrument — the smallest arrangement in which "another destination's
 * authority" is a thing that can exist.
 */
describe('provenance authority — synthetic', () => {
  const NEUTRAL = 'test-src-neutral'
  const A_MISSION = 'test-src-a-mission'
  const B_MISSION = 'test-src-b-mission'

  const SYNTHETIC_PUBLISHER: Record<string, PublishingAuthority> = {
    [NEUTRAL]: { kind: 'supranational' },
    [A_MISSION]: { kind: 'destination', countryCode: 'TESTLAND-A' },
    [B_MISSION]: { kind: 'destination', countryCode: 'TESTLAND-B' },
  }
  const syntheticPublisherOf = (id: string) => SYNTHETIC_PUBLISHER[id]

  const source = (id: string): RequirementSource => ({
    id,
    authority: `Authority ${id}`,
    titleKey: `test:sources.${id}.title`,
    sourceType: 'government',
    jurisdiction: 'TX',
  })

  const BASE: Omit<VisaTypeTemplate, 'documentRequirements'> = {
    id: 'test-authority',
    visaType: 'short_stay_tourism',
    nameKey: 'test:template.name',
    preparationMilestones: [],
    templateVersion: '1.0.0',
    reviewStatus: 'unverified',
  }

  /** A jurisdiction layer whose one requirement cites exactly `refs`. */
  const layerCiting = (refs: string[]): RequirementLayer => ({
    id: 'test-jurisdiction',
    kind: 'jurisdiction',
    add: [
      {
        code: 'TEST_LOCAL_DOC',
        nameKey: 'test:requirements.TEST_LOCAL_DOC.name',
        category: 'supporting',
        ownerType: 'applicant',
        required: true,
        revision: 1,
        sourceRefs: refs,
      },
    ],
    sources: refs.map(source),
  })

  const composeFor = (refs: string[]) =>
    composeVisaTemplate({ base: BASE, layers: [layerCiting(refs)] })

  it('rejects a pack resting solely on another destination’s mission', () => {
    // The Germany-citing-Greece case in miniature, and the reason this
    // invariant exists.
    expect(
      soleForeignAuthorityCodes(
        composeFor([A_MISSION]),
        'TESTLAND-B',
        syntheticPublisherOf
      )
    ).toEqual(['TEST_LOCAL_DOC'])
  })

  it('accepts the same citation once the neutral instrument is alongside it', () => {
    // Exactly the shape Slice A produced: the jurisdiction-level authority
    // first, a mission's rendering of it second.
    expect(
      soleForeignAuthorityCodes(
        composeFor([NEUTRAL, A_MISSION]),
        'TESTLAND-B',
        syntheticPublisherOf
      )
    ).toEqual([])
  })

  it('lets a destination cite its own mission', () => {
    expect(
      soleForeignAuthorityCodes(
        composeFor([A_MISSION]),
        'TESTLAND-A',
        syntheticPublisherOf
      )
    ).toEqual([])
  })

  it('accepts the neutral instrument alone, for any destination', () => {
    for (const destination of ['TESTLAND-A', 'TESTLAND-B', 'TESTLAND-C']) {
      expect(
        soleForeignAuthorityCodes(
          composeFor([NEUTRAL]),
          destination,
          syntheticPublisherOf
        )
      ).toEqual([])
    }
  })

  it('does not judge a requirement that cites nothing', () => {
    // Uncited is coverage's question (ADR-046). Answering it here would make
    // one failure mean two different things.
    const uncited = composeVisaTemplate({
      base: BASE,
      layers: [
        {
          id: 'test-jurisdiction',
          kind: 'jurisdiction',
          add: [
            {
              code: 'TEST_UNCITED',
              nameKey: 'test:requirements.TEST_UNCITED.name',
              category: 'supporting',
              ownerType: 'applicant',
              required: true,
              revision: 1,
            },
          ],
        },
      ],
    })
    expect(
      soleForeignAuthorityCodes(uncited, 'TESTLAND-B', syntheticPublisherOf)
    ).toEqual([])
  })

  it('refuses to be vouched for by a source it cannot classify', () => {
    // An unknown citation must not read as acceptable. Silence is not consent
    // where provenance is concerned.
    expect(
      soleForeignAuthorityCodes(
        composeFor(['test-src-unknown']),
        'TESTLAND-B',
        () => undefined
      )
    ).toEqual(['TEST_LOCAL_DOC'])
  })
})
