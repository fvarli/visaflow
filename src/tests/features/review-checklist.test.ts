import { describe, it, expect } from 'vitest'
import {
  buildSubmissionChecklist,
  checklistState,
  groupForCategory,
  SUBMISSION_GROUP_ORDER,
} from '@/features/review/review-checklist'
import { resolveVisaTemplate } from '@/config/countries'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { DocumentStatus } from '@/domain/types/common'

const TEMPLATE = resolveVisaTemplate('GR', 'short_stay_tourism')

const application = (over: Partial<Application> = {}): Application => ({
  applicationId: 'app1',
  applicantId: 'a1',
  destinationCountry: 'GR',
  visaType: 'short_stay_tourism',
  status: 'draft',
  createdAt: '2026-01-01T00:00:00.000Z',
  sponsorIds: [],
  documentIds: [],
  notes: [],
  ...over,
})

const doc = (
  over: Partial<Document> & Pick<Document, 'id' | 'code'>
): Document => ({
  category: 'financial',
  ownerType: 'applicant',
  ownerId: 'a1',
  required: true,
  status: 'not_started',
  verified: false,
  ...over,
})

describe('review-checklist', () => {
  describe('groupForCategory', () => {
    it('folds identity and passport into one submission group', () => {
      expect(groupForCategory('identity')).toBe('identity')
      expect(groupForCategory('passport')).toBe('identity')
    })

    it('folds the long tail into additional supporting documents', () => {
      expect(groupForCategory('civil_registry')).toBe('additional')
      expect(groupForCategory('previous_travel')).toBe('additional')
      expect(groupForCategory('supporting')).toBe('additional')
    })

    it('maps every domain category to a known submission group', () => {
      const categories = [
        'identity',
        'passport',
        'employment',
        'financial',
        'sponsor',
        'travel',
        'accommodation',
        'insurance',
        'application_form',
        'civil_registry',
        'previous_travel',
        'supporting',
      ] as const
      for (const category of categories) {
        expect(SUBMISSION_GROUP_ORDER).toContain(groupForCategory(category))
      }
    })
  })

  describe('checklistState', () => {
    it('treats ready as ready and not_applicable as not applicable', () => {
      expect(checklistState('ready', true)).toBe('ready')
      expect(checklistState('not_applicable', true)).toBe('notApplicable')
    })

    it('gives an obtained document its own calm state, not an alarm', () => {
      // `received` used to fold into `needsAttention`, which rendered amber for
      // a document the applicant already held (ADR-033).
      expect(checklistState('received', true)).toBe('obtained')
      expect(checklistState('received', false)).toBe('obtained')
    })

    it('treats a document needing correction as needing attention', () => {
      expect(checklistState('needs_update', true)).toBe('needsAttention')
    })

    it('separates missing from optional by the required flag', () => {
      const notInHand: DocumentStatus[] = ['not_started', 'requested']
      for (const status of notInHand) {
        expect(checklistState(status, true)).toBe('missing')
        expect(checklistState(status, false)).toBe('optional')
      }
      expect(checklistState('not_instantiated', true)).toBe('missing')
      expect(checklistState('not_instantiated', false)).toBe('optional')
    })
  })

  describe('buildSubmissionChecklist', () => {
    it('returns nothing for an empty dossier with no template', () => {
      const result = buildSubmissionChecklist([], null, undefined, null)
      expect(result.groups).toEqual([])
      expect(result.rows).toEqual([])
      expect(result.counts.total).toBe(0)
    })

    it('surfaces applicable requirements that have no document record yet', () => {
      const result = buildSubmissionChecklist([], application(), TEMPLATE, null)
      expect(result.rows.length).toBeGreaterThan(0)
      expect(result.rows.every((r) => r.status === 'not_instantiated')).toBe(
        true
      )
      expect(result.rows.every((r) => r.docId === null)).toBe(true)
      // A bare requirement links to its category, not to a document id.
      const passport = result.rows.find((r) => r.code === 'PASSPORT_CURRENT')
      expect(passport?.to).toBe('/documents?category=passport')
    })

    it('lets the dossier record win over the bare requirement', () => {
      const documents = [
        doc({
          id: 'd1',
          code: 'PASSPORT_CURRENT',
          category: 'passport',
          status: 'ready',
        }),
      ]
      const result = buildSubmissionChecklist(
        documents,
        application(),
        TEMPLATE,
        null
      )
      const rows = result.rows.filter((r) => r.code === 'PASSPORT_CURRENT')
      expect(rows).toHaveLength(1)
      expect(rows[0]?.status).toBe('ready')
      expect(rows[0]?.state).toBe('ready')
      expect(rows[0]?.to).toBe('/documents?doc=d1')
    })

    it('includes a custom document the applicant added themselves', () => {
      const documents = [
        doc({
          id: 'c1',
          code: 'CUSTOM-123',
          name: 'Cover letter',
          category: 'supporting',
          required: false,
          status: 'ready',
        }),
      ]
      const result = buildSubmissionChecklist(documents, null, undefined, null)
      const custom = result.rows.find((r) => r.code === 'CUSTOM-123')
      expect(custom).toBeDefined()
      expect(custom?.group).toBe('additional')
      expect(custom?.legacyName).toBe('Cover letter')
    })

    it('groups rows in the documented submission order', () => {
      const result = buildSubmissionChecklist([], application(), TEMPLATE, null)
      const ids = result.groups.map((g) => g.id)
      const expectedOrder = SUBMISSION_GROUP_ORDER.filter((id) =>
        ids.includes(id)
      )
      expect(ids).toEqual(expectedOrder)
    })

    it('flags a document that expires before the appointment', () => {
      const documents = [
        doc({
          id: 'ins',
          code: 'TRAVEL_INSURANCE',
          category: 'insurance',
          status: 'ready',
          validUntil: '2026-03-01',
        }),
      ]
      const expiring = buildSubmissionChecklist(
        documents,
        null,
        undefined,
        '2026-06-01'
      )
      expect(expiring.rows[0]?.expiresBeforeAppointment).toBe(true)

      const fine = buildSubmissionChecklist(
        documents,
        null,
        undefined,
        '2026-02-01'
      )
      expect(fine.rows[0]?.expiresBeforeAppointment).toBe(false)
    })

    it('never flags an expiry when there is no appointment to compare against', () => {
      const documents = [
        doc({ id: 'x', code: 'BANK_STATEMENTS', validUntil: '2020-01-01' }),
      ]
      const result = buildSubmissionChecklist(documents, null, undefined, null)
      expect(result.rows[0]?.expiresBeforeAppointment).toBe(false)
    })

    it('surfaces sponsor requirements only for sponsor-funded applications', () => {
      const selfFunded = buildSubmissionChecklist(
        [],
        application({ financing: { source: 'self', currency: 'EUR' } }),
        TEMPLATE,
        null
      )
      expect(selfFunded.groups.some((g) => g.id === 'sponsor')).toBe(false)

      const sponsored = buildSubmissionChecklist(
        [],
        application({ financing: { source: 'sponsor', currency: 'EUR' } }),
        TEMPLATE,
        null
      )
      expect(sponsored.groups.some((g) => g.id === 'sponsor')).toBe(true)
    })

    it('excludes not-applicable rows from the actionable count', () => {
      const documents = [
        doc({ id: 'a', code: 'A', status: 'ready' }),
        doc({ id: 'b', code: 'B', status: 'not_applicable' }),
        doc({ id: 'c', code: 'C', status: 'not_started' }),
      ]
      const result = buildSubmissionChecklist(documents, null, undefined, null)
      expect(result.counts.total).toBe(3)
      expect(result.counts.actionable).toBe(2)
      expect(result.counts.ready).toBe(1)
      expect(result.counts.missing).toBe(1)
      expect(result.counts.notApplicable).toBe(1)
    })

    it('keeps group counts consistent with the whole-checklist counts', () => {
      const documents = [
        doc({ id: 'a', code: 'A', category: 'passport', status: 'ready' }),
        doc({ id: 'b', code: 'B', category: 'financial', status: 'requested' }),
        doc({
          id: 'c',
          code: 'C',
          category: 'insurance',
          status: 'needs_update',
        }),
      ]
      const result = buildSubmissionChecklist(documents, null, undefined, null)
      const summed = result.groups.reduce((acc, g) => acc + g.counts.total, 0)
      expect(summed).toBe(result.counts.total)
    })
  })
})
