import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
// `commonSchengenDocuments` is deliberately no longer imported here. The
// quarantine used to read that array by name; it now walks the layer registry
// and the compositions, so the shared array is no longer a special case this
// file knows about.
import { getAllCountryConfigs } from '@/config/countries'
import { greeceTourismComposition } from '@/config/countries/greece/tourism'
import { ALL_REQUIREMENT_LAYERS } from '@/config/countries/layers'
import { jurisdictionScopedCodes } from '@/tests/fixtures/test-packs'
import {
  computeVerificationCoverage,
  isReviewStatusSupported,
} from '@/config/countries/verification-coverage'
import type {
  CountryConfig,
  DocumentRequirement,
  RequirementSource,
  VisaTypeTemplate,
} from '@/config/types'
import { dynamicT } from '@/lib/i18n-dynamic'

/**
 * The honesty contract every country pack must satisfy (ADR-046).
 *
 * These walk **every pack in the registry**, not Greece by name, so a second
 * pack inherits them the day it is registered and nobody has to remember to
 * write them again. That is the whole point: the provenance model was already
 * expressive enough, but nothing stopped a pack from claiming verification it
 * could not evidence, pointing a `sourceRef` at an id that does not exist, or
 * dating a review in the future.
 *
 * What these deliberately do **not** assert is that any particular pack *is*
 * verified. An earlier test pinned Greece to `unverified`, which would have
 * failed on the day someone honestly verified it — a guard that punishes the
 * outcome it exists to encourage. A truthful pack passes at any status.
 *
 * ADR-047 then made the status itself checkable: a declared `reviewStatus` is
 * compared against coverage computed from each requirement's own sources,
 * through the same helper the UI uses, so the two cannot drift apart.
 */

const PACKS = getAllCountryConfigs()

/** Every (country, template) pair, so a failure names the pack it came from. */
const TEMPLATES: [CountryConfig, VisaTypeTemplate][] = PACKS.flatMap((pack) =>
  pack.visaTypes.map(
    (template) => [pack, template] as [CountryConfig, VisaTypeTemplate]
  )
)

/** Source types that name an institution, and so should be reachable. */
const OFFICIAL_TYPES = [
  'government',
  'embassy',
  'consulate',
  'authorized_visa_center',
]

const sourcesOf = (pack: CountryConfig): RequirementSource[] =>
  pack.sources ?? []

const requirementsOf = (template: VisaTypeTemplate): DocumentRequirement[] =>
  template.documentRequirements

/** ISO date strings compare lexicographically; today is computed once. */
const TODAY = new Date().toISOString().slice(0, 10)

const isFuture = (iso: string | undefined): boolean =>
  typeof iso === 'string' && iso.slice(0, 10) > TODAY

describe('country packs — the registry is not empty', () => {
  it('registers at least one pack, so these invariants mean something', () => {
    expect(PACKS.length).toBeGreaterThan(0)
    expect(TEMPLATES.length).toBeGreaterThan(0)
  })
})

