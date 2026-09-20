import { describe, it, expect } from 'vitest'
import { ALL_REQUIREMENT_LAYERS } from '@/config/countries/layers'
import { trFilingLayer } from '@/config/countries/jurisdictions/tr-filing'
import { grTrMissionLayer } from '@/config/countries/jurisdictions/gr-tr-mission'
import { greeceTourismComposition } from '@/config/countries/greece/tourism'
import { germanyTourismComposition } from '@/config/countries/germany/tourism'
import type { CompositionResult } from '@/config/composition'
import type { RequirementLayer } from '@/config/types'

/**
 * Who is allowed to be the authority for a Türkiye filing requirement.
 *
 * Before this, every citation in `tr-filing` was a Hellenic Republic
 * publication. Composing that layer into a second destination would have made
 * that pack cite the Greek mission as its authority for SGK documents — the
 * ADR-048 defect one layer up, and one the quarantine cannot see because
 * `jurisdiction: 'TR'` is correct for a Greek mission page and for the
 * Commission act alike.
 *
 * The instrument both missions render is Commission Implementing Decision
 * C(2021) 5156, the ANNEX amending Annex III to C(2011) 7192, adopted under
 * Visa Code Article 14(5a) for the Türkiye jurisdiction. It is the neutral
 * authority; a mission's rendering of it is destination-specific and travels
 * only with that destination.
 */

const COMMISSION = 'eu-c2021-5156-turkey-annex3'
const GREEK_MISSION = [
  'gr-tr-harmonised-list',
  'gr-mfa-tr-visa-page',
  'gr-tr-visa-centre-checklist',
]

/**
 * Every requirement the Commission act actually supports, and where.
 *
 * Written out rather than derived, because "which clause supports this
 * contract" is a reading of a document and cannot be computed. Stating it here
 * makes a future citation added without evidence fail rather than pass.
 */
const SUPPORTED_BY_ANNEX_III: Record<string, string> = {
  // I. General requirements for all applicants
  CIVIL_REGISTRY_EXTRACT: 'I.2 complete extract of the civil registry',
  BANK_STATEMENTS:
    'I.4(a) bank statement, movements over the last three months',
  PAYSLIPS: 'I.4(b) salary slips of the last three months',
  PENSIONER_BOOKLET: 'I.4(c) pensioner booklet, if relevant',
  // I.5 by category of applicant
  EMPLOYMENT_LETTER: 'I.5(a) letter from employer',
  APPROVED_LEAVE: 'I.5(a) approval for leave',
  SOCIAL_SECURITY: 'I.5(a) SGK statement + service document, readable QR',
  EMPLOYER_TRADE_REGISTRY: 'I.5(c) trade register bulletin',
  CHAMBER_REGISTRATION_CERTIFICATE:
    'I.5(c) chamber registration; I.5(e)(iv) chamber register excerpt for ' +
    'truck drivers',
  TAX_PAYMENT_STATEMENT: 'I.5(c) statement of taxes payment',
  COMPANY_ACTIVITY_CERTIFICATE: 'I.5(c) company activity certificate',
  STUDENT_CERTIFICATE: 'I.5(d) student certificate',
  FARMER_CERTIFICATE:
    'I.5(b) farmer certificate issued by a chamber of agriculture',
  FILING_COUNTRY_RESIDENCE_PERMIT:
    'I.5(g) proof of residence in Türkiye for non-Turkish nationals, valid ' +
    'three months beyond departure from the Member States',
  // I.1 names three routes and VisaFlow now has a code for each. Two are
  // common-layer requirements the act also covers, reached by refinement; the
  // middle one is owned by this layer, because only Annex III states it.
  TRANSPORT_RESERVATION: 'I.1 flight reservations',
  TRANSPORT_MEANS_PROOF: 'I.1 other proof of intended means of transport',
  ITINERARY: 'I.1 proof of travel itinerary',
  ACCOMMODATION: 'I.3 proof of accommodation',
}

