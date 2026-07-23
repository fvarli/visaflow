import { differenceInCalendarDays, parseISO, subDays } from 'date-fns'
import { useMemo } from 'react'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type {
  DocumentCategory,
  DocumentStatus,
  FinancingSource,
  VisaType,
} from '@/domain/types/common'
import { runValidation } from '@/domain/rules/runner'
import type { ValidationResult } from '@/domain/rules/types'
import { resolveVisaTemplate, getSourcesForRefs } from '@/config/countries'
import type { RequirementSource, ReviewStatus } from '@/config/types'
import type { StatusTone } from '@/components/ui/status-badge'
import { useDossier } from '@/app/providers/DossierProvider'

/**
 * The Dashboard's presentation model.
 *
 * This is the one place dashboard-facing data is *derived*, so the page and its
 * widgets stay pure presentation. It re-encodes no business rule: validation
 * comes from `runValidation`, requirement/source resolution from
 * `resolveVisaTemplate`, and applicability lives in the config layer. What it
 * adds is a single, documented definition of readiness and a small set of
 * derived view descriptors.
 *
 * It is deliberately i18n- and Intl-free (returns raw numbers, ISO dates, and
 * stable keys) so it can be unit-tested without any React provider, and so
 * nothing locale-formatted can leak into it.
 *
 * IMPORTANT: readiness here is an *organizational* signal — how much of the
 * dossier is assembled — never a prediction about whether a visa will be
 * granted (ADR-016).
 */

/** The slice of dossier state the model reads. `DossierState` is a superset. */
export interface DashboardInput {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
}

/**
 * Organizational readiness state. Presentation maps each to a phrase; none of
 * them describes an application's chances.
 */
export type ReadinessState =
  | 'not_started'
  | 'preparing'
  | 'waiting_reservations'
  | 'documents_remaining'
  | 'ready_for_appointment'

/**
 * Required-document buckets, partitioned so ready + missing + needsUpdate sums
 * to total. "missing" = required documents that are neither ready nor flagged
 * for update (i.e. not_started / requested / received). This is the single
 * definition of readiness for the dashboard.
 */
export interface DocumentBuckets {
  total: number
  ready: number
  missing: number
  needsUpdate: number
  completionPercent: number
}

export type ActionKind =
  | 'resolveErrors'
  | 'completeMissingDocs'
  | 'updateDocuments'
  | 'reviewWarnings'
  | 'setAppointment'
  | 'addTrip'

export interface ActionDescriptor {
  id: ActionKind
  tone: StatusTone
  /** Present when the label is quantified (e.g. "Complete 3 documents"). */
  count?: number
  /** Route the action links to. */
  to: string
}

export type TimelineItemType =
  'appointment' | 'milestone' | 'trip_entry' | 'trip_exit' | 'document_expiry'

export interface TimelineItemModel {
  id: string
  type: TimelineItemType
  /** ISO date. */
  date: string
  status: 'past' | 'today' | 'upcoming'
  /** Translation key, for milestones. */
  nameKey?: string
  /** Document code, for expiries — the label is resolved at the UI boundary. */
  documentCode?: string
}

export interface TripSummaryModel {
  entryDate: string | null
  exitDate: string | null
  entryCity?: string
  exitCity?: string
  destinationCountry?: string
  budget: { amount: number; currency: string } | null
  hasInsurance: boolean
}

export interface FinancingSummaryModel {
  source: FinancingSource
  currency: string
  selfFundedAmount?: number
  sponsoredAmount?: number
  accountBalance?: number
}

export interface CountdownModel {
  date: string | null
  daysUntil: number | null
}

/** The per-application view model — the unit a future multi-application phase repeats. */
export interface ApplicationDashboardModel {
  hasData: boolean
  countryCode?: string
  visaType?: VisaType
  documents: DocumentBuckets
  readiness: {
    percent: number
    state: ReadinessState
    /** Outstanding required-document count, for the "N remaining" phrasing. */
    missingCount: number
  }
  appointment: CountdownModel
  trip: (CountdownModel & TripSummaryModel) | null
  validation: ValidationResult
  nextActions: ActionDescriptor[]
  timeline: TimelineItemModel[]
  /** Today + future items only, capped for the dashboard overview. */
  upcomingTimeline: TimelineItemModel[]
  sponsorCount: number
  financing: FinancingSummaryModel | null
  reviewStatus?: ReviewStatus
  sources: RequirementSource[]
}

/**
 * Top-level model. Wraps a list of per-application models so a future phase can
 * hold several applications without reshaping any widget prop. The MVP always
 * has exactly one; `active` is the one the dashboard renders. No multi-app UI,
 * selection, or storage is built here — this is shape only.
 */
export interface DashboardModel {
  applications: ApplicationDashboardModel[]
  active: ApplicationDashboardModel
}