describe('country packs — a claim of verification must be evidenced', () => {
  /**
   * The contract this replaces was far weaker than it looked (ADR-047).
   *
   * It read `template.sourceIds` — *template*-level — asked `.some()` whether
   * any resolved source carried a date, and treated `verified` and
   * `partially_verified` as the same claim. A pack could therefore be marked
   * `verified` with all 27 requirements unsourced and one dated ministry link,
   * and pass the build. It never consulted `requirement.sourceRefs` at all.
   *
   * The status now has to match the evidence, counted the same way the UI
   * counts it, through the one shared helper.
   */
  it.each(TEMPLATES)(
    '$countryCode: declares the status its requirements can support',
    (pack, template) => {
      const coverage = computeVerificationCoverage(pack, template)

      expect({
        pack: pack.countryCode,
        declared: template.reviewStatus,
        supported: isReviewStatusSupported(template.reviewStatus, coverage),
        coverage: `${coverage.verified}/${coverage.total}`,
      }).toEqual({
        pack: pack.countryCode,
        declared: template.reviewStatus,
        supported: true,
        coverage: `${coverage.verified}/${coverage.total}`,
      })
    }
  )

  it.each(TEMPLATES)(
    '$countryCode: a verified template leaves no requirement unsourced',
    (pack, template) => {
      if (template.reviewStatus !== 'verified') return

      const unsourced = requirementsOf(template)
        .filter(
          (requirement) =>
            !(requirement.sourceRefs ?? []).some((id) =>
              sourcesOf(pack).some(
                (source) => source.id === id && source.lastVerifiedAt
              )
            )
        )
        .map((requirement) => requirement.code)

      expect(unsourced).toEqual([])
    }
  )

  it.each(TEMPLATES)(
    '$countryCode: a partially verified template is genuinely partial',
    (pack, template) => {
      if (template.reviewStatus !== 'partially_verified') return

      // Both halves matter. Without the first the status is a decoration over
      // nothing; without the second it understates a pack that is complete.
      const coverage = computeVerificationCoverage(pack, template)
      expect({
        hasEvidence: coverage.verified > 0,
        isIncomplete: !coverage.isComplete,
      }).toEqual({ hasEvidence: true, isIncomplete: true })
    }
  )

  it('lets an honest pack stay unverified at any coverage', () => {
    // Understating is never the dishonesty this guards against, so a pack that
    // holds evidence but declines to advertise itself must still pass.
    const coverage = { total: 27, verified: 4, isComplete: false }
    expect(isReviewStatusSupported('unverified', coverage)).toBe(true)
    expect(isReviewStatusSupported('verified', coverage)).toBe(false)
  })

  it('never counts a template-level source as requirement evidence', () => {
    // A general ministry landing page cited at template level must not make 27
    // requirements it does not mention look evidenced.
    const pack: CountryConfig = {
      countryCode: 'ZZ',
      nameKey: 'x',
      schengenMember: false,
      sources: [
        {
          id: 'general',
          authority: 'Ministry',
          titleKey: 'x',
          sourceType: 'government',
          lastVerifiedAt: '2026-01-01',
        },
      ],
      visaTypes: [],
    }
    const template = {
      id: 't',
      visaType: 'short_stay_tourism',
      nameKey: 'x',
      documentRequirements: [
        {
          code: 'A',
          nameKey: 'x',
          category: 'supporting',
          ownerType: 'applicant',
          required: true,
          revision: 1,
        },
      ],
      preparationMilestones: [],
      templateVersion: '1.0.0',
      reviewStatus: 'unverified',
      sourceIds: ['general'],
    } as unknown as VisaTypeTemplate

    expect(computeVerificationCoverage(pack, template)).toEqual({
      total: 1,
      verified: 0,
      isComplete: false,
    })
  })
})

describe('country packs — every source reference resolves', () => {
  it.each(TEMPLATES)(
    '$countryCode: no requirement points at a source that does not exist',
    (pack, template) => {
      const known = new Set(sourcesOf(pack).map((s) => s.id))
      // `getSourcesForRefs` filters unresolvable ids out silently, so a typo
      // in a `sourceRef` does not fail — it just makes the citation vanish.
      const dangling = requirementsOf(template).flatMap((requirement) =>
        (requirement.sourceRefs ?? [])
          .filter((id) => !known.has(id))
          .map((id) => `${requirement.code} → ${id}`)
      )
      expect(dangling).toEqual([])
    }
  )

  it.each(TEMPLATES)(
    '$countryCode: no template points at a source that does not exist',
    (pack, template) => {
      const known = new Set(sourcesOf(pack).map((s) => s.id))
      const dangling = (template.sourceIds ?? []).filter((id) => !known.has(id))
      expect(dangling).toEqual([])
    }
  )
})

describe('country packs — dates describe the past', () => {
  it.each(PACKS)(
    '$countryCode: no source is verified in the future',
    (pack) => {
      const impossible = sourcesOf(pack)
        .filter((s) => isFuture(s.lastVerifiedAt) || isFuture(s.retrievedAt))
        .map((s) => s.id)
      expect(impossible).toEqual([])
    }
  )

  it.each(TEMPLATES)(
    '$countryCode: no template is reviewed in the future',
    (_pack, template) => {
      expect(isFuture(template.lastReviewedAt)).toBe(false)
    }
  )
})

