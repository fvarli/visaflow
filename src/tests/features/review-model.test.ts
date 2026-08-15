import { describe, it, expect } from 'vitest'
import { buildFinalReviewModel } from '@/features/review/review-model'
import {
  buildDocumentBuckets,
  deriveNextActions,
  deriveReadinessState,
} from '@/features/dashboard/dashboard-model'
import { buildValidationModel } from '@/features/validation/validation-model'
import { runValidation } from '@/domain/rules/runner'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'

const NOW = new Date('2026-08-15T00:00:00.000Z')

const APPLICANT: Applicant = {
  id: 'a1',
  firstName: 'Ada',
  lastName: 'Traveller',
  dateOfBirth: '1990-01-01',
  nationality: 'TR',
  passport: {
    number: 'X1234567',
    issueDate: '2020-01-01',
    expiryDate: '2035-01-01',
    issuingCountry: 'TR',
    passportType: 'ordinary',
  },
  previousPassports: [],
  previousVisas: [],
  travelHistory: [],
}

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
  trip: {
    entryDate: '2026-09-01',
    exitDate: '2026-09-08',
    budgetCurrency: 'EUR',
  } as Application['trip'],
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

const DOCUMENTS: Document[] = [
  doc({ id: 'd1', code: 'BANK_STATEMENTS', status: 'ready' }),
  doc({
    id: 'd2',
    code: 'PASSPORT_CURRENT',
    category: 'passport',
    status: 'ready',
  }),
  doc({
    id: 'd3',
    code: 'TRAVEL_INSURANCE',
    category: 'insurance',
    status: 'not_started',
  }),
]

const input = (
  over: Partial<Parameters<typeof buildFinalReviewModel>[0]> = {}
) => ({
  applicant: APPLICANT,
  application: application(),
  documents: DOCUMENTS,
  sponsors: [],
  ...over,
})

/** The `Dossier` shape `runValidation` expects, for the reuse assertions. */
const dossierOf = (app: Application): Dossier => ({
  schemaVersion: '1.0.0',
  exportedAt: NOW.toISOString(),
  applicant: APPLICANT,
  application: app,
  documents: DOCUMENTS,
  sponsors: [],
})

