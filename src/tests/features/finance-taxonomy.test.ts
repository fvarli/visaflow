import { describe, it, expect } from 'vitest'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { EmploymentStatus } from '@/domain/types/common'
import {
  financeDocGroup,
  buildFinanceDocuments,
} from '@/features/finance/finance-documents'
import { buildEmploymentDocuments } from '@/features/employment/employment-documents'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { applicableRequirements } from '@/features/documents/template-sync'
import { compositionFor } from '@/tests/support/production-compositions'
import { ctxFor } from '@/tests/support/applicability'

/**
 * What the Finance workspace is a workspace *of*.
 *
 * `financeDocGroup` used to admit a document because its `ownerType` was
 * `employer`, and render the result under two different headings: *Employer
 * evidence* in the summary, *Employer-funded evidence* in the gather list the
 * applicant copies out. One is a statement about whose situation the document
 * describes; the other is a statement about who pays for the trip. ADR-049a
 * decision 6 says those are not the same claim and that the first is never
 * evidence for the second.
 *
 * The clause admitted exactly two requirements, and was the only reason either
 * reached this workspace. This file pins the taxonomy that remains: every group
 * is decided by an explicit fact about the requirement — its category, or its
 * membership of a named code list — and never by whose situation it describes.
 */

function applicationFor(
  destinationCountry: string,
  employmentStatus: EmploymentStatus
): Application {
  return {
    destinationCountry,
    visaType: 'short_stay_tourism',
    employment: { employmentStatus },
  } as unknown as Application
}

/** The complete set of production requirements this workspace shows, by group. */
const EXPECTED_TAXONOMY: Record<string, string | null> = {
  // Bank — by category.
  BANK_STATEMENTS: 'bank',
  // Income — by the explicit code list, whatever the category says.
  PAYSLIPS: 'income',
  EMPLOYMENT_LETTER: 'income',
  SOCIAL_SECURITY: 'income',
  COMPANY_ACTIVITY_CERTIFICATE: 'income',
  TAX_PAYMENT_STATEMENT: 'income',
  PENSIONER_BOOKLET: 'income',
  // Sponsor — by category, plus the one code whose category is elsewhere.
  SPONSOR_LETTER: 'sponsor',
  SPONSOR_BANK_STATEMENTS: 'sponsor',
  SPONSOR_INCOME_PROOF: 'sponsor',
  RELATIONSHIP_PROOF: 'sponsor',
  // Other — by code.
  PROPERTY_DEED: 'other',
  // Admitted by the owner clause and by nothing else. A signature circular
  // proves who may sign for a company; a tax plate proves one is registered.
  EMPLOYER_SIGNATURE_CIRCULAR: null,
  EMPLOYER_TAX_PLATE: null,
  // Never in this workspace, and the counter-example that shows the old
  // taxonomy was already incoherent: the same source block listed it beside the
  // two above, and it reached no finance group at all.
  EMPLOYER_TRADE_REGISTRY: null,
}

describe('finance taxonomy — every production requirement, pinned', () => {
  it.each(
    compositionFor('GR')
      .template.documentRequirements.concat(
        compositionFor('DE').template.documentRequirements
      )
      .filter((req, i, all) => all.findIndex((r) => r.code === req.code) === i)
      .map((req) => [req.code, req.category] as const)
  )('%s', (code, category) => {
    const group = financeDocGroup(code, category)
    if (code in EXPECTED_TAXONOMY) {
      expect(group).toBe(EXPECTED_TAXONOMY[code])
    } else {
      // Everything not listed is not financial evidence.
      expect(group).toBeNull()
    }
  })

  it('no finance group is decided by an evidence subject', () => {
    // Structural: the classifier takes code and category, and nothing else.
    expect(financeDocGroup.length).toBe(2)
  })

  it('the employer group is empty and therefore never rendered', () => {
    for (const [country, status] of [
      ['GR', 'employed'],
      ['DE', 'self_employed'],
    ] as const) {
      const view = buildFinanceDocuments(
        [],
        ctxFor(applicationFor(country, status)),
        compositionFor(country).template
      )
      expect(view.groups.some((g) => g.id === 'employer')).toBe(false)
      expect(view.gather.some((g) => g.id === 'employer')).toBe(false)
    }
  })
})

