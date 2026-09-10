import { describe, it, expect } from 'vitest'
import { classifyDoc } from '@/features/documents/documents-model'
import { resolveObligations } from '@/features/readiness/obligations'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import { applyDocumentUpdate } from '@/features/documents/document-semantics'
import { resolveVisaTemplate } from '@/config/countries'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { DocumentCategory } from '@/domain/types/common'
import { ctxFor } from '@/tests/support/applicability'

/**
 * The obligation lives in the group, not in any member.
 *
 * Two presentation surfaces kept classifying and counting *requirements* after
 * the domain moved to obligations, and browser QA caught both: the detail panel
 * rendered "Required" directly above "Travel arrangements — any one of these",
 * and the Documents category caption read "1/4" under a hero reading "1 of 11".
 */

const GREECE = resolveVisaTemplate('GR', 'short_stay_tourism')!
const GERMANY = resolveVisaTemplate('DE', 'short_stay_tourism')!

const app = (destinationCountry: string, employmentStatus = 'employed') =>
  ({
    applicationId: 'app1',
    applicantId: 'a1',
    destinationCountry,
    visaType: 'short_stay_tourism',
    status: 'draft',
    createdAt: '2026-09-09T00:00:00.000Z',
    sponsorIds: [],
    documentIds: [],
    notes: [],
    employment: { employmentStatus },
  }) as unknown as Application

const doc = (
  code: string,
  over: Partial<Document> = {},
  template = GREECE
): Document => {
  const record = {
    id: `d-${code}`,
    code,
    name: code,
    category:
      template.documentRequirements.find((r) => r.code === code)?.category ??
      'supporting',
    ownerType: 'applicant',
    ownerId: 'a1',
    required: true,
    status: 'not_started',
    ...over,
  } as unknown as Document
  return record.status === 'ready'
    ? applyDocumentUpdate(
        { ...record, status: 'not_started' },
        { status: 'ready' },
        template
      )
    : record
}

describe('a grouped member is an alternative, never required or optional', () => {
  it.each([
    ['TRANSPORT_RESERVATION', GERMANY],
    ['ITINERARY', GERMANY],
    ['TRANSPORT_MEANS_PROOF', GERMANY],
    ['ACCOMMODATION', GERMANY],
    ['DE_OFFICIAL_UNDERTAKING', GERMANY],
    ['EMPLOYMENT_LETTER', GREECE],
    ['APPROVED_LEAVE', GREECE],
  ])('%s reads as an alternative', (code, template) => {
    expect(classifyDoc(doc(code, {}, template), template)).toBe('alternative')
  })

  it('leaves Germany’s employment documents independent', () => {
    // The German mission asks for one letter carrying both sets of information,
    // so Annex III's and/or is a choice it does not offer. These two are not a
    // group there, and their badges must still say so.
    expect(classifyDoc(doc('EMPLOYMENT_LETTER', {}, GERMANY), GERMANY)).toBe(
      'conditional'
    )
    expect(classifyDoc(doc('APPROVED_LEAVE', {}, GERMANY), GERMANY)).toBe(
      'conditional'
    )
  })

  it('leaves ungrouped requirements exactly as they were', () => {
    expect(classifyDoc(doc('PASSPORT_CURRENT'), GREECE)).toBe('required')
    expect(classifyDoc(doc('PROPERTY_DEED'), GREECE)).toBe('optional')
    expect(classifyDoc(doc('PAYSLIPS'), GREECE)).toBe('conditional')
    expect(classifyDoc(doc('CUSTOM-abc'), GREECE)).toBe('custom')
  })
})

