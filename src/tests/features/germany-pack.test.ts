import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import { germanyConfig } from '@/config/countries/germany'
import { germanyTourismComposition } from '@/config/countries/germany/tourism'
import { greeceTourismComposition } from '@/config/countries/greece/tourism'
import { greeceConfig } from '@/config/countries/greece'
import { deTrMissionLayer } from '@/config/countries/jurisdictions/de-tr-mission'
import { grTrMissionLayer } from '@/config/countries/jurisdictions/gr-tr-mission'
import { ALL_REQUIREMENT_LAYERS } from '@/config/countries/layers'
import {
  computeVerificationCoverage,
  isReviewStatusSupported,
} from '@/config/countries/verification-coverage'
import { resolveVisaTemplate } from '@/config/countries'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { DocumentRequirement } from '@/config/types'

/**
 * The second production pack, and what having two of them proves.
 *
 * Until this pack existed, every claim ADR-052 made about composition was
 * demonstrated by Greece plus synthetic fixtures. Synthetic layers can prove a
 * mechanism; they cannot show that two *real* packs built from the same shared
 * layers stay separate where they must and shared where they should. That is
 * what this file asserts, and the four properties it pins are the ones a
 * regression would break first.
 */
const germany = germanyTourismComposition
const greece = greeceTourismComposition

const GERMANY_ORDER = [
  'APPLICATION_FORM',
  'DE_S54_DECLARATION',
  'PASSPORT_CURRENT',
  'DE_TRAVEL_HISTORY_COPIES',
  'PHOTOS',
  'TRAVEL_INSURANCE',
  'TRANSPORT_RESERVATION',
  'TRANSPORT_MEANS_PROOF',
  'ITINERARY',
  'CIVIL_REGISTRY_EXTRACT',
  'ACCOMMODATION',
  'DE_OFFICIAL_UNDERTAKING',
  'BANK_STATEMENTS',
  'PAYSLIPS',
  'PENSIONER_BOOKLET',
  'PROPERTY_DEED',
  'EMPLOYMENT_LETTER',
  'APPROVED_LEAVE',
  'SOCIAL_SECURITY',
  'EMPLOYER_TRADE_REGISTRY',
  'EMPLOYER_TAX_PLATE',
  'TAX_PAYMENT_STATEMENT',
  'COMPANY_ACTIVITY_CERTIFICATE',
  // Annex III I.5(b), which this sheet also asks for at its own section 4(b).
  'FARMER_CERTIFICATE',
  'STUDENT_CERTIFICATE',
  'FILING_COUNTRY_RESIDENCE_PERMIT',
]

/** Every citation the German layers introduce, by the source that carries it. */
const GERMAN_SOURCE_IDS = [
  'de-aufenthg-54',
  'de-tr-tourism-checklist',
  'de-tr-schengen-general',
]
const GREEK_SOURCE_IDS = [
  'gr-mfa-general',
  'gr-tr-harmonised-list',
  'gr-mfa-tr-visa-page',
  // Operated by the Greek mission's authorized visa centre. Germany must never
  // compose it — the strongest form of "one destination's evidence is not
  // another's", because this one is not even published by a ministry.
  'gr-tr-visa-centre-checklist',
]

const codeOf = (composition: typeof germany, code: string) =>
  composition.template.documentRequirements.find((r) => r.code === code)