describe('review-model', () => {
  describe('reuse — Final Review can never disagree with the rest of the app', () => {
    it('uses the Dashboard’s readiness, not a new score', () => {
      const app = application()
      const model = buildFinalReviewModel(input({ application: app }), NOW)
      const buckets = buildDocumentBuckets(DOCUMENTS)
      const validation = runValidation(dossierOf(app))

      expect(model.readiness.percent).toBe(buckets.completionPercent)
      expect(model.readiness.missingCount).toBe(buckets.missing)
      expect(model.readiness.state).toBe(
        deriveReadinessState(buckets, DOCUMENTS, validation.errorCount, false)
      )
    })

    it('highlights exactly the Dashboard’s first next action', () => {
      const app = application()
      const model = buildFinalReviewModel(input({ application: app }), NOW)
      const expected = deriveNextActions(
        buildDocumentBuckets(DOCUMENTS),
        runValidation(dossierOf(app)),
        app
      )[0]

      expect(model.primaryAction?.id).toBe(expected?.id)
      expect(model.primaryAction?.to).toBe(expected?.to)
      expect(model.primaryAction?.count).toBe(expected?.count)
    })

    it('reports exactly the Validation Center’s counts', () => {
      const state = input()
      const model = buildFinalReviewModel(state, NOW)
      const validation = buildValidationModel(state)

      expect(model.attention.attentionCount).toBe(
        validation.hero.attentionCount
      )
      expect(model.attention.noteCount).toBe(validation.hero.noteCount)
      expect(model.attention.items.length + model.attention.notes.length).toBe(
        validation.totals.findingCount
      )
      expect(model.looksGood).toEqual(validation.ready)
    })

    it('separates actionable findings from informational notes', () => {
      const model = buildFinalReviewModel(input(), NOW)
      expect(
        model.attention.items.every((i) => i.finding.severity !== 'info')
      ).toBe(true)
      expect(
        model.attention.notes.every((i) => i.finding.severity === 'info')
      ).toBe(true)
    })

    it('gives every actionable finding a destination where one exists', () => {
      const model = buildFinalReviewModel(input(), NOW)
      // Findings the Validation Center can route are routed here identically.
      const validation = buildValidationModel(input())
      const routed = new Map(
        validation.groups
          .flatMap((g) => g.findings)
          .map((f) => [f.finding.id, f.action?.route ?? null])
      )
      for (const item of model.attention.items) {
        expect(item.action?.route ?? null).toBe(routed.get(item.finding.id))
      }
    })
  })

  describe('empty and partial dossiers', () => {
    it('reports no data when the dossier is empty', () => {
      const model = buildFinalReviewModel(
        { applicant: null, application: null, documents: [], sponsors: [] },
        NOW
      )
      expect(model.hasData).toBe(false)
      expect(model.readiness.percent).toBe(0)
      expect(model.attention.items).toEqual([])
      expect(model.checklist.groups).toEqual([])
      expect(model.appointmentDate).toBeNull()
      expect(model.appointmentDaysUntil).toBeNull()
    })

    it('handles a dossier with no appointment without inventing one', () => {
      const model = buildFinalReviewModel(input(), NOW)
      expect(model.appointmentDate).toBeNull()
      expect(model.appointmentDaysUntil).toBeNull()
      expect(
        model.print.generatedSheets.find((s) => s.id === 'appointmentSummary')
          ?.state
      ).toBe('unavailable')
    })

    it('counts down to a scheduled appointment', () => {
      const model = buildFinalReviewModel(
        input({
          application: application({
            appointment: { date: '2026-08-20', location: 'Istanbul' },
          }),
        }),
        NOW
      )
      expect(model.appointmentDate).toBe('2026-08-20')
      expect(model.appointmentDaysUntil).toBe(5)
    })

    it('reports a past appointment as a negative countdown, not as absent', () => {
      const model = buildFinalReviewModel(
        input({
          application: application({ appointment: { date: '2026-08-10' } }),
        }),
        NOW
      )
      expect(model.appointmentDaysUntil).toBe(-5)
    })
  })

  describe('composition', () => {
    it('reuses the Timeline’s appointment-day readiness items', () => {
      const model = buildFinalReviewModel(input(), NOW)
      expect(model.appointmentDay.items.map((i) => i.id)).toEqual([
        'passport',
        'applicationForm',
        'confirmation',
        'requiredDocuments',
      ])
      expect(model.appointmentDay.total).toBe(4)
    })

    it('carries only the country pack’s own notes, never invented ones', () => {
      const model = buildFinalReviewModel(input(), NOW)
      expect(model.templateNoteKeys.length).toBeGreaterThan(0)
      expect(
        model.templateNoteKeys.every((k) => k.startsWith('visa-domain:'))
      ).toBe(true)

      const unknownPack = buildFinalReviewModel(
        input({
          application: application({ destinationCountry: 'ZZ' }),
        }),
        NOW
      )
      expect(unknownPack.templateNoteKeys).toEqual([])
    })

    it('builds the checklist and the print package from one derivation', () => {
      const model = buildFinalReviewModel(input(), NOW)
      const bundleTotal = model.print.physicalBundles.reduce(
        (acc, b) => acc + b.counts.total,
        0
      )
      expect(bundleTotal).toBe(model.checklist.counts.total)
    })

    it('adapts the checklist to sponsor-funded applications', () => {
      const selfFunded = buildFinalReviewModel(
        input({
          application: application({
            financing: { source: 'self', currency: 'EUR' },
          }),
        }),
        NOW
      )
      const sponsored = buildFinalReviewModel(
        input({
          application: application({
            financing: { source: 'sponsor', currency: 'EUR' },
          }),
        }),
        NOW
      )
      expect(selfFunded.checklist.groups.some((g) => g.id === 'sponsor')).toBe(
        false
      )
      expect(sponsored.checklist.groups.some((g) => g.id === 'sponsor')).toBe(
        true
      )
      expect(
        sponsored.print.physicalBundles.some((b) => b.id === 'sponsor')
      ).toBe(true)
    })

    it('reports a well-prepared dossier without ever claiming an outcome', () => {
      const allReady = DOCUMENTS.map((d) => ({
        ...d,
        status: 'ready' as const,
      }))
      const model = buildFinalReviewModel(
        input({
          documents: allReady,
          application: application({
            appointment: { date: '2026-08-20', location: 'Istanbul' },
          }),
        }),
        NOW
      )
      expect(model.readiness.percent).toBe(100)
      expect(model.checklist.counts.missing).toBeGreaterThanOrEqual(0)
      // Readiness is an organizational state from a closed set — never a verdict.
      expect([
        'not_started',
        'preparing',
        'waiting_reservations',
        'documents_remaining',
        'ready_for_appointment',
      ]).toContain(model.readiness.state)
    })
  })
})
