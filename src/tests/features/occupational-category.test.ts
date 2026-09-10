import { describe, it, expect } from 'vitest'
import { ctxFor } from '@/tests/support/applicability'
import { applicableRequirements } from '@/features/documents/template-sync'
import { resolveVisaTemplate } from '@/config/countries'
import { importPartial } from '@/features/import-export/services/import.service'
import { EmploymentSchema } from '@/domain/schemas/employment.schema'
import {
  EmploymentStatusSchema,
  OCCUPATIONAL_CATEGORIES_BY_STATUS,
  OccupationalCategorySchema,
  type EmploymentStatus,
  type OccupationalCategory,
} from '@/domain/types/common'
import type { Application } from '@/domain/schemas/application.schema'
import legacyDossier from '@/tests/fixtures/dossier-schema-1.0.0.json'
import i18n from '@/i18n'
import { dynamicT } from '@/lib/i18n-dynamic'

/**
 * The occupational vocabulary, and the one property that makes it safe to ship.
 *
 * Three records had said the same thing for two sprints: `employed` cannot tell
 * a public servant from an ordinary employee, and `self_employed` cannot tell a
 * farmer from a company owner, so per-occupation document sets could not be
 * expressed at all (ADR-053). This is the vocabulary that expresses them.
 *
 * The risk is not in the new rows. It is in everything they sit beside: a
 * dossier written last week has no answer to the new question, applicability is
 * fail-closed, and a condition that reads an unanswered field is false. That is
 * exactly right for a requirement that did not exist — and would be a silent
 * disaster for one that did. So the load-bearing test here is not "the farmer
 * sees the certificate"; it is that an unanswered dossier sees the *same
 * checklist it saw before*, for every one of the seven statuses.
 */

const GREECE = resolveVisaTemplate('GR', 'short_stay_tourism')
if (!GREECE) throw new Error('Greece tourism template is not registered')
const GERMANY = resolveVisaTemplate('DE', 'short_stay_tourism')
if (!GERMANY) throw new Error('Germany tourism template is not registered')

const NEW_CODES = [
  'FARMER_CERTIFICATE',
  'FARMER_REGISTRY_RECORD',
  'FARMLAND_TITLE_DEED',
  'INSTITUTION_ID_CARD',
  'PROFESSIONAL_ID_CARD',
]

const application = (
  employmentStatus: EmploymentStatus,
  occupationalCategory?: OccupationalCategory
): Application =>
  ({
    destinationCountry: 'GR',
    visaType: 'short_stay_tourism',
    employment: {
      employmentStatus,
      ...(occupationalCategory ? { occupationalCategory } : {}),
    },
  }) as unknown as Application

const codesFor = (
  employmentStatus: EmploymentStatus,
  occupationalCategory?: OccupationalCategory,
  template = GREECE
) =>
  applicableRequirements(
    template,
    ctxFor(application(employmentStatus, occupationalCategory))
  ).map((r) => r.code)

describe('the occupational rows appear for their category and nobody else', () => {
  it.each([
    [
      'farmer',
      ['FARMER_CERTIFICATE', 'FARMER_REGISTRY_RECORD', 'FARMLAND_TITLE_DEED'],
    ],
    ['public_servant', ['INSTITUTION_ID_CARD']],
    ['independent_professional', ['PROFESSIONAL_ID_CARD']],
    ['company_owner', []],
    ['employee', []],
  ] as const)('%s is asked for exactly %j of them', (category, expected) => {
    // The status is the one the category belongs under, so this isolates the
    // category's effect rather than measuring the pair.
    const status: EmploymentStatus =
      category === 'public_servant' || category === 'employee'
        ? 'employed'
        : 'self_employed'
    const codes = codesFor(status, category)
    expect(NEW_CODES.filter((c) => codes.includes(c))).toEqual([...expected])
  })

  it('shows none of them to a dossier that has not answered', () => {
    // The fail-closed rule, asserted directly rather than inferred. H4c1 made
    // an absent value fail a comparison; this is the first vocabulary that
    // depends on it being true.
    for (const status of EmploymentStatusSchema.options) {
      const codes = codesFor(status)
      expect({
        status,
        seen: NEW_CODES.filter((c) => codes.includes(c)),
      }).toEqual({ status, seen: [] })
    }
  })

  it('gives Germany the farmer certificate and none of the Greek rows', () => {
    // Annex III I.5(b) is the filing jurisdiction's clause, so it reaches every
    // mission receiving applications lodged in Türkiye. The other four are the
    // Greek visa centre's and compose into nothing else.
    const codes = codesFor('self_employed', 'farmer', GERMANY)
    expect(NEW_CODES.filter((c) => codes.includes(c))).toEqual([
      'FARMER_CERTIFICATE',
    ])
  })
})

