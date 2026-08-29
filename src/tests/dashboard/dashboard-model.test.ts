import { describe, it, expect } from 'vitest'
import {
  buildDashboardModel,
  buildDossierSnapshot,
  buildTimeline,
  dashboardFindingLink,
} from '@/features/dashboard/dashboard-model'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import {
  deriveNextActions,
  deriveReadinessState,
} from '@/features/readiness/readiness-model'
import type { ValidationFinding, ValidationResult } from '@/domain/rules/types'
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
    previousRefusals: [],
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

describe('canonical readiness (consumed by the dashboard)', () => {
  it('partitions the applicable required documents exactly', () => {
    const r = buildDocumentReadiness({ documents: MIXED_DOCS })
    expect(r.applicable).toBe(10)
    expect(r.ready).toBe(4)
    expect(r.needsUpdate).toBe(1)
    expect(r.obtained).toBe(1)
    expect(r.inProgress).toBe(1)
    expect(r.notStarted).toBe(3)
    expect(
      r.ready + r.obtained + r.inProgress + r.notStarted + r.needsUpdate
    ).toBe(r.applicable)
    // Unchanged from the old arithmetic — this fixture has no not_applicable.
    expect(r.percent).toBe(40)
  })

  it('excludes not_applicable from the denominator and ignores optional documents', () => {
    const r = buildDocumentReadiness({
      documents: [
        doc('A', 'not_applicable'),
        doc('B', 'ready'),
        doc('C', 'not_started', 'supporting', false), // optional — excluded
      ],
    })
    // The old model counted not_applicable as completed work; it now leaves
    // both sides, so one ready document out of one applicable is 100%.
    expect(r.applicable).toBe(1)
    expect(r.notApplicable).toBe(1)
    expect(r.requiredTotal).toBe(2)
    expect(r.ready).toBe(1)
    expect(r.optional).toBe(1)
    expect(r.percent).toBe(100)
  })

  it('reports 0% with no required documents', () => {
    expect(buildDocumentReadiness({ documents: [] }).percent).toBe(0)
  })
})

describe('deriveReadinessState', () => {
  it('is not_started with no required documents', () => {
    const b = buildDocumentReadiness({ documents: [] })
    expect(deriveReadinessState(b, [], 0, false)).toBe('not_started')
  })

  it('is ready_for_appointment when complete, error-free and scheduled', () => {
    const docs = [doc('A', 'ready'), doc('B', 'ready')]
    const b = buildDocumentReadiness({ documents: docs })
    expect(deriveReadinessState(b, docs, 0, true)).toBe('ready_for_appointment')
  })

  it('stays preparing when complete but no appointment is set', () => {
    const docs = [doc('A', 'ready')]
    const b = buildDocumentReadiness({ documents: docs })
    expect(deriveReadinessState(b, docs, 0, false)).toBe('preparing')
  })

  it('is waiting_reservations when only reservation documents are outstanding', () => {
    const docs = [
      doc('A', 'ready'),
      doc('TRANSPORT_RESERVATION', 'not_started', 'travel'),
      doc('ACCOMMODATION', 'not_started', 'accommodation'),
    ]
    const b = buildDocumentReadiness({ documents: docs })
    expect(deriveReadinessState(b, docs, 0, true)).toBe('waiting_reservations')
  })

  it('is documents_remaining when non-reservation documents are outstanding', () => {
    const b = buildDocumentReadiness({ documents: MIXED_DOCS })
    expect(deriveReadinessState(b, MIXED_DOCS, 0, true)).toBe(
      'documents_remaining'
    )
  })
})