describe('country packs — identifiers are unambiguous', () => {
  it.each(PACKS)('$countryCode: source ids are unique', (pack) => {
    const ids = sourcesOf(pack).map((s) => s.id)
    expect(ids).toEqual([...new Set(ids)])
  })

  it.each(TEMPLATES)(
    '$countryCode: requirement codes are unique within the template',
    (_pack, template) => {
      // A duplicate code would make two requirements indistinguishable to the
      // document seeder, the checklist and every translation lookup.
      const codes = requirementsOf(template).map((r) => r.code)
      expect(codes).toEqual([...new Set(codes)])
    }
  )

  it.each(TEMPLATES)(
    '$countryCode: milestone ids are unique',
    (_p, template) => {
      const ids = template.preparationMilestones.map((m) => m.id)
      expect(ids).toEqual([...new Set(ids)])
    }
  )
})

describe('country packs — an official source can be checked by the reader', () => {
  it.each(PACKS)('$countryCode: official sources carry a url', (pack) => {
    // The user is told to verify requirements themselves. Naming an authority
    // without a way to reach it is an instruction they cannot follow.
    const unreachable = sourcesOf(pack)
      .filter((s) => OFFICIAL_TYPES.includes(s.sourceType) && !s.url)
      .map((s) => s.id)
    expect(unreachable).toEqual([])
  })

  it.each(PACKS)('$countryCode: every source names its authority', (pack) => {
    const nameless = sourcesOf(pack)
      .filter((s) => !s.authority.trim())
      .map((s) => s.id)
    expect(nameless).toEqual([])
  })
})

/**
 * The reverse of the key-resolves check below: prose that exists but which no
 * requirement can reach.
 *
 * `SOCIAL_SECURITY` carried "Both must carry a readable QR code" in both
 * locales from template 1.2.0, with no `notesKey` to render it — and the
 * requirement's revision was justified by that very criterion. An acceptance
 * criterion the applicant cannot read is not part of the contract, so this
 * mattered twice: the wording was invisible, and the revision was wrong
 * (ADR-051).
 */
describe('country packs — no acceptance criterion is unreachable', () => {
  const wiredNotesKeys = new Set(
    TEMPLATES.flatMap(([, t]) =>
      t.documentRequirements
        .map((r) => r.notesKey)
        .filter((k): k is string => Boolean(k))
    )
  )

  it.each(['tr', 'en'] as const)(
    'every requirement notes string in %s is rendered by some requirement',
    (locale) => {
      const bundle = i18n.getResourceBundle(locale, 'visa-domain') as {
        requirements?: Record<string, { notes?: string }>
      }
      const orphaned = Object.entries(bundle.requirements ?? {})
        .filter(([, value]) => typeof value?.notes === 'string')
        .map(([code]) => code)
        .filter(
          (code) =>
            !wiredNotesKeys.has(`visa-domain:requirements.${code}.notes`)
        )
      expect(orphaned).toEqual([])
    }
  )
})

describe('country packs — source copy exists in both languages', () => {
  const locales = ['tr', 'en'] as const

  it.each(PACKS)('$countryCode: every source key resolves', async (pack) => {
    const missing: string[] = []
    for (const locale of locales) {
      await i18n.changeLanguage(locale)
      const td = dynamicT(i18n.t.bind(i18n))
      for (const source of sourcesOf(pack)) {
        for (const key of [source.titleKey, source.notesKey]) {
          if (!key) continue
          // `defaultValue: ''` makes an unresolved key falsy rather than
          // echoing itself back, which is how a missing translation would
          // otherwise slip through looking like content.
          if (!td(key, { defaultValue: '' })) {
            missing.push(`${locale}: ${key}`)
          }
        }
      }
    }
    await i18n.changeLanguage('tr')
    expect(missing).toEqual([])
  })
})

