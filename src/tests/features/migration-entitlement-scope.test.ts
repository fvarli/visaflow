import { describe, it, expect } from 'vitest'
import { getAllCountryConfigs } from '@/config/countries'
import {
  APPLICABILITY_MIGRATIONS,
  type CompositionIdentity,
} from '@/config/countries/applicability-migrations'
import { PRODUCTION_COMPOSITIONS } from '@/tests/support/production-compositions'

/**
 * The scope of a migration entitlement (ADR-053b), as a contract the tests can
 * hold before the composer can enforce it.
 *
 * An entitlement preserves the contract a *composition* shipped, not the code.
 * The ledger now says which compositions those were; nothing at runtime reads
 * that yet, because the fallback still travels with the definition into every
 * composition that composes it. Until the composer strips it outside scope,
 * the only thing standing between a new activation and an inherited fallback
 * is this file: the migrations each composition carries today must be exactly
 * the ones the ledger says it shipped — in both directions.
 *
 * The ledger is the historical declaration and the composed templates are the
 * current exposure. Neither is derived from the other here; the test compares
 * them. The rules are stated as pure functions over fixtures first so that
 * each breach is shown to be caught, and then run over the real packs.
 */

const key = (id: CompositionIdentity) => `${id.countryCode}/${id.visaType}`

type ScopedEntry = {
  code: string
  shippedTo: CompositionIdentity[]
  obligationFrom?: string
}

/** What one composition carries today: the codes that fall back in it. */
type Exposure = { identity: CompositionIdentity; migratedCodes: string[] }

/** Every way a declared scope and the current exposure can disagree. */
function scopeBreaches(ledger: ScopedEntry[], exposure: Exposure[]): string[] {
  const breaches: string[] = []
  const compositions = new Map(
    exposure.map((e) => [key(e.identity), new Set(e.migratedCodes)])
  )
  const byCode = new Map(ledger.map((e) => [e.code, e]))

  for (const entry of ledger) {
    if (entry.shippedTo.length === 0) {
      breaches.push(`entitlement with no scope: ${entry.code}`)
    }
    const seen = new Set<string>()
    for (const identity of entry.shippedTo) {
      const k = key(identity)
      if (seen.has(k)) breaches.push(`duplicate scope: ${entry.code} @ ${k}`)
      seen.add(k)
      const carried = compositions.get(k)
      if (!carried) {
        breaches.push(
          `scope names no production composition: ${entry.code} @ ${k}`
        )
      } else if (!carried.has(entry.code)) {
        // Direction 1: the history says this composition is entitled, and it
        // no longer carries the fallback — a withdrawal nobody decided.
        breaches.push(
          `entitled composition does not carry it: ${entry.code} @ ${k}`
        )
      }
    }

    if (entry.obligationFrom !== undefined) {
      const parent = byCode.get(entry.obligationFrom)
      if (entry.obligationFrom === entry.code) {
        breaches.push(`split names itself as parent: ${entry.code}`)
      } else if (!parent) {
        breaches.push(
          `split parent is not a migration: ${entry.code} <- ${entry.obligationFrom}`
        )
      } else {
        const parentScope = new Set(parent.shippedTo.map(key))
        for (const identity of entry.shippedTo) {
          if (!parentScope.has(key(identity))) {
            breaches.push(
              `split reaches beyond its parent: ${entry.code} @ ${key(identity)}`
            )
          }
        }
      }
    }
  }

  for (const { identity, migratedCodes } of exposure) {
    const k = key(identity)
    for (const code of migratedCodes) {
      const entry = byCode.get(code)
      if (!entry) {
        breaches.push(`carries a migration with no entitlement: ${code} @ ${k}`)
      } else if (!entry.shippedTo.some((s) => key(s) === k)) {
        // Direction 2: the inheritance ADR-053b rejects — a composition
        // holding unclassified applicants to a contract it never showed them.
        breaches.push(`carries a migration outside its scope: ${code} @ ${k}`)
      }
    }
  }

  return breaches
}

/**
 * The rule a composition's own entitlement declaration must satisfy, stated
 * now so that the next slice's declarations have a gate the day they land:
 * a composition may declare only a code the ledger records as migrated, and
 * only where the ledger says it shipped.
 */
type Declaration = { identity: CompositionIdentity; codes: string[] }

function declarationBreaches(
  ledger: ScopedEntry[],
  declarations: Declaration[]
): string[] {
  const breaches: string[] = []
  const byCode = new Map(ledger.map((e) => [e.code, e]))
  for (const { identity, codes } of declarations) {
    const k = key(identity)
    for (const code of codes) {
      const entry = byCode.get(code)
      if (!entry) {
        breaches.push(`declares a code that is not migrated: ${code} @ ${k}`)
      } else if (!entry.shippedTo.some((s) => key(s) === k)) {
        breaches.push(`declares outside the recorded scope: ${code} @ ${k}`)
      }
    }
  }
  return breaches
}