/**
 * What every status resolved to at 11a6bd4 — the commit before the vocabulary.
 *
 * A FROZEN LITERAL, AND THE FIRST ATTEMPT AT THIS TEST WAS NOT ONE. It computed
 * the "before" set by filtering the new codes out of the "after" set, which
 * reads like a comparison and is a tautology: both sides come from the same
 * resolution, so narrowing an *existing* condition to the new field moves both
 * together and the assertion still passes. That is precisely the regression the
 * test exists to catch — the one change in this area that can take a required
 * document away from someone who never saw the question. Caught by running it:
 * narrowing  to  left it green.
 *
 * These arrays were generated by checking out the baseline commit and resolving
 * both packs there, not by hand and not from the current tree. Editing one is
 * how a deliberate change to what an applicant is asked for gets reviewed.
 */
const BEFORE_H4C2: Record<string, Record<string, string[]>> = {
  GR: {
    employed: [
      'APPLICATION_FORM',
      'PASSPORT_CURRENT',
      'PHOTOS',
      'TRAVEL_INSURANCE',
      'TRANSPORT_RESERVATION',
      'TRANSPORT_MEANS_PROOF',
      'ACCOMMODATION',
      'ITINERARY',
      'EMPLOYMENT_LETTER',
      'APPROVED_LEAVE',
      'PAYSLIPS',
      'SOCIAL_SECURITY',
      'BANK_STATEMENTS',
      'CIVIL_REGISTRY_EXTRACT',
      'EMPLOYER_SIGNATURE_CIRCULAR',
      'PROPERTY_DEED',
    ],
    self_employed: [
      'APPLICATION_FORM',
      'PASSPORT_CURRENT',
      'PHOTOS',
      'TRAVEL_INSURANCE',
      'TRANSPORT_RESERVATION',
      'TRANSPORT_MEANS_PROOF',
      'ACCOMMODATION',
      'ITINERARY',
      'BANK_STATEMENTS',
      'CIVIL_REGISTRY_EXTRACT',
      'EMPLOYER_TRADE_REGISTRY',
      'PROPERTY_DEED',
      'COMPANY_ACTIVITY_CERTIFICATE',
      'TAX_PAYMENT_STATEMENT',
    ],
    unemployed: [
      'APPLICATION_FORM',
      'PASSPORT_CURRENT',
      'PHOTOS',
      'TRAVEL_INSURANCE',
      'TRANSPORT_RESERVATION',
      'TRANSPORT_MEANS_PROOF',
      'ACCOMMODATION',
      'ITINERARY',
      'BANK_STATEMENTS',
      'CIVIL_REGISTRY_EXTRACT',
      'PROPERTY_DEED',
    ],
    retired: [
      'APPLICATION_FORM',
      'PASSPORT_CURRENT',
      'PHOTOS',
      'TRAVEL_INSURANCE',
      'TRANSPORT_RESERVATION',
      'TRANSPORT_MEANS_PROOF',
      'ACCOMMODATION',
      'ITINERARY',
      'BANK_STATEMENTS',
      'CIVIL_REGISTRY_EXTRACT',
      'PROPERTY_DEED',
      'PENSIONER_BOOKLET',
    ],
    student: [
      'APPLICATION_FORM',
      'PASSPORT_CURRENT',
      'PHOTOS',
      'TRAVEL_INSURANCE',
      'TRANSPORT_RESERVATION',
      'TRANSPORT_MEANS_PROOF',
      'ACCOMMODATION',
      'ITINERARY',
      'BANK_STATEMENTS',
      'CIVIL_REGISTRY_EXTRACT',
      'PROPERTY_DEED',
      'STUDENT_CERTIFICATE',
    ],
    homemaker: [
      'APPLICATION_FORM',
      'PASSPORT_CURRENT',
      'PHOTOS',
      'TRAVEL_INSURANCE',
      'TRANSPORT_RESERVATION',
      'TRANSPORT_MEANS_PROOF',
      'ACCOMMODATION',
      'ITINERARY',
      'BANK_STATEMENTS',
      'CIVIL_REGISTRY_EXTRACT',
      'PROPERTY_DEED',
    ],
    other: [
      'APPLICATION_FORM',
      'PASSPORT_CURRENT',
      'PHOTOS',
      'TRAVEL_INSURANCE',
      'TRANSPORT_RESERVATION',
      'TRANSPORT_MEANS_PROOF',
      'ACCOMMODATION',
      'ITINERARY',
      'BANK_STATEMENTS',
      'CIVIL_REGISTRY_EXTRACT',
      'PROPERTY_DEED',
    ],
  },
  DE: {
    employed: [
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
      'PROPERTY_DEED',
      'EMPLOYMENT_LETTER',
      'APPROVED_LEAVE',
      'SOCIAL_SECURITY',
    ],
    self_employed: [
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
      'PROPERTY_DEED',
      'EMPLOYER_TRADE_REGISTRY',
      'EMPLOYER_TAX_PLATE',
      'TAX_PAYMENT_STATEMENT',
      'COMPANY_ACTIVITY_CERTIFICATE',
    ],
    unemployed: [
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
      'PROPERTY_DEED',
    ],
    retired: [
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
      'PENSIONER_BOOKLET',
      'PROPERTY_DEED',
    ],
    student: [
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
      'PROPERTY_DEED',
      'STUDENT_CERTIFICATE',
    ],
    homemaker: [
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
      'PROPERTY_DEED',
    ],
    other: [
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
      'PROPERTY_DEED',
    ],
  },
}

