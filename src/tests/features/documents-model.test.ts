import { describe, it, expect } from 'vitest'
import {
  groupByCategory,
  deriveNextDocument,
  classifyDoc,
  associateFindings,
  findingLink,
} from '@/features/documents/documents-model'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import {
  filterDocuments,
  EMPTY_FILTERS,
} from '@/features/documents/document-filters'
import { planTemplateSync } from '@/features/documents/template-sync'
import type { Document } from '@/domain/schemas/document.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { VisaTypeTemplate, DocumentRequirement } from '@/config/types'
import type { ValidationFinding } from '@/domain/rules/types'

function doc(partial: Partial<Document>): Document {
  return {
    id: 'd',
    code: 'X',
    category: 'supporting',
    ownerType: 'applicant',
    ownerId: 'a',
    required: true,
    status: 'not_started',
    verified: false,
    ...partial,
  }
}

const req = (partial: Partial<DocumentRequirement>): DocumentRequirement => ({
  code: 'X',
  nameKey: 'k',
  category: 'supporting',
  ownerType: 'applicant',
  required: true,
  ...partial,
})

describe('documents model — canonical readiness', () => {
  it('partitions required documents into classes that sum to applicable', () => {
    const docs = [
      doc({ id: '1', required: true, status: 'ready' }),
      doc({ id: '2', required: true, status: 'needs_update' }),
      doc({ id: '3', required: true, status: 'requested' }),
      doc({ id: '4', required: true, status: 'not_started' }),
      doc({ id: '5', required: true, status: 'received' }),
      doc({ id: '6', required: true, status: 'not_applicable' }),
      doc({ id: '7', required: false, status: 'not_started' }),
    ]
    expect(buildDocumentReadiness({ documents: docs })).toEqual({
      requiredTotal: 6,
      applicable: 5,
      notApplicable: 1,
      ready: 1,
      obtained: 1,
      inProgress: 1,
      notStarted: 1,
      needsUpdate: 1,
      optional: 1,
      percent: 20,
      outstanding: 4,
      complete: false,
      hasApplicableWork: true,
    })
  })

  it('leaves no document unaccounted for — the old five buckets did not sum', () => {
    const docs = [
      doc({ id: '1', required: true, status: 'ready' }),
      doc({ id: '2', required: true, status: 'received' }),
      doc({ id: '3', required: true, status: 'not_applicable' }),
    ]
    const r = buildDocumentReadiness({ documents: docs })
    expect(
      r.ready + r.obtained + r.inProgress + r.notStarted + r.needsUpdate
    ).toBe(r.applicable)
    expect(r.applicable + r.notApplicable).toBe(r.requiredTotal)
  })
})

describe('documents model — grouping & next', () => {
  it('orders groups by the category order', () => {
    const docs = [
      doc({ id: '1', category: 'supporting' }),
      doc({ id: '2', category: 'passport' }),
      doc({ id: '3', category: 'employment' }),
    ]
    expect(groupByCategory(docs).map((g) => g.category)).toEqual([
      'passport',
      'employment',
      'supporting',
    ])
  })

  it('picks the first not-started required document as next', () => {
    const docs = [
      doc({ id: '1', required: true, status: 'ready' }),
      doc({ id: '2', required: true, status: 'not_started' }),
    ]
    expect(deriveNextDocument(docs)?.document?.id).toBe('2')
  })
})

describe('documents model — classification', () => {
  const template = {
    documentRequirements: [
      req({ code: 'A', required: true }),
      req({
        code: 'B',
        required: true,
        conditionalOn: { field: 'x', operator: 'equals', value: 'y' },
      }),
      req({ code: 'C', required: false }),
    ],
  } as unknown as VisaTypeTemplate

  it('classifies by template membership and requirement shape', () => {
    expect(classifyDoc(doc({ code: 'A' }), template)).toBe('required')
    expect(classifyDoc(doc({ code: 'B' }), template)).toBe('conditional')
    expect(classifyDoc(doc({ code: 'C' }), template)).toBe('optional')
    expect(classifyDoc(doc({ code: 'CUSTOM-1' }), template)).toBe('custom')
  })
})

