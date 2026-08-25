import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { DocumentCategory, DocumentStatus } from '@/domain/types/common'
import { resolveVisaTemplate } from '@/config/countries'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'

/**
 * Shared dossier fixtures for the readiness invariants.
 *
 * Every readiness surface (Dashboard, Documents, Timeline, Validation Center,
 * Final Review) is asserted against these same inputs, so a divergence between
 * two surfaces fails a test instead of shipping.
 *
 * Dates are deliberately far in the future: `trip.notInPast` reads the real
 * wall clock (`domain/rules/trip.rules.ts`), so a fixture dated "next year"
 * would silently start emitting findings once that year passed and would make
 * the suite fail on a calendar boundary rather than on a code change.
 */

/** Far enough out that the wall clock can never make these fixtures stale. */
const ENTRY_DATE = '2099-06-01'
const EXIT_DATE = '2099-06-10'
const APPOINTMENT_DATE = '2099-04-01'
/** After the entry date — trips the `trip.appointmentBeforeTrip` error on purpose. */
const LATE_APPOINTMENT_DATE = '2099-06-05'

export interface DossierFixture {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
}

const APPLICANT: Applicant = {
  id: 'fixture-applicant',
  firstName: 'Ada',
  lastName: 'Traveller',
  dateOfBirth: '1990-01-01',
  nationality: 'TR',
  passport: {
    number: 'FIXTURE-1',
    issueDate: '2020-01-01',
    // Comfortably beyond exit + 90 days, so `passport.validAfterTrip` is quiet.
    expiryDate: '2100-01-01',
    issuingCountry: 'TR',
    passportType: 'ordinary',
  },
  previousPassports: [],
  previousVisas: [],
  previousRefusals: [],
  travelHistory: [],
}

function application(over: Partial<Application> = {}): Application {
  return {
    applicationId: 'fixture-application',
    applicantId: 'fixture-applicant',
    destinationCountry: 'GR',
    visaType: 'short_stay_tourism',
    status: 'draft',
    createdAt: '2099-01-01T00:00:00.000Z',
    sponsorIds: [],
    documentIds: [],
    notes: [],
    appointment: { date: APPOINTMENT_DATE },
    trip: {
      entryDate: ENTRY_DATE,
      exitDate: EXIT_DATE,
      budgetCurrency: 'EUR',
    } as Application['trip'],
    financing: { source: 'self', currency: 'EUR' },
    ...over,
  }
}

interface DocSpec {
  code: string
  status: DocumentStatus
  category?: DocumentCategory
  required?: boolean
  notes?: string
}

function doc(spec: DocSpec, index: number): Document {
  return {
    id: `fixture-doc-${index}`,
    code: spec.code,
    category: spec.category ?? 'supporting',
    ownerType: 'applicant',
    ownerId: 'fixture-applicant',
    required: spec.required ?? true,
    status: spec.status,
    verified: false,
    ...(spec.notes ? { notes: spec.notes } : {}),
  }
}

function documents(specs: DocSpec[]): Document[] {
  return specs.map(doc)
}

/**
 * A justification note keeps `document.requiredNotSkipped` quiet, so the
 * not-applicable fixtures isolate readiness arithmetic from finding noise.
 */
const SKIP_NOTE = 'Not required for this applicant.'

/** Nothing entered at all — the first-run state. */
export const emptyDossier: DossierFixture = {
  applicant: null,
  application: null,
  documents: [],
  sponsors: [],
}

/** A realistic mid-preparation dossier: one of every meaningful status. */
export const partiallyPrepared: DossierFixture = {
  applicant: APPLICANT,
  application: application(),
  documents: documents([
    { code: 'APPLICATION_FORM', status: 'ready', category: 'application_form' },
    { code: 'PASSPORT_CURRENT', status: 'ready', category: 'passport' },
    { code: 'PHOTOS', status: 'received', category: 'identity' },
    { code: 'BANK_STATEMENTS', status: 'requested', category: 'financial' },
    { code: 'TRAVEL_INSURANCE', status: 'not_started', category: 'insurance' },
    {
      code: 'ACCOMMODATION',
      status: 'needs_update',
      category: 'accommodation',
    },
  ]),
  sponsors: [],
}

