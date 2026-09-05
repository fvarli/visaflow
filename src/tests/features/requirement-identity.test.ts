import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import { getAllCountryConfigs } from '@/config/countries'
import {
  RETIRED_REQUIREMENTS,
  isRetiredRequirement,
} from '@/config/countries/retired'
import { REQUIREMENT_REVISIONS } from '@/config/countries/requirement-revisions'
import { dynamicT } from '@/lib/i18n-dynamic'
import { ALL_REQUIREMENT_LAYERS } from '@/config/countries/layers'
import { greeceTourismComposition } from '@/config/countries/greece/tourism'
import type { DocumentRequirement } from '@/config/types'

/**
 * The requirement-identity contract (ADR-049).
 *
 * A document `code` is the identity of a record in someone's dossier. The
 * dossier stores the code and nothing else — `Document.name` is deprecated and
 * no longer written — so the label comes from the code's translation at render
 * time. Change what a code means and you rewrite the meaning of documents
 * people already filed, in files already on their disk.
 *
 * That is what ADR-048 did to three requirements, and these tests exist so it
 * cannot happen quietly again. They cannot understand meaning; what they can do
 * is refuse to let a shipped code vanish or be reused without somebody saying
 * so out loud in `RETIRED_REQUIREMENTS`.
 */

/**
 * Every code this project has shipped in a country pack.
 *
 * Frozen deliberately. Deriving it from the current template would make the
 * guard vacuous — a renamed code would simply leave the list and the test would
 * keep passing, which is precisely the failure being guarded against.
 */
const SHIPPED_CODES = [
  // Shared Schengen array
  'APPLICATION_FORM',
  'PASSPORT_CURRENT',
  'PASSPORT_PREVIOUS',
  'PHOTOS',
  'ID_CARD_COPY',
  'TRAVEL_INSURANCE',
  'TRANSPORT_RESERVATION',
  'ACCOMMODATION',
  'ITINERARY',
  'EMPLOYMENT_LETTER',
  'APPROVED_LEAVE',
  'PAYSLIPS',
  'SOCIAL_SECURITY',
  'BANK_STATEMENTS',
  'SPONSOR_LETTER',
  'SPONSOR_BANK_STATEMENTS',
  'SPONSOR_INCOME_PROOF',
  'RELATIONSHIP_PROOF',
  'PREVIOUS_VISAS',
  // Greece/Türkiye
  'CIVIL_REGISTRY_EXTRACT',
  'EMPLOYER_TAX_PLATE',
  'EMPLOYER_TRADE_REGISTRY',
  'EMPLOYER_SIGNATURE_CIRCULAR',
  'PROPERTY_DEED',
  'STUDENT_CERTIFICATE',
  'COMPANY_ACTIVITY_CERTIFICATE',
  'TAX_PAYMENT_STATEMENT',
  'PENSIONER_BOOKLET',
  // Retired in template 1.2.0 — still held by dossiers written before it
  'TAX_RETURNS',
  'BUSINESS_LICENSE',
  'PENSION_STATEMENT',
] as const

const activeCodes = new Set(
  getAllCountryConfigs().flatMap((pack) =>
    pack.visaTypes.flatMap((t) => t.documentRequirements.map((r) => r.code))
  )
)

describe('requirement identity — a shipped code is never orphaned', () => {
  it.each(SHIPPED_CODES)(
    '%s is either active in a template or explicitly retired',
    (code) => {
      // The acknowledgement this guard exists to force. A code removed from
      // every template without a `RETIRED_REQUIREMENTS` entry means somebody
      // deleted or renamed an identity that users' files still refer to.
      expect({
        code,
        accountedFor: activeCodes.has(code) || isRetiredRequirement(code),
      }).toEqual({ code, accountedFor: true })
    }
  )

  it.each(['tr', 'en'] as const)(
    'every shipped code still resolves to a label in %s',
    async (locale) => {
      await i18n.changeLanguage(locale)
      const td = dynamicT(i18n.t.bind(i18n))
      const unresolved = SHIPPED_CODES.filter(
        (code) =>
          !td(`visa-domain:requirements.${code}.name`, { defaultValue: '' })
      )
      await i18n.changeLanguage('tr')

      // Without this a retired record falls through `documentLabel` to its raw
      // code and the applicant sees "TAX_RETURNS" where a document name
      // belongs.
      expect(unresolved).toEqual([])
    }
  )
})

