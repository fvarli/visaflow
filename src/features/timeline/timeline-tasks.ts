import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import { applicableRequirements } from '@/features/documents/template-sync'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { VisaTypeTemplate } from '@/config/types'
import type { ValidationFinding } from '@/domain/rules/types'
import {
  resolveTimelinePolicy,
  SPONSOR_EVIDENCE_CODES,
  SPONSOR_EVIDENCE_LEAD_DAYS,
  type TaskDomain,
} from './timeline-policy'

/**
 * The preparation plan — recommended tasks derived from current dossier state and
 * the timeline policy. Tasks are **derived, never persisted** (ADR): status comes
 * from real document/validation state, and each task is grouped into a proximity
 * **band** computed from today and its recommended target date. Overdue means the
 * recommended date has passed while the task is still incomplete — a plan cue,
 * never an official deadline. Pure and deterministic with an injected `now`.
 */

export type TaskStatus =
  | 'notStarted'
  | 'inProgress'
  | 'ready'
  | 'needsAttention'
  | 'overdue'
  | 'notApplicable'

/**
 * Proximity bands. Date-anchored bands are used when an appointment date exists;
 * the relative phases (`startNow`/`soon`/`finalSteps`) are the calm fallback when
 * it does not (no dates are invented).
 */
export type TaskBand =
  | 'overdue'
  | 'today'
  | 'thisWeek'
  | 'beforeAppointment'
  | 'appointmentDay'
  | 'beforeTravel'
  | 'travel'
  | 'later'
  | 'startNow'
  | 'soon'
  | 'finalSteps'

/** Display order for bands (only non-empty bands render). */
export const BAND_ORDER: TaskBand[] = [
  'overdue',
  'today',
  'thisWeek',
  'startNow',
  'soon',
  'beforeAppointment',
  'appointmentDay',
  'finalSteps',
  'beforeTravel',
  'travel',
  'later',
]

export interface PreparationTask {
  id: string
  milestoneId?: string
  titleKey: string
  reasonKey: string
  /** ISO target date (recommended), or null when it can't be computed. */
  targetDate: string | null
  band: TaskBand
  status: TaskStatus
  domain: TaskDomain
  relatedDocuments: string[]
  source: 'policy' | 'derived'
}

export interface TasksInput {
  application: Application | null
  documents: Document[]
  template: VisaTypeTemplate | undefined
  findings: ValidationFinding[]
}

const READY_DOC_STATUSES = new Set(['ready', 'received', 'not_applicable'])

function isoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Status of a doc-backed task, from the applicable related documents' states. */
function docStatusFor(
  codes: string[],
  documents: Document[],
  applicableCodes: Set<string>
): TaskStatus {
  const applicable = codes.filter((c) => applicableCodes.has(c))
  if (applicable.length === 0) return 'notApplicable'

  const states = applicable.map((code) => {
    const doc = documents.find((d) => d.code === code)
    return doc ? doc.status : 'missing'
  })

  if (states.every((s) => READY_DOC_STATUSES.has(s))) return 'ready'
  if (states.some((s) => s === 'needs_update')) return 'needsAttention'
  if (states.some((s) => READY_DOC_STATUSES.has(s) || s === 'requested'))
    return 'inProgress'
  return 'notStarted'
}

/** Final-review status: attention on errors, ready when everything required is ready. */
function reviewStatus(documents: Document[], errorCount: number): TaskStatus {
  if (errorCount > 0) return 'needsAttention'
  const required = documents.filter((d) => d.required)
  if (required.length === 0) return 'notStarted'
  const allReady = required.every((d) => READY_DOC_STATUSES.has(d.status))
  return allReady ? 'ready' : 'inProgress'
}

/** Sponsor-evidence status: findings first, then the sponsor documents. */
function sponsorStatus(
  documents: Document[],
  findings: ValidationFinding[]
): TaskStatus {
  if (findings.some((f) => f.ruleId.startsWith('sponsor.')))
    return 'needsAttention'
  const docs = documents.filter((d) => SPONSOR_EVIDENCE_CODES.includes(d.code))
  if (docs.length === 0) return 'notStarted'
  if (docs.every((d) => READY_DOC_STATUSES.has(d.status))) return 'ready'
  return 'inProgress'
}

function isComplete(status: TaskStatus): boolean {
  return status === 'ready' || status === 'notApplicable'
}

