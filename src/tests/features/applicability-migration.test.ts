import { describe, it, expect } from 'vitest'
import {
  isRequirementApplicable,
  occupationIs,
  occupationOneOf,
} from '@/config/types'
import type {
  ApplicabilityContext,
  ConditionalRequirement,
  DocumentRequirement,
} from '@/config/types'
import { APPLICABILITY_MIGRATIONS } from '@/config/countries/applicability-migrations'
import { ALL_REQUIREMENT_LAYERS } from '@/config/countries/layers'
import { buildApplicabilityContext } from '@/features/documents/applicability'
import type { Application } from '@/domain/schemas/application.schema'
import type {
  EmploymentStatus,
  KnownOccupationCode,
} from '@/domain/types/common'

/**
 * Coarse→fine applicability migration (ADR-053a).
 *
 * The capability, with nothing using it. Its whole job is to stop a correction
 * from being a withdrawal: an applicant who has not classified themselves must
 * keep being asked exactly what their old contract asked, and the corrected
 * population must take over the moment they do.
 *
 * Everything here runs on synthetic requirements. No production row is migrated
 * in this slice, so exercising the rule against the packs would prove nothing —
 * and the production half of the entitlement invariant is vacuous until one is,
 * which is why the fixtures below carry it instead.
 */

const ctx = (
  employmentStatus: EmploymentStatus,
  occupationCode?: string
): ApplicabilityContext =>
  buildApplicabilityContext({
    applicant: null,
    application: {
      employment: {
        employmentStatus,
        ...(occupationCode === undefined ? {} : { occupationCode }),
      },
    } as unknown as Application,
  })

const statusIs = (value: EmploymentStatus): ConditionalRequirement => ({
  field: 'employment.employmentStatus',
  operator: 'equals',
  value,
})

/** A requirement mid-migration: corrected condition plus the prior contract. */
const migrated = (
  fine: readonly [KnownOccupationCode, ...KnownOccupationCode[]],
  prior: ConditionalRequirement
): DocumentRequirement => ({
  code: 'TEST_MIGRATED',
  nameKey: 'visa-domain:requirements.PHOTOS.name',
  category: 'employment',
  ownerType: 'applicant',
  required: true,
  revision: 1,
  conditionalOn: occupationOneOf(fine),
  applicabilityMigration: { priorCondition: prior },
})

const FUTURE = 'future_category_not_known_to_this_build'

describe('a migration keeps the prior contract until the applicant classifies', () => {
  /**
   * The shape that made the flat-sentinel design impossible: the corrected
   * population reaches two *self-employed* categories while the prior contract
   * covered only `employed`. A membership test carrying an `unclassified`
   * member would answer "applies" for a self-employed applicant who had never
   * had this row.
   */
  const row = migrated(
    ['employee', 'independent_professional', 'company_owner'],
    statusIs('employed')
  )

  it.each([
    ['nothing answered', 'employed', undefined, true],
    ['a code from a newer build', 'employed', FUTURE, true],
    ['a stale code the status forbids', 'employed', 'farmer', true],
  ] as const)(
    'preserves the prior contract for an employed applicant with %s',
    (_label, status, code, expected) => {
      expect(isRequirementApplicable(row, ctx(status, code))).toBe(expected)
    }
  )

  it.each([
    ['nothing answered', undefined],
    ['a code from a newer build', FUTURE],
    ['a stale code the status forbids', 'public_servant'],
  ] as const)(
    'does not reach a self-employed applicant with %s — the prior contract never did',
    (_label, code) => {
      expect(isRequirementApplicable(row, ctx('self_employed', code))).toBe(
        false
      )
    }
  )

  it.each([
    ['employed', 'employee', true],
    ['employed', 'public_servant', false],
    ['self_employed', 'company_owner', true],
    ['self_employed', 'independent_professional', true],
    ['self_employed', 'farmer', false],
  ] as const)(
    'uses the corrected population once classified: %s + %s',
    (status, code, expected) => {
      expect(isRequirementApplicable(row, ctx(status, code))).toBe(expected)
    }
  )

  it('stops consulting the prior contract entirely once classified', () => {
    /**
     * The subtractive half. If the prior branch survived classification, an
     * employed public servant would keep a row the correction exists to take
     * away from them — and the migration would only ever be able to add.
     */
    expect({
      unclassified: isRequirementApplicable(row, ctx('employed')),
      classifiedOut: isRequirementApplicable(
        row,
        ctx('employed', 'public_servant')
      ),
    }).toEqual({ unclassified: true, classifiedOut: false })
  })
})