const GR: CompositionIdentity = {
  countryCode: 'GR',
  visaType: 'short_stay_tourism',
}
const DE: CompositionIdentity = {
  countryCode: 'DE',
  visaType: 'short_stay_tourism',
}
/** Same country, another visa type — must never share Greece's history. */
const GR_BUSINESS: CompositionIdentity = {
  countryCode: 'GR',
  visaType: 'short_stay_business',
}
/** Same visa type, another country — must never share either history. */
const FR: CompositionIdentity = {
  countryCode: 'FR',
  visaType: 'short_stay_tourism',
}

describe('scope is checked in both directions (synthetic)', () => {
  const ledger: ScopedEntry[] = [
    { code: 'A', shippedTo: [GR, DE] },
    { code: 'B', shippedTo: [DE] },
  ]
  const exposure: Exposure[] = [
    { identity: GR, migratedCodes: ['A'] },
    { identity: DE, migratedCodes: ['A', 'B'] },
  ]

  it('accepts a scope that matches the exposure exactly', () => {
    expect(scopeBreaches(ledger, exposure)).toEqual([])
  })

  it('refuses a composition carrying a migration outside its scope', () => {
    // The Greek tax-plate case: an activation would bring B's fallback into a
    // composition that never shipped B's prior contract.
    expect(
      scopeBreaches(ledger, [
        { identity: GR, migratedCodes: ['A', 'B'] },
        { identity: DE, migratedCodes: ['A', 'B'] },
      ])
    ).toEqual([
      'carries a migration outside its scope: B @ GR/short_stay_tourism',
    ])
  })

  it('refuses a new composition appearing with a migrated code', () => {
    expect(
      scopeBreaches(ledger, [
        ...exposure,
        { identity: FR, migratedCodes: ['A'] },
      ])
    ).toEqual([
      'carries a migration outside its scope: A @ FR/short_stay_tourism',
    ])
  })

  it('refuses a second visa type of an entitled country', () => {
    // Country alone is not an identity.
    expect(
      scopeBreaches(ledger, [
        ...exposure,
        { identity: GR_BUSINESS, migratedCodes: ['A'] },
      ])
    ).toEqual([
      'carries a migration outside its scope: A @ GR/short_stay_business',
    ])
  })

  it('refuses a second country sharing an entitled visa type', () => {
    // Visa type alone is not an identity either: FR shares GR's visa type and
    // is refused all the same.
    expect(
      scopeBreaches(ledger, [
        ...exposure,
        { identity: FR, migratedCodes: ['B'] },
      ])
    ).toEqual([
      'carries a migration outside its scope: B @ FR/short_stay_tourism',
    ])
  })

  it('refuses an entitled composition that lost its migrated code', () => {
    expect(
      scopeBreaches(ledger, [
        { identity: GR, migratedCodes: [] },
        { identity: DE, migratedCodes: ['A', 'B'] },
      ])
    ).toEqual([
      'entitled composition does not carry it: A @ GR/short_stay_tourism',
    ])
  })

  it('refuses a scope naming a composition that does not exist', () => {
    expect(
      scopeBreaches(
        [{ code: 'A', shippedTo: [GR, FR] }],
        [{ identity: GR, migratedCodes: ['A'] }]
      )
    ).toEqual([
      'scope names no production composition: A @ FR/short_stay_tourism',
    ])
  })

  it('refuses an empty or duplicated scope', () => {
    expect(scopeBreaches([{ code: 'A', shippedTo: [] }], [])).toEqual([
      'entitlement with no scope: A',
    ])
    expect(
      scopeBreaches(
        [{ code: 'A', shippedTo: [GR, GR] }],
        [{ identity: GR, migratedCodes: ['A'] }]
      )
    ).toEqual(['duplicate scope: A @ GR/short_stay_tourism'])
  })

  it('refuses a migrated code the ledger does not know', () => {
    expect(scopeBreaches([], [{ identity: GR, migratedCodes: ['Z'] }])).toEqual(
      ['carries a migration with no entitlement: Z @ GR/short_stay_tourism']
    )
  })
})