/** Band from the recommended target date, today, and the appointment/trip anchors. */
export function classifyBand(
  targetDate: string,
  status: TaskStatus,
  now: Date,
  appointmentIso: string,
  tripEntryIso: string | null
): TaskBand {
  const target = parseISO(targetDate)
  const dToTarget = differenceInCalendarDays(target, now)
  const dTargetToAppt = differenceInCalendarDays(
    target,
    parseISO(appointmentIso)
  )

  if (!isComplete(status) && dToTarget < 0) return 'overdue'
  if (dTargetToAppt === 0) return 'appointmentDay'
  if (dTargetToAppt > 0) {
    // After the appointment: before travel, unless it falls on/after departure.
    if (
      tripEntryIso &&
      differenceInCalendarDays(target, parseISO(tripEntryIso)) >= 0
    )
      return 'travel'
    return 'beforeTravel'
  }
  if (dToTarget === 0) return 'today'
  if (dToTarget >= 1 && dToTarget <= 7) return 'thisWeek'
  return 'beforeAppointment'
}

/** Calm relative phase when no appointment date exists (no dates invented). */
function relativePhase(leadDays: number): TaskBand {
  if (leadDays >= 14) return 'startNow'
  if (leadDays >= 7) return 'soon'
  if (leadDays >= 3) return 'beforeAppointment'
  return 'finalSteps'
}

export function deriveTasks(input: TasksInput, now: Date): PreparationTask[] {
  const { application, documents, template, findings } = input
  const appointmentIso = application?.appointment?.date ?? null
  const tripEntryIso = application?.trip?.entryDate ?? null
  const applicableCodes = new Set(
    template
      ? applicableRequirements(template, application).map((r) => r.code)
      : []
  )
  const errorCount = findings.filter((f) => f.severity === 'error').length

  const bandFor = (
    targetDate: string | null,
    status: TaskStatus,
    leadDays: number
  ): TaskBand => {
    if (appointmentIso && targetDate)
      return classifyBand(targetDate, status, now, appointmentIso, tripEntryIso)
    return relativePhase(leadDays)
  }

  const targetFor = (leadDays: number): string | null =>
    appointmentIso ? isoDate(subDays(parseISO(appointmentIso), leadDays)) : null

  const tasks: PreparationTask[] = []

  for (const item of resolveTimelinePolicy(template)) {
    const status =
      item.id === 'final-review'
        ? reviewStatus(documents, errorCount)
        : docStatusFor(item.relatedDocuments, documents, applicableCodes)
    const targetDate = targetFor(item.leadDays)
    const band = bandFor(targetDate, status, item.leadDays)
    tasks.push({
      id: `task-${item.id}`,
      milestoneId: item.id,
      titleKey: item.nameKey,
      reasonKey: item.reasonKey,
      targetDate,
      band,
      status: band === 'overdue' ? 'overdue' : status,
      domain: item.domain,
      relatedDocuments: item.relatedDocuments,
      source: 'policy',
    })
  }

  // Derived pre-travel task: organise the dossier a few days before departure.
  // Only when a trip exists; a VisaFlow default of 3 days before travel.
  if (tripEntryIso) {
    const targetDate = isoDate(subDays(parseISO(tripEntryIso), 3))
    const status = reviewStatus(documents, errorCount)
    const band = appointmentIso
      ? classifyBand(targetDate, status, now, appointmentIso, tripEntryIso)
      : relativePhase(1)
    tasks.push({
      id: 'task-travel-prep',
      titleKey: 'timeline:derived.travelPrep.title',
      reasonKey: 'timeline:derived.travelPrep.reason',
      targetDate,
      band,
      status: band === 'overdue' ? 'overdue' : status,
      domain: 'review',
      relatedDocuments: [],
      source: 'derived',
    })
  }

  // Derived (non-milestone) sponsor-evidence task, only when a sponsor funds the trip.
  const source = application?.financing?.source
  if (source === 'sponsor' || source === 'mixed') {
    const status = sponsorStatus(documents, findings)
    const targetDate = targetFor(SPONSOR_EVIDENCE_LEAD_DAYS)
    const band = bandFor(targetDate, status, SPONSOR_EVIDENCE_LEAD_DAYS)
    tasks.push({
      id: 'task-sponsor-evidence',
      titleKey: 'timeline:derived.sponsorEvidence.title',
      reasonKey: 'timeline:derived.sponsorEvidence.reason',
      targetDate,
      band,
      status: band === 'overdue' ? 'overdue' : status,
      domain: 'sponsor',
      relatedDocuments: SPONSOR_EVIDENCE_CODES,
      source: 'derived',
    })
  }

  return tasks
}

export interface TaskBandGroup {
  band: TaskBand
  tasks: PreparationTask[]
}

/** Group tasks into bands in display order; non-empty bands only. */
export function groupTasksByBand(tasks: PreparationTask[]): TaskBandGroup[] {
  return BAND_ORDER.map((band) => ({
    band,
    tasks: tasks.filter((t) => t.band === band),
  })).filter((g) => g.tasks.length > 0)
}

/** Count of tasks past their recommended date and still incomplete. */
export function overdueCount(tasks: PreparationTask[]): number {
  return tasks.filter((t) => t.band === 'overdue').length
}
