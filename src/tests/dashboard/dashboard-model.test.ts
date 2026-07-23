import { describe, it, expect } from 'vitest'
import {
  buildDashboardModel,
  buildDocumentBuckets,
  buildTimeline,
  deriveNextActions,
  deriveReadinessState,
} from '@/features/dashboard/dashboard-model'
import type { ValidationResult } from '@/domain/rules/types'
import type { Application } from '@/domain/schemas/application.schema'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { DocumentCategory, DocumentStatus } from '@/domain/types/common'

/**
 * The adapter is pure — no React, no i18n — so these tests exercise the
 * readiness definition, next-action derivation and timeline logic directly,
 * with deterministic inputs.
 */

function doc(
  code: string,
  status: DocumentStatus,
  category: DocumentCategory = 'supporting',
  required = true
): Document {
  return {
    id: `d-${code}`,
    code,
    category,
    ownerType: 'applicant',
    ownerId: 'a',
    required,
    status,
    verified: status === 'ready',
  }
}

function app(over: Partial<Application> = {}): Application {
  return {
    applicationId: 'app',
    applicantId: 'a',
    destinationCountry: 'GR',
    visaType: 'short_stay_tourism',
    status: 'preparing',
    createdAt: '2027-01-01T00:00:00.000Z',
    sponsorIds: [],
    documentIds: [],
    notes: [],
    ...over,
  }
}

function applicant(): Applicant {
  return {
    id: 'a',
    firstName: 'Demo',
    lastName: 'User',
    dateOfBirth: '1990-01-01',
    nationality: 'TR',
    passport: {
      number: 'X0000000',
      issueDate: '2022-01-01',
      expiryDate: '2032-01-01',
      issuingCountry: 'TR',
      passportType: 'ordinary',
    },
    previousPassports: [],
    previousVisas: [],
    travelHistory: [],
  }
}

const NOW = new Date('2027-01-01T00:00:00.000Z')

const emptyValidation: ValidationResult = {
  findings: [],
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  passedRules: 0,
  totalRules: 0,
}

const MIXED_DOCS: Document[] = [
  doc('APPLICATION_FORM', 'ready', 'application_form'),
  doc('PASSPORT_CURRENT', 'ready', 'passport'),
  doc('PHOTOS', 'ready', 'identity'),
  doc('ID_CARD_COPY', 'ready', 'identity'),
  doc('BANK_STATEMENTS', 'needs_update', 'financial'),
  doc('EMPLOYMENT_LETTER', 'requested', 'employment'),
  doc('PAYSLIPS', 'received', 'employment'),
  doc('TRAVEL_INSURANCE', 'not_started', 'insurance'),
  doc('TRANSPORT_RESERVATION', 'not_started', 'travel'),
  doc('ACCOMMODATION', 'not_started', 'accommodation'),
]

describe('buildDocumentBuckets', () => {
  it('partitions required documents so ready + missing + needsUpdate = total', () => {
    const b = buildDocumentBuckets(MIXED_DOCS)
    expect(b.total).toBe(10)
    expect(b.ready).toBe(4)
    expect(b.needsUpdate).toBe(1)
    expect(b.missing).toBe(5)
    expect(b.ready + b.missing + b.needsUpdate).toBe(b.total)
    expect(b.completionPercent).toBe(40)
  })

  it('counts not_applicable as ready and ignores optional documents', () => {
    const b = buildDocumentBuckets([
      doc('A', 'not_applicable'),
      doc('B', 'ready'),
      doc('C', 'not_started', 'supporting', false), // optional — excluded
    ])
    expect(b.total).toBe(2)
    expect(b.ready).toBe(2)
    expect(b.completionPercent).toBe(100)
  })

  it('reports 0% completion with no required documents', () => {
    expect(buildDocumentBuckets([]).completionPercent).toBe(0)
  })
})

describe('deriveReadinessState', () => {
  it('is not_started with no required documents', () => {
    const b = buildDocumentBuckets([])
    expect(deriveReadinessState(b, [], 0, false)).toBe('not_started')
  })

  it('is ready_for_appointment when complete, error-free and scheduled', () => {
    const docs = [doc('A', 'ready'), doc('B', 'ready')]
    const b = buildDocumentBuckets(docs)
    expect(deriveReadinessState(b, docs, 0, true)).toBe('ready_for_appointment')
  })

  it('stays preparing when complete but no appointment is set', () => {
    const docs = [doc('A', 'ready')]
    const b = buildDocumentBuckets(docs)
    expect(deriveReadinessState(b, docs, 0, false)).toBe('preparing')
  })

  it('is waiting_reservations when only reservation documents are outstanding', () => {
    const docs = [
      doc('A', 'ready'),
      doc('TRANSPORT_RESERVATION', 'not_started', 'travel'),
      doc('ACCOMMODATION', 'not_started', 'accommodation'),
    ]
    const b = buildDocumentBuckets(docs)
    expect(deriveReadinessState(b, docs, 0, true)).toBe('waiting_reservations')
  })

  it('is documents_remaining when non-reservation documents are outstanding', () => {
    const b = buildDocumentBuckets(MIXED_DOCS)
    expect(deriveReadinessState(b, MIXED_DOCS, 0, true)).toBe(
      'documents_remaining'
    )
  })
})

