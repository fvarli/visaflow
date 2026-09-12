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
import tr from '@/i18n/locales/tr/visa-domain.json'
import en from '@/i18n/locales/en/visa-domain.json'

/**
 * `TAX_PAYMENT_STATEMENT`, narrowed to the population its citation names.
 *
 * Annex III I.5(c) files the statement of taxes payment under **Company
 * owners**. The condition said `self_employed`, so it also reached independent
 * professionals and farmers. Nothing anywhere disagrees: the German mission's
 * sheet lists no tax-payment document at all, and neither does the Greek visa
 * centre's company block — which is why this row moved before the two beside it.
 *
 * It lives in the shared Türkiye layer, so **both packs** change. Every matrix
 * below is asserted in both rather than in one and assumed for the other.
 */

const CODE = 'TAX_PAYMENT_STATEMENT'
const PACKS = ['GR', 'DE'] as const

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

const applies = (
  pack: (typeof PACKS)[number],
  status: EmploymentStatus,
  occupation?: string
) =>
  applicableRequirements(
    compositionFor(pack).template,
    ctx(pack, status, occupation)
  ).some((r) => r.code === CODE)

function seeded(): Document {
  return {
    id: 'doc-tax-payment',
    code: CODE,
    category: 'financial',
    ownerType: 'applicant',
    ownerId: 'applicant-1',
    required: true,
    status: 'not_started',
    verified: false,
  }
}

describe('tax payment statement — the population I.5(c) names', () => {
  it.each(
    PACKS.flatMap((pack) =>
      (
        [
          ['self_employed', 'company_owner', true],
          ['self_employed', 'independent_professional', false],
          ['self_employed', 'farmer', false],
          ['employed', 'employee', false],
          ['employed', 'public_servant', false],
        ] as const
      ).map(([status, occupation, expected]) => [
        pack,
        status,
        occupation,
        expected,
      ])
    )
  )('%s: %s + %s → applies: %s', (pack, status, occupation, expected) => {
    expect(
      applies(
        pack as (typeof PACKS)[number],
        status as EmploymentStatus,
        occupation as string
      )
    ).toBe(expected)
  })

  it.each(PACKS)('%s names one occupation, as an equality', (pack) => {
    // One occupation is an equality, not a set with one member. `oneOf` is for
    // the rows that genuinely route on several — keeping the distinction is
    // what lets the production census of `oneOf` mean something.
    const req = compositionFor(pack).template.documentRequirements.find(
      (r) => r.code === CODE
    )
    expect(req?.conditionalOn).toEqual({
      field: 'employment.occupation',
      operator: 'equals',
      value: 'company_owner',
    })
  })

  it('is purely subtractive — nobody gains it in either pack', () => {
    for (const pack of PACKS) {
      for (const status of [
        'employed',
        'retired',
        'student',
        'unemployed',
        'homemaker',
      ] as const) {
        expect(applies(pack, status), `${pack}/${status}`).toBe(false)
      }
    }
  })
})

describe('tax payment statement — the prior contract is evaluated, not assumed', () => {
  it.each(
    PACKS.flatMap((pack) =>
      (
        [
          [undefined],
          ['crypto_farmer_2031'], // unknown to this build
          ['employee'], // known, but illegal for self_employed
        ] as const
      ).map(([occupation]) => [pack, occupation])
    )
  )('%s: self-employed + %s keeps the row while unclassified', (pack, occ) => {
    expect(
      applies(pack as (typeof PACKS)[number], 'self_employed', occ as string)
    ).toBe(true)
  })

  it.each(PACKS)('%s: employed and unclassified gains nothing', (pack) => {
    for (const occupation of [undefined, 'crypto_farmer_2031', 'farmer']) {
      expect(applies(pack, 'employed', occupation), occupation).toBe(false)
    }
  })

  it.each(PACKS)('%s records the coarse condition it carried', (pack) => {
    const req = compositionFor(pack).template.documentRequirements.find(
      (r) => r.code === CODE
    )
    expect(req?.applicabilityMigration?.priorCondition).toEqual({
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    })
  })
})