describe('the vocabulary is additive — this is the property, not a detail', () => {
  it.each(EmploymentStatusSchema.options)(
    'a %s dossier with no category sees the checklist it saw at 11a6bd4',
    (status) => {
      for (const [cc, template] of [
        ['GR', GREECE],
        ['DE', GERMANY],
      ] as const) {
        const now = codesFor(status, undefined, template)
        expect({ cc, status, codes: now }).toEqual({
          cc,
          status,
          codes: BEFORE_H4C2[cc]![status]!,
        })
      }
    }
  )

  it('and the baseline is not empty, so the comparison means something', () => {
    // Guards a generation script that wrote  — every assertion above would
    // then compare an empty list against an empty list and pass forever.
    const sizes = Object.values(BEFORE_H4C2).flatMap((byStatus) =>
      Object.values(byStatus).map((c) => c.length)
    )
    expect(Math.min(...sizes)).toBeGreaterThan(5)
    expect(sizes.length).toBe(14)
  })

  it.each(EmploymentStatusSchema.options)(
    'and answering the category adds rows without taking any away for %s',
    (status) => {
      const unanswered = codesFor(status)
      for (const category of OCCUPATIONAL_CATEGORIES_BY_STATUS[status] ?? []) {
        const answered = codesFor(status, category)
        // Superset, in order: every code the unanswered dossier saw is still
        // there, in the same sequence, because `deriveNextDocument` reads the
        // first required row with no record and reordering would change what a
        // half-finished dossier is told to do next.
        expect(answered.filter((c) => unanswered.includes(c))).toEqual(
          unanswered
        )
      }
    }
  )

  it('has statuses that offer no category at all, and asks them nothing', () => {
    // A pensioner, a student and someone not working are already the branch the
    // checklist publishes; narrowing further would be a question with no
    // consequence. Pinned so that adding a category to one of them is a
    // decision rather than a slip.
    const withCategories = EmploymentStatusSchema.options.filter(
      (s) => OCCUPATIONAL_CATEGORIES_BY_STATUS[s]
    )
    expect(withCategories).toEqual(['employed', 'self_employed'])
  })

  it('covers every category exactly once across the statuses', () => {
    // Guards the other direction: a value in the enum that no status offers is
    // unreachable from the UI, and one offered under two statuses would let the
    // same dossier mean two things.
    const offered = Object.values(OCCUPATIONAL_CATEGORIES_BY_STATUS).flatMap(
      (v) => v ?? []
    )
    expect([...offered].sort()).toEqual(
      [...OccupationalCategorySchema.options].sort()
    )
    expect(new Set(offered).size).toBe(offered.length)
  })
})