const READY_STATUSES: DocumentStatus[] = ['ready', 'not_applicable']
const RESERVATION_CATEGORIES: DocumentCategory[] = [
  'travel',
  'accommodation',
  'insurance',
]
/** How far ahead a document expiry is worth surfacing on the dashboard. */
const EXPIRY_HORIZON_DAYS = 120
const MAX_UPCOMING = 5

const EMPTY_VALIDATION: ValidationResult = {
  findings: [],
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  passedRules: 0,
  totalRules: 0,
}

function dayStatus(iso: string, now: Date): TimelineItemModel['status'] {
  const diff = differenceInCalendarDays(parseISO(iso), now)
  if (diff < 0) return 'past'
  if (diff === 0) return 'today'
  return 'upcoming'
}

function daysUntil(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null
  return differenceInCalendarDays(parseISO(iso), now)
}

export function buildDocumentBuckets(documents: Document[]): DocumentBuckets {
  const required = documents.filter((d) => d.required)
  const ready = required.filter((d) => READY_STATUSES.includes(d.status)).length
  const needsUpdate = required.filter((d) => d.status === 'needs_update').length
  const missing = required.length - ready - needsUpdate
  const total = required.length
  const completionPercent = total > 0 ? Math.round((ready / total) * 100) : 0
  return { total, ready, missing, needsUpdate, completionPercent }
}

/**
 * Derive the organizational readiness state. Deterministic, and never a
 * probability — it only describes how assembled the dossier is.
 */
export function deriveReadinessState(
  buckets: DocumentBuckets,
  documents: Document[],
  errorCount: number,
  hasAppointment: boolean
): ReadinessState {
  if (buckets.total === 0) return 'not_started'
  if (buckets.completionPercent === 100 && errorCount === 0) {
    return hasAppointment ? 'ready_for_appointment' : 'preparing'
  }
  if (buckets.missing > 0) {
    const outstanding = documents.filter(
      (d) =>
        d.required &&
        !READY_STATUSES.includes(d.status) &&
        d.status !== 'needs_update'
    )
    const allReservations =
      outstanding.length > 0 &&
      outstanding.every((d) => RESERVATION_CATEGORIES.includes(d.category))
    return allReservations ? 'waiting_reservations' : 'documents_remaining'
  }
  return 'preparing'
}

/**
 * Prioritized next actions, derived from already-computed outputs — no rule
 * threshold is re-implemented here. Order encodes priority: blocking errors
 * first, then throughput (missing docs), then updates/warnings, then structural
 * gaps.
 */
export function deriveNextActions(
  buckets: DocumentBuckets,
  validation: ValidationResult,
  application: Application | null
): ActionDescriptor[] {
  const actions: ActionDescriptor[] = []

  if (validation.errorCount > 0) {
    actions.push({
      id: 'resolveErrors',
      tone: 'danger',
      count: validation.errorCount,
      to: '/consistency-checks',
    })
  }
  if (buckets.missing > 0) {
    actions.push({
      id: 'completeMissingDocs',
      tone: 'accent',
      count: buckets.missing,
      to: '/documents',
    })
  }
  if (buckets.needsUpdate > 0) {
    actions.push({
      id: 'updateDocuments',
      tone: 'warning',
      count: buckets.needsUpdate,
      to: '/documents',
    })
  }
  if (validation.warningCount > 0) {
    actions.push({
      id: 'reviewWarnings',
      tone: 'warning',
      count: validation.warningCount,
      to: '/consistency-checks',
    })
  }
  if (!application?.appointment) {
    actions.push({ id: 'setAppointment', tone: 'neutral', to: '/trip' })
  }
  if (!application?.trip) {
    actions.push({ id: 'addTrip', tone: 'neutral', to: '/trip' })
  }

  return actions
}