/**
 * Asked for by a mission but absent from the Commission act.
 *
 * Named individually because the failure this guards against is a bulk edit
 * that attaches the neutral citation to everything in the layer. Article 14(3)
 * lets a mission ask for more than the harmonised list; it does not let the
 * pack claim the Commission asked for it.
 */
/**
 * `EMPLOYER_TAX_PLATE` left this list in E5c — with the Türkiye layer itself.
 *
 * It was the clearest case the list ever held: asked for by the German mission
 * and by nobody else, sitting in the shared jurisdiction layer, so Greek
 * applicants were asked for a vergi levhası on no authority at all.
 *
 * Its definition now lives in `tr-mission-practice` and is **offered**, which
 * asks nobody for anything; `de-tr-mission` activates it and carries the only
 * evidence there has ever been for it (H5d, ADR-052d). Greece composes the
 * definition home and activates nothing out of it, so there is still no Greek
 * row to check — and now that is a property this pack proves rather than a
 * consequence of Greece not composing the layer at all.
 */
const NOT_IN_ANNEX_III = ['EMPLOYER_SIGNATURE_CIRCULAR']

describe('the Türkiye instrument is jurisdiction-level and destination-neutral', () => {
  const source = trFilingLayer.sources?.find((s) => s.id === COMMISSION)

  it('is declared by the jurisdiction layer', () => {
    expect(source).toBeDefined()
    expect(trFilingLayer.kind).toBe('jurisdiction')
  })

  it('is published by the Commission, not by a member state', () => {
    // The whole point: a source scoped to Türkiye can still belong to one
    // destination, and `jurisdiction` alone cannot tell the difference.
    expect(source?.authority).toBe('European Commission')
    expect(source?.jurisdiction).toBe('TR')
  })

  it('is declared by no destination or mission layer', () => {
    const others = ALL_REQUIREMENT_LAYERS.filter(
      (l) => l.id !== trFilingLayer.id
    )
    expect(
      others.filter((l) => (l.sources ?? []).some((s) => s.id === COMMISSION))
    ).toEqual([])
  })
})

describe('the neutral citation goes only where the act supports it', () => {
  const citing = greeceTourismComposition.template.documentRequirements
    .filter((r) => (r.sourceRefs ?? []).includes(COMMISSION))
    .map((r) => r.code)
    .sort()

  it('cites it for exactly the requirements Annex III covers', () => {
    expect(citing).toEqual(Object.keys(SUPPORTED_BY_ANNEX_III).sort())
  })

  it.each(NOT_IN_ANNEX_III)(
    'never attributes %s to the Commission act',
    (code) => {
      const requirement =
        greeceTourismComposition.template.documentRequirements.find(
          (r) => r.code === code
        )
      expect(requirement).toBeDefined()
      expect(requirement?.sourceRefs ?? []).not.toContain(COMMISSION)
    }
  )

  it('leaves the Visa Code requirements to the Visa Code', () => {
    // Annex III does not cover the form, the passport or the insurance —
    // Articles 11, 12 and 15 do, and they are already cited as such.
    for (const code of [
      'APPLICATION_FORM',
      'PASSPORT_CURRENT',
      'TRAVEL_INSURANCE',
    ]) {
      const r = greeceTourismComposition.template.documentRequirements.find(
        (x) => x.code === code
      )
      expect(r?.sourceRefs ?? []).not.toContain(COMMISSION)
    }
  })

  it('has something to check, so the comparison is not vacuous', () => {
    expect(citing.length).toBeGreaterThan(0)
    expect(NOT_IN_ANNEX_III.length).toBeGreaterThan(0)
  })
})

