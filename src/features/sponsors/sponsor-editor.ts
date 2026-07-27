import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { SponsorDocumentsView } from './sponsor-documents'

/**
 * The sponsor editor as data — the accordion section model for the editing Sheet.
 *
 * Pure: no React, no i18n. It decides which sections carry data, whether each is
 * "complete" (a calm organizational indicator, never a score), and which section
 * should open first (the first incomplete one). The Sheet resolves each id to a
 * translated title (`sponsors:editor.sections.<id>.title`) and renders the state.
 */

export const SPONSOR_SECTION_IDS = [
  'basics',
  'contact',
  'employment',
  'financial',
  'assets',
  'expenses',
  'letters',
  'documents',
  'review',
] as const

export type SponsorSectionId = (typeof SPONSOR_SECTION_IDS)[number]

/** The editable sections (everything except the terminal review summary). */
export const EDITABLE_SECTION_IDS = SPONSOR_SECTION_IDS.filter(
  (id) => id !== 'review'
)

/** Relationships that typically call for proof of relationship (mirrors the rule). */
const FAMILY_RELATIONSHIPS = new Set<string>([
  'spouse',
  'parent',
  'child',
  'sibling',
  'grandparent',
  'grandchild',
])

export function isFamilyRelationship(relationship: string): boolean {
  return FAMILY_RELATIONSHIPS.has(relationship)
}

/**
 * Whether a section has meaningful data recorded. Optional sections are "complete"
 * once they carry any relevant value; this drives the per-section completion
 * indicator and the first-incomplete auto-open — it never blocks or judges.
 */
export function isSectionComplete(
  sponsor: Sponsor,
  documents: SponsorDocumentsView,
  section: SponsorSectionId
): boolean {
  switch (section) {
    case 'basics':
      return Boolean(
        sponsor.firstName && sponsor.lastName && sponsor.relationship
      )
    case 'contact':
      return Boolean(
        sponsor.email ||
        sponsor.phone ||
        sponsor.address ||
        sponsor.countryOfResidence ||
        sponsor.nationality
      )
    case 'employment':
      return Boolean(sponsor.employmentStatus)
    case 'financial':
      return sponsor.monthlyIncome != null || sponsor.liquidAssets != null
    case 'assets':
      return sponsor.investments.length > 0 || sponsor.ownedAssets.length > 0
    case 'expenses':
      return sponsor.coveredExpenses.length > 0
    case 'letters':
      return sponsor.sponsorshipLetter || sponsor.proofOfRelationship
    case 'documents':
      return (
        documents.linkedCount > 0 && documents.missingRequirements.length === 0
      )
    case 'review':
      // A summary, never a data gap — always treated as "settled".
      return true
  }
}

export interface SponsorSectionState {
  id: SponsorSectionId
  complete: boolean
}

export function deriveSectionStates(
  sponsor: Sponsor,
  documents: SponsorDocumentsView
): SponsorSectionState[] {
  return SPONSOR_SECTION_IDS.map((id) => ({
    id,
    complete: isSectionComplete(sponsor, documents, id),
  }))
}

/**
 * The section to open when the editor mounts: the first incomplete editable
 * section, or the review summary when everything is already settled.
 */
export function firstIncompleteSection(
  sponsor: Sponsor,
  documents: SponsorDocumentsView
): SponsorSectionId {
  const first = EDITABLE_SECTION_IDS.find(
    (id) => !isSectionComplete(sponsor, documents, id)
  )
  return first ?? 'review'
}
