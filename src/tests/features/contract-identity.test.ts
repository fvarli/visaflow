import { describe, it, expect } from 'vitest'
import { composeVisaTemplate } from '@/config/composition'
import {
  applyDocumentUpdate,
  completionStanding,
  effectiveStatus,
} from '@/features/documents/document-semantics'
import { resolveVisaTemplate } from '@/config/countries'
import { PRODUCTION_COMPOSITIONS } from '@/tests/support/production-compositions'
import type { Document } from '@/domain/schemas/document.schema'
import type {
  DocumentRequirement,
  RequirementLayer,
  VisaTypeTemplate,
} from '@/config/types'

/**
 * A completion claim must never read as satisfied under a bar it was not made
 * against.
 *
 * This file exists because that failed in production. C1 let a mission layer
 * attach acceptance detail to a shared requirement and expressed the composed
 * contract by *summing* the owner's revision with its fragments' — monotonic, so
 * a tightened bar always superseded. Addition is not injective. Greece's "a
 * recent photograph" and Germany's "35 x 45 mm, full-face" are both one fragment
 * at revision 1 over an owner revision of 1, so both packs shipped `PHOTOS` at
 * revision 2 with materially different bars, and the test written at the time
 * asserted `[2, 2]` as though that were the intended outcome.
 *
 * The destination of a dossier is editable in Settings and template sync never
 * deletes records, so that collision was reachable by an ordinary user: mark the
 * photograph ready for Greece, switch to Germany, and the claim stayed
 * `current`.
 *
 * The invariant, stated once: **two materially different acceptance contracts
 * for one code must never be indistinguishable to a stored claim.**
 */

const shared: DocumentRequirement = {
  code: 'SHARED_DOC',
  nameKey: 'visa-domain:requirements.PHOTOS.name',
  category: 'identity',
  ownerType: 'applicant',
  required: true,
  revision: 1,
}

const common: RequirementLayer = { id: 'c', kind: 'common', add: [shared] }

const mission = (id: string, key: string, revision = 1): RequirementLayer => ({
  id,
  kind: 'jurisdiction',
  refine: [{ code: 'SHARED_DOC', addDetail: { detailKeys: [key], revision } }],
})

const base = {
  id: 'test-template',
  visaType: 'short_stay_tourism' as const,
  nameKey: 'visa-domain:visaTypes.schengen-short-stay-tourism',
  templateVersion: '1.0.0',
  reviewStatus: 'unverified' as const,
  preparationMilestones: [],
}

const compose = (layers: RequirementLayer[]): VisaTypeTemplate =>
  composeVisaTemplate({ base, layers }).template

const record = (): Document =>
  ({
    id: 'd1',
    code: 'SHARED_DOC',
    name: 'Shared',
    category: 'identity',
    ownerType: 'applicant',
    ownerId: 'a1',
    required: true,
    status: 'not_started',
  }) as unknown as Document

describe('a claim made under one composition does not survive into another', () => {
  // The exact shape that shipped: one owner revision, one fragment each, equal
  // fragment revisions, different criteria.
  const greekish = compose([common, mission('gr-ish', 'test:recent')])
  const germanish = compose([common, mission('de-ish', 'test:35x45')])

  it('gives the two bars the same revision and different keys', () => {
    const a = greekish.documentRequirements[0]!
    const b = germanish.documentRequirements[0]!
    // The collision, still present in the number — which is why the number is
    // no longer what a claim is compared against.
    expect(a.revision).toBe(b.revision)
    expect(a.contractKey).not.toBe(b.contractKey)
  })

  it('supersedes the claim when the destination changes', () => {
    const claimed = applyDocumentUpdate(record(), { status: 'ready' }, greekish)
    expect(claimed.satisfiedRevision).toBe(1)
    expect(claimed.satisfiedContract).toBe('SHARED_DOC@1+gr-ish:1')

    // Under its own composition the claim stands.
    expect(completionStanding(claimed, greekish)).toBe('current')

    // Under the other one it does not, and the applicant is asked to look
    // again. Before F1b this returned `current`, because `1 < 1` is false.
    expect(completionStanding(claimed, germanish)).toBe('superseded')
    expect(effectiveStatus(claimed, germanish)).toBe('needs_update')
  })

  it('holds when the fragments are the same length but different content', () => {
    const other = compose([common, mission('de-ish', 'test:something-else')])
    const claimed = applyDocumentUpdate(
      record(),
      { status: 'ready' },
      germanish
    )
    // Same layer, same fragment revision, different criteria — the key is
    // deliberately not a hash of the rendered text, so this one *is* missed.
    // Recorded rather than hidden: changing what a fragment says without moving
    // its revision is the same unpublished-contract mistake ADR-051a names, and
    // the fragment ledger is what catches it.
    expect(completionStanding(claimed, other)).toBe('current')
  })

  it('re-claiming under the new composition clears it', () => {
    const claimed = applyDocumentUpdate(record(), { status: 'ready' }, greekish)
    const reclaimed = applyDocumentUpdate(
      claimed,
      { status: 'ready' },
      germanish
    )
    expect(reclaimed.satisfiedContract).toBe('SHARED_DOC@1+de-ish:1')
    expect(completionStanding(reclaimed, germanish)).toBe('current')
  })

  it('releases both stamps when the claim is withdrawn', () => {
    const claimed = applyDocumentUpdate(record(), { status: 'ready' }, greekish)
    const withdrawn = applyDocumentUpdate(
      claimed,
      { status: 'received' },
      greekish
    )
    expect(withdrawn.satisfiedRevision).toBeUndefined()
    expect(withdrawn.satisfiedContract).toBeUndefined()
  })
})

