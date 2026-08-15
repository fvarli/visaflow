import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { DocumentCategory } from '@/domain/types/common'
import type { ValidationResult } from '@/domain/rules/types'
import type { StatusTone } from '@/components/ui/status-badge'
import { isDossierReady, isObtained } from './document-readiness'
import type { DocumentReadiness } from './readiness-types'

/**
 * Application-wide readiness state and priority.
 *
 * These used to live in `dashboard-model.ts`, which made the Dashboard the de
 * facto owner of logic that the Timeline, Final Review and Validation Center
 * all depend on. They are app-wide concepts, so they live in the app-wide
 * module (ADR-033). Behaviour is unchanged apart from consuming the canonical
 * `DocumentReadiness`.
 */

/**
 * Organizational readiness state. Presentation maps each to a phrase; none of
 * them describes an application's chances (ADR-016).
 */
export type ReadinessState =
  | 'not_started'
  | 'preparing'
  | 'waiting_reservations'
  | 'documents_remaining'
  | 'ready_for_appointment'

export type ActionKind =
  | 'resolveErrors'
  | 'completeMissingDocs'
  | 'updateDocuments'
  | 'confirmDocuments'
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

const RESERVATION_CATEGORIES: DocumentCategory[] = [
  'travel',
  'accommodation',
  'insurance',
]

/**
 * Derive the organizational readiness state. Deterministic, and never a
 * probability — it only describes how assembled the dossier is.
 *
 * `errorCount` is the one place a validation signal touches readiness, and only
 * as a **gate**: blocking findings stop a fully-collected dossier from reading
 * "ready for your appointment". It never alters the percentage.
 */
export function deriveReadinessState(
  readiness: DocumentReadiness,
  documents: Document[],
  errorCount: number,
  hasAppointment: boolean
): ReadinessState {
  // No applicable work at all — either nothing is on file, or every requirement
  // has been disclaimed. Neither is a prepared dossier, so this must never read
  // as "ready for your appointment": that would restore the polarity inversion
  // this model exists to remove, just in mirror image (ADR-033).
  if (!readiness.hasApplicableWork) return 'not_started'

  if (readiness.complete && errorCount === 0) {
    return hasAppointment ? 'ready_for_appointment' : 'preparing'
  }

  // Documents not yet in hand at all. A `received` document is in hand, so it
  // never makes the dossier read as "waiting" for something.
  const notInHand = documents.filter(
    (d) => d.required && !isObtained(d.status) && d.status !== 'needs_update'
  )
  if (notInHand.length > 0) {
    const allReservations = notInHand.every((d) =>
      RESERVATION_CATEGORIES.includes(d.category)
    )
    return allReservations ? 'waiting_reservations' : 'documents_remaining'
  }
  return 'preparing'
}

/**
 * Prioritized next actions, derived from already-computed outputs — no rule
 * threshold is re-implemented here. Order encodes priority: blocking errors
 * first, then throughput (documents not in hand), then the cheap wins
 * (updates, confirmations), then warnings, then structural gaps.
 *
 * `confirmDocuments` is the action for documents the applicant already holds
 * but has not confirmed. It is deliberately ranked below collecting and
 * updating: confirming is a minute's work, obtaining a document is not.
 */
export function deriveNextActions(
  readiness: DocumentReadiness,
  validation: ValidationResult,
  application: Application | null
): ActionDescriptor[] {
  const actions: ActionDescriptor[] = []
  const notInHand = readiness.notStarted + readiness.inProgress

  if (validation.errorCount > 0) {
    actions.push({
      id: 'resolveErrors',
      tone: 'danger',
      count: validation.errorCount,
      to: '/consistency-checks',
    })
  }
  if (notInHand > 0) {
    actions.push({
      id: 'completeMissingDocs',
      tone: 'accent',
      count: notInHand,
      to: '/documents',
    })
  }
  if (readiness.needsUpdate > 0) {
    actions.push({
      id: 'updateDocuments',
      tone: 'warning',
      count: readiness.needsUpdate,
      to: '/documents',
    })
  }
  if (readiness.obtained > 0) {
    actions.push({
      id: 'confirmDocuments',
      tone: 'info',
      count: readiness.obtained,
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

/** Re-exported so consumers import the whole readiness vocabulary from one path. */
export { isDossierReady, isObtained }