describe('Germany pack — composition', () => {
  it('resolves through the registry like any other pack', () => {
    // No consumer knows a second pack arrived: the same resolver, keyed by the
    // country code the dossier stores.
    expect(resolveVisaTemplate('DE', 'short_stay_tourism')).toBe(
      germany.template
    )
  })

  it('composes exactly these requirements, in exactly this order', () => {
    // Order is behaviour — document seeding and `deriveNextDocument` both read
    // it — so it is pinned rather than left to layer declaration order. This is
    // the German mission sheet's own sequence.
    expect(germany.template.documentRequirements.map((r) => r.code)).toEqual(
      GERMANY_ORDER
    )
  })

  it('owns four requirements and inherits the other twenty-two', () => {
    const tally = new Map<string, number>()
    for (const [, layerId] of germany.ownership) {
      tally.set(layerId, (tally.get(layerId) ?? 0) + 1)
    }
    expect(Object.fromEntries(tally)).toEqual({
      'schengen-short-stay': 8,
      // Twelve since F0 — `TRANSPORT_MEANS_PROOF` is Annex III's, so this pack
      // inherits it for the same reason Greece does: both file in Türkiye.
      // Fourteen since H4c2b2 added the farmer certificate on I.5(b). Germany
      // gains a requirement from a Greek evidence pass, and that is the layer
      // model working rather than a leak: the clause was always Annex III's,
      // and this sheet asks for the document itself at section 4(b).
      'tr-filing': 14,
      // Four since H3: the official undertaking is this mission's own
      // evidence, accepted in place of an accommodation document.
      'de-tr-mission': 4,
      // 'germany' owns none, the same finding Greece produced — now with a
      // second pack behind it. It contributes Germany's statute and nothing
      // else, so it never reaches the ownership tally.
    })
  })

  it('declares a review status its own evidence supports', () => {
    const coverage = computeVerificationCoverage(
      germanyConfig,
      germany.template
    )
    // Complete after E5c: the four uncited rows were the sponsor block, which
    // this pack no longer composes. Completeness by subtraction, and the
    // envelope says `verified` because that is the only status the arithmetic
    // now supports. F0 moved both sides by one and completeness held, which is
    // the property worth pinning: a requirement may not join this pack without
    // its own source.
    expect(coverage).toEqual({ total: 26, verified: 26, isComplete: true })
    expect(
      isReviewStatusSupported(germany.template.reviewStatus, coverage)
    ).toBe(true)
  })

  it('leaves no requirement uncited', () => {
    // It used to leave four — the sponsor block, which E5c moved to the layer
    // only Greece composes. Naming the empty set keeps the coverage figure
    // above from being a bare number nobody can check.
    const uncited = germany.template.documentRequirements
      .filter((r) => (r.sourceRefs ?? []).length === 0)
      .map((r) => r.code)
    expect(uncited).toEqual([])
  })
})

describe('Germany pack — the two requirements it owns', () => {
  it('pins the § 54 declaration', () => {
    expect(codeOf(germany, 'DE_S54_DECLARATION')).toEqual({
      code: 'DE_S54_DECLARATION',
      nameKey: 'visa-domain:requirements.DE_S54_DECLARATION.name',
      descriptionKey: 'visa-domain:requirements.DE_S54_DECLARATION.description',
      notesKey: 'visa-domain:requirements.DE_S54_DECLARATION.notes',
      category: 'application_form',
      ownerType: 'applicant',
      required: true,
      // Two authorities, two claims: the checklist says it must be submitted
      // here, the statute is what it refers to. Order is declaration order.
      sourceRefs: ['de-tr-tourism-checklist', 'de-aufenthg-54'],
      revision: 1,
      contractKey: 'DE_S54_DECLARATION@1',
    })
  })

  it('pins the travel-history copies', () => {
    expect(codeOf(germany, 'DE_TRAVEL_HISTORY_COPIES')).toEqual({
      code: 'DE_TRAVEL_HISTORY_COPIES',
      nameKey: 'visa-domain:requirements.DE_TRAVEL_HISTORY_COPIES.name',
      descriptionKey:
        'visa-domain:requirements.DE_TRAVEL_HISTORY_COPIES.description',
      notesKey: 'visa-domain:requirements.DE_TRAVEL_HISTORY_COPIES.notes',
      category: 'previous_travel',
      ownerType: 'applicant',
      required: true,
      sourceRefs: ['de-tr-tourism-checklist'],
      revision: 1,
      contractKey: 'DE_TRAVEL_HISTORY_COPIES@1',
    })
  })

  it('does not reuse PREVIOUS_VISAS, and carries neither version of it', () => {
    // The reuse rule in ADR-052a, asserted rather than described. The two are
    // not interchangeable — one is optional, Schengen-only and uncited; the
    // other is mandatory, five visa families, ten years, with the passport
    // pages — so they are two codes, and Germany carries only its own.
    const codes = germany.template.documentRequirements.map((r) => r.code)
    expect(codes).toContain('DE_TRAVEL_HISTORY_COPIES')
    expect(codes).not.toContain('PREVIOUS_VISAS')
  })

  it('inherits none of the requirements quarantined to the Greek mission', () => {
    // The whole point of the quarantine, now tested against a real second pack
    // rather than a synthetic one.
    const codes = new Set(
      germany.template.documentRequirements.map((r) => r.code)
    )
    const quarantined = (grTrMissionLayer.add ?? []).map((r) => r.code)
    expect(quarantined.filter((code) => codes.has(code))).toEqual([])
    // And there is something to inherit, so the check is not empty.
    expect(quarantined.length).toBeGreaterThan(0)
  })

  it('inherits I.5(g) from the jurisdiction, with no Greek semantics attached', () => {
    /**
     * The one requirement H4c1b added, and the reason it is not a leak.
     *
     * Annex III is the harmonised list the Commission adopted for Türkiye, so
     * a foreign resident's permit is what the *jurisdiction* asks of everyone
     * filing in it — not something one mission decided. Scoping it to Greece
     * would have been the ADR-052a error in reverse: mission practice dressed
     * as jurisdiction authority, with Germany quietly excused an obligation
     * its own sheet enumerates a category for.
     *
     * What Germany must *not* pick up is Greece's citation. The Greek mission
     * appends its own copy of the instrument for its own composition; that ref
     * travels with Greece and reaches nothing else.
     */
    const permit = germany.template.documentRequirements.find(
      (r) => r.code === 'FILING_COUNTRY_RESIDENCE_PERMIT'
    )
    expect({
      composed: Boolean(permit),
      owner: germany.ownership.get('FILING_COUNTRY_RESIDENCE_PERMIT'),
      sourceRefs: permit?.sourceRefs,
    }).toEqual({
      composed: true,
      owner: 'tr-filing',
      sourceRefs: ['eu-c2021-5156-turkey-annex3'],
    })
  })

  it.each(['tr', 'en'] as const)('renders both codes in %s', async (locale) => {
    // A code with no translation reaches an applicant as SCREAMING_CASE.
    await i18n.changeLanguage(locale)
    const td = dynamicT(i18n.t.bind(i18n))
    const unresolved = (deTrMissionLayer.add ?? [])
      .filter((r) => !td(r.nameKey, { defaultValue: '' }))
      .map((r) => r.code)
    await i18n.changeLanguage('tr')

    expect(unresolved).toEqual([])
  })
})

