import type { Application } from '@/domain/schemas/application.schema'
import type { Employment } from '@/domain/schemas/employment.schema'
import type { EmploymentStatus } from '@/domain/types/common'
import type { StepStatus } from '@/components/ui/stepper'

/**
 * The guided employment flow, as data.
 *
 * Pure — no React, no i18n, no formatting — so step ordering and completeness
 * can be unit-tested and reused. The UI resolves each id to a translated title
 * (`employment:steps.<id>.title`) and renders the statuses.
 *
 * Completeness is **status-aware**: for applicants without an employer
 * (unemployed / retired / student / homemaker / other), the employer / income /
 * leave / documents steps carry nothing to fill in, so they count as satisfied —
 * the rail never nags an applicant for whom a step does not apply.
 */
export const EMPLOYMENT_STEP_IDS = [
  'status',
  'employer',
  'income',
  'leave',
  'documents',
  'review',
] as const

export type EmploymentStepId = (typeof EMPLOYMENT_STEP_IDS)[number]

/** Statuses that involve an employer or business (employer/income steps apply). */
export function hasEmployer(status: EmploymentStatus | undefined): boolean {
  return status === 'employed' || status === 'self_employed'
}

/** Approved leave is only a concept for salaried (employed) applicants. */
export function leaveApplies(status: EmploymentStatus | undefined): boolean {
  return status === 'employed'
}

export function isStatusComplete(employment: Employment | undefined): boolean {
  return Boolean(employment?.employmentStatus)
}

export function isEmployerComplete(
  employment: Employment | undefined
): boolean {
  return Boolean(
    employment &&
    hasEmployer(employment.employmentStatus) &&
    employment.employerName &&
    employment.jobTitle &&
    employment.startDate
  )
}

export function isIncomeComplete(employment: Employment | undefined): boolean {
  return Boolean(
    employment &&
    hasEmployer(employment.employmentStatus) &&
    employment.monthlyNetIncome != null
  )
}

export function isLeaveComplete(employment: Employment | undefined): boolean {
  return Boolean(
    employment && employment.approvedLeaveStart && employment.approvedLeaveEnd
  )
}

/**
 * Whether a step counts as "done" for the rail. Steps that don't apply to the
 * current status are satisfied; the documents step (whose completeness depends
 * on the Documents workspace, not employment fields) is satisfied once passed;
 * Review is terminal and never auto-completes.
 */
export function isStepSatisfied(
  application: Application | null,
  stepId: EmploymentStepId,
  index: number,
  current: number
): boolean {
  const employment = application?.employment
  const status = employment?.employmentStatus
  switch (stepId) {
    case 'status':
      return isStatusComplete(employment)
    case 'employer':
      return hasEmployer(status) ? isEmployerComplete(employment) : true
    case 'income':
      return hasEmployer(status) ? isIncomeComplete(employment) : true
    case 'leave':
      return leaveApplies(status) ? isLeaveComplete(employment) : true
    case 'documents':
      return hasEmployer(status) ? index < current : true
    case 'review':
      return false
  }
}

export function deriveStepStatuses(
  application: Application | null,
  current: number
): StepStatus[] {
  return EMPLOYMENT_STEP_IDS.map((id, index) => {
    if (index === current) return 'current'
    return isStepSatisfied(application, id, index, current)
      ? 'complete'
      : 'upcoming'
  })
}