export function buildTimeline(
  application: Application | null,
  documents: Document[],
  now: Date
): TimelineItemModel[] {
  const items: TimelineItemModel[] = []
  if (!application) return items

  const appointmentDate = application.appointment?.date ?? null

  if (appointmentDate) {
    items.push({
      id: 'appointment',
      type: 'appointment',
      date: appointmentDate,
      status: dayStatus(appointmentDate, now),
    })

    // Preparation milestones are dated relative to the appointment — the same
    // derivation the Timeline page uses. Resolved from the template, not stored.
    const template = resolveVisaTemplate(
      application.destinationCountry,
      application.visaType
    )
    for (const milestone of template?.preparationMilestones ?? []) {
      const date = subDays(
        parseISO(appointmentDate),
        milestone.daysBeforeAppointment
      )
        .toISOString()
        .slice(0, 10)
      items.push({
        id: `milestone-${milestone.id}`,
        type: 'milestone',
        date,
        status: dayStatus(date, now),
        nameKey: milestone.nameKey,
      })
    }
  }

  if (application.trip?.entryDate) {
    items.push({
      id: 'trip-entry',
      type: 'trip_entry',
      date: application.trip.entryDate,
      status: dayStatus(application.trip.entryDate, now),
    })
  }
  if (application.trip?.exitDate) {
    items.push({
      id: 'trip-exit',
      type: 'trip_exit',
      date: application.trip.exitDate,
      status: dayStatus(application.trip.exitDate, now),
    })
  }

  for (const doc of documents) {
    if (!doc.validUntil || doc.status === 'not_applicable') continue
    const diff = differenceInCalendarDays(parseISO(doc.validUntil), now)
    if (diff < 0 || diff > EXPIRY_HORIZON_DAYS) continue
    items.push({
      id: `expiry-${doc.id}`,
      type: 'document_expiry',
      date: doc.validUntil,
      status: dayStatus(doc.validUntil, now),
      documentCode: doc.code,
    })
  }

  return items.sort((a, b) => a.date.localeCompare(b.date))
}

/** The Dossier shape `runValidation` expects, assembled from live state. */
function toDossier(
  applicant: Applicant,
  application: Application,
  documents: Document[],
  sponsors: Sponsor[]
): Dossier {
  return {
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    applicant,
    application,
    documents,
    sponsors,
  }
}

function buildTripSummary(
  application: Application | null,
  now: Date
): (CountdownModel & TripSummaryModel) | null {
  const trip = application?.trip
  if (!trip) return null
  return {
    date: trip.entryDate ?? null,
    daysUntil: daysUntil(trip.entryDate, now),
    entryDate: trip.entryDate ?? null,
    exitDate: trip.exitDate ?? null,
    entryCity: trip.entryCity,
    exitCity: trip.exitCity,
    destinationCountry:
      application?.destinationCountry ?? trip.mainDestinationCountry,
    budget:
      trip.estimatedBudget !== undefined
        ? { amount: trip.estimatedBudget, currency: trip.budgetCurrency }
        : null,
    hasInsurance: Boolean(trip.insurance),
  }
}

function buildApplicationModel(
  input: DashboardInput,
  now: Date
): ApplicationDashboardModel {
  const { applicant, application, documents, sponsors } = input
  const hasData = applicant !== null || application !== null

  const buckets = buildDocumentBuckets(documents)
  const validation =
    applicant && application
      ? runValidation(toDossier(applicant, application, documents, sponsors))
      : EMPTY_VALIDATION

  const state = deriveReadinessState(
    buckets,
    documents,
    validation.errorCount,
    Boolean(application?.appointment)
  )

  const timeline = buildTimeline(application, documents, now)
  const upcomingTimeline = timeline
    .filter((item) => item.status !== 'past')
    .slice(0, MAX_UPCOMING)

  const template = resolveVisaTemplate(
    application?.destinationCountry,
    application?.visaType
  )
  const sources = template?.sourceIds
    ? getSourcesForRefs(application?.destinationCountry, template.sourceIds)
    : []

  const financing: FinancingSummaryModel | null = application?.financing
    ? {
        source: application.financing.source,
        currency: application.financing.currency,
        selfFundedAmount: application.financing.selfFundedAmount,
        sponsoredAmount: application.financing.sponsoredAmount,
        accountBalance: application.financing.accountBalance,
      }
    : null

  return {
    hasData,
    countryCode: application?.destinationCountry || undefined,
    visaType: application?.visaType,
    documents: buckets,
    readiness: {
      percent: buckets.completionPercent,
      state,
      missingCount: buckets.missing,
    },
    appointment: {
      date: application?.appointment?.date ?? null,
      daysUntil: daysUntil(application?.appointment?.date, now),
    },
    trip: buildTripSummary(application, now),
    validation,
    nextActions: deriveNextActions(buckets, validation, application),
    timeline,
    upcomingTimeline,
    sponsorCount: sponsors.length,
    financing,
    reviewStatus: template?.reviewStatus,
    sources,
  }
}

/**
 * Build the full dashboard model from dossier state.
 *
 * `now` is injectable so tests are deterministic; production passes the current
 * date. The result always wraps exactly one application today.
 */
export function buildDashboardModel(
  input: DashboardInput,
  now: Date = new Date()
): DashboardModel {
  const active = buildApplicationModel(input, now)
  return { applications: [active], active }
}

/** Component-facing hook: derives the model once per state change. */
export function useDashboardModel(): DashboardModel {
  const { state } = useDossier()
  return useMemo(
    () =>
      buildDashboardModel({
        applicant: state.applicant,
        application: state.application,
        documents: state.documents,
        sponsors: state.sponsors,
      }),
    [state]
  )
}
