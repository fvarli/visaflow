import type {
  ValidationFinding,
  ValidationSeverity,
} from '@/domain/rules/types'
import type { StatusTone } from '@/components/ui/status-badge'

/**
 * Presentation vocabulary for the Validation Center.
 *
 * This module is pure — no React, no i18n, no formatting — so the mapping from
 * a machine-readable finding to a *domain group*, a *dossier area*, a calm
 * *severity label* and a *health* verdict can be unit-tested and reused. It
 * re-encodes no validation logic: it only classifies findings the engine
 * already produced. Prose is resolved at the UI boundary from the returned keys.
 *
 * IMPORTANT: nothing here expresses an outcome. "Needs attention" describes the
 * dossier's internal consistency, never a visa's chances (ADR-016).
 */

/**
 * The domain groups the page organizes findings under. Ordered from the
 * applicant outward through the trip to the supporting evidence. `finance` and
 * `timeline` are reserved for future rules; no current rule maps to them, so
 * they never appear today — the union keeps the mapping forward-compatible.
 */
export type FindingCategory =
  | 'applicant'
  | 'trip'
  | 'documents'
  | 'employment'
  | 'sponsors'
  | 'finance'
  | 'timeline'

export const CATEGORY_ORDER: FindingCategory[] = [
  'applicant',
  'trip',
  'documents',
  'employment',
  'finance',
  'sponsors',
  'timeline',
]

/**
 * Map a finding to its domain group by the stable `ruleId` prefix (never by
 * translated prose). The route a finding links to is a separate concern —
 * see `finding-actions.ts`.
 */
export function categoryForRuleId(ruleId: string): FindingCategory {
  if (ruleId.startsWith('passport.')) return 'applicant'
  if (ruleId.startsWith('document.')) return 'documents'
  if (ruleId.startsWith('employment.')) return 'employment'
  if (ruleId.startsWith('sponsor.')) return 'sponsors'
  // insurance.*, accommodation.* and trip.* are all part of the trip plan.
  return 'trip'
}

export function categoryForFinding(
  finding: ValidationFinding
): FindingCategory {
  return categoryForRuleId(finding.ruleId)
}

/**
 * Finer-grained dossier *areas*, used for the "what looks good" reinforcement
 * and the per-section review summary. Deliberately more specific than a
 * category (a category can span several areas — the trip category covers the
 * itinerary, accommodation, insurance and the appointment).
 */
export type ReviewAreaId =
  | 'passport'
  | 'trip'
  | 'accommodation'
  | 'insurance'
  | 'appointment'
  | 'documents'
  | 'employment'
  | 'sponsors'

export const REVIEW_AREA_ORDER: ReviewAreaId[] = [
  'passport',
  'trip',
  'accommodation',
  'insurance',
  'appointment',
  'documents',
  'employment',
  'sponsors',
]

/** Map a finding to its dossier area by `ruleId`. */
export function areaForRuleId(ruleId: string): ReviewAreaId {
  if (ruleId.startsWith('passport.')) return 'passport'
  if (ruleId.startsWith('accommodation.')) return 'accommodation'
  if (ruleId.startsWith('insurance.')) return 'insurance'
  if (ruleId.startsWith('employment.')) return 'employment'
  if (ruleId.startsWith('sponsor.')) return 'sponsors'
  if (ruleId.startsWith('document.')) return 'documents'
  if (ruleId === 'trip.appointmentBeforeTrip') return 'appointment'
  // Remaining trip.* rules concern the dates and the route itself.
  return 'trip'
}

export function areaForFinding(finding: ValidationFinding): ReviewAreaId {
  return areaForRuleId(finding.ruleId)
}

/**
 * Calm, presentation-first severity labels. The underlying engine severity is
 * unchanged — this only softens the wording ("Error" reads like a compiler; a
 * dossier review speaks in "needs attention"). See ADR-025.
 */
export const SEVERITY_LABEL_KEY: Record<ValidationSeverity, string> = {
  error: 'center.severity.attention',
  warning: 'center.severity.review',
  info: 'center.severity.note',
}

export const SEVERITY_TONE: Record<ValidationSeverity, StatusTone> = {
  error: 'danger',
  warning: 'warning',
  info: 'info',
}

/**
 * The health of a group/area, derived from the *worst* severity present.
 * `clear` means applicable and free of findings — the reassuring case.
 */
export type Health = 'attention' | 'review' | 'notes' | 'clear'

export function healthFromSeverities(severities: ValidationSeverity[]): Health {
  if (severities.includes('error')) return 'attention'
  if (severities.includes('warning')) return 'review'
  if (severities.includes('info')) return 'notes'
  return 'clear'
}

export const HEALTH_TONE: Record<Health, StatusTone> = {
  attention: 'danger',
  review: 'warning',
  notes: 'info',
  clear: 'success',
}

export const HEALTH_LABEL_KEY: Record<Health, string> = {
  attention: 'center.health.attention',
  review: 'center.health.review',
  notes: 'center.health.notes',
  clear: 'center.health.clear',
}