describe('country packs — unsourced normative values stay inert', () => {
  /**
   * The tripwire, re-expressed (ADR-047).
   *
   * It used to assert that no requirement carrying `validityPeriodDays` had
   * `sourceRefs` — a coupling with no semantic basis. A requirement can
   * perfectly well cite Article 12 *and* still carry an inert legacy number,
   * which is exactly what `PASSPORT_CURRENT` does now; the old shape would
   * have blocked the sprint's strongest citation to protect an invariant it
   * was not actually expressing.
   *
   * Worse, it would have missed the real risk: someone wiring the field into a
   * readiness rule against an *unsourced* requirement passed it silently. What
   * ADR-046 meant is that nothing reads the field, so that is what is checked.
   *
   * Reading goes through Vite rather than `fs`: the same resolution the app is
   * built with, so the scan cannot drift from what actually ships.
   */
  const SOURCES: Record<string, string> = import.meta.glob(
    '/src/**/*.{ts,tsx}',
    { query: '?raw', import: 'default', eager: true }
  )

  /** Declaring the number is allowed; consuming it is not. */
  const isDeclarationSite = (path: string) =>
    path === '/src/config/types.ts' || // the type itself, carrying @deprecated
    path.startsWith('/src/config/countries/') // pack configuration data

  // Tests may read the field freely — including this one.
  const isTest = (path: string) => path.startsWith('/src/tests/')

  it('scans a realistic number of production files', () => {
    // Without this, a glob that silently matched nothing would make the
    // tripwire below pass forever.
    const scanned = Object.keys(SOURCES).filter((p) => !isTest(p))
    expect(scanned.length).toBeGreaterThan(50)
  })

  it('no production code consumes validityPeriodDays', () => {
    const offenders = Object.entries(SOURCES)
      .filter(([path]) => !isTest(path) && !isDeclarationSite(path))
      .filter(([, contents]) => contents.includes('validityPeriodDays'))
      .map(([path]) => path)

    // A named list makes the failure actionable: it says which feature started
    // asserting a document-age rule that nobody published.
    expect(offenders).toEqual([])
  })

  it('still finds the quarantined numbers in the packs', () => {
    // Guards the scan above from passing because the field vanished entirely.
    const withValidity = TEMPLATES.flatMap(([, template]) =>
      requirementsOf(template).filter((r) => r.validityPeriodDays !== undefined)
    )
    expect(withValidity.length).toBeGreaterThan(0)
  })
})

