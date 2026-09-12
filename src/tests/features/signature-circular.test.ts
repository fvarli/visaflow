import { describe, it, expect } from 'vitest'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { EmploymentStatus, OwnerType } from '@/domain/types/common'
import { applicableRequirements } from '@/features/documents/template-sync'
import { resolveDocumentSemantics } from '@/features/documents/document-semantics'
import { buildFinanceDocuments } from '@/features/finance/finance-documents'
import { isStatusComplete } from '@/features/employment/employment-wizard'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { compositionFor } from '@/tests/support/production-compositions'
import { ctxFor } from '@/tests/support/applicability'

/**
 * `EMPLOYER_SIGNATURE_CIRCULAR`, and the three corrections that had to land
 * together.
 *
 * The row fired on `employmentStatus = employed`, which was wrong in both
 * directions: it over-asked the public servant, whose branch carries no company
 * block at all, and missed the company owner and the freelancer, whose branches
 * carry the same block verbatim. ADR-047's fourth evidence pass read all five
 * occupational branches at all four consular jurisdictions and they agree.
 *
 * Correcting applicability alone would have told a company owner their
 * *employer* supplies their own firm's circular. Correcting the subject alone
 * would have relabelled a population that was still wrong. Migrating alone
 * would have withdrawn the row from every employed applicant who has not yet
 * said what kind of work they do. So: one slice, three changes, one matrix.
 */

const CODE = 'EMPLOYER_SIGNATURE_CIRCULAR'
const template = compositionFor('GR').template

function ctx(employmentStatus: EmploymentStatus, occupationCode?: string) {
  return ctxFor({
    destinationCountry: 'GR',
    visaType: 'short_stay_tourism',
    employment: {
      employmentStatus,
      ...(occupationCode ? { occupationCode } : {}),
    },
  } as unknown as Application)
}

const applies = (status: EmploymentStatus, occupation?: string) =>
  applicableRequirements(template, ctx(status, occupation)).some(
    (r) => r.code === CODE
  )

function seeded(ownerType: OwnerType = 'employer'): Document {
  return {
    id: 'doc-circular',
    code: CODE,
    category: 'employment',
    ownerType,
    ownerId: 'applicant-1',
    required: false,
    status: 'not_started',
    verified: false,
  }
}

const ownerFor = (status: EmploymentStatus, occupation?: string) =>
  resolveDocumentSemantics(seeded(), template, ctx(status, occupation))
    .ownerType

describe('signature circular — the classified population', () => {
  it.each([
    ['employed', 'employee', true, 'employer'],
    ['employed', 'public_servant', false, null],
    ['self_employed', 'company_owner', true, 'applicant'],
    ['self_employed', 'independent_professional', true, 'applicant'],
    ['self_employed', 'farmer', false, null],
  ] as const)(
    '%s + %s → applies: %s, owner: %s',
    (status, occupation, expected, owner) => {
      expect(applies(status, occupation)).toBe(expected)
      if (owner !== null) expect(ownerFor(status, occupation)).toBe(owner)
    }
  )

  it('the corrected population is exactly three, and names no one else', () => {
    const req = template.documentRequirements.find((r) => r.code === CODE)
    expect(req?.conditionalOn).toEqual({
      field: 'employment.occupation',
      operator: 'oneOf',
      values: ['employee', 'company_owner', 'independent_professional'],
    })
  })
})

describe('signature circular — the prior contract is evaluated, not assumed', () => {
  /**
   * The asymmetry ADR-053a exists for, and the reason no `unclassified` token
   * was added to the vocabulary. A membership test can only widen: an employed
   * applicant who has not classified themselves must keep the row, and a
   * self-employed one must still not have it — the corrected population reaches
   * two self-employed categories the old contract never did, so treating
   * "unclassified" as a matchable value would have *activated* a requirement
   * for people who never had it.
   */
  it.each([
    ['employed', undefined],
    ['employed', 'crypto_farmer_2031'], // unknown to this build
    ['employed', 'farmer'], // known, but illegal for `employed`
  ] as const)(
    'employed + %s / %s keeps the row, on the contract it was shown',
    (status, occupation) => {
      expect(applies(status, occupation)).toBe(true)
      expect(ownerFor(status, occupation)).toBe('employer')
    }
  )

  it.each([
    ['self_employed', undefined],
    ['self_employed', 'crypto_farmer_2031'],
    ['self_employed', 'employee'], // known, but illegal for `self_employed`
  ] as const)(
    'self-employed + %s / %s does not gain it',
    (status, occupation) => {
      expect(applies(status, occupation)).toBe(false)
    }
  )

  it('a status the prior contract never named gains nothing either', () => {
    for (const status of ['retired', 'student', 'unemployed'] as const) {
      expect(applies(status), status).toBe(false)
    }
  })

  it('the recorded prior condition is the one the row actually carried', () => {
    const req = template.documentRequirements.find((r) => r.code === CODE)
    expect(req?.applicabilityMigration?.priorCondition).toEqual({
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    })
  })
})

