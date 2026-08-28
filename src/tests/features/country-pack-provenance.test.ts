import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import {
  getAllCountryConfigs,
  commonSchengenDocuments,
} from '@/config/countries'
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

  it('composes 19 shared Schengen requirements and 8 Greece-specific ones', () => {
    // Pins the composition the coverage denominator depends on. If the shared
    // array grows, coverage silently drops and this says so first.
    const codes = requirementsOf(tourism!).map((r) => r.code)
    const shared = commonSchengenDocuments.map((r) => r.code)
    expect(codes.length).toBe(27)
    expect(codes.slice(0, shared.length)).toEqual(shared)
  })

  it('resolves every requirement citation it declares', () => {
    const known = new Set(sourcesOf(greece!).map((s) => s.id))
    const refs = requirementsOf(tourism!).flatMap((r) => r.sourceRefs ?? [])
    expect(refs.length).toBeGreaterThan(0)
    expect(refs.filter((id) => !known.has(id))).toEqual([])
  })

  it('is partially verified on exactly the evidence recorded', () => {
    // 4 of 27, from Visa Code Articles 12 and 15 and Annex II. The Hellenic
    // Republic's own publication could not be reached, so every
    // Greece-specific requirement stays unverified and `gr-mfa-general`
    // carries no verification date.
    expect(computeVerificationCoverage(greece!, tourism!)).toEqual({
      total: 27,
      verified: 4,
      isComplete: false,
    })
    expect(tourism!.reviewStatus).toBe('partially_verified')
    expect(
      sourcesOf(greece!).find((s) => s.id === 'gr-mfa-general')?.lastVerifiedAt
    ).toBeUndefined()
  })
})