describe('a split never reaches further than its parent (synthetic)', () => {
  const both: Exposure[] = [
    { identity: GR, migratedCodes: ['P', 'C'] },
    { identity: DE, migratedCodes: ['P', 'C'] },
  ]

  it('accepts a child whose scope is within the parent', () => {
    expect(
      scopeBreaches(
        [
          { code: 'P', shippedTo: [GR, DE] },
          { code: 'C', shippedTo: [GR, DE], obligationFrom: 'P' },
        ],
        both
      )
    ).toEqual([])
  })

  it('refuses a child broader than its parent', () => {
    expect(
      scopeBreaches(
        [
          { code: 'P', shippedTo: [DE] },
          { code: 'C', shippedTo: [GR, DE], obligationFrom: 'P' },
        ],
        [
          { identity: GR, migratedCodes: ['C'] },
          { identity: DE, migratedCodes: ['P', 'C'] },
        ]
      )
    ).toEqual(['split reaches beyond its parent: C @ GR/short_stay_tourism'])
  })

  it('refuses a parent that is not a migration, and a self-parent', () => {
    expect(
      scopeBreaches(
        [{ code: 'C', shippedTo: [GR], obligationFrom: 'P' }],
        [{ identity: GR, migratedCodes: ['C'] }]
      )
    ).toEqual(['split parent is not a migration: C <- P'])
    expect(
      scopeBreaches(
        [{ code: 'C', shippedTo: [GR], obligationFrom: 'C' }],
        [{ identity: GR, migratedCodes: ['C'] }]
      )
    ).toEqual(['split names itself as parent: C'])
  })
})

describe('a composition may declare only a scoped migration (synthetic)', () => {
  const ledger: ScopedEntry[] = [{ code: 'A', shippedTo: [DE] }]

  it('accepts a declaration inside the recorded scope', () => {
    expect(
      declarationBreaches(ledger, [{ identity: DE, codes: ['A'] }])
    ).toEqual([])
  })

  it('refuses a declaration for a code that is not migrated', () => {
    // FARMER_CERTIFICATE's shape: no prior contract, so nothing to declare.
    expect(
      declarationBreaches(ledger, [{ identity: DE, codes: ['FARMER'] }])
    ).toEqual([
      'declares a code that is not migrated: FARMER @ DE/short_stay_tourism',
    ])
  })

  it('refuses a declaration outside the recorded scope', () => {
    // A composition cannot earn an entitlement by writing it down (ADR-053b,
    // "Not decided here").
    expect(
      declarationBreaches(ledger, [{ identity: GR, codes: ['A'] }])
    ).toEqual([
      'declares outside the recorded scope: A @ GR/short_stay_tourism',
    ])
  })
})

/** Production: identity, taken from the packs rather than typed. */
const production = PRODUCTION_COMPOSITIONS.map(
  ({ countryCode, composition }) => ({
    identity: {
      countryCode,
      visaType: composition.template.visaType,
    } satisfies CompositionIdentity,
    composition,
  })
)

/** What each production composition carries today, read from its template. */
const exposure: Exposure[] = production.map(({ identity, composition }) => ({
  identity,
  migratedCodes: composition.template.documentRequirements
    .filter((r) => r.applicabilityMigration)
    .map((r) => r.code),
}))

