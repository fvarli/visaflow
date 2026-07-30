import type { StepStatus } from '@/components/ui/stepper'

/**
 * The first-run flow, as data.
 *
 * This module is pure — no React, no i18n, no formatting — so the step ordering,
 * the safe `?step=` resolution, and the first-run routing decision can be
 * unit-tested and reused. The UI resolves each id to a translated title
 * (`onboarding:nav.<id>`) and renders the statuses.
 *
 * Onboarding is a presentation surface, not a stored state: nothing here is
 * persisted, there is no "completed" flag, and entry stays derived solely from
 * whether a dossier exists (`hasData`). See ADR-031.
 */

/** The onboarding steps, in flow order. Used for `?step=` deep-linking. */
export const ONBOARDING_STEP_IDS = [
  'welcome',
  'setup',
  'create',
  'ready',
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number]

/** Resolve a `?step=` param to a valid step; unknown/`null` falls back safely. */
export function resolveStep(param: string | null): OnboardingStepId {
  return ONBOARDING_STEP_IDS.includes(param as OnboardingStepId)
    ? (param as OnboardingStepId)
    : 'welcome'
}

/** Index of a step id in the flow, or `0` (welcome) when unknown. */
export function stepIndex(id: OnboardingStepId): number {
  const index = ONBOARDING_STEP_IDS.indexOf(id)
  return index >= 0 ? index : 0
}

/**
 * Marker status for every step given the active index. Onboarding steps are not
 * "satisfied" by dossier data the way the domain wizards are, so status is
 * purely positional: passed steps are `complete`, the active one is `current`,
 * the rest are `upcoming`.
 */
export function deriveOnboardingStepStatuses(current: number): StepStatus[] {
  return ONBOARDING_STEP_IDS.map((_id, index) => {
    if (index < current) return 'complete'
    if (index === current) return 'current'
    return 'upcoming'
  })
}

/**
 * The first-run routing decision used by the index route: a brand-new visitor
 * with no dossier starts in the welcome flow; a returning visitor with a dossier
 * goes straight to the dashboard. Kept pure so the redirect is unit-testable and
 * never depends on a persisted flag.
 */
export function firstRunTarget(hasData: boolean): '/welcome' | '/dashboard' {
  return hasData ? '/dashboard' : '/welcome'
}

/**
 * The destination country a fresh dossier starts with. Greece is the only pack
 * configured today; kept as a single named constant (replacing the page-local
 * literal that used to live in `DashboardPage`) rather than scattered strings.
 */
export const DEFAULT_DESTINATION_COUNTRY = 'GR'