describe('Germany pack — no Greek evidence reaches it', () => {
  it('cites no Greek source in any requirement', () => {
    const offenders = germany.template.documentRequirements
      .filter((r) =>
        (r.sourceRefs ?? []).some((id) => GREEK_SOURCE_IDS.includes(id))
      )
      .map((r) => r.code)
    expect(offenders).toEqual([])
  })

  it('composes no Greek source at all', () => {
    // Stronger than the citation check: a Greek record must not even be in the
    // pool, or a later refinement could reach one.
    const ids = germany.sources.map((s) => s.id)
    expect(ids.filter((id) => GREEK_SOURCE_IDS.includes(id))).toEqual([])
  })

  it('and Greece composes no German source', () => {
    const ids = greece.sources.map((s) => s.id)
    expect(ids.filter((id) => GERMAN_SOURCE_IDS.includes(id))).toEqual([])
  })

  it('keeps German evidence out of the shared and Greek layers', () => {
    // Where a leak would actually originate: a citation added to a layer both
    // packs compose. `de-tr-mission` is the only layer allowed to name these.
    const leaking = ALL_REQUIREMENT_LAYERS.filter(
      (l) => l.id !== deTrMissionLayer.id
    )
      .filter((layer) =>
        [
          ...(layer.add ?? []).flatMap((r) => r.sourceRefs ?? []),
          ...(layer.refine ?? []).flatMap((r) => r.addSourceRefs ?? []),
          ...(layer.sources ?? []).map((s) => s.id),
        ].some((id) => id.startsWith('de-') && id !== 'de-aufenthg-54')
      )
      .map((l) => l.id)
    expect(leaking).toEqual([])
  })

  it('declares Germany’s statute in Germany’s own destination layer', () => {
    // The one German record that is not the mission's: it is Germany's law, so
    // it belongs to the destination layer, and it is not floating unattached —
    // the declaration cites it.
    const germanyLayer = ALL_REQUIREMENT_LAYERS.find((l) => l.id === 'germany')
    expect((germanyLayer?.sources ?? []).map((s) => s.id)).toEqual([
      'de-aufenthg-54',
    ])
    expect(codeOf(germany, 'DE_S54_DECLARATION')?.sourceRefs).toContain(
      'de-aufenthg-54'
    )
  })
})