describe('tax payment statement — what this slice did not touch', () => {
  it.each(PACKS)(
    '%s: the subject, already correct and still static',
    (pack) => {
      const req = compositionFor(pack).template.documentRequirements.find(
        (r) => r.code === CODE
      )
      expect(req?.ownerType).toBe('applicant')
      expect(req?.ownerByOccupation).toBeUndefined()
    }
  )

  it.each(PACKS)('%s: requiredness, and the obligation with it', (pack) => {
    const req = compositionFor(pack).template.documentRequirements.find(
      (r) => r.code === CODE
    )
    expect(req?.required).toBe(true)
    expect(
      requiredRequirementCodes(
        compositionFor(pack).template,
        ctx(pack, 'self_employed', 'company_owner')
      )
    ).toContain(CODE)
  })

  it.each(PACKS)('%s: the acceptance contract', (pack) => {
    const req = compositionFor(pack).template.documentRequirements.find(
      (r) => r.code === CODE
    )
    expect(req?.revision).toBe(1)
    expect(req?.contractKey).toBe('TAX_PAYMENT_STATEMENT@1')
  })

  it('the applicant-facing copy', () => {
    expect(tr.requirements.TAX_PAYMENT_STATEMENT.name).toBe(
      'Vergi Ödeme Belgesi'
    )
    expect(en.requirements.TAX_PAYMENT_STATEMENT.name).toBe(
      'Tax Payment Statement'
    )
  })

  it('a stored record, which is read and never rewritten', () => {
    const record = seeded()
    const before = JSON.stringify(record)
    expect(
      resolveDocumentSemantics(
        record,
        compositionFor('GR').template,
        ctx('GR', 'self_employed', 'company_owner')
      ).ownerType
    ).toBe('applicant')
    expect(JSON.stringify(record)).toBe(before)
  })
})

describe('tax payment statement — both packs move together', () => {
  /**
   * The row is authored once in the shared Türkiye layer and rendered by two
   * packs, so a correction that reached only one of them would be a composition
   * bug rather than a narrower change.
   */
  it('the two packs agree on every cell of the matrix', () => {
    for (const status of ['employed', 'self_employed', 'retired'] as const) {
      for (const occupation of [
        undefined,
        'company_owner',
        'independent_professional',
        'farmer',
        'employee',
        'crypto_farmer_2031',
      ]) {
        expect(
          applies('GR', status, occupation),
          `${status}/${occupation}`
        ).toBe(applies('DE', status, occupation))
      }
    }
  })

  it('and neither pack gained or lost a requirement', () => {
    // Narrowing a condition changes who is asked, never what the pack carries.
    expect(compositionFor('GR').template.documentRequirements).toHaveLength(27)
    expect(compositionFor('DE').template.documentRequirements).toHaveLength(26)
  })

  it('and both templateVersions moved, because both packs now ask differently', () => {
    /**
     * Greece's version has been pinned since the composition pin was written.
     * Germany's was pinned nowhere, which a negative control found: reverting
     * it to 1.10.0 broke nothing at all. `templateVersion` is per pack and
     * versions what *that* pack asks an applicant for, so a shared-layer
     * correction has to move both — and a row authored once is exactly the
     * case where forgetting the second one is easy.
     */
    expect(compositionFor('GR').template.templateVersion).toBe('1.13.0')
    expect(compositionFor('DE').template.templateVersion).toBe('1.11.0')
  })
})

describe('tax payment statement — Finance follows applicability, unchanged', () => {
  /**
   * `financeDocGroup` is untouched: this row is `income` by the explicit code
   * list, and stays there whenever it applies. A professional or a farmer loses
   * the Finance row because the requirement stopped applying to them, which is
   * how any inapplicable requirement behaves — not because the taxonomy moved.
   */
  it('still groups as income, by code and category alone', () => {
    expect(financeDocGroup(CODE, 'financial')).toBe('income')
    expect(financeDocGroup.length).toBe(2)
  })
})