describe('signature circular — stored records are read, never rewritten', () => {
  it('a seeded employer snapshot resolves to the applicant for a company owner', () => {
    const record = seeded('employer')
    const before = JSON.stringify(record)
    const semantics = resolveDocumentSemantics(
      record,
      template,
      ctx('self_employed', 'company_owner')
    )
    expect(semantics.ownerType).toBe('applicant')
    expect(JSON.stringify(record)).toBe(before)
  })

  it('and to the employer for an employee, which is what it was', () => {
    expect(
      resolveDocumentSemantics(
        seeded('employer'),
        template,
        ctx('employed', 'employee')
      ).ownerType
    ).toBe('employer')
  })
})

describe('signature circular — what this slice deliberately did not move', () => {
  const req = template.documentRequirements.find((r) => r.code === CODE)

  it('requiredness, which stays its own question', () => {
    expect(req?.required).toBe(false)
    for (const occupation of [
      'employee',
      'company_owner',
      'independent_professional',
    ]) {
      expect(
        requiredRequirementCodes(
          template,
          ctx(
            occupation === 'employee' ? 'employed' : 'self_employed',
            occupation
          )
        )
      ).not.toContain(CODE)
    }
  })

  it('the acceptance contract — so no stored claim is superseded', () => {
    expect(req?.revision).toBe(1)
    expect(req?.contractKey).toBe('EMPLOYER_SIGNATURE_CIRCULAR@1')
  })

  it('the identity: one code, not an employer variant and an applicant one', () => {
    const circulars = template.documentRequirements.filter((r) =>
      r.code.includes('SIGNATURE_CIRCULAR')
    )
    expect(circulars.map((r) => r.code)).toEqual([CODE])
  })

  it('the citation, which needs a source record that does not exist', () => {
    expect(req?.sourceRefs ?? []).toEqual([])
  })

  it('and Germany, which does not compose this layer', () => {
    expect(
      compositionFor('DE').template.documentRequirements.map((r) => r.code)
    ).not.toContain(CODE)
  })
})

describe('signature circular — the workflow still wants an answer', () => {
  /**
   * The migration preserves the *requirement contract*, not the impression that
   * the applicant has finished. A branched status with no usable occupation is
   * still incomplete, so the rail and the review chip keep asking (H4c2d3) —
   * otherwise the fallback would quietly become a way of never being asked.
   */
  it('an employed applicant with no occupation is incomplete, and still sees the row', () => {
    expect(
      isStatusComplete({ employmentStatus: 'employed', currency: 'EUR' })
    ).toBe(false)
    expect(applies('employed')).toBe(true)
  })

  it('an unknown code does not count as an answer', () => {
    expect(
      isStatusComplete({
        employmentStatus: 'employed',
        currency: 'EUR',
        occupationCode: 'crypto_farmer_2031',
      })
    ).toBe(false)
  })

  it('a classified applicant is complete', () => {
    expect(
      isStatusComplete({
        employmentStatus: 'self_employed',
        currency: 'EUR',
        occupationCode: 'company_owner',
      })
    ).toBe(true)
  })
})

describe('signature circular — Finance stays out of it', () => {
  /**
   * The firewall H4c2d2g made structural. The subject now differs by
   * occupation, and `financeDocGroup` takes a code and a category — so there is
   * no argument through which that difference could reach a finance group.
   */
  it.each([
    ['employed', 'employee'],
    ['self_employed', 'company_owner'],
    ['self_employed', 'independent_professional'],
    ['employed', undefined],
  ] as const)('%s + %s: not financial evidence', (status, occupation) => {
    const view = buildFinanceDocuments(
      [seeded()],
      ctx(status, occupation),
      template
    )
    expect(view.rows.some((r) => r.code === CODE)).toBe(false)
    expect(view.groups.some((g) => g.id === 'employer')).toBe(false)
  })
})