describe('Greek mission authority arrives only by destination refinement', () => {
  /**
   * Every layer both production packs compose, derived rather than listed.
   *
   * THERE USED TO BE EXACTLY ONE, AND THE CHECK BELOW NAMED IT. H5d added a
   * second — `tr-mission-practice`, the neutral definition home — and a guard
   * hard-coded to `tr-filing` would have gone on passing while saying nothing
   * about the new layer. Intersecting the two packs' layer lists asks the
   * question the check is actually about: *which layers can a citation reach
   * both destinations from?*
   */
  const PROBE_ROW = {
    code: 'PROBE_CODE',
    nameKey: 'probe:name',
    category: 'supporting',
    ownerType: 'applicant',
    required: true,
    revision: 1,
  } as const

  const declaringLayers = (composition: CompositionResult) =>
    new Set([
      ...composition.ownership.values(),
      // Offers too, or a layer that only *defines* would look absent from the
      // composition that carries it — which is precisely the layer this guard
      // was widened to reach.
      ...composition.offered.values(),
    ])

  const SHARED_LAYER_IDS = (() => {
    const inGreece = declaringLayers(greeceTourismComposition)
    return [...declaringLayers(germanyTourismComposition)].filter((id) =>
      inGreece.has(id)
    )
  })()

  /** Every field on a layer that can name a source. */
  const citationsIn = (layer: RequirementLayer): string[] => [
    ...(layer.add ?? []).flatMap((r) => r.sourceRefs ?? []),
    ...(layer.offer ?? []).flatMap((r) => r.sourceRefs ?? []),
    ...(layer.refine ?? []).flatMap((r) => r.addSourceRefs ?? []),
    ...(layer.activate ?? []).flatMap((a) => a.addSourceRefs ?? []),
    ...(layer.groups ?? []).flatMap((g) => g.sourceRefs ?? []),
    ...(layer.sources ?? []).map((s) => s.id),
  ]

  it('has more than one shared jurisdiction layer to check', () => {
    // Non-vacuity, and the reason this guard was widened: with one shared
    // layer, "every shared layer" and "`tr-filing`" are the same statement.
    expect(SHARED_LAYER_IDS).toContain(trFilingLayer.id)
    expect(SHARED_LAYER_IDS).toContain('tr-mission-practice')
  })

  const greekCitationsIn = (layer: RequirementLayer) =>
    citationsIn(layer)
      .filter((id) => (GREEK_MISSION as readonly string[]).includes(id))
      .map((id) => `${layer.id} → ${id}`)

  it('appears nowhere in any layer both packs compose', () => {
    // Shared means shared by two real packs, so a Greek citation in one of
    // these would reach a German applicant's checklist. Every citation-bearing
    // field is read, including the two ADR-052d added: an activation carries
    // evidence, and an offered definition must carry none.
    const offenders = ALL_REQUIREMENT_LAYERS.filter((l) =>
      SHARED_LAYER_IDS.includes(l.id)
    ).flatMap(greekCitationsIn)
    expect(offenders).toEqual([])
  })

  it('and would still notice one, in any field a layer can carry it', () => {
    /**
     * A detector that has never been seen to fire is indistinguishable from one
     * that cannot, and this one is unusually hard to observe: planting a Greek
     * citation in a real shared layer makes the *composer* throw at module
     * load — `duplicate-source` if the record already exists, `dangling-
     * source-ref` if it does not — so the leak never reaches this assertion and
     * the file reports "no tests" rather than a failure.
     *
     * That earlier refusal is a stronger guarantee, not a weaker one, but it is
     * a different guarantee. This exercises the detector itself, on a synthetic
     * layer, through each field ADR-052d made citation-bearing.
     */
    const shapes = (greek: string): RequirementLayer[] => [
      {
        id: 'probe-add',
        kind: 'jurisdiction',
        add: [{ ...PROBE_ROW, sourceRefs: [greek] }],
      },
      {
        id: 'probe-offer',
        kind: 'jurisdiction',
        offer: [{ ...PROBE_ROW, sourceRefs: [greek] }],
      },
      {
        id: 'probe-refine',
        kind: 'jurisdiction',
        refine: [{ code: PROBE_ROW.code, addSourceRefs: [greek] }],
      },
      {
        id: 'probe-activate',
        kind: 'jurisdiction',
        activate: [{ code: PROBE_ROW.code, addSourceRefs: [greek] }],
      },
    ]

    // Every Greek id, not just the first: the detector matches on membership,
    // so a list that had quietly lost an entry would still pass a one-id probe.
    for (const greek of GREEK_MISSION) {
      expect(shapes(greek).map(greekCitationsIn)).toEqual([
        [`probe-add → ${greek}`],
        [`probe-offer → ${greek}`],
        [`probe-refine → ${greek}`],
        [`probe-activate → ${greek}`],
      ])
    }
  })

  it('arrives from the Greek mission layer, and only from there', () => {
    // This layer used to own nothing. It now holds two quarantined legacy
    // requirements — Article 14(3) permits a mission to ask for more than the
    // harmonised list, and this is where such a thing would live — but that is
    // separate from the point here, which is about citations: every Greek
    // mission reference in the composition comes from this layer's refinements
    // and from nowhere else.
    const refined = (grTrMissionLayer.refine ?? []).flatMap(
      (r) => r.addSourceRefs
    )
    expect([...new Set(refined)].sort()).toEqual([...GREEK_MISSION].sort())
  })

  it('lets a quarantined requirement claim Greek authority only once its contract earns it', () => {
    /**
     * The rule has not moved; the rows have. A quarantined requirement is held
     * because its *contract* does not match the evidence, not because no
     * evidence exists, so attaching a mission citation to one in that state
     * would convert a recorded evidence gap into a claim of authority — the
     * failure the allowlist in `country-pack-provenance.test.ts` exists to
     * prevent.
     *
     * `EMPLOYER_SIGNATURE_CIRCULAR` left that state by being corrected: its
     * population now says what the visa centre's checklist says, which is what
     * makes the reference a citation rather than a promotion. The four sponsor
     * rows are still in it — they fire on a funding election the checklist does
     * not use — and stay uncited.
     */
    const cited = (grTrMissionLayer.add ?? [])
      .filter((r) => (r.sourceRefs ?? []).length > 0)
      .map((r) => r.code)
    expect(cited).toEqual(['EMPLOYER_SIGNATURE_CIRCULAR'])
  })

  it('composes after the jurisdiction layer, so it refines forwards', () => {
    // A destination layer would sit *before* `tr-filing` and refining from
    // there would invert the composition order ADR-052 states.
    const ids = ALL_REQUIREMENT_LAYERS.map((l) => l.id)
    expect(ids.indexOf(grTrMissionLayer.id)).toBeGreaterThan(
      ids.indexOf(trFilingLayer.id)
    )
  })

  it.each(
    ALL_REQUIREMENT_LAYERS.filter((l) => l.id.endsWith('-tr-mission')).map(
      (l) => [l.id, l] as const
    )
  )('%s follows the same rules', (_id, mission) => {
    // Every mission layer, not the Greek one by name — Germany's arrived after
    // these rules were written and must obey them without anybody remembering
    // to add a row. The Commission act is the jurisdiction's authority and no
    // mission may re-declare it as its own record; a mission's own citations
    // are its own; and it composes after the layer it refines.
    const ids = ALL_REQUIREMENT_LAYERS.map((l) => l.id)
    expect(ids.indexOf(mission.id)).toBeGreaterThan(
      ids.indexOf(trFilingLayer.id)
    )
    expect((mission.sources ?? []).map((s) => s.id)).not.toContain(COMMISSION)
    expect(mission.kind).toBe('jurisdiction')
  })

  it('has more than one mission layer to hold to that', () => {
    // Otherwise the row above is the Greek layer wearing a general name.
    expect(
      ALL_REQUIREMENT_LAYERS.filter((l) => l.id.endsWith('-tr-mission')).length
    ).toBeGreaterThan(1)
  })

  it('still reaches the composed pack, ordered authority-first', () => {
    const sgk = greeceTourismComposition.template.documentRequirements.find(
      (r) => r.code === 'SOCIAL_SECURITY'
    )
    expect(sgk?.sourceRefs).toEqual([COMMISSION, 'gr-tr-harmonised-list'])
  })
})
