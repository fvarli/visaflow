import { useMemo } from 'react'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type {
  Currency,
  ExpenseType,
  SponsorRelationship,
} from '@/domain/types/common'
import { runValidation } from '@/domain/rules/runner'
import type { ValidationFinding } from '@/domain/rules/types'
import { resolveVisaTemplate } from '@/config/countries'
import { useDossier } from '@/app/providers/DossierProvider'
import {
  buildSponsorDocuments,
  type SponsorDocumentsView,
} from './sponsor-documents'
import { isFamilyRelationship } from './sponsor-editor'

/**
 * The Sponsors workspace presentation model.
 *
 * The one place the page derives its shape, so the cards and editor stay pure
 * presentation. It re-encodes no rule: sponsor findings come straight from
 * `runValidation`'s `sponsor.*` output, document evidence from the Documents
 * feature via `Sponsor.documentIds`, and per-sponsor "readiness" is an
 * organizational status label — never a financial-strength score, an asset
 * comparison, or an approval likelihood (ADR-016/ADR-028). It is i18n/Intl-free,
 * so it unit-tests without a React provider.
 */

export interface SponsorsInput {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
}

/** A calm, organizational status — not a score, not a prediction. */
export type SponsorReadiness = 'ready' | 'needsAttention' | 'incomplete'

export interface SponsorParticipation {
  coveredExpenses: ExpenseType[]
  monthlyIncome: number | null
  currency: Currency
  /** Mirrors the rule's "has financial info" test (income / assets / investments). */
  hasFinanceInfo: boolean
}

/** A typed reason a sponsor's evidence is incomplete; prose resolved in the UI. */
export interface SponsorMissingReason {
  id: string
  /** Optional document code for a `requirement:<code>` reason. */
  code?: string
}

/** The single most useful next step for a sponsor; prose resolved in the UI. */
export interface SponsorNextAction {
  id: string
  code?: string
}

export interface SponsorCardView {
  id: string
  firstName: string
  lastName: string
  relationship: SponsorRelationship
  isFamily: boolean
  readiness: SponsorReadiness
  participation: SponsorParticipation
  documents: SponsorDocumentsView
  /** This sponsor's own `sponsor.*` findings, verbatim. */
  findings: ValidationFinding[]
  missing: SponsorMissingReason[]
  nextAction: SponsorNextAction | null
  hasStale: boolean
}

export interface SponsorsModel {
  hasData: boolean
  count: number
  sponsors: SponsorCardView[]
  /** Whether the funding source involves a sponsor (sponsor / mixed). */
  fundingApplies: boolean
  /** Sponsor funding is selected but no sponsor exists yet (dossier-level finding). */
  needsSponsorButNone: boolean
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

/** The sponsor a finding is tied to, or null for a dossier-level finding. */
function sponsorIdForFinding(finding: ValidationFinding): string | null {
  for (const field of finding.relatedFields) {
    const match = /^sponsors\.([^.]+)\./.exec(field)
    if (match) return match[1] ?? null
  }
  return null
}

function hasFinanceInfo(sponsor: Sponsor): boolean {
  return (
    sponsor.monthlyIncome !== undefined ||
    sponsor.liquidAssets !== undefined ||
    sponsor.investments.length > 0
  )
}

function deriveMissing(
  sponsor: Sponsor,
  documents: SponsorDocumentsView
): SponsorMissingReason[] {
  const missing: SponsorMissingReason[] = []
  if (!hasFinanceInfo(sponsor)) missing.push({ id: 'financeInfo' })
  if (!sponsor.sponsorshipLetter) missing.push({ id: 'sponsorshipLetter' })
  if (
    isFamilyRelationship(sponsor.relationship) &&
    !sponsor.proofOfRelationship
  )
    missing.push({ id: 'relationshipProof' })
  if (documents.linkedCount === 0) missing.push({ id: 'noLinkedDocuments' })
  for (const req of documents.missingRequirements) {
    missing.push({ id: 'requirement', code: req.code })
  }
  return missing
}

function deriveNextAction(
  sponsor: Sponsor,
  documents: SponsorDocumentsView
): SponsorNextAction | null {
  if (documents.stale.length > 0) return { id: 'reviewStale' }
  if (documents.missingRequirements.length > 0)
    return { id: 'addDocument', code: documents.missingRequirements[0]!.code }
  if (hasFinanceInfo(sponsor) && documents.linkedCount === 0)
    return { id: 'linkDocuments' }
  if (documents.eligibleUnlinked.length > 0 && documents.linkedCount === 0)
    return { id: 'linkDocuments' }
  if (
    isFamilyRelationship(sponsor.relationship) &&
    !sponsor.proofOfRelationship
  )
    return { id: 'addRelationshipProof' }
  if (!sponsor.sponsorshipLetter) return { id: 'addSponsorshipLetter' }
  return null
}

function deriveReadiness(
  sponsor: Sponsor,
  documents: SponsorDocumentsView,
  findings: ValidationFinding[]
): SponsorReadiness {
  if (findings.length > 0 || documents.stale.length > 0) return 'needsAttention'
  if (documents.missingRequirements.length > 0) return 'needsAttention'
  const hasParticipation =
    hasFinanceInfo(sponsor) ||
    sponsor.coveredExpenses.length > 0 ||
    documents.linkedCount > 0 ||
    sponsor.sponsorshipLetter
  return hasParticipation ? 'ready' : 'incomplete'
}

export function buildSponsorsModel(input: SponsorsInput): SponsorsModel {
  const { applicant, application, documents, sponsors } = input
  const hasData = application !== null

  const template = resolveVisaTemplate(
    application?.destinationCountry,
    application?.visaType
  )

  const sponsorFindings =
    applicant && application
      ? runValidation(
          toDossier(applicant, application, documents, sponsors)
        ).findings.filter((f) => f.ruleId.startsWith('sponsor.'))
      : []

  const cards: SponsorCardView[] = sponsors.map((sponsor) => {
    const docView = buildSponsorDocuments(
      sponsor,
      documents,
      application,
      template
    )
    const findings = sponsorFindings.filter(
      (f) => sponsorIdForFinding(f) === sponsor.id
    )
    return {
      id: sponsor.id,
      firstName: sponsor.firstName,
      lastName: sponsor.lastName,
      relationship: sponsor.relationship,
      isFamily: isFamilyRelationship(sponsor.relationship),
      readiness: deriveReadiness(sponsor, docView, findings),
      participation: {
        coveredExpenses: sponsor.coveredExpenses,
        monthlyIncome: sponsor.monthlyIncome ?? null,
        currency: sponsor.currency,
        hasFinanceInfo: hasFinanceInfo(sponsor),
      },
      documents: docView,
      findings,
      missing: deriveMissing(sponsor, docView),
      nextAction: deriveNextAction(sponsor, docView),
      hasStale: docView.stale.length > 0,
    }
  })

  const source = application?.financing?.source
  const fundingApplies = source === 'sponsor' || source === 'mixed'

  return {
    hasData,
    count: sponsors.length,
    sponsors: cards,
    fundingApplies,
    needsSponsorButNone: fundingApplies && sponsors.length === 0,
  }
}

/** Component-facing hook: derives the model once per state change. */
export function useSponsorsModel(): SponsorsModel {
  const { state } = useDossier()
  return useMemo(
    () =>
      buildSponsorsModel({
        applicant: state.applicant,
        application: state.application,
        documents: state.documents,
        sponsors: state.sponsors,
      }),
    [state]
  )
}