describe('the mirror case — a prior contract of self-employed', () => {
  const row = migrated(
    ['company_owner', 'independent_professional'],
    statusIs('self_employed')
  )

  it.each([
    ['nothing answered', undefined],
    ['a code from a newer build', FUTURE],
    ['a stale code', 'employee'],
  ] as const)('keeps asking a self-employed applicant with %s', (_l, code) => {
    // The readiness denominator holds. This is the case where narrowing
    // outright took Greece from eleven required documents to eight.
    expect(isRequirementApplicable(row, ctx('self_employed', code))).toBe(true)
  })

  it('withdraws once the applicant says they farm', () => {
    expect(isRequirementApplicable(row, ctx('self_employed', 'farmer'))).toBe(
      false
    )
  })

  it('is not gained by an employed applicant who has answered nothing', () => {
    expect(isRequirementApplicable(row, ctx('employed'))).toBe(false)
  })
})

describe('the prior contract is evaluated, not assumed', () => {
  it('does not special-case statuses that open no occupational branch', () => {
    /**
     * A branchless status can never be classified, so it always takes the prior
     * branch — and that branch must be *run*. A retiree whose prior contract
     * named them keeps the row; one whose prior contract did not, does not.
     * Reading "branchless" as "false" would silently withdraw the first.
     */
    const retireesToo = migrated(['farmer'], statusIs('retired'))
    const employedOnly = migrated(['farmer'], statusIs('employed'))
    expect({
      named: isRequirementApplicable(retireesToo, ctx('retired')),
      notNamed: isRequirementApplicable(employedOnly, ctx('retired')),
    }).toEqual({ named: true, notNamed: false })
  })
})

describe('an ordinary fine-axis requirement is untouched by the capability', () => {
  const farmerRow: DocumentRequirement = {
    code: 'TEST_NEW_FINE',
    nameKey: 'visa-domain:requirements.PHOTOS.name',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    revision: 1,
    conditionalOn: occupationIs('farmer'),
  }

  it.each([
    ['nothing answered', 'self_employed', undefined],
    ['a code from a newer build', 'self_employed', FUTURE],
    ['a stale code', 'retired', 'farmer'],
  ] as const)('still fails closed with %s', (_label, status, code) => {
    // The critical negative control: a requirement with no migration metadata
    // must not inherit compatibility behaviour from the capability existing.
    expect(isRequirementApplicable(farmerRow, ctx(status, code))).toBe(false)
  })

  it('and applies to a classified farmer', () => {
    expect(
      isRequirementApplicable(farmerRow, ctx('self_employed', 'farmer'))
    ).toBe(true)
  })
})

/**
 * Entitlement: the ledger authorises, the config executes, and neither is
 * trusted alone.
 *
 * The production half of this is vacuous today — nothing is migrated, so the
 * ledger is empty and there is no config claim to check it against. Weakening
 * the invariant to suit that would defeat it, so the rule is stated as a pure
 * function of two lists and exercised against fixtures; the production walk then
 * runs the same function over the real ones and will start biting the day
 * H4c2d2 adds the first row.
 */
type LedgerLike = { code: string; priorCondition: ConditionalRequirement }
type RowLike = {
  code: string
  applicabilityMigration?: { priorCondition: ConditionalRequirement }
}

/** Every way a ledger and a set of requirements can fail to agree. */
function entitlementBreaches(ledger: LedgerLike[], rows: RowLike[]): string[] {
  const breaches: string[] = []
  const byCode = new Map<string, LedgerLike>()

  for (const entry of ledger) {
    if (byCode.has(entry.code))
      breaches.push(`duplicate ledger entry: ${entry.code}`)
    byCode.set(entry.code, entry)
  }

  for (const row of rows) {
    const claim = row.applicabilityMigration
    const entry = byCode.get(row.code)
    if (claim && !entry) {
      breaches.push(`config claims migration with no entitlement: ${row.code}`)
    }
    if (
      claim &&
      entry &&
      JSON.stringify(claim.priorCondition) !==
        JSON.stringify(entry.priorCondition)
    ) {
      breaches.push(`prior condition disagrees with the ledger: ${row.code}`)
    }
  }

  const claiming = new Set(
    rows.filter((r) => r.applicabilityMigration).map((r) => r.code)
  )
  for (const entry of ledger) {
    if (!claiming.has(entry.code)) {
      breaches.push(`entitlement with no config to execute it: ${entry.code}`)
    }
  }

  return breaches
}