describe('deriveNextActions', () => {
  it('orders actions by priority and carries counts and routes', () => {
    const buckets = buildDocumentBuckets(MIXED_DOCS)
    const validation: ValidationResult = {
      ...emptyValidation,
      errorCount: 2,
      warningCount: 1,
      totalRules: 5,
    }
    const actions = deriveNextActions(
      buckets,
      validation,
      app({ appointment: undefined, trip: undefined })
    )

    expect(actions.map((a) => a.id)).toEqual([
      'resolveErrors',
      'completeMissingDocs',
      'updateDocuments',
      'reviewWarnings',
      'setAppointment',
      'addTrip',
    ])
    expect(actions[0]?.tone).toBe('danger')

    const missing = actions.find((a) => a.id === 'completeMissingDocs')
    expect(missing?.count).toBe(5)
    expect(missing?.to).toBe('/documents')
  })

  it('emits no actions when everything is complete and set', () => {
    const docs = [doc('A', 'ready')]
    const buckets = buildDocumentBuckets(docs)
    const actions = deriveNextActions(
      buckets,
      emptyValidation,
      app({ appointment: { date: '2027-03-15' }, trip: undefined })
    )
    // Only the missing "trip" gap remains.
    expect(actions.map((a) => a.id)).toEqual(['addTrip'])
  })
})

describe('buildTimeline', () => {
  const application = app({
    appointment: { date: '2027-03-15' },
    trip: {
      entryDate: '2027-05-01',
      exitDate: '2027-05-10',
      firstEntryCountry: 'GR',
      mainDestinationCountry: 'GR',
      route: [],
      transportReservations: [],
      accommodationReservations: [],
      budgetCurrency: 'EUR',
    },
  })
  const docs = [
    // Within the 120-day horizon → included.
    { ...doc('SOON', 'ready'), validUntil: '2027-02-01' },
    // Far in the future → excluded.
    { ...doc('LATER', 'ready'), validUntil: '2028-01-01' },
  ]

  it('returns items sorted ascending by date', () => {
    const items = buildTimeline(application, docs, NOW)
    const dates = items.map((i) => i.date)
    expect([...dates].sort()).toEqual(dates)
  })

  it('includes appointment, trip and near-term expiry events', () => {
    const types = buildTimeline(application, docs, NOW).map((i) => i.type)
    expect(types).toContain('appointment')
    expect(types).toContain('trip_entry')
    expect(types).toContain('trip_exit')
    expect(types).toContain('document_expiry')
  })

  it('excludes expiries beyond the horizon', () => {
    const codes = buildTimeline(application, docs, NOW)
      .filter((i) => i.type === 'document_expiry')
      .map((i) => i.documentCode)
    expect(codes).toContain('SOON')
    expect(codes).not.toContain('LATER')
  })

  it('returns nothing without an application', () => {
    expect(buildTimeline(null, docs, NOW)).toEqual([])
  })
})

describe('buildDashboardModel', () => {
  it('wraps exactly one application today, with active pointing at it', () => {
    const model = buildDashboardModel(
      {
        applicant: applicant(),
        application: app(),
        documents: MIXED_DOCS,
        sponsors: [],
      },
      NOW
    )
    expect(model.applications).toHaveLength(1)
    expect(model.active).toBe(model.applications[0])
  })

  it('runs validation only when applicant and application exist', () => {
    const empty = buildDashboardModel(
      { applicant: null, application: null, documents: [], sponsors: [] },
      NOW
    )
    expect(empty.active.hasData).toBe(false)
    expect(empty.active.validation.totalRules).toBe(0)
    expect(empty.active.readiness.state).toBe('not_started')

    const populated = buildDashboardModel(
      {
        applicant: applicant(),
        application: app(),
        documents: MIXED_DOCS,
        sponsors: [],
      },
      NOW
    )
    expect(populated.active.validation.totalRules).toBeGreaterThan(0)
    expect(populated.active.documents.completionPercent).toBe(40)
  })

  it('caps the upcoming timeline and excludes past events', () => {
    const model = buildDashboardModel(
      {
        applicant: applicant(),
        application: app({
          appointment: { date: '2027-03-15' },
          trip: {
            entryDate: '2027-05-01',
            exitDate: '2027-05-10',
            firstEntryCountry: 'GR',
            mainDestinationCountry: 'GR',
            route: [],
            transportReservations: [],
            accommodationReservations: [],
            budgetCurrency: 'EUR',
          },
        }),
        documents: [],
        sponsors: [],
      },
      NOW
    )
    expect(model.active.upcomingTimeline.length).toBeLessThanOrEqual(5)
    expect(
      model.active.upcomingTimeline.every((i) => i.status !== 'past')
    ).toBe(true)
  })
})
