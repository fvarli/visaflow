import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import { dynamicT } from '@/lib/i18n-dynamic'
import { ctxFor } from '@/tests/support/applicability'
import { applicableRequirements } from '@/features/documents/template-sync'
import {
  occupationAfterStatusChange,
  resolveOccupation,
} from '@/features/documents/applicability'
import { resolveVisaTemplate } from '@/config/countries'
import { ALL_REQUIREMENT_LAYERS } from '@/config/countries/layers'
import { importPartial } from '@/features/import-export/services/import.service'
import { exportDossier } from '@/features/import-export/services/export.service'
import { EmploymentSchema } from '@/domain/schemas/employment.schema'
import {
  EmploymentStatusSchema,
  KNOWN_OCCUPATION_CODES,
  OCCUPATIONS_BY_STATUS,
  type EmploymentStatus,
} from '@/domain/types/common'
import type { Application } from '@/domain/schemas/application.schema'
import type { Employment } from '@/domain/schemas/employment.schema'
import legacyDossier from '@/tests/fixtures/dossier-schema-1.0.0.json'

/**
 * The occupational capability, carrying no behaviour at all.
 *
 * Nothing in either country pack consults occupation yet — that is deliberate,
 * and it is what makes this slice's central property provable in isolation:
 * adding the field changes nothing for anybody. The first attempt at this could
 * not demonstrate that, because it shipped five requirement codes in the same
 * commit as the vocabulary.
 *
 * The load-bearing tests here are therefore the negative ones. What the code
 * must NOT do — reject a slice, erase an unknown value, act on a contradictory
 * pair, alter an existing checklist — is the whole contract (ADR-053).
 */

const GREECE = resolveVisaTemplate('GR', 'short_stay_tourism')
if (!GREECE) throw new Error('Greece tourism template is not registered')
const GERMANY = resolveVisaTemplate('DE', 'short_stay_tourism')
if (!GERMANY) throw new Error('Germany tourism template is not registered')

const FUTURE = 'future_category_not_known_to_this_build'

const employment = (
  employmentStatus: EmploymentStatus,
  occupationCode?: string
): Employment => ({
  employmentStatus,
  currency: 'EUR',
  ...(occupationCode === undefined ? {} : { occupationCode }),
})

const codesFor = (
  status: EmploymentStatus,
  occupationCode?: string,
  template = GREECE
) =>
  applicableRequirements(
    template,
    ctxFor({
      destinationCountry: 'GR',
      visaType: 'short_stay_tourism',
      employment: employment(status, occupationCode),
    } as unknown as Application)
  ).map((r) => r.code)

describe('resolveOccupation — raw, known, effective', () => {
  it.each([
    ['known and compatible', 'self_employed', 'farmer', 'farmer'],
    ['known but incompatible', 'retired', 'farmer', undefined],
    [
      'known but incompatible the other way',
      'self_employed',
      'public_servant',
      undefined,
    ],
    ['unknown future code', 'self_employed', FUTURE, undefined],
    ['absent', 'self_employed', undefined, undefined],
  ] as const)('%s', (_label, status, raw, expected) => {
    expect(resolveOccupation(employment(status, raw))).toBe(expected)
  })

  it('resolves nothing for a status that offers no occupational branch', () => {
    // A pensioner, a student and someone not working are already the branch the
    // checklists publish; there is no finer answer for them to give.
    const none = [
      'retired',
      'student',
      'unemployed',
      'homemaker',
      'other',
    ] as const
    for (const status of none) {
      for (const code of KNOWN_OCCUPATION_CODES) {
        expect({
          status,
          code,
          effective: resolveOccupation(employment(status, code)),
        }).toEqual({ status, code, effective: undefined })
      }
    }
  })

  it('never mutates what it is given', () => {
    // The raw value stays in the dossier whatever this build makes of it. A
    // resolver that tidied its input would be the parse-time normalizer
    // ADR-053 rejected, moved one layer out.
    const e = employment('retired', 'farmer')
    const before = JSON.stringify(e)
    resolveOccupation(e)
    expect(JSON.stringify(e)).toBe(before)
  })

  it('handles an absent employment object', () => {
    expect(resolveOccupation(undefined)).toBeUndefined()
    expect(resolveOccupation(null)).toBeUndefined()
  })
})

