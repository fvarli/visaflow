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

/** What the index route knows once the workspace has finished hydrating. */
export interface EntryState {
  /** Is a dossier open in this tab's editor right now? */
  hasData: boolean
  /** How many dossiers are saved in this browser. */
  savedCount: number
}

/**
 * Where a visitor lands, derived from the **workspace**, not just the editor.
 *
 * ADR-031 derived this purely from `hasData`, which was correct when a dossier
 * could only ever be in memory. With durable storage it stopped being: `hasData`
 * answers "is a dossier open in this tab", not "does this person have work
 * here". A returning user was therefore routed into onboarding, and closing a
 * dossier stranded someone with saved dossiers in the brand-new-user
 * experience (ADR-040).
 *
 * The three destinations mean three different things and must stay distinct:
 * `/welcome` — nothing exists yet · `/dossiers` — a workspace exists but nothing
 * is open · `/dashboard` — a dossier is open.
 *
 * Deliberately does **not** pick a dossier to open. Having saved work is not
 * consent to reopen an arbitrary one, and a deliberate close must survive a
 * reload.
 */
export function firstRunTarget(
  entry: EntryState
): '/welcome' | '/dashboard' | '/dossiers' {
  if (entry.hasData) return '/dashboard'
  return entry.savedCount > 0 ? '/dossiers' : '/welcome'
}

/**
 * The destination country a fresh dossier starts with. Greece is the only pack
 * configured today; kept as a single named constant (replacing the page-local
 * literal that used to live in `DashboardPage`) rather than scattered strings.
 */
export const DEFAULT_DESTINATION_COUNTRY = 'GR'
