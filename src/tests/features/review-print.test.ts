import { describe, it, expect } from 'vitest'
import {
  buildPrintPackage,
  bundleForGroup,
  GENERATED_SHEET_ORDER,
  PHYSICAL_BUNDLE_ORDER,
} from '@/features/review/review-print'
import { buildSubmissionChecklist } from '@/features/review/review-checklist'
import { buildApplicationSummary } from '@/features/review/review-summary'
import { resolveVisaTemplate } from '@/config/countries'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'

const TEMPLATE = resolveVisaTemplate('GR', 'short_stay_tourism')

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
  previousRefusals: [],
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

function build(
  documents: Document[],
  app: Application | null,
  applicant: Applicant | null = APPLICANT,
  appointmentDate: string | null = null,
  /** Pass `false` to isolate the applicant's own documents from the country pack. */
  withTemplate = true
) {
  const checklist = buildSubmissionChecklist(
    documents,
    app,
    withTemplate ? TEMPLATE : undefined,
    appointmentDate
  )
  const summary = buildApplicationSummary(applicant, app, [])
  return {
    checklist,
    print: buildPrintPackage(
      summary,
      checklist,
      (app?.trip?.route?.length ?? 0) > 0
    ),
  }
}

describe('review-print', () => {
  describe('the generated / physical separation', () => {
    it('never lets an applicant document appear as a VisaFlow-generated sheet', () => {
      const documents = [
        doc({ id: 'bank1', code: 'BANK_STATEMENTS', status: 'ready' }),
        doc({
          id: 'pass1',
          code: 'PASSPORT_CURRENT',
          category: 'passport',
          status: 'ready',
        }),
        doc({
          id: 'own1',
          code: 'CUSTOM-secret',
          name: 'My private letter',
          category: 'supporting',
          required: false,
          status: 'ready',
        }),
      ]
      const { print } = build(documents, application())

      // Generated sheets are a fixed, closed set of VisaFlow's own pages.
      expect(print.generatedSheets.map((s) => s.id)).toEqual(
        GENERATED_SHEET_ORDER
      )

      // No applicant document code, id or title can reach the generated side.
      const serialized = JSON.stringify(print.generatedSheets)
      for (const needle of [
        'BANK_STATEMENTS',
        'PASSPORT_CURRENT',
        'CUSTOM-secret',
        'My private letter',
        'bank1',
        'pass1',
        'own1',
      ]) {
        expect(serialized).not.toContain(needle)
      }
    })

    it('accounts for the applicant’s own documents only in the physical plan', () => {
      const documents = [
        doc({ id: 'bank1', code: 'BANK_STATEMENTS', status: 'ready' }),
      ]
      const { print } = build(documents, null, APPLICANT, null, false)

      const bank = print.physicalBundles.find((b) => b.id === 'bankStatements')
      expect(bank).toBeDefined()
      expect(bank?.counts.ready).toBe(1)
      expect(bank?.state).toBe('ready')
    })

    it('maps every submission group onto a physical bundle', () => {
      const groups = [
        'identity',
        'application',
        'employment',
        'financial',
        'sponsor',
        'travel',
        'accommodation',
        'insurance',
        'additional',
      ] as const
      for (const group of groups) {
        expect(PHYSICAL_BUNDLE_ORDER).toContain(bundleForGroup(group))
      }
    })

    it('merges travel and accommodation into a single reservations bundle', () => {
      const documents = [
        doc({
          id: 't1',
          code: 'TRANSPORT_RESERVATION',
          category: 'travel',
          status: 'ready',
        }),
        doc({
          id: 'h1',
          code: 'ACCOMMODATION',
          category: 'accommodation',
          status: 'not_started',
        }),
      ]
      const { print } = build(documents, null, APPLICANT, null, false)
      const reservations = print.physicalBundles.find(
        (b) => b.id === 'reservations'
      )
      expect(reservations?.counts.total).toBe(2)
      expect(reservations?.counts.ready).toBe(1)
      expect(reservations?.state).toBe('partial')
    })

    it('sends sponsor evidence to the Sponsors workspace and the rest to Documents', () => {
      const documents = [
        doc({
          id: 's1',
          code: 'SPONSOR_LETTER',
          category: 'sponsor',
          ownerType: 'sponsor',
        }),
        doc({ id: 'b1', code: 'BANK_STATEMENTS' }),
      ]
      const { print } = build(documents, null, APPLICANT, null, false)
      expect(print.physicalBundles.find((b) => b.id === 'sponsor')?.to).toBe(
        '/sponsors'
      )
      expect(
        print.physicalBundles.find((b) => b.id === 'bankStatements')?.to
      ).toBe('/documents')
    })
  })

  describe('generated sheet availability', () => {
    it('marks everything unavailable for a bare dossier', () => {
      const { print } = build([], null, null, null, false)
      const byId = Object.fromEntries(
        print.generatedSheets.map((s) => [s.id, s.state])
      )
      expect(byId.coverSheet).toBe('unavailable')
      expect(byId.submissionChecklist).toBe('unavailable')
      expect(byId.appointmentSummary).toBe('unavailable')
      expect(byId.itinerarySummary).toBe('unavailable')
      expect(print.readySheetCount).toBe(0)
    })

    it('marks the cover sheet ready once applicant, destination and type exist', () => {
      const { print } = build([], application())
      expect(
        print.generatedSheets.find((s) => s.id === 'coverSheet')?.state
      ).toBe('ready')
    })

    it('marks the cover sheet partial when the applicant is missing', () => {
      const { print } = build([], application(), null)
      expect(
        print.generatedSheets.find((s) => s.id === 'coverSheet')?.state
      ).toBe('partial')
    })

    it('counts the checklist lines it would print', () => {
      const documents = [
        doc({ id: 'a', code: 'A', status: 'ready' }),
        doc({ id: 'b', code: 'B', status: 'not_applicable' }),
      ]
      const { print } = build(documents, null, APPLICANT, null, false)
      const sheet = print.generatedSheets.find(
        (s) => s.id === 'submissionChecklist'
      )
      expect(sheet?.state).toBe('ready')
      // not_applicable rows are not lines you would print.
      expect(sheet?.itemCount).toBe(1)
    })

    it('treats a date-only appointment as a partial summary', () => {
      const partial = build(
        [],
        application({ appointment: { date: '2026-08-20' } })
      )
      expect(
        partial.print.generatedSheets.find((s) => s.id === 'appointmentSummary')
          ?.state
      ).toBe('partial')

      const full = build(
        [],
        application({
          appointment: { date: '2026-08-20', location: 'Istanbul' },
        })
      )
      expect(
        full.print.generatedSheets.find((s) => s.id === 'appointmentSummary')
          ?.state
      ).toBe('ready')
    })

    it('treats an itinerary without a route as partial', () => {
      const trip = {
        entryDate: '2026-09-01',
        exitDate: '2026-09-08',
        budgetCurrency: 'EUR',
      } as Application['trip']

      const noRoute = build([], application({ trip }))
      expect(
        noRoute.print.generatedSheets.find((s) => s.id === 'itinerarySummary')
          ?.state
      ).toBe('partial')

      const withRoute = build(
        [],
        application({
          trip: {
            ...trip,
            route: [
              {
                city: 'Athens',
                country: 'GR',
                arrivalDate: '2026-09-01',
                departureDate: '2026-09-08',
                nights: 7,
              },
            ],
          } as Application['trip'],
        })
      )
      expect(
        withRoute.print.generatedSheets.find((s) => s.id === 'itinerarySummary')
          ?.state
      ).toBe('ready')
    })
  })

  describe('bundle readiness', () => {
    it('is notApplicable when every document in the bundle is not applicable', () => {
      const documents = [doc({ id: 'x', code: 'X', status: 'not_applicable' })]
      const { print } = build(documents, null, APPLICANT, null, false)
      expect(
        print.physicalBundles.find((b) => b.id === 'bankStatements')?.state
      ).toBe('notApplicable')
    })

    it('is missing when nothing in the bundle is ready yet', () => {
      const documents = [doc({ id: 'x', code: 'X', status: 'not_started' })]
      const { print } = build(documents, null, APPLICANT, null, false)
      expect(
        print.physicalBundles.find((b) => b.id === 'bankStatements')?.state
      ).toBe('missing')
      expect(print.readyBundleCount).toBe(0)
    })
  })
})
