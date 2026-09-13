import { describe, it, expect } from 'vitest'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { EmploymentStatus } from '@/domain/types/common'
import { applicableRequirements } from '@/features/documents/template-sync'
import { resolveDocumentSemantics } from '@/features/documents/document-semantics'
import { financeDocGroup } from '@/features/finance/finance-documents'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { compositionFor } from '@/tests/support/production-compositions'
import { ctxFor } from '@/tests/support/applicability'

/**
 * `COMPANY_ACTIVITY_CERTIFICATE` — the row the whole composition detour was for.
 *
 * Annex III I.5(c) files it under company owners; the condition said
 * `self_employed`, so it also reached independent professionals and farmers.
 * Correcting it to the citation alone would have taken the document away from a
 * Greek freelancer whose own visa centre publishes it — the withdrawal H4c2d2n
 * refused, and ADR-053a puts that harm level with inventing a document.
 *
 * So the correction and the Greek widening land together: Greece asks what its
 * checklist asks, Germany asks what its citation says, and the farmer over-ask
 * that every authority agrees on disappears. **Nobody in either pack loses a
 * document they are asked for**, which is the property this file exists to hold.
 */

const CODE = 'COMPANY_ACTIVITY_CERTIFICATE'

function ctx(
  destinationCountry: string,
  employmentStatus: EmploymentStatus,
  occupationCode?: string
) {
  return ctxFor({
    destinationCountry,
    visaType: 'short_stay_tourism',
    employment: {
      employmentStatus,
      ...(occupationCode ? { occupationCode } : {}),
    },
  } as unknown as Application)
}

const applies = (pack: 'GR' | 'DE', status: EmploymentStatus, occ?: string) =>
  applicableRequirements(
    compositionFor(pack).template,
    ctx(pack, status, occ)
  ).some((r) => r.code === CODE)

function seeded(): Document {
  return {
    id: 'doc-activity',
    code: CODE,
    category: 'employment',
    ownerType: 'applicant',
    ownerId: 'applicant-1',
    required: true,
    status: 'not_started',
    verified: false,
  }
}

const ownerFor = (pack: 'GR' | 'DE', status: EmploymentStatus, occ?: string) =>
  resolveDocumentSemantics(
    seeded(),
    compositionFor(pack).template,
    ctx(pack, status, occ)
  ).ownerType

describe('activity certificate — Greece asks what its checklist asks', () => {
  it.each([
    ['employed', 'employee', true, 'employer'],
    ['self_employed', 'company_owner', true, 'applicant'],
    ['self_employed', 'independent_professional', true, 'applicant'],
    ['self_employed', 'farmer', false, null],
    ['employed', 'public_servant', false, null],
  ] as const)('%s + %s → %s', (status, occupation, expected, owner) => {
    expect(applies('GR', status, occupation)).toBe(expected)
    if (owner !== null) expect(ownerFor('GR', status, occupation)).toBe(owner)
  })

  it('nobody in Greece lost the row, which is the point of doing it this way', () => {
    // A freelancer had it through `self_employed` and keeps it through the
    // widening. Narrowing without widening in the same commit would have taken
    // it away, and that is the harm the detour existed to avoid.
    expect(applies('GR', 'self_employed', 'independent_professional')).toBe(
      true
    )
  })
})

describe('activity certificate — Germany asks what its citation says', () => {
  it.each([
    ['self_employed', 'company_owner', true],
    ['self_employed', 'independent_professional', false],
    ['self_employed', 'farmer', false],
    ['employed', 'employee', false],
    ['employed', 'public_servant', false],
  ] as const)('%s + %s → %s', (status, occupation, expected) => {
    expect(applies('DE', status, occupation)).toBe(expected)
  })

  it('and the German sheet names no activity certificate at all', () => {
    // Which is why Germany composes it on the jurisdiction instrument alone and
    // is not widened: nothing in its own mission evidence asks for it.
    const de = compositionFor('DE').template.documentRequirements.find(
      (r) => r.code === CODE
    )
    expect(de?.sourceRefs).toEqual(['eu-c2021-5156-turkey-annex3'])
    expect(de?.applicableOccupations).toBeUndefined()
  })
})