describe('the two vocabularies read as two questions, not one', () => {
  /**
   * No status label and no category label may be the same string, in either
   * locale.
   *
   * This is not a style rule. `employee` and `employed` are the same word in
   * Turkish — the first version of this vocabulary shipped both as *"Ücretli
   * çalışan"*, so the Employment step asked two questions whose answers were
   * spelled identically and stacked one above the other. Found in the browser,
   * not here, which is why it is here now: the parity test guarantees the keys
   * exist in both locales and says nothing about whether they can be told
   * apart.
   *
   * The repo already carries two free-text occupation-shaped questions —
   * `applicant.occupation` ("Meslek") and `employment.jobTitle` ("Görev") — so
   * the third one has to earn its distinctness rather than assume it.
   */
  it.each(['en', 'tr'] as const)('in %s', async (locale) => {
    await i18n.changeLanguage(locale)
    const td = dynamicT(i18n.t.bind(i18n))
    const statuses = EmploymentStatusSchema.options.map((v) =>
      td(`visa-domain:employmentStatus.${v}`)
    )
    const categories = OccupationalCategorySchema.options.map((v) =>
      td(`visa-domain:occupationalCategory.${v}`)
    )
    await i18n.changeLanguage('tr')

    // Non-vacuity first: an unresolved key would make every comparison a
    // comparison of key strings, which are trivially distinct.
    expect(statuses.every((s) => s && !s.includes(':'))).toBe(true)
    expect(categories.every((c) => c && !c.includes(':'))).toBe(true)

    expect(categories.filter((c) => statuses.includes(c))).toEqual([])
    expect(new Set(categories).size).toBe(categories.length)
  })
})

describe('an older build reading a file that carries the new field', () => {
  /**
   * The mirror of `schema-compat.test.ts`'s refusal test, written for the slice
   * that had the choice.
   *
   * The obvious way to carry this information was to widen
   * `EmploymentStatusSchema`, and the cost is measurable: `importPartial`
   * parses `application` as one unit, so an unknown enum value takes the
   * destination country, visa type, appointment, trip and financing with it —
   * and `hasData` is still true, so the import reports success. An unknown key
   * is dropped per-field. Both halves are asserted here rather than reasoned
   * about, because the reasoning is what a maintainer would have to redo before
   * widening the enum in some later sprint.
   */
  const fileWith = (employment: Record<string, unknown>) => {
    const file = JSON.parse(JSON.stringify(legacyDossier)) as Record<
      string,
      unknown
    >
    const app = file.application as Record<string, unknown>
    app.employment = { ...(app.employment as object), ...employment }
    return JSON.stringify(file)
  }

  it('keeps the whole application when the key is one it does not know', () => {
    const result = importPartial(
      fileWith({ occupationalCategory: 'public_servant' })
    )
    expect({
      application: result.data?.application !== undefined,
      omitted: result.omitted,
      destination: result.data?.application?.destinationCountry,
    }).toEqual({
      application: true,
      omitted: undefined,
      destination: (
        JSON.parse(fileWith({})) as {
          application: { destinationCountry: string }
        }
      ).application.destinationCountry,
    })
  })

  it('would have lost the whole application to an unknown status', () => {
    // The counterfactual, run for real. This is Strategy A's cost, and it is
    // the reason the field is a field.
    const result = importPartial(
      fileWith({ employmentStatus: 'public_servant' })
    )
    expect({
      application: result.data?.application,
      omitted: result.omitted,
      // And it still calls itself a success, because the applicant survived.
      success: result.success,
    }).toEqual({ application: undefined, omitted: 1, success: true })
  })

  it('accepts the field on the way in, so a round trip keeps it', () => {
    const parsed = EmploymentSchema.safeParse({
      employmentStatus: 'employed',
      occupationalCategory: 'public_servant',
    })
    expect(parsed.success && parsed.data.occupationalCategory).toBe(
      'public_servant'
    )
  })

  it('and refuses a category that is not in the vocabulary', () => {
    // The optional key is only safe because it is still a closed enum on the
    // way in; an open string would let a pack condition on a value no UI can
    // produce.
    expect(
      EmploymentSchema.safeParse({
        employmentStatus: 'employed',
        occupationalCategory: 'astronaut',
      }).success
    ).toBe(false)
  })
})
