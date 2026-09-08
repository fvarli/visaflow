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

describe('claims written before contract keys existed are not demoted', () => {
  const greekish = compose([common, mission('gr-ish', 'test:recent')])

  it('judges a keyless claim on the number alone', () => {
    // Every completion already on somebody's disk carries a revision and no
    // key. Treating absence as a mismatch would supersede all of them on the
    // day this shipped — the ADR-051 mistake in a new place.
    const legacy = {
      ...record(),
      status: 'ready',
      satisfiedRevision: 1,
    } as Document
    expect(legacy.satisfiedContract).toBeUndefined()
    expect(completionStanding(legacy, greekish)).toBe('current')
  })

  it('still supersedes a keyless claim when the owner’s revision rises', () => {
    const legacy = {
      ...record(),
      status: 'ready',
      satisfiedRevision: 1,
    } as Document
    const bumped = compose([
      { ...common, add: [{ ...shared, revision: 2 }] },
      mission('gr-ish', 'test:recent'),
    ])
    expect(completionStanding(legacy, bumped)).toBe('superseded')
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