describe('production: composition identity is (countryCode, visaType)', () => {
  it('names every production composition uniquely', () => {
    const keys = production.map(({ identity }) => key(identity))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('covers every (country, visa type) the registry ships', () => {
    /**
     * `PRODUCTION_COMPOSITIONS` is cross-checked against the registry by
     * country only. A second visa type for a registered country would slip
     * past that, and then past this census — so the pair is checked here.
     */
    const registered = getAllCountryConfigs()
      .flatMap((c) =>
        c.visaTypes.map((t) =>
          key({ countryCode: c.countryCode, visaType: t.visaType })
        )
      )
      .sort()
    expect(production.map(({ identity }) => key(identity)).sort()).toEqual(
      registered
    )
  })

  it('does not let the visa type alone stand for a composition', () => {
    // Not hypothetical: two production compositions share a visa type today,
    // with different entitlements. A scope keyed by visa type would hand
    // Greece the German tax plate.
    const visaTypes = production.map(({ identity }) => identity.visaType)
    expect(new Set(visaTypes).size).toBeLessThan(visaTypes.length)
  })
})

describe('production: the ledger scope equals the composed exposure', () => {
  it('every ledger entry declares a scope inside the production compositions', () => {
    const known = new Set(production.map(({ identity }) => key(identity)))
    for (const entry of APPLICABILITY_MIGRATIONS) {
      expect(entry.shippedTo.length, entry.code).toBeGreaterThan(0)
      for (const identity of entry.shippedTo) {
        expect(
          known.has(key(identity)),
          `${entry.code} @ ${key(identity)}`
        ).toBe(true)
      }
    }
  })

  it('agrees in both directions', () => {
    expect(scopeBreaches(APPLICABILITY_MIGRATIONS, exposure)).toEqual([])
  })

  it('declares exactly these historical scopes', () => {
    // Read from git, not from today's exposure (ADR-053b). A list, so a change
    // to any composition's history is a reviewed line in a diff.
    const declared = APPLICABILITY_MIGRATIONS.flatMap((e) =>
      e.shippedTo.map((s) => `${key(s)} -> ${e.code}`)
    )
    expect(declared.sort()).toEqual([
      'DE/short_stay_tourism -> CHAMBER_REGISTRATION_CERTIFICATE',
      'DE/short_stay_tourism -> COMPANY_ACTIVITY_CERTIFICATE',
      'DE/short_stay_tourism -> EMPLOYER_TAX_PLATE',
      'DE/short_stay_tourism -> EMPLOYER_TRADE_REGISTRY',
      'DE/short_stay_tourism -> TAX_PAYMENT_STATEMENT',
      'GR/short_stay_tourism -> CHAMBER_REGISTRATION_CERTIFICATE',
      'GR/short_stay_tourism -> COMPANY_ACTIVITY_CERTIFICATE',
      'GR/short_stay_tourism -> EMPLOYER_SIGNATURE_CIRCULAR',
      'GR/short_stay_tourism -> EMPLOYER_TRADE_REGISTRY',
      'GR/short_stay_tourism -> TAX_PAYMENT_STATEMENT',
    ])
  })

  it('and the packs carry exactly those today', () => {
    const carried = exposure.flatMap(({ identity, migratedCodes }) =>
      migratedCodes.map((code) => `${key(identity)} -> ${code}`)
    )
    expect(carried.sort()).toEqual(
      APPLICABILITY_MIGRATIONS.flatMap((e) =>
        e.shippedTo.map((s) => `${key(s)} -> ${e.code}`)
      ).sort()
    )
  })

  it('the declarations the next slice must write pass the declaration gate', () => {
    // Non-vacuity for the declaration rule: the exact per-composition lists a
    // composition will declare are admissible, and nothing broader is.
    const declarations: Declaration[] = exposure.map(
      ({ identity, migratedCodes }) => ({ identity, codes: migratedCodes })
    )
    expect(declarationBreaches(APPLICABILITY_MIGRATIONS, declarations)).toEqual(
      []
    )
    expect(
      declarationBreaches(APPLICABILITY_MIGRATIONS, [
        { identity: GR, codes: ['EMPLOYER_TAX_PLATE', 'FARMER_CERTIFICATE'] },
      ])
    ).toEqual([
      'declares outside the recorded scope: EMPLOYER_TAX_PLATE @ GR/short_stay_tourism',
      'declares a code that is not migrated: FARMER_CERTIFICATE @ GR/short_stay_tourism',
    ])
  })
})

describe('production: split provenance', () => {
  it('only the chamber certificate names a parent, and it is the trade registry', () => {
    // No parent is invented for an entry that was never split.
    expect(
      Object.fromEntries(
        APPLICABILITY_MIGRATIONS.filter((e) => e.obligationFrom).map((e) => [
          e.code,
          e.obligationFrom,
        ])
      )
    ).toEqual({ CHAMBER_REGISTRATION_CERTIFICATE: 'EMPLOYER_TRADE_REGISTRY' })
  })

  it('and its scope is within the parent it split from', () => {
    const byCode = new Map(APPLICABILITY_MIGRATIONS.map((e) => [e.code, e]))
    for (const child of APPLICABILITY_MIGRATIONS) {
      if (child.obligationFrom === undefined) continue
      const parent = byCode.get(child.obligationFrom)
      expect(parent, child.code).toBeDefined()
      const parentScope = new Set(parent?.shippedTo.map(key))
      for (const s of child.shippedTo) {
        expect(parentScope.has(key(s)), `${child.code} @ ${key(s)}`).toBe(true)
      }
    }
  })
})

describe('production: the Greek tax plate stays out of scope', () => {
  it('is entitled in Germany alone', () => {
    const plate = APPLICABILITY_MIGRATIONS.find(
      (e) => e.code === 'EMPLOYER_TAX_PLATE'
    )
    expect(plate?.shippedTo.map(key)).toEqual(['DE/short_stay_tourism'])
  })

  it('and Greece does not compose it — nothing yet enforces the scope', () => {
    // ADR-053b decision 9: until the composer strips an out-of-scope fallback,
    // a Greek activation would inherit Germany's. The census above would fail
    // it; this says why in one line.
    const greece = production.find(({ identity }) => key(identity) === key(GR))
    expect(
      greece?.composition.template.documentRequirements.some(
        (r) => r.code === 'EMPLOYER_TAX_PLATE'
      )
    ).toBe(false)
  })
})
