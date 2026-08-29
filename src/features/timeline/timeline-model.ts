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
// Readiness and priority come from the canonical readiness feature, so the
// Timeline's number and highlighted action are byte-identical to every other
// surface's (ADR-033).
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import {
  deriveNextActions,
  deriveReadinessState,
  type ActionDescriptor,
  type ReadinessState,
} from '@/features/readiness/readiness-model'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
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
 * is factual, and readiness plus the highlighted "do this first" come from the
 * canonical readiness feature, so no two surfaces disagree (ADR-033). It is
 * i18n/Intl-free.
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
  /** Applicable work not yet confirmed ready — for the phase verdict phrasing. */
  outstandingDocuments: number
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
  // Both items ask the *dossier-readiness* question, so both require `ready`
  // (an applicable requirement marked not-applicable simply leaves the set).
  // A `received` document deliberately does not qualify here even though it
  // satisfies its preparation task on the plan — see ADR-033.
  const allRequiredReady = buildDocumentReadiness({
    documents,
    requiredRequirementCodes: requiredRequirementCodes(template, application),
    template,
    application,
  }).complete
  const form = documents.find((d) => d.code === 'APPLICATION_FORM')
  const formReady =
    form?.status === 'ready' || form?.status === 'not_applicable'

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

  const readiness = buildDocumentReadiness({
    documents,
    requiredRequirementCodes: requiredRequirementCodes(template, application),
    template,
    application,
  })
  const actions = deriveNextActions(readiness, validation, application)

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
      readiness,
      documents,
      validation.errorCount,
      appointmentDate !== null
    ),
    outstandingDocuments: readiness.outstanding,
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