describe('deriveNextActions', () => {
  it('orders actions by priority and carries counts and routes', () => {
    const buckets = buildDocumentReadiness({ documents: MIXED_DOCS })
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
      // Confirming a document you already hold ranks below obtaining one.
      'confirmDocuments',
      'reviewWarnings',
      'setAppointment',
      'addTrip',
    ])
    expect(actions[0]?.tone).toBe('danger')

    // `received` is no longer counted as missing — it is in hand, awaiting
    // confirmation, and gets its own action instead.
    const missing = actions.find((a) => a.id === 'completeMissingDocs')
    expect(missing?.count).toBe(4)
    expect(missing?.to).toBe('/documents')

    const confirm = actions.find((a) => a.id === 'confirmDocuments')
    expect(confirm?.count).toBe(1)
    expect(confirm?.to).toBe('/documents')
  })

  it('emits no actions when everything is complete and set', () => {
    const docs = [doc('A', 'ready')]
    const buckets = buildDocumentReadiness({ documents: docs })
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

describe('dashboardFindingLink', () => {
  const finding = (field: string): ValidationFinding =>
    ({ relatedFields: [field] }) as ValidationFinding

  it('links each locatable finding to the page that fixes it', () => {
    expect(dashboardFindingLink(finding('documents.d-1'))?.route).toBe(
      '/documents'
    )
    expect(dashboardFindingLink(finding('applicant.passport'))?.route).toBe(
      '/applicant'
    )
    expect(dashboardFindingLink(finding('trip.insurance'))?.route).toBe('/trip')
    expect(dashboardFindingLink(finding('appointment.date'))?.route).toBe(
      '/trip'
    )
    expect(
      dashboardFindingLink({
        relatedFields: [],
      } as unknown as ValidationFinding)
    ).toBeNull()
  })
})

describe('buildDossierSnapshot', () => {
  it('derives present-tense facts from current state', () => {
    const items = buildDossierSnapshot({
      applicant: applicant(),
      application: app({
        appointment: { date: '2027-03-15' },
        financing: { source: 'self', currency: 'EUR' },
      }),
      documents: MIXED_DOCS,
      sponsors: [],
    })
    const keys = items.map((i) => i.key)
    expect(keys).toContain('applicantOnFile')
    expect(keys).toContain('passportOnFile')
    expect(keys).toContain('appointmentScheduled')
    expect(keys).toContain('financingSet')

    const ready = items.find((i) => i.key === 'documentsReady')
    expect(ready?.count).toBe(4)
    expect(ready?.to).toBe('/documents')
  })

  it('is empty for a bare dossier — never fabricates activity', () => {
    expect(
      buildDossierSnapshot({
        applicant: null,
        application: null,
        documents: [],
        sponsors: [],
      })
    ).toEqual([])
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
    // The model describes the dossier that is open and nothing else. It used
    // to also expose a fake `applications: [active]` array; the real
    // multi-dossier axis lives in the workspace, not here (ADR-040).
    expect(Object.keys(model)).toEqual(['active'])
    expect(model.active.readiness).toBeDefined()
  })

  it('never aggregates across dossiers', () => {
    // A guard, not a formality: a "portfolio readiness" number would be a
    // comparison between applications, which VisaFlow does not make.
    const model = buildDashboardModel(
      {
        applicant: applicant(),
        application: app(),
        documents: MIXED_DOCS,
        sponsors: [],
      },
      NOW
    )
    const serialised = JSON.stringify(model)
    expect(serialised).not.toMatch(/dossierCount|totalDossiers|acrossDossiers/)
    expect(Object.keys(model)).toHaveLength(1)
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
    // 4 ready of 9 applicable. This fixture's applicant has no employment
    // status, so EMPLOYMENT_LETTER and PAYSLIPS do not apply to it — before
    // ADR-049 they were counted anyway, because readiness trusted the
    // `required: true` frozen into each record instead of asking the template
    // whether the requirement still applied.
    expect(populated.active.documents.percent).toBe(44)

    // Given-name greeting only; null (→ neutral) when there is no applicant.
    expect(populated.active.greetingName).toBe('Demo')
    expect(empty.active.greetingName).toBeNull()

    // One canonical figure backs both the ring and the documents breakdown.
    //
    // `inProgress` and `obtained` are zero because the only records carrying
    // those statuses were EMPLOYMENT_LETTER and PAYSLIPS, which do not apply to
    // an applicant with no employment status. They used to be counted from
    // their frozen `required` flags regardless (ADR-049).
    const d = populated.active.documents
    expect({
      applicable: d.applicable,
      ready: d.ready,
      needsUpdate: d.needsUpdate,
      inProgress: d.inProgress,
      obtained: d.obtained,
      notStarted: d.notStarted,
    }).toEqual({
      applicable: 9,
      ready: 4,
      needsUpdate: 1,
      inProgress: 0,
      obtained: 0,
      notStarted: 4,
    })
    expect(
      d.ready + d.needsUpdate + d.inProgress + d.obtained + d.notStarted
    ).toBe(d.applicable)
  })

  it('surfaces the nearest upcoming date as the next milestone', () => {
    const model = buildDashboardModel(
      {
        applicant: applicant(),
        application: app({ appointment: { date: '2027-03-15' } }),
        documents: [],
        sponsors: [],
      },
      NOW
    )
    expect(model.active.nextMilestone).not.toBeNull()
    expect(model.active.nextMilestone).toBe(model.active.upcomingTimeline[0])

    const empty = buildDashboardModel(
      { applicant: null, application: null, documents: [], sponsors: [] },
      NOW
    )
    expect(empty.active.nextMilestone).toBeNull()
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