/**
 * Most documents are in hand but unconfirmed. Readiness must stay low while
 * nothing reads as "missing" — the case Iteration 19 rendered as amber alarm.
 */
const RECEIVED_APPLICATION = application()

export const receivedHeavy: DossierFixture = {
  applicant: APPLICANT,
  application: RECEIVED_APPLICATION,
  // Every applicable requirement has a record, so nothing is uncollected — the
  // only thing standing between this dossier and 100% is confirmation.
  documents: requiredRequirementCodes(
    resolveVisaTemplate(
      RECEIVED_APPLICATION.destinationCountry,
      RECEIVED_APPLICATION.visaType
    ),
    RECEIVED_APPLICATION
  ).map((code, index) =>
    doc({ code, status: index === 0 ? 'ready' : 'received' }, index)
  ),
  sponsors: [],
}

/**
 * Half the required work does not apply. The old models disagreed wildly here:
 * the Dashboard counted N/A as completed (inflating to 100%), the Validation
 * Center kept it in the denominator where it could never be satisfied.
 */
const NA_APPLICATION = application()

/** Every third requirement is disclaimed; the rest are confirmed ready. */
export const manyNotApplicable: DossierFixture = {
  applicant: APPLICANT,
  application: NA_APPLICATION,
  documents: requiredRequirementCodes(
    resolveVisaTemplate(
      NA_APPLICATION.destinationCountry,
      NA_APPLICATION.visaType
    ),
    NA_APPLICATION
  ).map((code, index) =>
    index % 3 === 0
      ? doc({ code, status: 'not_applicable', notes: SKIP_NOTE }, index)
      : doc({ code, status: 'ready' }, index)
  ),
  sponsors: [],
}

/**
 * Every applicable required document confirmed. Readiness must read 100%.
 *
 * Built from the country pack rather than hand-listed, because "complete" means
 * a record for every requirement the pack actually makes applicable — a
 * hand-picked subset would read 100% only if readiness ignored uncollected
 * requirements, which is exactly the bug this fixture guards against.
 */
const READY_APPLICATION = application()

export const allApplicableReady: DossierFixture = {
  applicant: APPLICANT,
  application: READY_APPLICATION,
  documents: [
    ...requiredRequirementCodes(
      resolveVisaTemplate(
        READY_APPLICATION.destinationCountry,
        READY_APPLICATION.visaType
      ),
      READY_APPLICATION
    ).map((code, index) => doc({ code, status: 'ready' }, index)),
    // One optional document, deliberately not started: it must never move the
    // percentage in either direction.
    doc(
      {
        code: 'OLD_VISAS',
        status: 'not_started',
        category: 'previous_travel',
        required: false,
      },
      900
    ),
  ],
  sponsors: [],
}

/**
 * Byte-identical documents to `allApplicableReady`, but the appointment falls
 * after the trip starts, so the engine raises a blocking finding. The pair
 * proves readiness and consistency health are independent: same documents →
 * same percentage, different findings.
 */
export const readyButWithFindings: DossierFixture = {
  applicant: APPLICANT,
  application: application({
    appointment: { date: LATE_APPOINTMENT_DATE },
  }),
  documents: allApplicableReady.documents,
  sponsors: [],
}

/** Named entries for `it.each` — the name shows up in test output. */
export const ALL_FIXTURE_ENTRIES: [string, DossierFixture][] = [
  ['emptyDossier', emptyDossier],
  ['partiallyPrepared', partiallyPrepared],
  ['receivedHeavy', receivedHeavy],
  ['manyNotApplicable', manyNotApplicable],
  ['allApplicableReady', allApplicableReady],
  ['readyButWithFindings', readyButWithFindings],
]

export const READINESS_FIXTURES: Record<string, DossierFixture> = {
  emptyDossier,
  partiallyPrepared,
  receivedHeavy,
  manyNotApplicable,
  allApplicableReady,
  readyButWithFindings,
}

/** The `Dossier` shape `runValidation` expects. Returns null when incomplete. */
export function toDossier(fixture: DossierFixture): Dossier | null {
  if (!fixture.applicant || !fixture.application) return null
  return {
    schemaVersion: '1.0.0',
    exportedAt: '2099-01-01T00:00:00.000Z',
    applicant: fixture.applicant,
    application: fixture.application,
    documents: fixture.documents,
    sponsors: fixture.sponsors,
  }
}