describe('documents model — findings', () => {
  it('associates findings by code, id and cross-entity category', () => {
    const docs = [
      doc({ id: 'p', code: 'PASSPORT_CURRENT', category: 'passport' }),
      doc({ id: 'i', code: 'TRAVEL_INSURANCE', category: 'insurance' }),
      doc({ id: 'e', code: 'EMPLOYMENT_LETTER', category: 'employment' }),
    ]
    const findings: ValidationFinding[] = [
      {
        id: 'f1',
        ruleId: 'document.requiredNotStarted',
        severity: 'warning',
        messageKey: 'k',
        messageParams: { documentCodes: { documents: ['PASSPORT_CURRENT'] } },
        relatedFields: ['documents.p'],
      },
      {
        id: 'f2',
        ruleId: 'insurance.coversTrip',
        severity: 'error',
        messageKey: 'k',
        relatedFields: ['trip.insurance.coverageEndDate', 'trip.exitDate'],
      },
    ]
    const map = associateFindings(docs, findings)
    expect(map.get('p')?.map((f) => f.id)).toEqual(['f1'])
    expect(map.get('i')?.map((f) => f.id)).toEqual(['f2'])
    expect(map.get('e')).toBeUndefined()
  })

  it('deep-links cross-entity findings to the right section', () => {
    expect(
      findingLink({ relatedFields: ['trip.insurance'] } as ValidationFinding)
        ?.route
    ).toBe('/trip')
    expect(
      findingLink({
        relatedFields: ['applicant.passport.expiryDate'],
      } as ValidationFinding)?.route
    ).toBe('/applicant')
    expect(
      findingLink({ relatedFields: ['documents.x'] } as ValidationFinding)
    ).toBeNull()
  })
})

describe('documents model — filtering', () => {
  const docs = [
    doc({
      id: '1',
      code: 'PASSPORT_CURRENT',
      category: 'passport',
      status: 'ready',
      required: true,
    }),
    doc({
      id: '2',
      code: 'EMPLOYMENT_LETTER',
      category: 'employment',
      status: 'not_started',
      required: true,
    }),
    doc({
      id: '3',
      code: 'CUSTOM-1',
      category: 'supporting',
      status: 'not_started',
      required: false,
    }),
  ]
  const labelOf = (d: Document) => d.code

  it('filters by search, status and requirement', () => {
    expect(
      filterDocuments(docs, { ...EMPTY_FILTERS, search: 'passport' }, labelOf)
    ).toHaveLength(1)
    expect(
      filterDocuments(
        docs,
        { ...EMPTY_FILTERS, status: 'not_started' },
        labelOf
      )
    ).toHaveLength(2)
    expect(
      filterDocuments(
        docs,
        { ...EMPTY_FILTERS, requirement: 'optional' },
        labelOf
      )
    ).toHaveLength(1)
  })
})

describe('template sync', () => {
  const template = {
    documentRequirements: [
      req({ code: 'A', required: true }),
      req({
        code: 'B',
        required: true,
        conditionalOn: {
          field: 'employment.employmentStatus',
          operator: 'equals',
          value: 'employed',
        },
      }),
      req({ code: 'C', required: false }),
    ],
  } as unknown as VisaTypeTemplate

  const application = { employment: undefined } as unknown as Application

  it('adds missing applicable requirements and flags — never deletes — the rest', () => {
    const docs = [doc({ id: 'a', code: 'A' }), doc({ id: 'b', code: 'B' })]
    const plan = planTemplateSync(docs, application, template)
    // C is applicable and missing → add; B is a template code no longer
    // applicable (not employed) → flagged, not deleted.
    expect(plan.toAdd.map((r) => r.code)).toEqual(['C'])
    expect(plan.noLongerApplicable.map((d) => d.id)).toEqual(['b'])
  })
})
