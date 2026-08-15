import { useMemo } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import { runValidation } from '@/domain/rules/runner'
import { resolveVisaTemplate } from '@/config/countries'
import { useDossier } from '@/app/providers/DossierProvider'
import { associateFindings } from '@/features/documents/documents-model'
// Reuse — never re-implement — the Dashboard's priority + readiness derivation,
// so Timeline's highlighted action is byte-identical to the Dashboard's.
import {
  buildDocumentBuckets,
  deriveNextActions,
  deriveReadinessState,
  type ActionDescriptor,
  type ReadinessState,
} from '@/features/dashboard/dashboard-model'
import {
  deriveTasks,
  groupTasksByBand,
  overdueCount,
  type PreparationTask,
  type TaskBandGroup,
} from './timeline-tasks'
import { buildKeyDates, type KeyDateEvent } from './timeline-dates'
import { buildFreshness, type FreshnessView } from './document-freshness'

/**
 * The Timeline workspace presentation model — an actionable preparation plan.
 *
 * The one place the page derives its shape. It re-encodes no rule and persists
 * nothing: preparation tasks are **derived** from the timeline policy + real
 * document/validation state, key dates are the dossier's fixed events, freshness
 * is factual, and the highlighted "do this first" **reuses the Dashboard's
 * `deriveNextActions`** so the two never disagree (ADR-*). It is i18n/Intl-free.
 */

export interface TimelineInput {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
}

export interface AppointmentDayItem {
  id: string
  ready: boolean
}

export interface AppointmentDaySummaryModel {
  items: AppointmentDayItem[]
  readyCount: number
  total: number
  /** Honestly-configured template notes (never hardcoded office instructions). */
  noteKeys: string[]
}

export interface TimelineModel {
  hasData: boolean
  hasAppointment: boolean
  hasTrip: boolean
  appointmentDate: string | null
  appointmentDaysUntil: number | null
  tripDaysUntil: number | null
  phase: ReadinessState
  /** Outstanding required-document count — for the phase verdict phrasing. */
  missingDocuments: number
  /** The single highlighted action — identical to the Dashboard's `nextActions[0]`. */
  primaryAction: ActionDescriptor | null
  tasks: PreparationTask[]
  taskGroups: TaskBandGroup[]
  overdue: number
  /** Preparation tasks that apply (excludes not-applicable). */
  applicableTaskCount: number
  keyDates: KeyDateEvent[]
  freshness: FreshnessView
  appointmentDay: AppointmentDaySummaryModel
}

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

function daysUntil(iso: string | null, now: Date): number | null {
  return iso ? differenceInCalendarDays(parseISO(iso), now) : null
}

/**
 * The read-only "what you need on the day" summary. Exported so the Final
 * Review workspace reuses this exact derivation instead of writing a second
 * appointment-readiness check that could drift from the Timeline's.
 */
export function buildAppointmentDay(
  applicant: Applicant | null,
  application: Application | null,
  documents: Document[],
  template: ReturnType<typeof resolveVisaTemplate>
): AppointmentDaySummaryModel {
  const required = documents.filter((d) => d.required)
  const allRequiredReady =
    required.length > 0 &&
    required.every((d) => d.status === 'ready' || d.status === 'not_applicable')
  const formReady =
    documents.find((d) => d.code === 'APPLICATION_FORM')?.status === 'ready'

  const items: AppointmentDayItem[] = [
    { id: 'passport', ready: Boolean(applicant?.passport?.number) },
    { id: 'applicationForm', ready: formReady },
    {
      id: 'confirmation',
      ready: Boolean(application?.appointment?.confirmationNumber),
    },
    { id: 'requiredDocuments', ready: allRequiredReady },
  ]

  return {
    items,
    readyCount: items.filter((i) => i.ready).length,
    total: items.length,
    noteKeys: template?.notesKeys ?? [],
  }
}

export function buildTimelineModel(
  input: TimelineInput,
  now: Date
): TimelineModel {
  const { applicant, application, documents, sponsors } = input
  const hasData = application !== null
  const appointmentDate = application?.appointment?.date ?? null

  const template = resolveVisaTemplate(
    application?.destinationCountry,
    application?.visaType
  )

  const validation =
    applicant && application
      ? runValidation(toDossier(applicant, application, documents, sponsors))
      : {
          findings: [],
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
          passedRules: 0,
          totalRules: 0,
        }

  const buckets = buildDocumentBuckets(documents)
  const actions = deriveNextActions(buckets, validation, application)

  const tasks = deriveTasks(
    { application, documents, template, findings: validation.findings },
    now
  )

  const freshness = buildFreshness(
    documents,
    appointmentDate,
    associateFindings(documents, validation.findings)
  )

  return {
    hasData,
    hasAppointment: appointmentDate !== null,
    hasTrip: Boolean(application?.trip),
    appointmentDate,
    appointmentDaysUntil: daysUntil(appointmentDate, now),
    tripDaysUntil: daysUntil(application?.trip?.entryDate ?? null, now),
    phase: deriveReadinessState(
      buckets,
      documents,
      validation.errorCount,
      appointmentDate !== null
    ),
    missingDocuments: buckets.missing,
    primaryAction: actions[0] ?? null,
    tasks,
    taskGroups: groupTasksByBand(tasks),
    overdue: overdueCount(tasks),
    applicableTaskCount: tasks.filter((t) => t.status !== 'notApplicable')
      .length,
    keyDates: buildKeyDates({ applicant, application, documents }, now),
    freshness,
    appointmentDay: buildAppointmentDay(
      applicant,
      application,
      documents,
      template
    ),
  }
}

/** Component-facing hook: derives the model once per state change. */
export function useTimelineModel(): TimelineModel {
  const { state } = useDossier()
  return useMemo(
    () =>
      buildTimelineModel(
        {
          applicant: state.applicant,
          application: state.application,
          documents: state.documents,
          sponsors: state.sponsors,
        },
        new Date()
      ),
    [state]
  )
}