/**
 * The legacy hole F1b left open, and the rule that closes it.
 *
 * F1b judged any claim carrying no contract key on the number alone, "exactly as
 * before". That is safe on a requirement whose contract is still the one its
 * owner published. It is not safe on one a mission layer has added criteria to,
 * because such a claim provably predates those criteria — and the arithmetic
 * happened to agree with it in both shapes:
 *
 *  - a pre-C1 claim stamped at the owner's revision compares equal, so `<` is
 *    false and the claim stood;
 *  - a claim from the window when C1 stamped the *composed additive* number
 *    carries something larger than the owner's revision, so `<` could never be
 *    true again.
 *
 * The fix discriminates on the requirement, not on the claim: composition-scoped
 * detail present means a keyless claim is asked to be re-checked. Everything
 * else keeps ADR-051's behaviour untouched.
 */
describe('legacy claims are demoted only where the bar became composition-specific', () => {
  const withDetail = compose([common, mission('gr-ish', 'test:recent')])
  const baseOnly = compose([common])

  const legacy = (satisfiedRevision?: number): Document => {
    const claim = { ...record(), status: 'ready' } as Document
    return satisfiedRevision === undefined
      ? claim
      : { ...claim, satisfiedRevision }
  }

  it('supersedes a numeric-only claim whose number matches the owner revision', () => {
    // Case A. `1 < 1` is false, so F1b called this current — under Greece and
    // under Germany alike, against detail the claim never saw.
    const claim = legacy(1)
    expect(claim.satisfiedContract).toBeUndefined()
    expect(completionStanding(claim, withDetail)).toBe('superseded')
    expect(effectiveStatus(claim, withDetail)).toBe('needs_update')
  })

  it('supersedes a claim carrying an F1-era composed number', () => {
    // Case B, and worse: F1 stamped owner + fragments, so restoring the owner's
    // revision left these permanently larger than anything they meet. `3 < 1`
    // is false forever.
    expect(completionStanding(legacy(3), withDetail)).toBe('superseded')
  })

  it('supersedes a claim with no stamp at all', () => {
    // A pre-1.2.0 dossier. ADR-051 Decision 3 says an unrecorded claim counts
    // as ready, and it still does — everywhere the contract is the one the
    // owner published. Here it cannot: "no evidence about their evidence" is
    // not neutral when the criteria postdate the claim outright.
    expect(completionStanding(legacy(), withDetail)).toBe('superseded')
  })

  it('leaves an unrecorded claim alone on a base-only requirement', () => {
    // The narrowing, asserted from the other side. This is the ADR-051 rule,
    // unchanged, and it must stay unchanged.
    expect(completionStanding(legacy(), baseOnly)).toBe('unrecorded')
    expect(effectiveStatus(legacy(), baseOnly)).toBe('ready')
  })

  it('keeps the numeric comparison on a base-only requirement', () => {
    expect(completionStanding(legacy(1), baseOnly)).toBe('current')

    const bumped = compose([{ ...common, add: [{ ...shared, revision: 2 }] }])
    expect(completionStanding(legacy(1), bumped)).toBe('superseded')
  })

  it('clears the demotion as soon as the claim is re-confirmed', () => {
    // The way out, and it is one click: re-asserting `ready` stamps both fields
    // against the contract now in force.
    const reconfirmed = applyDocumentUpdate(
      legacy(1),
      { status: 'ready' },
      withDetail
    )
    expect(reconfirmed.satisfiedContract).toBe('SHARED_DOC@1+gr-ish:1')
    expect(completionStanding(reconfirmed, withDetail)).toBe('current')
  })
})