describe('requirement identity — retirement is not reuse', () => {
  it('never lets a retired code back into a template', () => {
    const resurrected = RETIRED_REQUIREMENTS.map((r) => r.code).filter((code) =>
      activeCodes.has(code)
    )
    expect(resurrected).toEqual([])
  })

  it('gives every replacement a genuinely new identity', () => {
    // `replacedBy` is documentation, never resolution. If a replacement ever
    // shared its predecessor's code the retirement would be a rename wearing a
    // retirement's clothes.
    const collisions = RETIRED_REQUIREMENTS.filter(
      (r) => r.replacedBy && r.replacedBy === r.code
    ).map((r) => r.code)
    expect(collisions).toEqual([])
  })

  it('records why each identity could not be reused', () => {
    for (const retired of RETIRED_REQUIREMENTS) {
      expect({
        code: retired.code,
        hasReason: retired.reason.trim().length > 20,
        hasVersion: /^\d+\.\d+\.\d+$/.test(retired.retiredIn),
      }).toEqual({ code: retired.code, hasReason: true, hasVersion: true })
    }
  })

  it('retires exactly the three ADR-048 replacements', () => {
    expect(RETIRED_REQUIREMENTS.map((r) => r.code).sort()).toEqual([
      'BUSINESS_LICENSE',
      'PENSION_STATEMENT',
      'TAX_RETURNS',
    ])
  })
})

/**
 * Every active requirement in every registered pack, keyed by code.
 *
 * Still one entry per code, because identity *is* global — a shared layer
 * legitimately yields the same requirement in several compositions, and one
 * entry is the correct answer for it. What changed is that the map used to
 * reach that answer by silently overwriting: `new Map(...)` keeps whichever
 * pair came last, so two packs declaring the same code with different
 * revisions would have produced one entry and no complaint at all.
 *
 * The dedupe was assuming an invariant nothing enforced. It is enforced here
 * now: agreeing declarations collapse, disagreeing ones throw, so the map can
 * only be built when the assumption it rests on actually holds.
 */
function buildActiveRequirements(): Map<string, DocumentRequirement> {
  const byCode = new Map<string, DocumentRequirement>()
  const conflicts: string[] = []

  for (const pack of getAllCountryConfigs()) {
    for (const template of pack.visaTypes) {
      for (const requirement of template.documentRequirements) {
        const seen = byCode.get(requirement.code)
        if (!seen) {
          byCode.set(requirement.code, requirement)
          continue
        }
        // Composition may append citations, so two compositions of one code can
        // differ in `sourceRefs` and still be the same requirement. Everything
        // else is the acceptance contract and must be identical.
        const strip = ({ sourceRefs: _refs, ...rest }: DocumentRequirement) =>
          JSON.stringify(rest)
        if (strip(seen) !== strip(requirement)) {
          conflicts.push(requirement.code)
        }
      }
    }
  }

  if (conflicts.length > 0) {
    throw new Error(
      `Requirement codes declared with conflicting contracts: ${[
        ...new Set(conflicts),
      ].join(', ')}`
    )
  }
  return byCode
}

const activeRequirements = buildActiveRequirements()

/**
 * The acceptance-contract ledger (ADR-051).
 *
 * Acceptance criteria live only in translated prose, so nothing can detect a
 * tightening automatically — a bump has to be written down. These guards refuse
 * to let one appear, vanish, or drift from the packs silently. They walk the
 * registry rather than naming Greece, because the previous version hardcoded a
 * single template and would have gone blind the moment a second pack shipped.
 */