describe('changing status clears a known contradiction and nothing else', () => {
  it('drops a farmer who says they have retired', () => {
    // The exact transition the reverted attempt left behaviourally live: it
    // hid the value and kept applying three required farmer documents.
    expect(
      occupationAfterStatusChange(
        employment('self_employed', 'farmer'),
        'retired'
      )
    ).toBeUndefined()
  })

  it('drops a public servant who says they are now self-employed', () => {
    expect(
      occupationAfterStatusChange(
        employment('employed', 'public_servant'),
        'self_employed'
      )
    ).toBeUndefined()
  })

  it('keeps a code the new status still allows', () => {
    expect(
      occupationAfterStatusChange(
        employment('employed', 'employee'),
        'employed'
      )
    ).toBe('employee')
  })

  it('keeps an unknown code, because this build cannot judge it', () => {
    /**
     * The asymmetry is deliberate. A known contradiction is something this
     * build can see and correct; an unknown code is something it cannot, and
     * clearing it would destroy an answer written by a build that understood
     * more than this one does.
     */
    for (const next of EmploymentStatusSchema.options) {
      expect(
        occupationAfterStatusChange(employment('self_employed', FUTURE), next)
      ).toBe(FUTURE)
    }
  })

  it('has nothing to keep when nothing was answered', () => {
    expect(
      occupationAfterStatusChange(employment('employed'), 'retired')
    ).toBeUndefined()
  })
})

describe('the persisted field is open, and that is the point', () => {
  it('accepts a code this build has never heard of', () => {
    /**
     * The single most important assertion in this file. A closed enum here
     * would be safe today and would cost an older build its whole application
     * slice on the first value added after it — the failure ADR-053 decision 2
     * exists to prevent.
     */
    const parsed = EmploymentSchema.safeParse({
      employmentStatus: 'self_employed',
      occupationCode: FUTURE,
    })
    expect(parsed.success && parsed.data.occupationCode).toBe(FUTURE)
  })

  it('accepts a contradictory pair rather than rejecting it', () => {
    // Rejection at the boundary is slice loss. The pair is resolved, not
    // refused (ADR-053 decision 5).
    const parsed = EmploymentSchema.safeParse({
      employmentStatus: 'retired',
      occupationCode: 'farmer',
    })
    expect(parsed.success && parsed.data.occupationCode).toBe('farmer')
  })
})

describe('an unknown future code survives every boundary and acts on nothing', () => {
  const fileWith = (patch: Record<string, unknown>) => {
    const file = JSON.parse(JSON.stringify(legacyDossier)) as Record<
      string,
      unknown
    >
    const app = file.application as Record<string, unknown>
    app.employment = { ...(app.employment as object), ...patch }
    return JSON.stringify(file)
  }

  it('keeps the whole application slice on import', () => {
    const result = importPartial(fileWith({ occupationCode: FUTURE }))
    const original = JSON.parse(fileWith({})) as {
      application: { destinationCountry: string }
    }
    expect({
      application: result.data?.application !== undefined,
      omitted: result.omitted,
      destination: result.data?.application?.destinationCountry,
    }).toEqual({
      application: true,
      omitted: undefined,
      destination: original.application.destinationCountry,
    })
  })

  it('survives import, export and re-import unchanged', () => {
    const imported = importPartial(fileWith({ occupationCode: FUTURE }))
    const data = imported.data
    if (!data?.application)
      throw new Error('expected the application to import')
    expect(data.application.employment?.occupationCode).toBe(FUTURE)

    const exported = exportDossier(
      data.applicant ?? null,
      data.application,
      data.documents ?? [],
      data.sponsors ?? []
    )
    const parsed = JSON.parse(exported) as {
      application: { employment: { occupationCode?: string } }
    }
    expect(parsed.application.employment.occupationCode).toBe(FUTURE)

    const round = importPartial(exported)
    expect(round.data?.application?.employment?.occupationCode).toBe(FUTURE)
  })

  it('activates nothing, in either pack', () => {
    const packs = [
      ['GR', GREECE],
      ['DE', GERMANY],
    ] as const
    for (const [label, template] of packs) {
      for (const status of EmploymentStatusSchema.options) {
        expect({
          label,
          status,
          codes: codesFor(status, FUTURE, template),
        }).toEqual({
          label,
          status,
          codes: codesFor(status, undefined, template),
        })
      }
    }
  })
})

describe('a contradictory pair is preserved and inert', () => {
  it.each([
    ['retired', 'farmer'],
    ['self_employed', 'public_servant'],
    ['employed', 'company_owner'],
  ] as const)('%s + %s changes no checklist', (status, code) => {
    expect(codesFor(status, code)).toEqual(codesFor(status, undefined))
    expect(resolveOccupation(employment(status, code))).toBeUndefined()
  })
})