describe('country packs — Greece composition and citations', () => {
  const greece = PACKS.find((p) => p.countryCode === 'GR')
  const tourism = greece?.visaTypes[0]

  it('composes 28 requirements from three ownership layers', () => {
    // Pins the composition the coverage denominator depends on. It used to
    // assert that the first nineteen codes were the shared array, which held
    // only while the pack was two concatenated arrays — the Türkiye-owned
    // requirements sit at positions 9-13 and again at the end, so a prefix
    // comparison cannot express the split.
    //
    // What it says instead is where the twenty-eight come from, which is the
    // fact the coverage arithmetic actually depends on.
    const codes = requirementsOf(tourism!).map((r) => r.code)
    expect(codes.length).toBe(28)

    const byLayer = new Map<string, number>()
    for (const [, layerId] of greeceTourismComposition.ownership) {
      byLayer.set(layerId, (byLayer.get(layerId) ?? 0) + 1)
    }
    expect(Object.fromEntries(byLayer)).toEqual({
      'schengen-short-stay': 15,
      'tr-filing': 13,
      // 'greece' owns none: nothing in this pack is true *because* the
      // destination is Greece. Absent from the map rather than zero, since a
      // layer that declares nothing never reaches the ownership tally.
    })
  })

  it('carries the civil registry extract exactly once', () => {
    // The harmonised list makes it a general requirement for every applicant,
    // and VisaFlow had no requirement for it at all — the document existed
    // only inside another requirement's Turkish notes (ADR-048).
    const codes = requirementsOf(tourism!).map((r) => r.code)
    expect(codes.filter((c) => c === 'CIVIL_REGISTRY_EXTRACT')).toHaveLength(1)

    const extract = requirementsOf(tourism!).find(
      (r) => r.code === 'CIVIL_REGISTRY_EXTRACT'
    )
    expect({
      required: extract?.required,
      conditional: extract?.conditionalOn,
    }).toEqual({ required: true, conditional: undefined })
  })

  it('resolves every requirement citation it declares', () => {
    const known = new Set(sourcesOf(greece!).map((s) => s.id))
    const refs = requirementsOf(tourism!).flatMap((r) => r.sourceRefs ?? [])
    expect(refs.length).toBeGreaterThan(0)
    expect(refs.filter((id) => !known.has(id))).toEqual([])
  })

  it('is partially verified on exactly the evidence recorded', () => {
    // 18 of 28. The jump from 4 came from the harmonised list adopted for
    // Türkiye. Ten requirements stay uncited, three of them because a nearby
    // source exists but does not state what VisaFlow claims (ADR-048).
    expect(computeVerificationCoverage(greece!, tourism!)).toEqual({
      total: 28,
      verified: 18,
      isComplete: false,
    })
    expect(tourism!.reviewStatus).toBe('partially_verified')
    expect(
      sourcesOf(greece!).find((s) => s.id === 'gr-mfa-general')?.lastVerifiedAt
    ).toBeUndefined()
  })

  /**
   * The period is the rule, not decoration (ADR-048).
   *
   * The harmonised list says "the last three months" for both the bank
   * statement and the salary slips. VisaFlow said "3-6 months", which no
   * source states — a range invented somewhere upstream and then cited as if
   * it were authority. Pinned per locale, and pinned negatively too: a
   * translation that quietly restores the range must fail.
   */
  it.each(['tr', 'en'] as const)(
    'states the source-backed three-month period in %s',
    async (locale) => {
      await i18n.changeLanguage(locale)
      const td = dynamicT(i18n.t.bind(i18n))
      const text = (code: string) =>
        [
          td(`visa-domain:requirements.${code}.description`, {
            defaultValue: '',
          }),
          td(`visa-domain:requirements.${code}.notes`, { defaultValue: '' }),
        ].join(' ')

      const payslips = text('PAYSLIPS')
      const bank = text('BANK_STATEMENTS')
      await i18n.changeLanguage('tr')

      const threeMonths = /three months|üç aya|üç ayd/i
      const inventedRange = /3\s*-\s*6|3-6/

      expect({
        payslipsPeriod: threeMonths.test(payslips),
        payslipsNoRange: !inventedRange.test(payslips),
        bankPeriod: threeMonths.test(bank),
        bankNoRange: !inventedRange.test(bank),
      }).toEqual({
        payslipsPeriod: true,
        payslipsNoRange: true,
        bankPeriod: true,
        bankNoRange: true,
      })
    }
  )

  /**
   * A citation vouches for the whole rule, not the memorable part of it.
   *
   * Article 15(3) sets three criteria — the EUR 30 000 minimum, validity
   * throughout the territory of the Member States, and cover for the entire
   * intended stay. The first pass cited Article 15 while stating only the
   * amount, which understated the rule to the applicant most likely to buy the
   * wrong policy: one that is cheap, compliant on paper, and expires mid-trip
   * or excludes half of Schengen.
   *
   * Pinned in both locales because a translation is where half a rule quietly
   * goes missing.
   */
  it.each(['tr', 'en'] as const)(
    'states all three Article 15(3) criteria in %s',
    async (locale) => {
      await i18n.changeLanguage(locale)
      const td = dynamicT(i18n.t.bind(i18n))
      const notes = td('visa-domain:requirements.TRAVEL_INSURANCE.notes', {
        defaultValue: '',
      })
      const description = td(
        'visa-domain:requirements.TRAVEL_INSURANCE.description',
        { defaultValue: '' }
      )
      await i18n.changeLanguage('tr')

      const combined = `${description} ${notes}`
      expect({
        amount: /30[.,]?000/.test(combined),
        territory: /schengen/i.test(combined),
        duration: /entire stay|tamamını/i.test(combined),
      }).toEqual({ amount: true, territory: true, duration: true })
    }
  )
})

/**
 * The ADR-048 quarantine, re-expressed over layers and compositions.
 *
 * It used to read `commonSchengenDocuments` by name and assert the offender
 * list was non-empty — an honest record of a debt while the debt existed, and
 * useless the moment it was paid or a second layer appeared. The property it
 * was really protecting is not about one array: *a requirement must not carry
 * evidence scoped to a filing jurisdiction unless the jurisdiction that owns
 * that evidence is part of what you are looking at.*
 *
 * That splits into two checks which fail for genuinely different reasons, and
 * neither subsumes the other:
 *
 *  - **At the layer**, where contamination is written. A `common` or
 *    `destination` layer declaring a requirement that cites a
 *    jurisdiction-scoped source is the original defect: a second destination
 *    would inherit somebody else's consulate as its own authority.
 *  - **At the composition**, where contamination could still arrive. This one
 *    exists because the layer check is not sufficient: `PASSPORT_CURRENT` is
 *    common-owned and *does* cite a Türkiye source in the Greece composition,
 *    because the overlay appended it. That is the mechanism working, not a
 *    leak, and only a composition-aware check can tell the two apart.
 */