describe('entitlement is cross-checked in both directions', () => {
  const prior = statusIs('employed')
  const other = statusIs('self_employed')
  const entry = { code: 'A', priorCondition: prior }
  const claiming = {
    code: 'A',
    applicabilityMigration: { priorCondition: prior },
  }
  const plain = { code: 'B' }

  it('accepts a matched pair', () => {
    expect(entitlementBreaches([entry], [claiming, plain])).toEqual([])
  })

  it('refuses config that claims migration with no ledger entitlement', () => {
    // A new row cannot grant itself a compatibility route by carrying the
    // metadata — which is the whole reason the ledger is the gate.
    expect(entitlementBreaches([], [claiming])).toEqual([
      'config claims migration with no entitlement: A',
    ])
  })

  it('refuses an entitlement nothing executes', () => {
    // The stale half. An entry left behind after its row lost the metadata
    // reads as a live compatibility route that no longer exists.
    expect(entitlementBreaches([entry], [plain])).toEqual([
      'entitlement with no config to execute it: A',
    ])
  })

  it('refuses a prior condition that does not match the recorded one', () => {
    expect(
      entitlementBreaches(
        [entry],
        [{ code: 'A', applicabilityMigration: { priorCondition: other } }]
      )
    ).toEqual(['prior condition disagrees with the ledger: A'])
  })

  it('refuses a duplicate ledger code', () => {
    expect(entitlementBreaches([entry, entry], [claiming])).toContain(
      'duplicate ledger entry: A'
    )
  })

  it('says nothing about a requirement that never claimed migration', () => {
    expect(entitlementBreaches([], [plain])).toEqual([])
  })
})

describe('production: nothing is migrated, and the guards say so', () => {
  const owned = ALL_REQUIREMENT_LAYERS.flatMap((layer) =>
    (layer.add ?? []).map((r) => ({ layer: layer.id, r }))
  )

  it('the ledger and the packs agree', () => {
    expect(
      entitlementBreaches(
        APPLICABILITY_MIGRATIONS,
        owned.map((o) => o.r)
      )
    ).toEqual([])
  })

  it('no production requirement carries migration metadata yet', () => {
    // H4c2d2 changes this line, deliberately and visibly.
    const claiming = owned
      .filter(({ r }) => r.applicabilityMigration)
      .map(({ layer, r }) => `${layer} -> ${r.code}`)
    expect(claiming).toEqual([])
  })

  it('and the ledger is empty, so no entitlement exists to be used', () => {
    expect(APPLICABILITY_MIGRATIONS).toEqual([])
  })

  it('FARMER_CERTIFICATE has no entitlement and no metadata', () => {
    /**
     * The negative example ADR-053a names. It was authored against the
     * occupational axis and has no prior coarse contract, so there is nothing
     * for it to preserve and no route by which it could acquire one.
     */
    const farmer = owned.find(({ r }) => r.code === 'FARMER_CERTIFICATE')
    expect(farmer).toBeDefined()
    expect(farmer?.r.applicabilityMigration).toBeUndefined()
    expect(
      APPLICABILITY_MIGRATIONS.some((m) => m.code === 'FARMER_CERTIFICATE')
    ).toBe(false)
  })
})

describe('a later layer cannot grant itself a migration', () => {
  it('the composer refuses any refinement key but the three it allows', () => {
    /**
     * ADR-052b forbids a refining layer from touching applicability, and
     * migration metadata *is* applicability wearing a compatibility hat — so a
     * destination or jurisdiction layer smuggling it onto a code it does not
     * own would be the override this project has refused three times.
     *
     * It is already impossible: `composition.ts` allowlists refinement keys
     * rather than ignoring unknown ones, so the field cannot even be written.
     * Asserted here because the protection is one `Set` away from being lost by
     * somebody adding a key for an unrelated reason.
     */
    const refinementKeys = ALL_REQUIREMENT_LAYERS.flatMap((layer) =>
      (layer.refine ?? []).flatMap((r) => Object.keys(r))
    )
    expect([...new Set(refinementKeys)].sort()).toEqual(
      ['addDetail', 'addSourceRefs', 'code'].filter((k) =>
        refinementKeys.includes(k)
      )
    )
    expect(refinementKeys).not.toContain('applicabilityMigration')
    expect(refinementKeys).not.toContain('conditionalOn')
  })

  it('and the owner is the only layer that declares one', () => {
    // Every migration claim, if any existed, would sit on a requirement in its
    // owner's `add` list — the only place applicability may be declared.
    const declared = ALL_REQUIREMENT_LAYERS.flatMap((layer) =>
      (layer.add ?? [])
        .filter((r) => r.applicabilityMigration)
        .map((r) => `${layer.id} -> ${r.code}`)
    )
    expect(declared).toEqual([])
  })
})

describe('the corrected population is typed, not stringly', () => {
  it('rejects an empty set and an unknown code at compile time', () => {
    // @ts-expect-error a corrected occupational population may not be empty
    occupationOneOf([])
    // @ts-expect-error 'farmr' is not a known occupation code
    occupationOneOf(['farmr'])
    expect(occupationOneOf(['farmer'])).toEqual({
      field: 'employment.occupation',
      operator: 'oneOf',
      values: ['farmer'],
    })
  })

  it('targets the resolved value, never the raw persisted code', () => {
    expect(occupationOneOf(['farmer', 'company_owner']).field).toBe(
      'employment.occupation'
    )
  })
})