describe('activity certificate — the prior contract is evaluated, not assumed', () => {
  it.each([
    ['GR', undefined],
    ['GR', 'crypto_farmer_2031'],
    ['GR', 'employee'], // known, illegal for self_employed
    ['DE', undefined],
    ['DE', 'crypto_farmer_2031'],
  ] as const)(
    '%s: self-employed + %s keeps the row while unclassified',
    (pack, occupation) => {
      expect(applies(pack, 'self_employed', occupation)).toBe(true)
    }
  )

  it.each(['GR', 'DE'] as const)(
    '%s: employed and unclassified gains nothing, though Greece widens employees in',
    (pack) => {
      // The distinction ADR-052c decision 6 exists for. A Greek employee is a
      // *new* obligation for that population, so it fails closed until they
      // classify — the widening is never consulted on the fallback path.
      for (const occupation of [undefined, 'crypto_farmer_2031', 'farmer']) {
        expect(applies(pack, 'employed', occupation), String(occupation)).toBe(
          false
        )
      }
    }
  )

  it('records the coarse condition the row actually carried', () => {
    const req = compositionFor('GR').template.documentRequirements.find(
      (r) => r.code === CODE
    )
    expect(req?.applicabilityMigration?.priorCondition).toEqual({
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    })
  })
})

describe('activity certificate — one requirement, two populations', () => {
  const gr = compositionFor('GR').template.documentRequirements.find(
    (r) => r.code === CODE
  )
  const de = compositionFor('DE').template.documentRequirements.find(
    (r) => r.code === CODE
  )

  it('the packs differ in population and in nothing else that matters', () => {
    expect(gr?.applicableOccupations).toEqual([
      'employee',
      'independent_professional',
    ])
    expect(de?.applicableOccupations).toBeUndefined()
    expect(gr?.conditionalOn).toEqual(de?.conditionalOn)
    expect(gr?.required).toBe(de?.required)
    expect(gr?.ownerType).toBe(de?.ownerType)
  })

  it('and render one contract, so no stored claim is superseded', () => {
    expect(gr?.revision).toBe(1)
    expect(gr?.contractKey).toBe('COMPANY_ACTIVITY_CERTIFICATE@1')
    expect(gr?.contractKey).toBe(de?.contractKey)
  })

  it('the owner mapping is inert in the pack that does not widen', () => {
    // Declared on the shared row, so Germany carries it — and never consults
    // it, because Germany never applies the row to an employee.
    expect(de?.ownerByOccupation).toEqual({ employee: 'employer' })
    expect(applies('DE', 'employed', 'employee')).toBe(false)
  })
})

describe('activity certificate — what this slice did not move', () => {
  const req = compositionFor('GR').template.documentRequirements.find(
    (r) => r.code === CODE
  )

  it('requiredness, and the obligation with it in both packs', () => {
    expect(req?.required).toBe(true)
    for (const pack of ['GR', 'DE'] as const) {
      expect(
        requiredRequirementCodes(
          compositionFor(pack).template,
          ctx(pack, 'self_employed', 'company_owner')
        )
      ).toContain(CODE)
    }
  })

  it('the Finance group, which follows code and category alone', () => {
    expect(financeDocGroup(CODE, 'employment')).toBe('income')
    expect(financeDocGroup.length).toBe(2)
  })

  it('and a stored record, which is read and never rewritten', () => {
    const record = seeded()
    const before = JSON.stringify(record)
    expect(
      resolveDocumentSemantics(
        record,
        compositionFor('GR').template,
        ctx('GR', 'employed', 'employee')
      ).ownerType
    ).toBe('employer')
    expect(JSON.stringify(record)).toBe(before)
  })

  it('both packs kept every requirement they had', () => {
    expect(compositionFor('GR').template.documentRequirements).toHaveLength(27)
    expect(compositionFor('DE').template.documentRequirements).toHaveLength(26)
  })
})
