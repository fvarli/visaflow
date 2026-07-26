import { useMemo } from 'react'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type { EmploymentStatus } from '@/domain/types/common'
import { runValidation } from '@/domain/rules/runner'
import type { ValidationFinding } from '@/domain/rules/types'
import { resolveVisaTemplate } from '@/config/countries'
import { useDossier } from '@/app/providers/DossierProvider'
import { computeTenure, type Tenure } from './employment-tenure'
import {
  deriveEmploymentGuidance,
  type EmploymentGuidanceHint,
} from './employment-guidance'
import {
  buildEmploymentDocuments,
  type EmploymentDocumentsView,
} from './employment-documents'
import {
  hasEmployer,
  isEmployerComplete,
  isIncomeComplete,
  isLeaveComplete,
  leaveApplies,
} from './employment-wizard'

/**
 * The Employment workspace's presentation model.
 *
 * The one place the page derives its shape, so the page and its widgets stay
 * pure presentation. It re-encodes no rule: leave coverage comes straight from
 * the `employment.leaveCoversTrip` findings `runValidation` already produces,
 * document readiness from the Documents feature's canonical helpers, and tenure
 * from `computeTenure`. It is i18n/Intl-free (raw values + stable keys), so it
 * unit-tests without a React provider (ADR-026).
 */

export interface EmploymentInput {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
}

export type EmploymentReviewStatus =
  'captured' | 'incomplete' | 'needsReview' | 'notApplicable'

export type EmploymentReviewSectionId =
  'status' | 'employer' | 'income' | 'leave' | 'documents'

export interface EmploymentReviewSection {
  id: EmploymentReviewSectionId
  status: EmploymentReviewStatus
}

export interface LeaveView {
  /** Approved leave only applies to salaried (employed) applicants. */
  applicable: boolean
  start: string | null
  end: string | null
  tripEntry: string | null
  tripExit: string | null
  /** The engine's `employment.leaveCoversTrip` findings, verbatim. */
  findings: ValidationFinding[]
}

export interface EmploymentModel {
  hasData: boolean
  status: EmploymentStatus | null
  /** employed or self_employed — an employer/business is involved. */
  isActive: boolean
  tenure: Tenure
  leave: LeaveView
  documents: EmploymentDocumentsView
  guidance: EmploymentGuidanceHint[]
  review: EmploymentReviewSection[]
}

function toDossier(
  applicant: Applicant,
  application: Application,
  documents: Document[],
  sponsors: Sponsor[]
): Dossier {
  return {
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    applicant,
    application,
    documents,
    sponsors,
  }
}

function buildReview(
  employment: Application['employment'],
  docView: EmploymentDocumentsView,
  leaveFindings: ValidationFinding[]
): EmploymentReviewSection[] {
  const status = employment?.employmentStatus
  const sections: EmploymentReviewSection[] = [
    { id: 'status', status: status ? 'captured' : 'incomplete' },
  ]

  if (hasEmployer(status)) {
    sections.push({
      id: 'employer',
      status: isEmployerComplete(employment) ? 'captured' : 'incomplete',
    })
    sections.push({
      id: 'income',
      status: isIncomeComplete(employment) ? 'captured' : 'incomplete',
    })
  } else {
    sections.push({ id: 'employer', status: 'notApplicable' })
    sections.push({ id: 'income', status: 'notApplicable' })
  }

  if (!leaveApplies(status)) {
    sections.push({ id: 'leave', status: 'notApplicable' })
  } else if (leaveFindings.length > 0) {
    sections.push({ id: 'leave', status: 'needsReview' })
  } else {
    sections.push({
      id: 'leave',
      status: isLeaveComplete(employment) ? 'captured' : 'incomplete',
    })
  }

  if (docView.rows.length === 0) {
    sections.push({ id: 'documents', status: 'notApplicable' })
  } else if (
    docView.rows.every(
      (r) => r.status === 'ready' || r.status === 'not_applicable'
    )
  ) {
    sections.push({ id: 'documents', status: 'captured' })
  } else {
    sections.push({ id: 'documents', status: 'needsReview' })
  }

  return sections
}

export function buildEmploymentModel(
  input: EmploymentInput,
  now: Date = new Date()
): EmploymentModel {
  const { applicant, application, documents, sponsors } = input
  const hasData = application !== null
  const employment = application?.employment
  const status = employment?.employmentStatus ?? null

  const template = resolveVisaTemplate(
    application?.destinationCountry,
    application?.visaType
  )
  const docView = buildEmploymentDocuments(documents, application, template)

  const leaveFindings =
    applicant && application
      ? runValidation(
          toDossier(applicant, application, documents, sponsors)
        ).findings.filter((f) => f.ruleId.startsWith('employment.'))
      : []

  const trip = application?.trip
  const leave: LeaveView = {
    applicable: leaveApplies(status ?? undefined),
    start: employment?.approvedLeaveStart ?? null,
    end: employment?.approvedLeaveEnd ?? null,
    tripEntry: trip?.entryDate ?? null,
    tripExit: trip?.exitDate ?? null,
    findings: leaveFindings,
  }

  return {
    hasData,
    status,
    isActive: hasEmployer(status ?? undefined),
    tenure: computeTenure(employment?.startDate, now),
    leave,
    documents: docView,
    guidance: deriveEmploymentGuidance(employment),
    review: buildReview(employment, docView, leaveFindings),
  }
}

/** Component-facing hook: derives the model once per state change. */
export function useEmploymentModel(): EmploymentModel {
  const { state } = useDossier()
  return useMemo(
    () =>
      buildEmploymentModel({
        applicant: state.applicant,
        application: state.application,
        documents: state.documents,
        sponsors: state.sponsors,
      }),
    [state]
  )
}
