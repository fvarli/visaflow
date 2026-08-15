import { useMemo } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import { resolveVisaTemplate } from '@/config/countries'
import { useDossier } from '@/app/providers/DossierProvider'
// Readiness and priority are the Dashboard's, imported not re-derived, exactly
// as the Timeline does — so Dashboard, Timeline and Final Review can never
// disagree about how ready the dossier is or what to do first.
import {
  buildDocumentBuckets,
  deriveNextActions,
  deriveReadinessState,
  type ActionDescriptor,
  type ReadinessState,
} from '@/features/dashboard/dashboard-model'
// Findings, counts and per-area health are the Validation Center's model, used
// whole. Final Review re-reads no rule and re-counts nothing (ADR-025).
import {
  buildValidationModel,
  type ActionableFinding,
  type ReviewArea,
} from '@/features/validation/validation-model'
// The appointment-day readiness is the Timeline's own derivation, reused.
import { buildAppointmentDay } from '@/features/timeline/timeline-model'
import type { AppointmentDaySummaryModel } from '@/features/timeline/timeline-model'
import {
  buildSubmissionChecklist,
  type SubmissionChecklist,
} from './review-checklist'
import {
  buildApplicationSummary,
  type ApplicationSummary,
} from './review-summary'
import { buildPrintPackage, type PrintPackage } from './review-print'

/**
 * The Final Review workspace model — the last look before the appointment.
 *
 * Final Review answers a different question from the Validation Center. The
 * Validation Center asks *"what is inconsistent?"*; Final Review asks *"what do
 * I have, what am I still missing, what do I bring, and am I organised for the
 * appointment?"*
 *
 * It is a composition, not a new authority. Readiness comes from the Dashboard,
 * findings and their counts from the Validation Center, appointment-day
 * readiness from the Timeline, document applicability from the country pack.
 * The only things this module adds are the submission checklist grouping and
 * the print-package split — neither of which re-encodes a rule or invents a
 * score. Nothing here predicts a visa outcome (ADR-016).
 *
 * Pure and i18n/Intl-free, so it unit-tests without a React provider.
 */

export interface ReviewInput {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
}

export interface ReviewReadiness {
  percent: number
  state: ReadinessState
  missingCount: number
}

export interface ReviewAttention {
  /** Errors and warnings, engine order — the things worth acting on. */
  items: ActionableFinding[]
  /** Informational notes, kept separate so they never read as problems. */
  notes: ActionableFinding[]
  /** Identical to the Validation Center's `attentionCount`. */
  attentionCount: number
  noteCount: number
}

export interface FinalReviewModel {
  hasData: boolean
  readiness: ReviewReadiness
  appointmentDate: string | null
  appointmentDaysUntil: number | null
  /** The Dashboard's `nextActions[0]` — the same single priority everywhere. */
  primaryAction: ActionDescriptor | null
  summary: ApplicationSummary
  checklist: SubmissionChecklist
  attention: ReviewAttention
  /** Areas that are on file and raise no findings — the Validation Center's. */
  looksGood: ReviewArea[]
  appointmentDay: AppointmentDaySummaryModel
  print: PrintPackage
  /** Honestly-configured template notes; empty when the pack records none. */
  templateNoteKeys: string[]
}

export function buildFinalReviewModel(
  input: ReviewInput,
  now: Date
): FinalReviewModel {
  const { applicant, application, documents, sponsors } = input
  const hasData = applicant !== null && application !== null

  const template = resolveVisaTemplate(
    application?.destinationCountry,
    application?.visaType
  )
  const appointmentDate = application?.appointment?.date ?? null

  // Reused wholesale — same input, same output as the Validation Center.
  const validation = buildValidationModel(input)

  const buckets = buildDocumentBuckets(documents)
  const readinessState = deriveReadinessState(
    buckets,
    documents,
    validation.validation.errorCount,
    appointmentDate !== null
  )

  const checklist = buildSubmissionChecklist(
    documents,
    application,
    template,
    appointmentDate
  )
  const summary = buildApplicationSummary(applicant, application, sponsors)
  const print = buildPrintPackage(
    summary,
    checklist,
    (application?.trip?.route?.length ?? 0) > 0
  )

  const findings = validation.validation.findings
  const actionable = findings.map<ActionableFinding>((finding) => {
    const match = validation.groups
      .flatMap((group) => group.findings)
      .find((item) => item.finding.id === finding.id)
    return match ?? { finding, action: null }
  })

  return {
    hasData,
    readiness: {
      percent: buckets.completionPercent,
      state: readinessState,
      missingCount: buckets.missing,
    },
    appointmentDate,
    appointmentDaysUntil: appointmentDate
      ? differenceInCalendarDays(parseISO(appointmentDate), now)
      : null,
    primaryAction:
      deriveNextActions(buckets, validation.validation, application)[0] ?? null,
    summary,
    checklist,
    attention: {
      items: actionable.filter((item) => item.finding.severity !== 'info'),
      notes: actionable.filter((item) => item.finding.severity === 'info'),
      attentionCount: validation.hero.attentionCount,
      noteCount: validation.hero.noteCount,
    },
    looksGood: validation.ready,
    appointmentDay: buildAppointmentDay(
      applicant,
      application,
      documents,
      template
    ),
    print,
    templateNoteKeys: template?.notesKeys ?? [],
  }
}

/** Component-facing hook: derives the model once per state change. */
export function useFinalReviewModel(): FinalReviewModel {
  const { state } = useDossier()
  return useMemo(
    () =>
      buildFinalReviewModel(
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
