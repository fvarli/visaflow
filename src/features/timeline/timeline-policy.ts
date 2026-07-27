import { commonPreparationMilestones } from '@/config/countries/common/schengen-short-stay'
import type { PreparationMilestone, VisaTypeTemplate } from '@/config/types'

/**
 * Timeline preparation policy — the recommended lead times for preparation tasks.
 *
 * This is **not** an official deadline calculator. It normalizes the country
 * template's existing `preparationMilestones` (VisaFlow's organizational
 * recommendations, override-ready per country/visa type) into a small, pure
 * policy the plan derives target dates from. When no template resolves, it falls
 * back to the shared Schengen defaults. It invents no official-source metadata
 * and adds no arbitrary knobs — the source of truth stays the template config
 * (ADR: timeline recommendations are organisational defaults, not deadlines).
 */

/** The dossier area a preparation task belongs to — drives grouping and deep-links. */
export type TaskDomain =
  | 'employment'
  | 'finance'
  | 'sponsor'
  | 'insurance'
  | 'reservations'
  | 'documents'
  | 'passport'
  | 'review'

export interface TimelinePolicyItem {
  /** Stable milestone id (e.g. `obtain-bank-statements`). */
  id: string
  /** Recommended days before the appointment to complete this task. */
  leadDays: number
  /** Document codes this task prepares (may be empty, e.g. final review). */
  relatedDocuments: string[]
  /** i18n key for the task title (`visa-domain:milestones.<id>.name`). */
  nameKey: string
  /** i18n key for the "why now" reason (`visa-domain:milestones.<id>.description`). */
  reasonKey: string
  domain: TaskDomain
}

/** Milestone id → dossier domain. Ids are stable, language-independent. */
const DOMAIN_BY_MILESTONE: Record<string, TaskDomain> = {
  'request-employer-docs': 'employment',
  'request-employer-company-docs': 'employment',
  'obtain-bank-statements': 'finance',
  'purchase-insurance': 'insurance',
  'confirm-reservations': 'reservations',
  'take-photos': 'documents',
  'final-review': 'review',
}

function domainFor(id: string): TaskDomain {
  return DOMAIN_BY_MILESTONE[id] ?? 'documents'
}

function normalize(milestone: PreparationMilestone): TimelinePolicyItem {
  return {
    id: milestone.id,
    leadDays: milestone.daysBeforeAppointment,
    relatedDocuments: milestone.relatedDocuments ?? [],
    nameKey: milestone.nameKey,
    reasonKey: milestone.descriptionKey,
    domain: domainFor(milestone.id),
  }
}

/**
 * Resolve the preparation policy for a template. Uses the template's own
 * milestones when present; otherwise the shared Schengen defaults so the plan is
 * never empty. Deterministic and pure.
 */
export function resolveTimelinePolicy(
  template: VisaTypeTemplate | undefined
): TimelinePolicyItem[] {
  const milestones =
    template?.preparationMilestones ?? commonPreparationMilestones
  return milestones.map(normalize)
}

/** VisaFlow-default lead time (days) for a derived sponsor-evidence task. */
export const SPONSOR_EVIDENCE_LEAD_DAYS = 14

/** Sponsor-evidence document codes (the derived sponsor task prepares these). */
export const SPONSOR_EVIDENCE_CODES = [
  'SPONSOR_LETTER',
  'SPONSOR_BANK_STATEMENTS',
  'SPONSOR_INCOME_PROOF',
]