/**
 * What every status resolved to at 5259214 — the commit before the capability.
 *
 * A FROZEN LITERAL, GENERATED FROM THAT COMMIT. Deriving the "before" set by
 * filtering the "after" set reads like a comparison and is a tautology: both
 * sides come from the same resolution, so a change that moved them together
 * would pass. That is not hypothetical — it is exactly how the reverted first
 * attempt kept a green test over a real regression.
 */
const BEFORE_H4C2B1: Record<string, Record<string, string[]>> = {
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

describe('the capability changes nothing for anybody', () => {
  it.each(EmploymentStatusSchema.options)(
    'a %s dossier resolves exactly what it resolved at 5259214',
    (status) => {
      const packs = [
        ['GR', GREECE],
        ['DE', GERMANY],
      ] as const
      for (const [cc, template] of packs) {
        expect({
          cc,
          status,
          codes: codesFor(status, undefined, template),
        }).toEqual({ cc, status, codes: BEFORE_H4C2B1[cc]![status]! })
      }
    }
  )

  it('and the baseline is real, so the comparison means something', () => {
    const sizes = Object.values(BEFORE_H4C2B1).flatMap((byStatus) =>
      Object.values(byStatus).map((c) => c.length)
    )
    expect(Math.min(...sizes)).toBeGreaterThan(5)
    expect(sizes.length).toBe(14)
  })

  it('because no production requirement consults occupation yet', () => {
    /**
     * The guard that keeps the next slice out of this one. A requirement
     * conditioned on occupation is H4c2b2's decision, on its own evidence, and
     * it must not arrive as a side effect of the vocabulary existing.
     */
    const conditioned = ALL_REQUIREMENT_LAYERS.flatMap((layer) =>
      (layer.add ?? [])
        .filter((r) => r.conditionalOn?.field === 'employment.occupation')
        .map((r) => layer.id + ' -> ' + r.code)
    )
    expect(conditioned).toEqual([])
  })
})

describe('the registry and the status map agree', () => {
  it('offers every known code under exactly one status', () => {
    const offered = Object.values(OCCUPATIONS_BY_STATUS).flatMap((v) => v ?? [])
    expect([...offered].sort()).toEqual([...KNOWN_OCCUPATION_CODES].sort())
    expect(new Set(offered).size).toBe(offered.length)
  })

  it('names only the two statuses with observed occupational branches', () => {
    const withBranches = EmploymentStatusSchema.options.filter(
      (s) => OCCUPATIONS_BY_STATUS[s]
    )
    expect(withBranches).toEqual(['employed', 'self_employed'])
  })

  it('resolves every offered pair, so the map is not decorative', () => {
    for (const [status, codes] of Object.entries(OCCUPATIONS_BY_STATUS)) {
      for (const code of codes ?? []) {
        const effective = resolveOccupation(
          employment(status as EmploymentStatus, code)
        )
        expect(effective).toBe(code)
      }
    }
  })
})

describe('four concepts, four labels a reader can tell apart', () => {
  /**
   * `employee` and `employed` are the same word in Turkish, and the repo
   * already asks two free-text occupation-shaped questions —
   * `applicant.occupation` ("Meslek") and `employment.jobTitle` ("Görev").
   * The parity test proves both locales carry a key and says nothing about
   * whether a reader can tell two of them apart.
   */
  it.each(['en', 'tr'] as const)('in %s', async (locale) => {
    await i18n.changeLanguage(locale)
    const td = dynamicT(i18n.t.bind(i18n))
    const statuses = EmploymentStatusSchema.options.map((v) =>
      td('visa-domain:employmentStatus.' + v)
    )
    const occupations = KNOWN_OCCUPATION_CODES.map((v) =>
      td('visa-domain:occupationCode.' + v)
    )
    const others = [
      td('employment:fields.jobTitle'),
      td('applicant:fields.occupation'),
      td('employment:occupation.label'),
    ]
    await i18n.changeLanguage('tr')

    // Non-vacuity: an unresolved key would make every comparison trivially
    // distinct, because key strings differ from each other.
    for (const label of [...statuses, ...occupations, ...others]) {
      expect(label.length > 0 && !label.includes(':')).toBe(true)
    }

    expect(occupations.filter((o) => statuses.includes(o))).toEqual([])
    expect(occupations.filter((o) => others.includes(o))).toEqual([])
    expect(new Set(occupations).size).toBe(occupations.length)
  })
})