describe('the acceptance-contract ledger', () => {
  it.each([...activeRequirements.keys()])(
    '%s declares an explicit integer revision >= 1',
    (code) => {
      const revision = activeRequirements.get(code)!.revision
      // `revision` used to be optional with a `?? 1` fallback, which let a
      // `revision: 0` typo reach `satisfiedRevision` — where the persisted
      // schema rejects it, making the dossier unimportable with no earlier
      // signal. Required + bounded is what closes that.
      expect({
        code,
        valid: Number.isInteger(revision) && revision >= 1,
      }).toEqual({ code, valid: true })
    }
  )

  it.each([...activeRequirements.keys()])(
    '%s has a complete ledger history for every revision above 1',
    (code) => {
      const revision = activeRequirements.get(code)!.revision
      const recorded = REQUIREMENT_REVISIONS.filter((e) => e.code === code)
        .map((e) => e.revision)
        .sort((a, b) => a - b)
      // 1 means no history; N means one entry for each of 2..N, contiguous.
      // A gap would mean a bump nobody explained.
      const expected = Array.from({ length: revision - 1 }, (_, i) => i + 2)
      expect({ code, recorded }).toEqual({ code, recorded: expected })
    }
  )

  it('records no revision for a code no pack declares', () => {
    // Catches a typo, and catches bumping an identity that has been withdrawn:
    // a retired requirement has no current contract to tighten.
    const orphans = REQUIREMENT_REVISIONS.filter(
      (e) => !activeRequirements.has(e.code)
    ).map((e) => `${e.code}@${e.revision}`)
    expect(orphans).toEqual([])
  })

  it('never bumps a retired identity', () => {
    // Implied by the test above, but stated separately so the failure names the
    // actual mistake instead of reading as an unexplained array mismatch.
    const retired = REQUIREMENT_REVISIONS.filter((e) =>
      isRetiredRequirement(e.code)
    ).map((e) => e.code)
    expect(retired).toEqual([])
  })

  it('starts a replacement requirement at revision 1', () => {
    // A replacement is a new identity, not a continuation. Inheriting its
    // predecessor's revision would be the aliasing ADR-049 forbids, in a
    // different field.
    const replacements = RETIRED_REQUIREMENTS.map((r) => r.replacedBy).filter(
      (code): code is string => Boolean(code)
    )
    expect(replacements.length).toBeGreaterThan(0)
    for (const code of replacements) {
      expect({
        code,
        revision: activeRequirements.get(code)?.revision,
      }).toEqual({ code, revision: 1 })
    }
  })

  it('has no duplicate rows', () => {
    const keys = REQUIREMENT_REVISIONS.map((e) => `${e.code}@${e.revision}`)
    expect(keys).toEqual([...new Set(keys)])
  })

  it('explains every bump it records', () => {
    for (const entry of REQUIREMENT_REVISIONS) {
      expect({
        row: `${entry.code}@${entry.revision}`,
        hasReason: entry.reason.trim().length > 30,
        hasVersion: /^\d+\.\d+\.\d+$/.test(entry.bumpedIn),
        startsAboveOne: entry.revision > 1,
      }).toEqual({
        row: `${entry.code}@${entry.revision}`,
        hasReason: true,
        hasVersion: true,
        startsAboveOne: true,
      })
    }
  })
})

/**
 * Requirement identity is global across every declared layer.
 *
 * A `code` names a record in somebody's dossier, so it has to mean one thing
 * everywhere — not one thing per composition. Per-composition checking cannot
 * express that: if the Türkiye overlay and a future German overlay both
 * declared `SOCIAL_SECURITY`, no single composition would ever contain both,
 * every composition would compose cleanly, and the collision would surface only
 * when somebody exported a dossier from one and imported it into the other.
 *
 * So these walk the layer registry rather than the compositions. It is the one
 * question that has to be asked of the layers themselves.
 */
describe('requirement identity — one code, one owning layer, registry-wide', () => {
  const declarations = ALL_REQUIREMENT_LAYERS.flatMap((layer) =>
    (layer.add ?? []).map((r) => ({ code: r.code, layerId: layer.id }))
  )

  it('declares every code exactly once across all layers', () => {
    const owners = new Map<string, string[]>()
    for (const { code, layerId } of declarations) {
      owners.set(code, [...(owners.get(code) ?? []), layerId])
    }
    const duplicated = [...owners.entries()]
      .filter(([, layerIds]) => layerIds.length > 1)
      .map(([code, layerIds]) => `${code}: ${layerIds.join(' + ')}`)

    expect(duplicated).toEqual([])
  })

  it('has layers to walk, so the check is not vacuous', () => {
    // "No duplicates found" and "found nothing" are the same result otherwise.
    expect(ALL_REQUIREMENT_LAYERS.length).toBeGreaterThan(1)
    expect(declarations.length).toBeGreaterThan(0)
  })

  it('accounts for every composed requirement', () => {
    // Ties the registry to reality: a requirement reaching an applicant whose
    // code no registered layer declares would mean the registry is incomplete
    // and the duplicate check above is looking at the wrong set.
    const declared = new Set(declarations.map((d) => d.code))
    const composed = greeceTourismComposition.template.documentRequirements.map(
      (r) => r.code
    )
    expect(composed.filter((code) => !declared.has(code))).toEqual([])
  })

  it('registers every layer the composition actually used', () => {
    // The other direction. `ALL_REQUIREMENT_LAYERS` is consulted by nothing in
    // production, which is exactly the shape ADR-050 warns about — a registry
    // that looks authoritative, is never read, and drifts. Cross-checking it
    // against the composer's own ownership map is what keeps it honest.
    const registered = new Set(ALL_REQUIREMENT_LAYERS.map((l) => l.id))
    const used = new Set(greeceTourismComposition.ownership.values())
    expect([...used].filter((id) => !registered.has(id))).toEqual([])
  })

  it('composes every registered layer that declares requirements', () => {
    // And a layer registered but composed by nothing is dead configuration
    // whose codes are being held against every other layer for no reason.
    const used = new Set(greeceTourismComposition.ownership.values())
    const orphaned = ALL_REQUIREMENT_LAYERS.filter(
      (l) => (l.add?.length ?? 0) > 0 && !used.has(l.id)
    ).map((l) => l.id)
    expect(orphaned).toEqual([])
  })
})
