import type { Trip } from '@/domain/schemas/trip.schema'
import type { TripStepId } from '@/features/trip/trip-wizard'

/**
 * Calm, informational planning guidance for the trip wizard.
 *
 * Like `applicant-guidance.ts`, this is a pure PRESENTATION layer, separate from
 * the validation engine: it offers helpful, non-blocking explanations derived
 * from the current trip state. It is NOT a validation rule — nothing here runs
 * through `runValidation`, becomes a finding, or affects dossier readiness or
 * severity. Guidance is always `info`/`neutral`, never fear-inducing, and never
 * predictive of an outcome (ADR-016).
 */

export type GuidanceTone = 'info' | 'neutral'

export interface TripGuidanceHint {
  id: string
  stage: TripStepId
  /** i18n key (`trip:guidance.<key>`), resolved at the UI boundary. */
  messageKey: string
  tone: GuidanceTone
}

export function deriveTripGuidance(
  trip: Trip | null | undefined
): TripGuidanceHint[] {
  const hints: TripGuidanceHint[] = []
  const route = trip?.route ?? []

  // Route stage — plan the overnight itinerary first.
  if (route.length === 0) {
    hints.push({
      id: 'addOvernightLocations',
      stage: 'route',
      messageKey: 'trip:guidance.addOvernightLocations',
      tone: 'info',
    })
  } else {
    hints.push({
      id: 'mainDestinationMeaning',
      stage: 'route',
      messageKey: 'trip:guidance.mainDestinationMeaning',
      tone: 'neutral',
    })
  }
  hints.push({
    id: 'dayTripsNoStop',
    stage: 'route',
    messageKey: 'trip:guidance.dayTripsNoStop',
    tone: 'neutral',
  })

  // Accommodation & transport — reservations can come after the plan.
  if ((trip?.accommodationReservations?.length ?? 0) === 0) {
    hints.push({
      id: 'accommodationReservationsLater',
      stage: 'accommodation',
      messageKey: 'trip:guidance.reservationsLater',
      tone: 'info',
    })
  }
  if ((trip?.transportReservations?.length ?? 0) === 0) {
    hints.push({
      id: 'transportReservationsLater',
      stage: 'transportation',
      messageKey: 'trip:guidance.reservationsLater',
      tone: 'info',
    })
  }

  return hints
}

/** The guidance hints for one wizard stage. */
export function tripGuidanceForStage(
  hints: TripGuidanceHint[],
  stage: TripStepId
): TripGuidanceHint[] {
  return hints.filter((hint) => hint.stage === stage)
}