describe('country packs — jurisdiction evidence stays with its jurisdiction', () => {
  /** A source scoped to one country's applicants rather than EU-wide. */
  const isJurisdictionScoped = (source: RequirementSource) =>
    typeof source.jurisdiction === 'string' && source.jurisdiction !== 'EU'

  const scopedSourceIds = new Set(
    ALL_REQUIREMENT_LAYERS.flatMap((layer) =>
      (layer.sources ?? []).filter(isJurisdictionScoped).map((s) => s.id)
    )
  )

  const PRODUCTION_COMPOSITIONS = [greeceTourismComposition]

  it('has jurisdiction-scoped evidence to reason about at all', () => {
    // Non-vacuity. Every assertion below is of the form "no violations", and
    // "found no violations" is indistinguishable from "found nothing" unless
    // something positive is asserted first. If the packs ever stop carrying
    // jurisdiction-scoped sources, these checks stop meaning anything and this
    // is what says so.
    expect(scopedSourceIds.size).toBeGreaterThan(0)
  })

  it('declares jurisdiction-scoped citations only in jurisdiction layers', () => {
    const misplaced = ALL_REQUIREMENT_LAYERS.filter(
      (l) => l.kind !== 'jurisdiction'
    ).flatMap((layer) =>
      (layer.add ?? [])
        .filter((r) =>
          (r.sourceRefs ?? []).some((id) => scopedSourceIds.has(id))
        )
        .map((r) => `${layer.id} → ${r.code}`)
    )

    // The original ADR-048 defect, stated positively: eleven shared
    // requirements cited a Türkiye source before the split.
    expect(misplaced).toEqual([])
  })

  it('and a jurisdiction layer does carry some, so the check is not empty', () => {
    const carried = ALL_REQUIREMENT_LAYERS.filter(
      (l) => l.kind === 'jurisdiction'
    ).flatMap((layer) =>
      (layer.add ?? [])
        .filter((r) =>
          (r.sourceRefs ?? []).some((id) => scopedSourceIds.has(id))
        )
        .map((r) => r.code)
    )
    expect(carried.length).toBeGreaterThan(0)
  })

  it.each(PRODUCTION_COMPOSITIONS.map((c) => [c.template.id, c] as const))(
    '%s composes no jurisdiction it does not include',
    (_id, composition) => {
      // Reuses the detector proven against four synthetic compositions in
      // `pack-composition.test.ts`, including its own vacuity control. Derived
      // from composed sources rather than layer membership, so it asks the
      // question ADR-048 asks rather than restating how the pack was built.
      const present = jurisdictionScopedCodes(composition, 'EU')
      const composedJurisdictions = new Set(
        composition.sources
          .filter(isJurisdictionScoped)
          .map((s) => s.jurisdiction as string)
      )
      const foreign = [...present.keys()].filter(
        (j) => !composedJurisdictions.has(j)
      )
      expect(foreign).toEqual([])
    }
  )

  it.each(PRODUCTION_COMPOSITIONS.map((c) => [c.template.id, c] as const))(
    '%s actually contains jurisdiction-scoped evidence',
    (_id, composition) => {
      // The other half of non-vacuity: a composition carrying none would pass
      // the check above for the wrong reason.
      expect(jurisdictionScopedCodes(composition, 'EU').size).toBeGreaterThan(0)
    }
  )
})

/**
 * Requirements whose *translation* names a local document, without that making
 * the requirement itself jurisdictional.
 *
 * The token scan cannot tell these apart, and this is where that limitation is
 * written down rather than silently tolerated. `ID_CARD_COPY` asks for a copy
 * of a national identity card: the English prose is entirely generic, it cites
 * nothing, and any Schengen destination might reasonably ask for it. What trips
 * the scan is the Turkish translation glossing the local document by name
 * ("nüfus cüzdanının veya kimlik kartının") — a translator being helpful, not a
 * pack making a jurisdictional claim.
 *
 * Moving it to the Türkiye layer would be the wrong fix: a second destination
 * would then not ask for an ID copy at all. Rewriting the translation is
 * content work with its own review. Both are real options and neither is a
 * refactor, so the limitation is quarantined precisely instead: a *new* token
 * offender fails, this one does not.
 */
const KNOWN_LOCALE_GLOSSES: Record<string, string> = {
  ID_CARD_COPY:
    'Generic English prose and no citation; only the Turkish translation names ' +
    'the local document (nüfus cüzdanı). A translation gloss, not jurisdictional evidence.',
}

