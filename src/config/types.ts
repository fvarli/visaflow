import type {
  DocumentCategory,
  OwnerType,
  VisaType,
} from '@/domain/types/common'

/**
 * Configuration model: country → visa type → requirements.
 *
 * Everything here is a TEMPLATE describing what an application may need. It
 * is never applicant data. The distinction matters:
 *
 *   DocumentRequirement — configuration. "A short-stay tourism application
 *                         may need an employment letter."
 *   Document (instance) — applicant record. "This applicant's employment
 *                         letter is requested and expires on 2026-09-01."
 *
 * Identifiers (countryCode, visaTypeId, requirement `code`) are stable and
 * language-independent. Everything a user reads is a translation key.
 */

export interface ConditionalRequirement {
  field: string
  operator: 'equals' | 'notEquals' | 'exists' | 'notExists' | 'includes'
  value?: string | boolean | number
}

/**
 * Where a requirement came from.
 *
 * VisaFlow does not scrape or call official websites. A source record is a
 * manually maintained citation, and its absence is meaningful: it means the
 * requirement has not been checked against a current official publication.
 */
export type RequirementSourceType =
  | 'embassy'
  | 'consulate'
  | 'authorized_visa_center'
  | 'government'
  | 'regulation'
  | 'other'

export interface RequirementSource {
  id: string
  /** Publishing body, as it names itself. A proper noun, so not translated. */
  authority: string
  /** Translation key for the document or page title. */
  titleKey: string
  url?: string
  sourceType: RequirementSourceType
  /** ISO 3166-1 alpha-2 where this source has authority. */
  jurisdiction?: string
  /** BCP 47 tag of the source document itself, not of the UI. */
  language?: string
  /** ISO date a maintainer last confirmed this template against the source. */
  lastVerifiedAt?: string
  /** ISO date the source was retrieved. */
  retrievedAt?: string
  notesKey?: string
}

/**
 * Content-maintenance status. NOT a legal guarantee, and never a statement
 * about whether a visa will be granted — only a record of how recently a
 * human checked this template against an official publication.
 */
export type ReviewStatus =
  'unverified' | 'partially_verified' | 'verified' | 'needs_review'

export interface DocumentRequirement {
  /** Stable and language-independent. Also the key into visa-domain strings. */
  code: string
  nameKey: string
  descriptionKey?: string
  notesKey?: string
  category: DocumentCategory
  ownerType: OwnerType
  required: boolean
  conditionalOn?: ConditionalRequirement
  /**
   * @deprecated Non-authoritative. Do not read this in production code.
   *
   * Ten of these numbers exist across the packs (90, 180, 30×8) and **nothing
   * consumes them**. That is the only reason they are harmless: they are
   * document-age rules with no recorded source, so the moment a consumer
   * appears VisaFlow begins asserting "payslips are valid 30 days" on nobody's
   * authority — an invented deadline of exactly the kind ADR-015 forbids.
   *
   * Kept rather than deleted because removing it is a change to the shared
   * pack contract with no offsetting benefit while it is inert. A normative
   * validity or freshness value must carry a verified `sourceRefs` entry
   * **before** any readiness, freshness, timeline, warning or UI consumer may
   * read it (ADR-046). A test pins the absence of consumers.
   */
  validityPeriodDays?: number
  /** Zero or more RequirementSource ids. Empty means unverified. */
  sourceRefs?: string[]
}

export interface PreparationMilestone {
  id: string
  nameKey: string
  descriptionKey: string
  daysBeforeAppointment: number
  relatedDocuments?: string[]
}

export interface VisaTypeTemplate {
  /** Stable, language-independent, e.g. 'schengen-short-stay-tourism'. */
  id: string
  /** Maps to the persisted dossier `application.visaType` enum. */
  visaType: VisaType
  nameKey: string
  documentRequirements: DocumentRequirement[]
  preparationMilestones: PreparationMilestone[]
  notesKeys?: string[]

  /** Template maintenance metadata. */
  templateVersion: string
  lastReviewedAt?: string
  reviewStatus: ReviewStatus
  sourceIds?: string[]
}

export interface CountryConfig {
  /** ISO 3166-1 alpha-2. The stable identifier stored in the dossier. */
  countryCode: string
  nameKey: string
  schengenMember: boolean
  visaTypes: VisaTypeTemplate[]
  /** Source records referenced by this country's requirements. */
  sources?: RequirementSource[]
}

/**
 * Unchanged from the previous configuration model — conditional evaluation
 * must behave identically, so this logic is reused verbatim.
 */
export function isRequirementApplicable(
  requirement: DocumentRequirement,
  context: Record<string, unknown>
): boolean {
  if (!requirement.conditionalOn) return true

  const { field, operator, value } = requirement.conditionalOn
  const fieldValue = getNestedValue(context, field)

  switch (operator) {
    case 'equals':
      return fieldValue === value
    case 'notEquals':
      return fieldValue !== value
    case 'exists':
      return (
        fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
      )
    case 'notExists':
      return (
        fieldValue === undefined || fieldValue === null || fieldValue === ''
      )
    case 'includes':
      return Array.isArray(fieldValue) && fieldValue.includes(value)
    default:
      return true
  }
}

// Helper to get nested object value by dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}