describe('finance taxonomy — the two removed rows keep every other obligation', () => {
  const deTemplate = compositionFor('DE').template
  const deCtx = ctxFor(applicationFor('DE', 'self_employed'))

  it('EMPLOYER_TAX_PLATE is still required, applicable and globally counted', () => {
    const req = deTemplate.documentRequirements.find(
      (r) => r.code === 'EMPLOYER_TAX_PLATE'
    )
    expect(req?.required).toBe(true)
    expect(
      applicableRequirements(deTemplate, deCtx).map((r) => r.code)
    ).toContain('EMPLOYER_TAX_PLATE')
    // The global obligation set is untouched — it never consulted this
    // workspace's classifier.
    expect(requiredRequirementCodes(deTemplate, deCtx)).toContain(
      'EMPLOYER_TAX_PLATE'
    )
  })

  it('and it is still shown, in the workspace its category names', () => {
    const employment = buildEmploymentDocuments([], deCtx, deTemplate)
    expect(employment.rows.map((r) => r.code)).toContain('EMPLOYER_TAX_PLATE')
  })

  it('a record already marked ready survives intact outside Finance', () => {
    const ready: Document = {
      id: 'doc-plate',
      code: 'EMPLOYER_TAX_PLATE',
      category: 'employment',
      ownerType: 'employer',
      ownerId: 'applicant-1',
      required: true,
      status: 'ready',
      verified: false,
    }
    const finance = buildFinanceDocuments([ready], deCtx, deTemplate)
    expect(finance.rows.some((r) => r.code === 'EMPLOYER_TAX_PLATE')).toBe(
      false
    )

    // Not hidden, not rewritten — it simply belongs to another workspace.
    expect(ready.status).toBe('ready')
    const employment = buildEmploymentDocuments([ready], deCtx, deTemplate)
    const row = employment.rows.find((r) => r.code === 'EMPLOYER_TAX_PLATE')
    expect(row?.status).toBe('ready')
    expect(row?.docId).toBe('doc-plate')
  })

  it('the German finance denominator is read from the builder, and is three', () => {
    // Pinned from the production path rather than recomputed from the filter:
    // a test that reruns the predicate itself cannot notice the predicate
    // changing. It was four while the owner clause admitted the tax plate.
    const view = buildFinanceDocuments([], deCtx, deTemplate)
    expect(view.readiness.applicable).toBe(3)
    expect(view.rows.map((r) => r.code).sort()).toEqual([
      'BANK_STATEMENTS',
      'COMPANY_ACTIVITY_CERTIFICATE',
      'PROPERTY_DEED',
      'TAX_PAYMENT_STATEMENT',
    ])
  })

  it('EMPLOYER_SIGNATURE_CIRCULAR is optional, so no denominator moves for Greece', () => {
    const grTemplate = compositionFor('GR').template
    const grCtx = ctxFor(applicationFor('GR', 'employed'))
    const req = grTemplate.documentRequirements.find(
      (r) => r.code === 'EMPLOYER_SIGNATURE_CIRCULAR'
    )
    expect(req?.required).toBe(false)
    expect(requiredRequirementCodes(grTemplate, grCtx)).not.toContain(
      'EMPLOYER_SIGNATURE_CIRCULAR'
    )
    // Still asked for, still visible, just not as financial evidence.
    expect(
      applicableRequirements(grTemplate, grCtx).map((r) => r.code)
    ).toContain('EMPLOYER_SIGNATURE_CIRCULAR')
    expect(
      buildEmploymentDocuments([], grCtx, grTemplate).rows.map((r) => r.code)
    ).toContain('EMPLOYER_SIGNATURE_CIRCULAR')
  })
})

describe('finance taxonomy — one classifier, three consumers', () => {
  /**
   * Membership, the required-requirement filter and the row builder each asked
   * `financeDocGroup` separately, and until this slice they did not agree about
   * which owner to pass it: membership resolved the effective subject while the
   * other two used the declared one. Identical today, and divergent the moment a
   * subject became profile-dependent — a document the applicant had marked ready
   * would have rendered as never started. Removing the parameter makes the
   * disagreement unstateable.
   */
  it('every finance row finds its own record, in both packs', () => {
    // Seed a document for every applicable requirement, then assert no finance
    // row reads `not_instantiated`. That is exactly the symptom divergence
    // produces: the row builder admits a requirement while the membership
    // filter drops the matching record, so `byCode` misses it.
    for (const country of ['GR', 'DE'] as const) {
      const template = compositionFor(country).template
      const ctx = ctxFor(applicationFor(country, 'self_employed'))
      const documents: Document[] = applicableRequirements(template, ctx).map(
        (req, i) => ({
          id: `seed-${i}`,
          code: req.code,
          category: req.category,
          ownerType: req.ownerType,
          ownerId: 'applicant-1',
          required: req.required,
          status: 'received',
          verified: false,
        })
      )
      for (const row of buildFinanceDocuments(documents, ctx, template).rows) {
        expect(row.status, `${country}/${row.code}`).not.toBe(
          'not_instantiated'
        )
        expect(row.docId, `${country}/${row.code}`).not.toBeNull()
      }
    }
  })

  it('a ready document reaches its row, rather than reading as not started', () => {
    const grTemplate = compositionFor('GR').template
    const grCtx = ctxFor(applicationFor('GR', 'employed'))
    const ready: Document = {
      id: 'doc-bank',
      code: 'BANK_STATEMENTS',
      category: 'financial',
      ownerType: 'applicant',
      ownerId: 'applicant-1',
      required: true,
      status: 'ready',
      verified: false,
    }
    const row = buildFinanceDocuments([ready], grCtx, grTemplate).rows.find(
      (r) => r.code === 'BANK_STATEMENTS'
    )
    expect(row?.status).toBe('ready')
    expect(row?.docId).toBe('doc-bank')
  })
})