describe('country packs — institution names in shared prose (heuristic)', () => {
  /**
   * A heuristic, and deliberately never the authority.
   *
   * Citations decide whether a requirement is jurisdictional, because a
   * citation is a claim the pack makes about where its evidence comes from.
   * Prose is softer: it can name a local document in one locale for clarity
   * while asserting nothing. So this scan reports, and the citation check
   * above enforces.
   */
  const JURISDICTION_TOKENS = [
    'SGK',
    'Vukuatlı',
    'Nüfus',
    'Faaliyet Belgesi',
    'YÖK',
    'Ticaret Sicil',
    'İmza Sirküleri',
    'Vergi Levhası',
  ]

  async function tokenOffendersInSharedLayers(): Promise<string[]> {
    const offenders = new Set<string>()
    for (const locale of ['tr', 'en'] as const) {
      await i18n.changeLanguage(locale)
      const td = dynamicT(i18n.t.bind(i18n))
      for (const layer of ALL_REQUIREMENT_LAYERS) {
        if (layer.kind === 'jurisdiction') continue
        for (const requirement of layer.add ?? []) {
          const text = [
            requirement.nameKey,
            requirement.descriptionKey,
            requirement.notesKey,
          ]
            .filter((k): k is string => Boolean(k))
            .map((k) => td(k, { defaultValue: '' }))
            .join(' ')
          if (JURISDICTION_TOKENS.some((token) => text.includes(token))) {
            offenders.add(requirement.code)
          }
        }
      }
    }
    await i18n.changeLanguage('tr')
    return [...offenders].sort()
  }

  it('flags only requirements already recorded as locale glosses', async () => {
    // Not `toEqual([])`: that would require either moving a requirement or
    // editing a translation to stay green, and both are decisions rather than
    // cleanups. Not `toBeGreaterThan(0)` either, since the honest outcome is
    // that this list shrinks to nothing one day. A subset check keeps the guard
    // live — a new offender fails — while letting the known one stay recorded.
    const offenders = await tokenOffendersInSharedLayers()
    expect(offenders).toEqual(
      offenders.filter((code) => code in KNOWN_LOCALE_GLOSSES)
    )
  })

  it('still names the one it knows about, so the entry cannot rot', async () => {
    // If `ID_CARD_COPY` stops tripping the scan — because the gloss was
    // reworded or the requirement moved — the allowlist entry is stale and
    // should be deleted rather than left implying a limitation that is gone.
    const offenders = await tokenOffendersInSharedLayers()
    expect(offenders).toEqual(['ID_CARD_COPY'])
  })

  it('every recorded gloss explains itself', () => {
    for (const [code, reason] of Object.entries(KNOWN_LOCALE_GLOSSES)) {
      expect({ code, explained: reason.trim().length > 40 }).toEqual({
        code,
        explained: true,
      })
    }
  })
})

/**
 * Two requirements rendering the same label in one composition.
 *
 * Also a heuristic, and for the same reason: identity is the `code` (ADR-049),
 * never the prose. This cannot detect the case it would most like to — two
 * layers describing the same real document in different words under different
 * codes — because that needs meaning, and meaning lives only in translation.
 * What it does catch is the realistic slip: two layers both calling something
 * "Bank Statements", which reads to an applicant as one requirement listed
 * twice.
 */
describe('country packs — duplicate rendered labels (heuristic)', () => {
  it.each(['tr', 'en'] as const)(
    'no two composed requirements share a label in %s',
    async (locale) => {
      await i18n.changeLanguage(locale)
      const td = dynamicT(i18n.t.bind(i18n))

      const collisions: string[] = []
      for (const composition of [greeceTourismComposition]) {
        const byLabel = new Map<string, string[]>()
        for (const requirement of composition.template.documentRequirements) {
          const label = td(requirement.nameKey, { defaultValue: '' })
          if (!label) continue
          byLabel.set(label, [...(byLabel.get(label) ?? []), requirement.code])
        }
        for (const [label, codes] of byLabel) {
          if (codes.length > 1) collisions.push(`${label}: ${codes.join(', ')}`)
        }
      }
      await i18n.changeLanguage('tr')
      expect(collisions).toEqual([])
    }
  )
})
