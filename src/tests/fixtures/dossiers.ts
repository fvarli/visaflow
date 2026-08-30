import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { DocumentCategory, DocumentStatus } from '@/domain/types/common'
import { resolveVisaTemplate } from '@/config/countries'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import type { DocumentReadiness } from '@/features/readiness/readiness-types'

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
  /** Which requirement revision this `ready` claim is made against (ADR-051). */
  satisfiedRevision?: number
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
    ...(spec.satisfiedRevision !== undefined
      ? { satisfiedRevision: spec.satisfiedRevision }
      : {}),
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
    // Carries a completion stamp against the current definition, so every
    // fixture-wide `toEqual(payload)` assertion — notably the workspace
    // repository round-trips — becomes a real guard that `satisfiedRevision`
    // survives storage, which nothing else covered (ADR-051).
    {
      code: 'PASSPORT_CURRENT',
      status: 'ready',
      category: 'passport',
      satisfiedRevision: 2,
    },
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
        code: 'PREVIOUS_VISAS',
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

/**
 * `allApplicableReady`, plus records for three requirements the pack has since
 * withdrawn — each `required: true` and `ready`, exactly as a dossier written
 * before template 1.2.0 would hold them.
 *
 * Its whole purpose is that it must read **identically** to
 * `allApplicableReady` on every surface. Retired obligations used to enter both
 * sides of the fraction, so this dossier would have reported a different
 * percentage from the one it is a copy of (ADR-050).
 */
export const withRetiredHistory: DossierFixture = {
  applicant: APPLICANT,
  application: READY_APPLICATION,
  documents: [
    ...allApplicableReady.documents,
    doc({ code: 'TAX_RETURNS', status: 'ready', category: 'financial' }, 910),
    doc(
      { code: 'PENSION_STATEMENT', status: 'ready', category: 'financial' },
      911
    ),
    // Deliberately not ready: an uncollected withdrawn requirement must not
    // make completion unreachable either.
    doc(
      {
        code: 'BUSINESS_LICENSE',
        status: 'not_started',
        category: 'employment',
      },
      912
    ),
  ],
  sponsors: [],
}

/**
 * `allApplicableReady`, plus one record of every kind that is **not** current
 * work — a withdrawn requirement, a code this build does not recognise, a
 * document the applicant added themselves, and a requirement left behind by an
 * applicability change.
 *
 * Like `withRetiredHistory`, its whole purpose is to read **identically** to
 * the dossier it copies. `withRetiredHistory` proves that for the one case the
 * registry can decide without a template; this one covers the three that need
 * the template, and therefore only holds on surfaces that actually resolve it
 * (ADR-051). Five such surfaces did not, and each was reporting a number the
 * canonical percentage beside it contradicted.
 *
 * `SOCIAL_SECURITY` is the applicability leftover: it is conditional on being
 * employed, and this application states no employment, so the record is a
 * genuine remnant rather than an invented one.
 */
export const withNonCurrentRecords: DossierFixture = {
  applicant: APPLICANT,
  application: READY_APPLICATION,
  documents: [
    ...allApplicableReady.documents,
    doc({ code: 'TAX_RETURNS', status: 'ready', category: 'financial' }, 920),
    doc({ code: 'NOT_A_REAL_CODE', status: 'ready' }, 921),
    doc({ code: 'CUSTOM-notarised-letter', status: 'ready' }, 922),
    doc(
      {
        code: 'SOCIAL_SECURITY',
        status: 'not_started',
        category: 'employment',
      },
      923
    ),
  ],
  sponsors: [],
}

/**
 * `allApplicableReady`, except that one claim was made against an older, laxer
 * definition of the requirement.
 *
 * `PASSPORT_CURRENT` sits at revision 2 (Article 12(c), the 10-year issue
 * rule); this claim is stamped against revision 1, so it is **superseded**: the
 * applicant confirmed a passport against a shorter list of criteria than the
 * pack now states (ADR-051).
 *
 * The dossier is otherwise complete, which is the point. Everything must agree
 * that exactly one item is outstanding — the ring, the caption, the checklist
 * and the next-document recommendation. A surface that reads this dossier as
 * finished is contradicting the one beside it.
 */
export const withSupersededClaim: DossierFixture = {
  applicant: APPLICANT,
  application: READY_APPLICATION,
  documents: allApplicableReady.documents.map((d) =>
    d.code === 'PASSPORT_CURRENT' ? { ...d, satisfiedRevision: 1 } : d
  ),
  sponsors: [],
}

/**
 * Readiness composed the way every canonical surface composes it.
 *
 * Deliberately an independent statement rather than a call into a page model —
 * its job is to disagree when a surface drifts. It lives here because two test
 * files had each grown their own copy and both had drifted the same way,
 * omitting the template and so agreeing with the surfaces only for fixtures
 * that contained nothing the template could disqualify (ADR-051).
 */
export function canonicalReadiness(fixture: DossierFixture): DocumentReadiness {
  const template = resolveVisaTemplate(
    fixture.application?.destinationCountry,
    fixture.application?.visaType
  )
  return buildDocumentReadiness({
    documents: fixture.documents,
    requiredRequirementCodes: requiredRequirementCodes(
      template,
      fixture.application
    ),
    template,
    application: fixture.application,
  })
}

/** Named entries for `it.each` — the name shows up in test output. */
export const ALL_FIXTURE_ENTRIES: [string, DossierFixture][] = [
  ['emptyDossier', emptyDossier],
  ['partiallyPrepared', partiallyPrepared],
  ['receivedHeavy', receivedHeavy],
  ['manyNotApplicable', manyNotApplicable],
  ['allApplicableReady', allApplicableReady],
  ['readyButWithFindings', readyButWithFindings],
  ['withRetiredHistory', withRetiredHistory],
  ['withNonCurrentRecords', withNonCurrentRecords],
  ['withSupersededClaim', withSupersededClaim],
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