describe('the discriminator cannot drift from the key format', () => {
  it('agrees with the key in every production composition', () => {
    // `hasCompositionDetail` reads `detailKeys`; the key encodes the same fact
    // as a `+` segment. They are equivalent by construction in the composer, and
    // if they ever stop being, the standing rule silently changes meaning.
    for (const { countryCode, composition } of PRODUCTION_COMPOSITIONS) {
      const disagreeing = composition.template.documentRequirements
        .filter(
          (r) =>
            (r.detailKeys?.length ?? 0) > 0 !==
            (r.contractKey ?? '').includes('+')
        )
        .map((r) => r.code)
      expect({ countryCode, disagreeing }).toEqual({
        countryCode,
        disagreeing: [],
      })
    }
  })
})

describe('the production packs cannot collide', () => {
  it('never lets one contract key stand for two different bars', () => {
    // The invariant itself, stated over the real packs: group every composed
    // requirement by its key, and every group must be internally identical.
    // A key shared by two different acceptance bars is precisely what a stored
    // claim cannot tell apart.
    const byKey = new Map<string, Set<string>>()
    for (const { composition } of PRODUCTION_COMPOSITIONS) {
      for (const r of composition.template.documentRequirements) {
        const bar = JSON.stringify({
          revision: r.revision,
          detail: r.detailKeys ?? [],
        })
        const bars = byKey.get(r.contractKey ?? '') ?? new Set<string>()
        bars.add(bar)
        byKey.set(r.contractKey ?? '', bars)
      }
    }
    const collisions = [...byKey]
      .filter(([, bars]) => bars.size > 1)
      .map(([key]) => key)
    expect(collisions).toEqual([])
  })

  it('carries a contract key on every composed requirement', () => {
    // Absent means "legacy claim" in the standing logic, so a requirement
    // without one would make every claim against it unjudgeable.
    for (const { countryCode, composition } of PRODUCTION_COMPOSITIONS) {
      const missing = composition.template.documentRequirements
        .filter((r) => !r.contractKey)
        .map((r) => r.code)
      expect({ countryCode, missing }).toEqual({ countryCode, missing: [] })
    }
  })

  it('demotes a pre-1.2.0 photograph claim in both packs, and only the C1 rows', () => {
    // The production shape of the legacy hole: a dossier from before completion
    // provenance existed, opened today. Its photograph claim cannot show it met
    // Greece's "recent" or Germany's 35 x 45 mm, because neither existed when it
    // was made — and it is asked to be re-checked in both.
    const greece = resolveVisaTemplate('GR', 'short_stay_tourism')!
    const germany = resolveVisaTemplate('DE', 'short_stay_tourism')!
    const stale = { ...record(), code: 'PHOTOS', status: 'ready' } as Document
    expect(stale.satisfiedRevision).toBeUndefined()
    expect(completionStanding(stale, greece)).toBe('superseded')
    expect(completionStanding(stale, germany)).toBe('superseded')

    // And nothing else moves. Greece's other requirements carry no fragment, so
    // the same stamp-less claim against them stays exactly where ADR-051 put it.
    const untouched = greece.documentRequirements
      .filter((r) => (r.detailKeys?.length ?? 0) === 0)
      .map((r) => ({ ...record(), code: r.code, status: 'ready' as const }))
      .filter((d) => completionStanding(d, greece) !== 'unrecorded')
      .map((d) => d.code)
    expect(untouched).toEqual([])
  })

  it('supersedes a real Greek photograph claim carried into Germany', () => {
    // The production instance of the same trace, through the real packs.
    const greece = resolveVisaTemplate('GR', 'short_stay_tourism')!
    const germany = resolveVisaTemplate('DE', 'short_stay_tourism')!
    const photo: Document = { ...record(), code: 'PHOTOS' }

    const claimed = applyDocumentUpdate(photo, { status: 'ready' }, greece)
    expect(completionStanding(claimed, greece)).toBe('current')
    expect(completionStanding(claimed, germany)).toBe('superseded')
  })
})
