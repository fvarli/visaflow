import type { Application } from '@/domain/schemas/application.schema'
import type { StepStatus } from '@/components/ui/stepper'

/**
 * The guided trip planner, as data — pure, no React/i18n, so ordering and
 * completeness unit-test cleanly. The UI resolves each id to a translated
 * title (`trip:steps.<id>.title`) and renders the statuses.
 */
export const TRIP_STEP_IDS = [
  'dates',
  'route',
  'accommodation',
  'transportation',
  'insurance',
  'review',
] as const

export type TripStepId = (typeof TRIP_STEP_IDS)[number]

export function isDatesComplete(application: Application | null): boolean {
  const trip = application?.trip
  return Boolean(trip?.entryDate && trip?.exitDate)
}

export function isRouteComplete(application: Application | null): boolean {
  const trip = application?.trip
  return Boolean(trip?.firstEntryCountry && trip?.mainDestinationCountry)
}

/**
 * Whether a step counts as "done" for the rail. Dates and Route depend on their
 * fields; the reservation/insurance steps are optional and count once they hold
 * an entry or the user has moved past them; Review is terminal.
 */
export function isStepSatisfied(
  application: Application | null,
  stepId: TripStepId,
  index: number,
  current: number
): boolean {
  const trip = application?.trip
  switch (stepId) {
    case 'dates':
      return isDatesComplete(application)
    case 'route':
      return isRouteComplete(application)
    case 'accommodation':
      return (
        (trip?.accommodationReservations.length ?? 0) > 0 || index < current
      )
    case 'transportation':
      return (trip?.transportReservations.length ?? 0) > 0 || index < current
    case 'insurance':
      return Boolean(trip?.insurance) || index < current
    case 'review':
      return false
  }
}

export function deriveStepStatuses(
  application: Application | null,
  current: number
): StepStatus[] {
  return TRIP_STEP_IDS.map((id, index) => {
    if (index === current) return 'current'
    return isStepSatisfied(application, id, index, current)
      ? 'complete'
      : 'upcoming'
  })
}