describe('a category owes obligations, not requirements', () => {
  const employed = app('GR')
  const countFor = (
    documents: Document[],
    category: DocumentCategory,
    template = GREECE,
    application = employed
  ) =>
    resolveObligations({
      documents,
      requiredRequirementCodes: requiredRequirementCodes(
        template,
        ctxFor(application)
      ),
      template,
      context: ctxFor(application),
    }).filter((o) => o.category === category)

  const GR_EMPLOYMENT = [
    'PAYSLIPS',
    'SOCIAL_SECURITY',
    'EMPLOYMENT_LETTER',
    'APPROVED_LEAVE',
  ]

  it('counts Greece employment as three obligations, not four requirements', () => {
    // Payslips, social security, and one-of(letter, leave). The caption used to
    // say 4, so an applicant could only "finish" the section by obtaining a
    // document the authority accepts an alternative to.
    const owed = countFor(
      GR_EMPLOYMENT.map((c) => doc(c)),
      'employment'
    )
    expect(owed).toHaveLength(3)
  })

  it('advances once when either accepted member is ready', () => {
    for (const member of ['EMPLOYMENT_LETTER', 'APPROVED_LEAVE']) {
      const docs = GR_EMPLOYMENT.map((c) =>
        doc(c, c === member ? { status: 'ready' } : {})
      )
      const owed = countFor(docs, 'employment')
      expect({
        member,
        total: owed.length,
        ready: owed.filter((o) => o.status === 'ready').length,
      }).toEqual({ member, total: 3, ready: 1 })
    }
  })

  it('advances only once when both are ready', () => {
    const docs = GR_EMPLOYMENT.map((c) =>
      doc(
        c,
        ['EMPLOYMENT_LETTER', 'APPROVED_LEAVE'].includes(c)
          ? { status: 'ready' }
          : {}
      )
    )
    const owed = countFor(docs, 'employment')
    expect({
      total: owed.length,
      ready: owed.filter((o) => o.status === 'ready').length,
    }).toEqual({ total: 3, ready: 1 })
  })

  it('keeps Germany employment at four independent obligations', () => {
    const docs = GR_EMPLOYMENT.map((c) => doc(c, {}, GERMANY))
    expect(countFor(docs, 'employment', GERMANY, app('DE'))).toHaveLength(4)
  })

  it('counts each travel and accommodation group as one slot', () => {
    const de = app('DE')
    const docs = [
      'TRANSPORT_RESERVATION',
      'TRANSPORT_MEANS_PROOF',
      'ITINERARY',
      'ACCOMMODATION',
      'DE_OFFICIAL_UNDERTAKING',
    ].map((c) => doc(c, {}, GERMANY))
    expect(countFor(docs, 'travel', GERMANY, de)).toHaveLength(1)
    expect(countFor(docs, 'accommodation', GERMANY, de)).toHaveLength(1)
  })

  it('counts a superseded claim by its effective status', () => {
    // Stored `ready`, claimed against a contract no longer in force.
    // Built directly rather than through the helper: the helper stamps a `ready`
    // record against the contract in force, which is exactly what this case
    // needs *not* to have happened.
    const stale = {
      ...doc('PASSPORT_CURRENT'),
      status: 'ready',
      satisfiedRevision: 1,
      satisfiedContract: 'PASSPORT_CURRENT@1',
    } as Document
    const owed = countFor([stale], 'passport')
    expect(owed.map((o) => o.status)).toEqual(['needsUpdate'])
  })

  it('agrees with the hero on the whole dossier', () => {
    // The property that stops a third counting implementation appearing: every
    // obligation the ring counts is one the categories can account for.
    const docs = GR_EMPLOYMENT.map((c) => doc(c))
    const codes = requiredRequirementCodes(GREECE, ctxFor(employed))
    const obligations = resolveObligations({
      documents: docs,
      requiredRequirementCodes: codes,
      template: GREECE,
      context: ctxFor(employed),
    })
    const readiness = buildDocumentReadiness({
      documents: docs,
      requiredRequirementCodes: codes,
      template: GREECE,
      context: ctxFor(employed),
    })
    expect(obligations).toHaveLength(
      readiness.applicable + readiness.notApplicable
    )
  })

  it('owes nothing for a requirement that does not apply', () => {
    const student = app('GR', 'student')
    expect(
      countFor([doc('EMPLOYMENT_LETTER')], 'employment', GREECE, student)
    ).toHaveLength(0)
  })
})