describe('Germany pack — what the two packs share is only neutral evidence', () => {
  const germanIds = germany.sources.map((s) => s.id)
  const greekIds = greece.sources.map((s) => s.id)

  it('shares exactly the EU instruments and the Commission act', () => {
    // An equality, not a subset: a subset check would pass if the two packs
    // shared nothing at all, and "they share nothing" is a different pack
    // architecture from the one ADR-052 describes.
    expect(germanIds.filter((id) => greekIds.includes(id))).toEqual([
      'eu-visa-code-art11',
      'eu-visa-code-art12',
      'eu-visa-code-art13',
      'eu-visa-code-art15',
      'eu-visa-code-annex2',
      'eu-c2021-5156-turkey-annex3',
    ])
  })

  it('keeps each pack’s own mission evidence to itself', () => {
    expect(germanIds.filter((id) => !greekIds.includes(id))).toEqual(
      GERMAN_SOURCE_IDS
    )
    expect(greekIds.filter((id) => !germanIds.includes(id))).toEqual(
      GREEK_SOURCE_IDS
    )
  })

  it('inherits the Türkiye documents with the Commission as their authority', () => {
    // The property that made `tr-filing` reusable in the first place. Every
    // Türkiye requirement Germany inherits leads with the neutral instrument;
    // the mission's rendering, where there is one, follows it.
    const sgk = codeOf(germany, 'SOCIAL_SECURITY')
    expect(sgk?.sourceRefs).toEqual([
      'eu-c2021-5156-turkey-annex3',
      'de-tr-tourism-checklist',
    ])
    // The same code in Greece leads with the same instrument and a different
    // mission — one contract, two renderings.
    expect(codeOf(greece, 'SOCIAL_SECURITY')?.sourceRefs).toEqual([
      'eu-c2021-5156-turkey-annex3',
      'gr-tr-harmonised-list',
    ])
  })
})

