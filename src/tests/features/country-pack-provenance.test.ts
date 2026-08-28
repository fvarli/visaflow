import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import { getAllCountryConfigs } from '@/config/countries'
import type {
  CountryConfig,
  DocumentRequirement,
  RequirementSource,
  ReviewStatus,
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
 * verified. The test this replaces pinned Greece to `unverified`, which would
 * have failed on the day someone honestly verified it — a guard that punishes
 * the outcome it exists to encourage. A truthful pack passes at any status.
 */

const PACKS = getAllCountryConfigs()

/** Every (country, template) pair, so a failure names the pack it came from. */
const TEMPLATES: [CountryConfig, VisaTypeTemplate][] = PACKS.flatMap((pack) =>
  pack.visaTypes.map(
    (template) => [pack, template] as [CountryConfig, VisaTypeTemplate]
  )
)

/** Statuses that assert a human checked this against a published source. */
const CLAIMS_VERIFICATION: ReviewStatus[] = ['verified', 'partially_verified']

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
  it.each(TEMPLATES)(
    '$countryCode: only claims review it can support',
    (pack, template) => {
      if (!CLAIMS_VERIFICATION.includes(template.reviewStatus)) return

      // Saying "verified" means a person checked this against something, on a
      // date. Without a resolvable source carrying that date there is nothing
      // behind the claim.
      const cited = (template.sourceIds ?? [])
        .map((id) => sourcesOf(pack).find((s) => s.id === id))
        .filter((s): s is RequirementSource => s !== undefined)

      expect({
        pack: pack.countryCode,
        template: template.id,
        status: template.reviewStatus,
        hasVerifiedSource: cited.some((s) => Boolean(s.lastVerifiedAt)),
      }).toEqual({
        pack: pack.countryCode,
        template: template.id,
        status: template.reviewStatus,
        hasVerifiedSource: true,
      })
    }
  )
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
  it('no production code consumes validityPeriodDays', () => {
    // Ten unsourced document-age numbers (90, 180, 30×8) live in the packs and
    // nothing reads them. That is the only reason they are harmless: the moment
    // a consumer appears, VisaFlow starts asserting "payslips are valid 30
    // days" with no source behind it — an invented deadline (ADR-015, ADR-046).
    //
    // This test is the tripwire. If a real consumer is added, bring a verified
    // source with it and update this test deliberately.
    const withValidity = TEMPLATES.flatMap(([, template]) =>
      requirementsOf(template).filter((r) => r.validityPeriodDays !== undefined)
    )
    expect(withValidity.length).toBeGreaterThan(0)
    expect(
      withValidity.every(
        (r) => r.sourceRefs === undefined || r.sourceRefs.length === 0
      )
    ).toBe(true)
  })
})
