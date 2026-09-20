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
import {
  PRODUCTION_COMPOSITIONS,
  compositionFor,
} from '@/tests/support/production-compositions'
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
  'CHAMBER_REGISTRATION_CERTIFICATE',
  'EMPLOYER_SIGNATURE_CIRCULAR',
  'PROPERTY_DEED',
  'STUDENT_CERTIFICATE',
  'COMPANY_ACTIVITY_CERTIFICATE',
  'TAX_PAYMENT_STATEMENT',
  'PENSIONER_BOOKLET',
  'FILING_COUNTRY_RESIDENCE_PERMIT',
  // Germany/Türkiye
  'DE_S54_DECLARATION',
  'DE_TRAVEL_HISTORY_COPIES',
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

  it('retires exactly the codes two evidence sprints have withdrawn', () => {
    // Three from ADR-048, where a wrongly-named requirement was replaced by a
    // correctly-named one, and three from the E1 fidelity audit, where no
    // authority at any level could be found for the ask at all. The two groups
    // are different in kind — the first has `replacedBy`, the second does not,
    // because nothing replaces a requirement that should never have been made.
    expect(RETIRED_REQUIREMENTS.map((r) => r.code).sort()).toEqual([
      'BUSINESS_LICENSE',
      'ID_CARD_COPY',
      'PASSPORT_PREVIOUS',
      'PENSION_STATEMENT',
      'PREVIOUS_VISAS',
      'TAX_RETURNS',
    ])
  })

  it('replaces only what was actually replaced', () => {
    const withReplacement = RETIRED_REQUIREMENTS.filter((r) => r.replacedBy)
    const without = RETIRED_REQUIREMENTS.filter((r) => !r.replacedBy)
    expect(withReplacement.map((r) => r.code).sort()).toEqual([
      'BUSINESS_LICENSE',
      'PENSION_STATEMENT',
      'TAX_RETURNS',
    ])
    expect(without.map((r) => r.code).sort()).toEqual([
      'ID_CARD_COPY',
      'PASSPORT_PREVIOUS',
      'PREVIOUS_VISAS',
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
        /**
         * Composition may append citations, composition-scoped acceptance
         * detail since C1, and — since [ADR-052c] — occupations a composition
         * asks the requirement of beyond the population its owner declared. So
         * two compositions of one code can differ in `sourceRefs`,
         * `detailKeys`, `applicableOccupations` and the `contractKey` that
         * names which detail applied.
         *
         * Everything else is identity and must be identical, `revision`
         * included: F1b gave it back to the owner, so a code carrying two
         * different numbers is two declarations of one code.
         *
         * Widening is on that list because asking the same document of more
         * people is not a different requirement — ADR-052c decision 5 — which
         * is precisely why it is checked against the key below rather than
         * waved through.
         */
        const strip = ({
          sourceRefs: _refs,
          detailKeys: _detail,
          contractKey: _key,
          applicableOccupations: _widened,
          ...rest
        }: DocumentRequirement) => JSON.stringify(rest)
        if (strip(seen) !== strip(requirement)) {
          conflicts.push(requirement.code)
        }
        // The key is only allowed to diverge *because* the detail does, and it
        // must diverge whenever the detail does. Both directions, because the
        // failure that shipped was the second one: two different bars sharing a
        // number, indistinguishable to a stored claim.
        const sameDetail =
          JSON.stringify(seen.detailKeys ?? []) ===
          JSON.stringify(requirement.detailKeys ?? [])
        const sameKey = seen.contractKey === requirement.contractKey
        if (sameDetail !== sameKey) {
          conflicts.push(requirement.code)
        }
        /**
         * And the mirror for widening, in the other direction: a population
         * that differs between compositions must **not** move the key.
         *
         * A widening changes who is asked, not what satisfies the ask, so a
         * claim made in one pack stays valid in the other and a dossier that
         * changes destination is told the row no longer applies rather than
         * that its evidence went stale (ADR-051a, ADR-052c decision 5).
         *
         * SCOPED TO ROWS WHOSE DETAIL MATCHES, which is the only place the
         * question is answerable. Where two compositions also attach different
         * acceptance detail the key is *supposed* to differ, and this check
         * cannot tell which of the two moved it — so unscoped it would fail
         * `CHAMBER_REGISTRATION_CERTIFICATE`, whose German composition carries
         * a wider population *and* a six-month chamber bar that has nothing to
         * do with it. The same over-breadth was corrected on the sibling
         * invariant when the first widening shipped; this is the second half of
         * it, found by the first row to have both at once.
         *
         * Narrowing a guard is how a guard stops saying anything, so the
         * coincidence is not simply allowed: the census below names every row
         * where both differ, and it is a list rather than a count so the next
         * one is a reviewed line in a diff.
         */
        const sameWidening =
          JSON.stringify(seen.applicableOccupations ?? []) ===
          JSON.stringify(requirement.applicableOccupations ?? [])
        if (sameDetail && !sameWidening && !sameKey) {
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

  /**
   * Which refining layers contributed detail to a composed requirement.
   *
   * Read back out of the keys rather than tracked separately, because the keys
   * are what an applicant actually reads — a ledger entry for a fragment that
   * has been deleted stops being counted here, and the contiguity check below
   * then fails, which is the behaviour we want.
   */
  const layersInDetail = (requirement: DocumentRequirement): Set<string> =>
    new Set(
      (requirement.detailKeys ?? []).map((key) => key.split('.')[1] ?? '')
    )

  /**
   * A fragment's revision, read back out of the composed contract key.
   *
   * The key is `CODE@ownerRevision+layer:fragmentRevision…`, and it is the only
   * place the composed requirement records what each fragment's version was —
   * which is exactly why it is the thing a stored claim is stamped against.
   */
  const fragmentRevision = (
    requirement: DocumentRequirement,
    layer: string
  ): number => {
    const part = (requirement.contractKey ?? '')
      .split('+')
      .find((segment) => segment.startsWith(`${layer}:`))
    return Number(part?.split(':')[1] ?? 0)
  }

  /**
   * Owner revisions and fragment revisions are two ledgers in one file, and the
   * contiguity rule differs by one because their revision 1 means different
   * things.
   *
   * A requirement's revision 1 is its birth, so history starts at 2. A
   * fragment's revision 1 already adds criteria to a contract that was
   * published without them, so its history starts at 1.
   *
   * This is checked per code rather than per composition again, which is the
   * F1b correction: `revision` is the owner's and identical everywhere, so
   * there is nothing composition-specific left in the number to check. What
   * varies by composition is `contractKey`, and that has its own invariants.
   */
  it.each([...activeRequirements.keys()])(
    '%s has a complete owner-revision history above 1',
    (code) => {
      const revision = activeRequirements.get(code)!.revision
      const recorded = REQUIREMENT_REVISIONS.filter(
        (e) => e.code === code && e.viaLayer === undefined
      )
        .map((e) => e.revision)
        .sort((a, b) => a - b)
      const expected = Array.from({ length: revision - 1 }, (_, i) => i + 2)
      expect({ code, recorded }).toEqual({ code, recorded: expected })
    }
  )

  /** Every fragment any production composition attaches, by layer and code. */
  const FRAGMENT_ROWS = [
    ...new Map(
      PRODUCTION_COMPOSITIONS.flatMap(({ composition }) =>
        composition.template.documentRequirements.flatMap((r) =>
          [...layersInDetail(r)].map(
            (layer) =>
              [
                `${layer} ${r.code}`,
                layer,
                r.code,
                fragmentRevision(r, layer),
              ] as const
          )
        )
      ).map((row) => [row[0], row] as const)
    ).values(),
  ]

  it.each(FRAGMENT_ROWS)(
    '%s has a complete fragment history from 1',
    (_label, layer, code, revision) => {
      const recorded = REQUIREMENT_REVISIONS.filter(
        (e) => e.code === code && e.viaLayer === layer
      )
        .map((e) => e.revision)
        .sort((a, b) => a - b)
      const expected = Array.from({ length: revision }, (_, i) => i + 1)
      expect({ layer, code, recorded }).toEqual({
        layer,
        code,
        recorded: expected,
      })
    }
  )

  it('records no composition-scoped move for a layer that attaches no detail', () => {
    // The other direction: a `viaLayer` naming a layer whose fragment was
    // removed, or misspelled, would silently stop applying to anything and the
    // entry would become decoration.
    const attaching = new Set(
      PRODUCTION_COMPOSITIONS.flatMap(({ composition }) =>
        composition.template.documentRequirements.flatMap((r) =>
          [...layersInDetail(r)].map((layer) => `${layer}:${r.code}`)
        )
      )
    )
    const orphans = REQUIREMENT_REVISIONS.filter(
      (e) =>
        e.viaLayer !== undefined && !attaching.has(`${e.viaLayer}:${e.code}`)
    ).map((e) => `${e.viaLayer}:${e.code}`)
    expect(orphans).toEqual([])
  })

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

  /**
   * A row's identity includes the layer that caused it.
   *
   * `PHOTOS@2` happens twice — once because the Greek consulate asks for a
   * recent photograph, once because the German mission states its dimensions —
   * and those are two different bumps in two different compositions, not a
   * duplicate. Keying on the code and number alone stopped being enough the
   * moment a revision could move for one pack and not the other.
   */
  const ledgerKey = (e: (typeof REQUIREMENT_REVISIONS)[number]) =>
    `${e.code}@${e.revision}${e.viaLayer ? ` via ${e.viaLayer}` : ''}`

  it('has no duplicate rows', () => {
    const keys = REQUIREMENT_REVISIONS.map(ledgerKey)
    expect(keys).toEqual([...new Set(keys)])
  })

  it('explains every bump it records', () => {
    for (const entry of REQUIREMENT_REVISIONS) {
      expect({
        row: ledgerKey(entry),
        hasReason: entry.reason.trim().length > 30,
        // A composition-scoped move names the pack it shipped in, because two
        // packs version independently and a bare number would not say which.
        hasVersion: entry.viaLayer
          ? /^[A-Z]{2} \d+\.\d+\.\d+$/.test(entry.bumpedIn)
          : /^\d+\.\d+\.\d+$/.test(entry.bumpedIn),
        // A requirement's revision 1 is its birth and needs no entry; a
        // fragment's revision 1 already adds criteria to a published contract,
        // so it does.
        startsAboveOne: entry.viaLayer
          ? entry.revision >= 1
          : entry.revision > 1,
      }).toEqual({
        row: ledgerKey(entry),
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
describe('requirement identity — population and detail diverging together', () => {
  /**
   * The census the scoped widening guard above hands off to.
   *
   * Where two compositions differ in *both* population and acceptance detail,
   * no mechanical check can say which of the two moved the contract key — so
   * the rule is that such a row is named here and argued in writing, which is
   * what ADR-052b's consequences already require of the fragment-versus-code
   * judgement it resembles.
   *
   * `CHAMBER_REGISTRATION_CERTIFICATE` is the first and only one. Germany asks
   * it of independent professionals as well as company owners (section 4(c))
   * *and* publishes a six-month bar on the chamber copy; the two are unrelated,
   * and the bar applies to company owners just the same. The key moves for the
   * bar alone, which is the answer a Greek claim carried into Germany should
   * get.
   */
  it('names every row whose population and detail both differ by composition', () => {
    const byCode = new Map<string, DocumentRequirement[]>()
    for (const { composition } of PRODUCTION_COMPOSITIONS) {
      for (const r of composition.template.documentRequirements) {
        byCode.set(r.code, [...(byCode.get(r.code) ?? []), r])
      }
    }

    const population = (r: DocumentRequirement) =>
      JSON.stringify(r.applicableOccupations ?? [])
    const detail = (r: DocumentRequirement) =>
      JSON.stringify(r.detailKeys ?? [])

    const both = [...byCode.entries()]
      .filter(([, rows]) => rows.length > 1)
      .filter(([, [first, ...rest]]) =>
        first === undefined
          ? false
          : rest.some(
              (r) =>
                population(r) !== population(first) &&
                detail(r) !== detail(first)
            )
      )
      .map(([code]) => code)

    expect(both.sort()).toEqual(['CHAMBER_REGISTRATION_CERTIFICATE'])
  })

  it('and its key differs for the detail, in the pack that attaches it', () => {
    // The specific claim the census is standing behind: the German key carries
    // the mission fragment and the Greek one does not, so a Greek claim read
    // under Germany is superseded — by the six-month bar, not by the widening.
    const keyIn = (cc: string) =>
      compositionFor(cc).template.documentRequirements.find(
        (r) => r.code === 'CHAMBER_REGISTRATION_CERTIFICATE'
      )?.contractKey

    expect({ GR: keyIn('GR'), DE: keyIn('DE') }).toEqual({
      GR: 'CHAMBER_REGISTRATION_CERTIFICATE@1',
      DE: 'CHAMBER_REGISTRATION_CERTIFICATE@1+de-tr-mission:1',
    })
  })
})

describe('requirement identity — one code, one owning layer, registry-wide', () => {
  /**
   * Offers count as declarations, because owning is what they do.
   *
   * ADR-052d separates *ownership* from *presence*, and relaxes only the second
   * one: an offered definition composes for nobody, but it still claims its
   * code registry-wide. Walking `add` alone would let an offered code collide
   * with an added one in another layer and this check would never see it —
   * which is the failure the check exists for, arriving through the one field
   * it did not read.
   */
  const declarations = ALL_REQUIREMENT_LAYERS.flatMap((layer) =>
    [...(layer.add ?? []), ...(layer.offer ?? [])].map((r) => ({
      code: r.code,
      layerId: layer.id,
    }))
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

  /**
   * The union across every production pack, not one pack's map.
   *
   * Reachability is a claim about the registry as a whole: a layer composed by
   * *some* pack is not dead configuration, and reading a single pack's
   * ownership map would report every other pack's layers as orphaned. With one
   * pack the two are the same set, which is exactly why this had to be fixed
   * before a second pack existed rather than after it failed.
   */
  const usedLayerIds = new Set(
    PRODUCTION_COMPOSITIONS.flatMap((p) => [
      ...p.composition.ownership.values(),
    ])
  )
  const composedCodes = PRODUCTION_COMPOSITIONS.flatMap((p) =>
    p.composition.template.documentRequirements.map((r) => r.code)
  )

  it('accounts for every composed requirement', () => {
    // Ties the registry to reality: a requirement reaching an applicant whose
    // code no registered layer declares would mean the registry is incomplete
    // and the duplicate check above is looking at the wrong set.
    const declared = new Set(declarations.map((d) => d.code))
    expect(composedCodes.filter((code) => !declared.has(code))).toEqual([])
  })

  it('has composed requirements to account for', () => {
    // The union above would satisfy the previous assertion trivially if it were
    // empty, and an empty union is what a mis-wired pack list produces.
    expect(composedCodes.length).toBeGreaterThan(0)
    expect(usedLayerIds.size).toBeGreaterThan(0)
  })

  it('registers every layer any pack actually used', () => {
    // The other direction. `ALL_REQUIREMENT_LAYERS` is consulted by nothing in
    // production, which is exactly the shape ADR-050 warns about — a registry
    // that looks authoritative, is never read, and drifts. Cross-checking it
    // against the composers' own ownership maps is what keeps it honest.
    const registered = new Set(ALL_REQUIREMENT_LAYERS.map((l) => l.id))
    expect([...usedLayerIds].filter((id) => !registered.has(id))).toEqual([])
  })

  it('composes every registered layer that declares requirements', () => {
    // And a layer registered but composed by nothing is dead configuration
    // whose codes are being held against every other layer for no reason.
    //
    // A layer that only *offers* is included, and it is the harder case: its
    // codes appear in a pack's `ownership` map only once something activates
    // one of them, so a definition home nobody ever activates reads here as
    // exactly what it is.
    const orphaned = ALL_REQUIREMENT_LAYERS.filter(
      (l) =>
        (l.add?.length ?? 0) + (l.offer?.length ?? 0) > 0 &&
        !usedLayerIds.has(l.id)
    ).map((l) => l.id)
    expect(orphaned).toEqual([])
  })
})

/**
 * Offered identities, and the reachability they owe in both directions.
 *
 * ADR-052d's own consequences paragraph asks for this: one more way for a
 * requirement to exist is one more thing that can quietly exist for nobody, and
 * a definition nobody activates is precisely the inert registry ADR-050 warns
 * about. `ALL_REQUIREMENT_LAYERS` already gets this treatment; offers now do
 * too.
 *
 * **These are empty-set true today, and that is stated rather than hidden.**
 * H5c implements the capability against synthetic packs only and migrates no
 * production requirement, so no registered layer offers anything yet. The
 * assertions are written now because the slice that first offers one (H5d, the
 * `EMPLOYER_TAX_PLATE` pilot) should find them already standing rather than
 * have to remember to write them — but a green result here proves nothing until
 * `offeredCodes` is non-empty, which is what the census below makes visible.
 */
describe('requirement identity — an offer is reachable or it is dead', () => {
  const offeredCodes = ALL_REQUIREMENT_LAYERS.flatMap((layer) =>
    (layer.offer ?? []).map((r) => ({ code: r.code, layerId: layer.id }))
  )

  const activatedCodes = new Set(
    PRODUCTION_COMPOSITIONS.flatMap((p) => [
      ...p.composition.activations.keys(),
    ])
  )

  it('records how many identities are offered, so a vacuous pass is visible', () => {
    // Not an assertion that the number is right — only the evidence that says
    // whether the two checks below are proving anything yet. H5c ships zero.
    expect(offeredCodes.length).toBe(0)
  })

  it('has every offered identity activated by some pack', () => {
    const unreached = offeredCodes
      .filter(({ code }) => !activatedCodes.has(code))
      .map(({ code, layerId }) => `${code} (${layerId})`)
    expect(unreached).toEqual([])
  })

  it('activates nothing that no registered layer offers', () => {
    // The other direction: an activation is only legal against an offer, so an
    // activated code absent from the registry means the registry is incomplete.
    const declaredOffers = new Set(offeredCodes.map((o) => o.code))
    expect(
      [...activatedCodes].filter((code) => !declaredOffers.has(code))
    ).toEqual([])
  })

  it('never offers a retired identity', () => {
    // The existing resurrection guard reads composed templates, which an inert
    // offer never reaches — so a retired code could be re-declared as an offer
    // and nothing would object until somebody activated it.
    const retired = new Set(RETIRED_REQUIREMENTS.map((r) => r.code))
    expect(offeredCodes.filter(({ code }) => retired.has(code))).toEqual([])
  })
})