describe('Germany pack — refinement adds citations and detail, and nothing else', () => {
  it('changes no shared requirement except its citations and its detail', () => {
    // The composer's contract, checked where it matters most: every code both
    // packs carry must be identical field for field once the three additive
    // fields are set aside. A destination that could reword a shared
    // requirement, or move its requiredness or applicability, would make one
    // code mean two different things — which is still forbidden, and is what
    // this measures.
    //
    // `sourceRefs` and `detailKeys` are the additions a refinement may make,
    // and `contractKey` names which of them applied. Everything else — the
    // owner's `revision` now included, since F1b gave it back — is the identity
    // of the requirement and must match exactly.
    const strip = ({
      sourceRefs: _refs,
      detailKeys: _detail,
      contractKey: _key,
      ...rest
    }: DocumentRequirement) => JSON.stringify(rest)
    const shared = germany.template.documentRequirements.filter((r) =>
      greece.template.documentRequirements.some((g) => g.code === r.code)
    )
    // Twenty-one codes are common to both packs after F0 — the number moves
    // whenever ownership does, so the guard is that there is a substantial
    // shared set to compare, not a pinned count.
    expect(shared.length).toBeGreaterThan(15)
    const diverged = shared
      .filter((requirement) => {
        const counterpart = codeOf(greece, requirement.code)
        return !counterpart || strip(requirement) !== strip(counterpart)
      })
      .map((r) => r.code)
    expect(diverged).toEqual([])
  })

  it('gives two different bars two different keys, and never one key', () => {
    // THE GUARD THAT WAS MISSING WHEN C1 SHIPPED, in both directions.
    //
    // The version here at F1 checked only that identical detail implied an
    // identical number. The dangerous direction is the other one — *different*
    // detail sharing a number — and it went unasserted while `PHOTOS` really
    // did carry revision 2 in both packs for two different photographs.
    const mismatched = germany.template.documentRequirements
      .map((de) => [de, codeOf(greece, de.code)] as const)
      .filter(([, gr]) => gr !== undefined)
      .filter(([de, gr]) => {
        const sameDetail =
          JSON.stringify(de.detailKeys ?? []) ===
          JSON.stringify(gr!.detailKeys ?? [])
        return sameDetail !== (de.contractKey === gr!.contractKey)
      })
      .map(([de]) => de.code)
    expect(mismatched).toEqual([])

    // And the owner's revision is identical everywhere, which is the property
    // F1b restored: `satisfiedRevision: N` means one thing again.
    const divergedRevisions = germany.template.documentRequirements
      .map((de) => [de, codeOf(greece, de.code)] as const)
      .filter(([de, gr]) => gr !== undefined && de.revision !== gr.revision)
      .map(([de]) => de.code)
    expect(divergedRevisions).toEqual([])
  })

  it('pins which requirements the mission’s pages vouch for', () => {
    // Written out, because "which requirements does this checklist support" is
    // a reading of a document. A bulk edit attaching the checklist to
    // everything in the pack fails here.
    const cited = (id: string) =>
      germany.template.documentRequirements
        .filter((r) => (r.sourceRefs ?? []).includes(id))
        .map((r) => r.code)

    expect(cited('de-tr-schengen-general')).toEqual([
      'PASSPORT_CURRENT',
      'PHOTOS',
      'TRAVEL_INSURANCE',
    ])
    expect(cited('de-tr-tourism-checklist')).toEqual([
      'APPLICATION_FORM',
      'DE_S54_DECLARATION',
      'DE_TRAVEL_HISTORY_COPIES',
      'TRANSPORT_RESERVATION',
      'TRANSPORT_MEANS_PROOF',
      'ITINERARY',
      'CIVIL_REGISTRY_EXTRACT',
      'ACCOMMODATION',
      'DE_OFFICIAL_UNDERTAKING',
      'BANK_STATEMENTS',
      'PAYSLIPS',
      'EMPLOYMENT_LETTER',
      'APPROVED_LEAVE',
      'SOCIAL_SECURITY',
      'EMPLOYER_TRADE_REGISTRY',
      'EMPLOYER_TAX_PLATE',
      'STUDENT_CERTIFICATE',
    ])
  })

  it('attributes to the sheet nothing the sheet does not ask for', () => {
    // `PENSIONER_BOOKLET` is the case worth naming: the sheet asks for
    // documents showing pension *payments*, Annex III asks for the pensioner
    // booklet, and this requirement's contract renders the booklet. Citing the
    // sheet here would attribute to it a document it does not request.
    const misattributed = [
      'PENSIONER_BOOKLET',
      'TAX_PAYMENT_STATEMENT',
      'COMPANY_ACTIVITY_CERTIFICATE',
      'PROPERTY_DEED',
    ].filter((code) =>
      (codeOf(germany, code)?.sourceRefs ?? []).includes(
        'de-tr-tourism-checklist'
      )
    )
    expect(misattributed).toEqual([])
  })

  it('keeps the shared photograph contract identical and the detail apart', () => {
    // THE LIMITATION THIS USED TO PIN IS GONE, AND THE BOUNDARY REPLACING IT IS
    // NARROWER. The German mission states 35 x 45 mm, not older than six
    // months, full-face; the Greek one says only "recent". Both are now
    // rendered, each in its own composition, and the *base* contract is still
    // byte-identical — an applicant in either pack reads the same ICAO 9303
    // requirement, with different detail beneath it.
    //
    // What must never happen is the German measurements reaching Greece. That
    // is asserted here by inspection and again, from the other side, by the
    // C2 claim scan in the provenance suite, which now reads Greece's
    // `detailKeys` as well as its prose.
    const de = codeOf(germany, 'PHOTOS')
    const gr = codeOf(greece, 'PHOTOS')
    expect({
      nameKey: de?.nameKey,
      descriptionKey: de?.descriptionKey,
      notesKey: de?.notesKey,
    }).toEqual({
      nameKey: gr?.nameKey,
      descriptionKey: gr?.descriptionKey,
      notesKey: gr?.notesKey,
    })
    expect(de?.detailKeys).toEqual([
      'visa-domain:detail.de-tr-mission.PHOTOS.count',
      'visa-domain:detail.de-tr-mission.PHOTOS.size',
      'visa-domain:detail.de-tr-mission.PHOTOS.pose',
    ])
    expect(gr?.detailKeys).toEqual([
      'visa-domain:detail.gr-tr-mission.PHOTOS.recent',
    ])
    // The owner's revision is 1 in both — a fragment no longer touches it. What
    // separates the two bars is the key, and it must separate them: under the
    // additive scheme both packs sat at revision 2 with different photographs,
    // and this assertion said `[2, 2]` as though that were fine.
    expect([de?.revision, gr?.revision]).toEqual([1, 1])
    expect(de?.contractKey).toBe('PHOTOS@1+de-tr-mission:2')
    expect(gr?.contractKey).toBe('PHOTOS@1+gr-tr-mission:1')
    expect(de?.sourceRefs).toEqual([
      'eu-visa-code-art13',
      'de-tr-schengen-general',
    ])
    // Greece now cites its consulate page here too, for the same reason
    // Germany cites its general sheet: each mission is the authority for the
    // detail it added, and for nothing else.
    expect(gr?.sourceRefs).toEqual([
      'eu-visa-code-art13',
      'gr-mfa-tr-visa-page',
    ])
  })
})

describe('Germany pack — Greece is untouched by its arrival', () => {
  it('still composes its own requirements with its own coverage', () => {
    expect(greece.template.documentRequirements).toHaveLength(27)
    expect(computeVerificationCoverage(greeceConfig, greece.template)).toEqual({
      total: 27,
      verified: 23,
      isComplete: false,
    })
  })

  it('still resolves to its own template, not Germany’s', () => {
    // The registry now has two entries keyed by country code; this is the
    // assertion that they do not bleed.
    expect(resolveVisaTemplate('GR', 'short_stay_tourism')).toBe(
      greece.template
    )
    expect(resolveVisaTemplate('GR', 'short_stay_tourism')).not.toBe(
      germany.template
    )
  })
})
