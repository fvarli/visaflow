import { describe, it, expect } from 'vitest'
import {
  buildEmploymentDocuments,
  hrClipboardText,
} from '@/features/employment/employment-documents'
import { buildEmploymentModel } from '@/features/employment/employment-model'
import { resolveVisaTemplate } from '@/config/countries'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Employment } from '@/domain/schemas/employment.schema'

const template = resolveVisaTemplate('GR', 'short_stay_tourism')!

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

const doc = (partial: Partial<Document>): Document => ({
  id: 'd',
  code: 'X',
  category: 'employment',
  ownerType: 'applicant',
  ownerId: 'a1',
  required: true,
  status: 'not_started',
  verified: false,
  ...partial,
})

const application = (
  employment: Partial<Employment> | undefined,
  trip?: Application['trip']
): Application => ({
  applicationId: 'app1',
  applicantId: 'a1',
  destinationCountry: 'GR',
  visaType: 'short_stay_tourism',
  status: 'draft',
  createdAt: new Date().toISOString(),
  sponsorIds: [],
  documentIds: [],
  notes: [],
  ...(employment
    ? { employment: { currency: 'EUR', ...employment } as Employment }
    : {}),
  ...(trip ? { trip } : {}),
})

describe('buildEmploymentDocuments — employment-only, reused helpers', () => {
  const documents: Document[] = [
    doc({ id: '1', code: 'EMPLOYMENT_LETTER', status: 'ready' }),
    doc({ id: '2', code: 'PAYSLIPS', status: 'not_started' }),
    doc({ id: '3', code: 'BANK_STATEMENTS', category: 'financial' }),
  ]
  const app = application({ employmentStatus: 'employed' })
  const view = buildEmploymentDocuments(documents, app, template)

  it('surfaces applicable employment requirements with their dossier status', () => {
    const letter = view.rows.find((r) => r.code === 'EMPLOYMENT_LETTER')
    expect(letter?.status).toBe('ready')
    expect(letter?.docId).toBe('1')
    // A required requirement with no instance shows as not_instantiated.
    const leave = view.rows.find((r) => r.code === 'APPROVED_LEAVE')
    expect(leave?.status).toBe('not_instantiated')
    expect(leave?.docId).toBeNull()
    // The financial document is not part of the employment view.
    expect(view.rows.some((r) => r.code === 'BANK_STATEMENTS')).toBe(false)
  })

  it('lists only missing docs in the HR request (ready excluded)', () => {
    const codes = view.hrRequests.map((r) => r.code)
    expect(codes).not.toContain('EMPLOYMENT_LETTER') // ready → not requested
    expect(codes).toContain('PAYSLIPS') // not_started → requested
    expect(codes).toContain('APPROVED_LEAVE') // not_instantiated → requested
  })

  it('builds the HR clipboard text from names only, in the active locale', () => {
    const rows = view.hrRequests
    const en = hrClipboardText(rows, 'Ask HR:', (k) => `EN:${k}`)
    const tr = hrClipboardText(rows, 'İK:', (k) => `TR:${k}`)
    expect(en.startsWith('Ask HR:\n- ')).toBe(true)
    expect(tr.startsWith('İK:\n- ')).toBe(true)
    expect(en).toContain('EN:')
    expect(tr).toContain('TR:')
    // Never leaks any dossier value — only the resolved names.
    expect(en).not.toContain('Ada')
    expect(en.split('\n').length).toBe(rows.length + 1)
  })
})

describe('buildEmploymentModel — leave coverage + review states', () => {
  const trip = {
    entryDate: '2027-06-01',
    exitDate: '2027-06-10',
    firstEntryCountry: 'GR',
    mainDestinationCountry: 'GR',
    route: [],
    transportReservations: [],
    accommodationReservations: [],
    budgetCurrency: 'EUR',
  } as Application['trip']

  const build = (employment: Partial<Employment>, withTrip = true) =>
    buildEmploymentModel({
      applicant: APPLICANT,
      application: application(employment, withTrip ? trip : undefined),
      documents: [],
      sponsors: [],
    })

  it('is captured when approved leave covers the full trip', () => {
    const model = build({
      employmentStatus: 'employed',
      approvedLeaveStart: '2027-06-01',
      approvedLeaveEnd: '2027-06-10',
    })
    expect(model.leave.findings).toHaveLength(0)
    expect(model.review.find((s) => s.id === 'leave')?.status).toBe('captured')
  })

  it('needs review when leave ends before the trip returns', () => {
    const model = build({
      employmentStatus: 'employed',
      approvedLeaveStart: '2027-06-01',
      approvedLeaveEnd: '2027-06-08',
    })
    expect(model.leave.findings.map((f) => f.id)).toContain('leave-ends-early')
    expect(model.review.find((s) => s.id === 'leave')?.status).toBe(
      'needsReview'
    )
  })

  it('needs review when leave starts after the trip begins', () => {
    const model = build({
      employmentStatus: 'employed',
      approvedLeaveStart: '2027-06-03',
      approvedLeaveEnd: '2027-06-10',
    })
    expect(model.leave.findings.map((f) => f.id)).toContain('leave-starts-late')
  })

  it('exposes null trip dates when there is no trip', () => {
    const model = build({ employmentStatus: 'employed' }, false)
    expect(model.leave.tripEntry).toBeNull()
    expect(model.leave.findings).toHaveLength(0)
  })

  it('marks every employer section not-applicable for a non-employed status', () => {
    const model = build({ employmentStatus: 'retired' })
    expect(model.isActive).toBe(false)
    const byId = Object.fromEntries(model.review.map((s) => [s.id, s.status]))
    expect(byId.employer).toBe('notApplicable')
    expect(byId.income).toBe('notApplicable')
    expect(byId.leave).toBe('notApplicable')
    expect(byId.documents).toBe('notApplicable')
  })
})
