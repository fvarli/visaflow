import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import { dynamicT } from '@/lib/i18n-dynamic'
import { ctxFor } from '@/tests/support/applicability'
import { applicableRequirements } from '@/features/documents/template-sync'

import { resolveVisaTemplate } from '@/config/countries'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { runValidation } from '@/domain/rules/runner'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import { ALL_REQUIREMENT_LAYERS } from '@/config/countries/layers'
import { importPartial } from '@/features/import-export/services/import.service'
import { exportDossier } from '@/features/import-export/services/export.service'
import { EmploymentSchema } from '@/domain/schemas/employment.schema'
import {
  EmploymentStatusSchema,
  KNOWN_OCCUPATION_CODES,
  OCCUPATIONS_BY_STATUS,
  isKnownOccupationCode,
  occupationAfterStatusChange,
  resolveOccupation,
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

/** Every production requirement whose applicability reads the effective code. */
const OCCUPATION_CONDITIONED = ALL_REQUIREMENT_LAYERS.flatMap((layer) =>
  (layer.add ?? []).filter(
    (r) => r.conditionalOn?.field === 'employment.occupation'
  )
)

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

describe('an unknown code under a status with no occupational branch', () => {
  /**
   * ADJUDICATED IN H4c2b1a, AND PINNED SO A LATER SLICE HAS TO ARGUE IT.
   *
   * A retiree or a student is asked no occupational question at all, so an
   * unknown code they carry is invisible to them. That is *interpretation A*,
   * and it is what ADR-053 actually requires: decision 4 asks for preserved,
   * inert and round-tripping; decision 5 forbids destructive clearing. Neither
   * says anything about disclosure, and the ADR's only mentions of the UI are
   * to deny it any correctness role.
   *
   * The wider reading — surfacing dormant occupational data under a status that
   * has no branches — is a product decision the record does not make, and
   * hiding it is not destructive: the value survives, acts on nothing, and
   * reappears the moment the applicant returns to a status that has branches.
   * If a later slice wants that disclosure it will have to change these tests,
   * which is the point of writing them.
   */
  const BRANCHLESS = [
    'retired',
    'student',
    'unemployed',
    'homemaker',
    'other',
  ] as const

  it.each(BRANCHLESS)(
    '%s is asked no occupational question at all',
    (status) => {
      // The reason the control does not render, stated where it can be checked
      // rather than inferred from the component.
      expect(OCCUPATIONS_BY_STATUS[status]).toBeUndefined()
    }
  )

  it.each(['retired', 'student'] as const)(
    '%s keeps an unknown code, and it stays inert',
    (status) => {
      expect(resolveOccupation(employment(status, FUTURE))).toBeUndefined()
      expect(codesFor(status, FUTURE)).toEqual(codesFor(status, undefined))
    }
  )

  it('cannot be erased by moving between branchless statuses', () => {
    /**
     * The path that would lose the value silently: switch to a status where
     * the control is not mounted, so nothing can show what happened. The
     * transition rule returns an unknown code unchanged for *every* target,
     * which is what makes the round trip safe.
     */
    for (const from of BRANCHLESS) {
      for (const to of EmploymentStatusSchema.options) {
        expect({
          from,
          to,
          kept: occupationAfterStatusChange(employment(from, FUTURE), to),
        }).toEqual({ from, to, kept: FUTURE })
      }
    }
  })

  it('and comes back into view on a status that has branches', () => {
    // The other half of "not destructive": a value hidden under `retired` is
    // still the dossier's answer when the applicant says self-employed again.
    expect(
      occupationAfterStatusChange(
        employment('retired', FUTURE),
        'self_employed'
      )
    ).toBe(FUTURE)
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
const BEFORE_H4C2B1: Record<'GR' | 'DE', Record<EmploymentStatus, string[]>> = {
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
        }).toEqual({ cc, status, codes: BEFORE_H4C2B1[cc][status] })
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

  it('because the one requirement that reads occupation needs an answer', () => {
    /**
     * This asserted an empty list until H4c2b2, when the capability got its
     * first production consumer. The equivalence above still holds for the same
     * reason it did then — a dossier that has not answered the occupational
     * question resolves to `undefined`, and `FARMER_CERTIFICATE` is
     * conditioned on `equals farmer`, so it cannot appear for anyone who has
     * not said so.
     *
     * That is the property worth restating rather than deleting: farmer is
     * never *inferred* from `self_employed`.
     */
    expect(OCCUPATION_CONDITIONED.map((r) => r.code)).toEqual([
      'FARMER_CERTIFICATE',
    ])
  })
})

/**
 * Pack-authoring safety, which ADR-053 decision 8 requires and which the typed
 * helper alone cannot deliver.
 *
 * `occupationIs()` makes a typo a compile error at the site where it is made.
 * It cannot stop anybody writing the condition literal by hand — the authored
 * value is a plain primitive, so a hand-written `'farmr'` compiles. That is
 * what this walk is for: the same callee-then-registry idiom
 * `applicability-drift.test.ts` uses.
 */
describe('every occupational condition names a code this build knows', () => {
  /**
   * Narrowed on the operator rather than reaching for `.value` directly.
   *
   * H4c2d1 made `ConditionalRequirement` a discriminated union, and it refused
   * to compile this — correctly, because reading a payload without knowing
   * which operator authored it is exactly the unsoundness the union exists to
   * stop. An occupational condition that is not `equals` has no single value to
   * check, and the test below is what requires it to be `equals` today.
   */
  const authoredValue = (r: (typeof OCCUPATION_CONDITIONED)[number]) => {
    const c = r.conditionalOn
    return c && 'value' in c ? c.value : undefined
  }

  it('uses only known codes', () => {
    const unknown = OCCUPATION_CONDITIONED.filter(
      (r) => !isKnownOccupationCode(authoredValue(r))
    ).map((r) => `${r.code} -> ${String(authoredValue(r))}`)
    expect(unknown).toEqual([])
  })

  it('uses only the operator occupational conditions are defined for', () => {
    // `equals` is the whole vocabulary today. A pack reaching for `notEquals`
    // would be expressing "not a farmer", which under fail-closed semantics is
    // false for every dossier that has not answered — a subtractive change
    // needing its own decision, not a condition someone slips in.
    const operators = [
      ...new Set(OCCUPATION_CONDITIONED.map((r) => r.conditionalOn?.operator)),
    ]
    expect(operators).toEqual(['equals'])
  })

  it('never reads the raw persisted code, or a path near it', () => {
    /**
     * The failure this exists to prevent: a pack conditioning on
     * `employment.occupationCode` would compare against an unvalidated string
     * that no resolver has judged, so an unknown code from a newer build could
     * satisfy a condition written before it existed.
     */
    const raw = ALL_REQUIREMENT_LAYERS.flatMap((layer) =>
      (layer.add ?? [])
        .filter((r) => {
          const field = r.conditionalOn?.field ?? ''
          return (
            field.includes('occupation') && field !== 'employment.occupation'
          )
        })
        .map((r) => `${layer.id} -> ${r.code} -> ${r.conditionalOn?.field}`)
    )
    expect(raw).toEqual([])
  })

  it('has something to check, so none of the above is vacuous', () => {
    expect(OCCUPATION_CONDITIONED.length).toBeGreaterThan(0)
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

/**
 * The first production obligation, and the only claim this slice makes:
 * occupational routing works end to end.
 *
 * One requirement, one condition, both packs. What matters as much as the
 * positive case is the list of populations it must *not* reach — most of all
 * the applicant who has said `self_employed` and nothing more, because
 * inferring farmer from self-employment is exactly the over-reach the coarse
 * vocabulary was never able to avoid.
 */
describe('FARMER_CERTIFICATE — the first occupational obligation', () => {
  const CODE = 'FARMER_CERTIFICATE'

  it.each([
    ['GR', GREECE],
    ['DE', GERMANY],
  ] as const)('reaches a farmer in %s', (_cc, template) => {
    // Both packs, because Annex III I.5(b) belongs to the instrument adopted
    // for applications lodged in Türkiye rather than to either mission.
    expect(codesFor('self_employed', 'farmer', template)).toContain(CODE)
  })

  it.each([
    ['a company owner', 'self_employed', 'company_owner'],
    [
      'an independent professional',
      'self_employed',
      'independent_professional',
    ],
    ['an ordinary employee', 'employed', 'employee'],
    ['a public servant', 'employed', 'public_servant'],
    ['an unknown future code', 'self_employed', FUTURE],
    ['a stale pair that says retired', 'retired', 'farmer'],
  ] as const)('does not reach %s', (_label, status, code) => {
    for (const template of [GREECE, GERMANY]) {
      expect(codesFor(status, code, template)).not.toContain(CODE)
    }
  })

  it('does not reach someone who only said self-employed', () => {
    /**
     * The load-bearing negative. A farmer picks `self_employed` today because
     * nothing finer existed, so inferring the certificate from that value would
     * ask it of every company owner and freelancer in the country — the exact
     * over-ask the occupational axis was introduced to end, arriving through
     * the change meant to fix it.
     */
    for (const template of [GREECE, GERMANY]) {
      expect(codesFor('self_employed', undefined, template)).not.toContain(CODE)
    }
  })

  it('is required, so readiness counts it rather than treating it as extra', () => {
    const requirement = GREECE.documentRequirements.find((r) => r.code === CODE)
    expect({
      required: requirement?.required,
      owner: requirement?.ownerType,
    }).toEqual({ required: true, owner: 'applicant' })
  })
})

describe('FARMER_CERTIFICATE flows through the ordinary pipeline', () => {
  /**
   * No bespoke rule, no farmer-specific branch anywhere. If the obligation did
   * not travel the same path every other required requirement travels, the
   * capability would have bought a checklist entry and not an obligation.
   */
  const farmer = {
    destinationCountry: 'GR',
    visaType: 'short_stay_tourism',
    employment: employment('self_employed', 'farmer'),
  } as unknown as Application

  it('joins the readiness denominator for a farmer, and not for anyone else', () => {
    const forFarmer = requiredRequirementCodes(GREECE, ctxFor(farmer))
    const forOwner = requiredRequirementCodes(
      GREECE,
      ctxFor({
        ...farmer,
        employment: employment('self_employed', 'company_owner'),
      })
    )
    expect({
      farmer: forFarmer.includes('FARMER_CERTIFICATE'),
      owner: forOwner.includes('FARMER_CERTIFICATE'),
    }).toEqual({ farmer: true, owner: false })
  })

  it('is named by validation when a farmer has no record of it', () => {
    const named = runValidation({
      dossier: {
        applicant: { id: 'a1', nationality: 'TR' },
        application: farmer,
        documents: [],
        sponsors: [],
      } as unknown as Dossier,
      template: GREECE,
      applicability: ctxFor(farmer),
    })
      .findings.flatMap((f) => f.messageParams?.documentCodes?.documents ?? [])
      .includes('FARMER_CERTIFICATE')

    expect(named).toBe(true)
  })

  it('and says nothing once the document is ready', () => {
    const findings = runValidation({
      dossier: {
        applicant: { id: 'a1', nationality: 'TR' },
        application: farmer,
        documents: [
          {
            id: 'd-farm',
            code: 'FARMER_CERTIFICATE',
            category: 'employment',
            ownerType: 'applicant',
            ownerId: 'a1',
            required: true,
            status: 'ready',
            verified: false,
          },
        ],
        sponsors: [],
      } as unknown as Dossier,
      template: GREECE,
      applicability: ctxFor(farmer),
    }).findings.flatMap((f) => f.messageParams?.documentCodes?.documents ?? [])

    expect(findings).not.toContain('FARMER_CERTIFICATE')
  })
})

/**
 * Workflow requiredness changes the rail and nothing else (H4c2d3).
 *
 * A legacy dossier that has never answered the occupational question is now
 * visibly incomplete. It must still be asked for exactly the documents it was
 * asked for yesterday — the whole point of making the step incomplete is to put
 * the question in front of somebody *before* the corrections that will change
 * their checklist, not to change it now.
 *
 * So this is the guard against the change leaking one layer down: step
 * completeness is a workflow fact, and applicability must not learn about it.
 */
describe('requiredness is a workflow fact, not an applicability one', () => {
  const LEGACY = ['employed', 'self_employed'] as const

  it.each(LEGACY)(
    'a legacy %s dossier with no occupation is asked for exactly what it always was',
    (status) => {
      for (const [cc, template] of [
        ['GR', GREECE],
        ['DE', GERMANY],
      ] as const) {
        expect({
          cc,
          status,
          codes: codesFor(status, undefined, template),
        }).toEqual({ cc, status, codes: BEFORE_H4C2B1[cc][status] })
      }
    }
  )

  it.each(LEGACY)(
    'and its required obligation set is unchanged for %s',
    (status) => {
      const app = {
        destinationCountry: 'GR',
        visaType: 'short_stay_tourism',
        employment: employment(status),
      } as unknown as Application
      const required = requiredRequirementCodes(GREECE, ctxFor(app))

      // Derived from the frozen baseline rather than from today's resolution,
      // so a change that moved both sides together could not hide here.
      const expected = BEFORE_H4C2B1.GR[status].filter(
        (code) =>
          GREECE.documentRequirements.find((r) => r.code === code)?.required
      )
      expect(required).toEqual(expected)
    }
  )

  it('names the same missing documents to a legacy dossier as before', () => {
    const app = {
      destinationCountry: 'GR',
      visaType: 'short_stay_tourism',
      employment: employment('self_employed'),
    } as unknown as Application

    const named = runValidation({
      dossier: {
        applicant: { id: 'a1', nationality: 'TR' },
        application: app,
        documents: [],
        sponsors: [],
      } as unknown as Dossier,
      template: GREECE,
      applicability: ctxFor(app),
    }).findings.flatMap((f) => f.messageParams?.documentCodes?.documents ?? [])

    // The company block is still asked of an unclassified self-employed
    // applicant. That over-ask is known and deliberate until H4c2e; what must
    // not happen is it disappearing now, silently, as a side effect of the rail.
    expect(named).toEqual(
      expect.arrayContaining([
        'EMPLOYER_TRADE_REGISTRY',
        'COMPANY_ACTIVITY_CERTIFICATE',
        'TAX_PAYMENT_STATEMENT',
      ])
    )
    expect(named).not.toContain('FARMER_CERTIFICATE')
  })
})
