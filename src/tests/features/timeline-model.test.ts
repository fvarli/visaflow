import { describe, it, expect } from 'vitest'
import { buildTimelineModel } from '@/features/timeline/timeline-model'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { resolveVisaTemplate } from '@/config/countries'
import { deriveNextActions } from '@/features/readiness/readiness-model'
import { runValidation } from '@/domain/rules/runner'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'

const APPLICANT: Applicant = {
  id: 'a1',
  firstName: 'Ada',
  lastName: 'Traveller',
  dateOfBirth: '1990-01-01',
  nationality: 'TR',
  passport: {
    number: 'X1',
    issueDate: '2020-01-01',
    expiryDate: '2035-01-01',
    issuingCountry: 'TR',
    passportType: 'ordinary',
  },
  previousPassports: [],
  previousVisas: [],
  travelHistory: [],
}

const application = (appointment?: string): Application => ({
  applicationId: 'app1',
  applicantId: 'a1',
  destinationCountry: 'GR',
  visaType: 'short_stay_tourism',
  status: 'draft',
  createdAt: new Date().toISOString(),
  sponsorIds: [],
  documentIds: [],
  notes: [],
  ...(appointment ? { appointment: { date: appointment } } : {}),
})

const DOCUMENTS: Document[] = [
  {
    id: 'bank',
    code: 'BANK_STATEMENTS',
    category: 'financial',
    ownerType: 'applicant',
    ownerId: 'a1',
    required: true,
    status: 'not_started',
    verified: false,
  },
]

const now = new Date('2027-03-01')

describe('buildTimelineModel — Dashboard priority compatibility', () => {
  it('highlights exactly the Dashboard primary action', () => {
    const app = application('2027-03-15')
    const model = buildTimelineModel(
      {
        applicant: APPLICANT,
        application: app,
        documents: DOCUMENTS,
        sponsors: [],
      },
      now
    )
    const dossier: Dossier = {
      schemaVersion: '1.0.0',
      exportedAt: now.toISOString(),
      applicant: APPLICANT,
      application: app,
      documents: DOCUMENTS,
      sponsors: [],
    }
    const expected = deriveNextActions(
      buildDocumentReadiness({
        documents: DOCUMENTS,
        requiredRequirementCodes: requiredRequirementCodes(
          resolveVisaTemplate(app.destinationCountry, app.visaType),
          app
        ),
      }),
      runValidation(dossier),
      app
    )[0]
    expect(model.primaryAction).toEqual(expected)
    // Sanity: a missing required document surfaces as the top action.
    expect(model.primaryAction?.id).toBe('completeMissingDocs')
  })
})

describe('buildTimelineModel — states', () => {
  it('reports no data without an application', () => {
    const model = buildTimelineModel(
      { applicant: null, application: null, documents: [], sponsors: [] },
      now
    )
    expect(model.hasData).toBe(false)
    expect(model.hasAppointment).toBe(false)
  })

  it('has no dated targets without an appointment', () => {
    const model = buildTimelineModel(
      {
        applicant: APPLICANT,
        application: application(),
        documents: DOCUMENTS,
        sponsors: [],
      },
      now
    )
    expect(model.hasAppointment).toBe(false)
    expect(model.appointmentDaysUntil).toBeNull()
    expect(model.tasks.every((t) => t.targetDate === null)).toBe(true)
  })

  it('counts a past appointment as negative days remaining', () => {
    const model = buildTimelineModel(
      {
        applicant: APPLICANT,
        application: application('2027-02-01'),
        documents: DOCUMENTS,
        sponsors: [],
      },
      now
    )
    expect(model.appointmentDaysUntil).toBeLessThan(0)
  })

  it('builds a read-only appointment-day summary', () => {
    const model = buildTimelineModel(
      {
        applicant: APPLICANT,
        application: application('2027-03-15'),
        documents: DOCUMENTS,
        sponsors: [],
      },
      now
    )
    expect(model.appointmentDay.total).toBe(4)
    // Passport number present → the identity item is ready.
    expect(
      model.appointmentDay.items.find((i) => i.id === 'passport')?.ready
    ).toBe(true)
  })
})
