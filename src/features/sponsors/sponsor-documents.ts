import { applicableRequirements } from '@/features/documents/template-sync'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { VisaTypeTemplate } from '@/config/types'
import type {
  DocumentCategory,
  DocumentStatus,
  OwnerType,
} from '@/domain/types/common'

/**
 * Per-sponsor document evidence — a pure view over the Documents feature.
 *
 * The Documents workspace stays the sole owner of document creation, status,
 * verification, dates, notes, and deletion. The Sponsors workspace only records
 * an **association** between an existing eligible document and a sponsor, via the
 * canonical `Sponsor.documentIds` (never a schema change, never a second store).
 * This module resolves those ids against `state.documents`, distinguishing linked
 * evidence, unlinked-but-eligible evidence, missing applicable requirements, and
 * stale references — so per-sponsor readiness is real (ADR-028).
 */

/** Codes that are sponsor evidence despite not being in the `sponsor` category. */
const SPONSOR_EVIDENCE_CODES = new Set<string>(['RELATIONSHIP_PROOF'])

/**
 * Whether a document/requirement is eligible sponsor evidence. Eligibility is a
 * property of the document (its category/code), independent of the current
 * funding source — so an existing sponsor letter can always be linked. Arbitrary
 * passport/trip/employment documents are never eligible.
 */
export function isSponsorEvidence(
  code: string,
  category: DocumentCategory
): boolean {
  return category === 'sponsor' || SPONSOR_EVIDENCE_CODES.has(code)
}

export interface SponsorDocRow {
  docId: string
  code: string
  /** Legacy display name fallback (resolve via `documentLabel(t, code, name)`). */
  name?: string
  category: DocumentCategory
  ownerType: OwnerType
  status: DocumentStatus
  linked: boolean
}

export interface SponsorMissingRequirement {
  code: string
  nameKey: string
  required: boolean
}

export interface SponsorDocumentsView {
  /** Eligible documents currently linked to this sponsor. */
  linked: SponsorDocRow[]
  /** Eligible documents that exist but are not linked to this sponsor. */
  eligibleUnlinked: SponsorDocRow[]
  /** Linked ids that resolve to no eligible document — surfaced, never crashing. */
  stale: string[]
  /** Applicable sponsor requirements with no document instance at all. */
  missingRequirements: SponsorMissingRequirement[]
  linkedCount: number
  /** Linked documents whose status is `ready`. */
  readyCount: number
}

function toRow(doc: Document, linked: boolean): SponsorDocRow {
  return {
    docId: doc.id,
    code: doc.code,
    name: doc.name,
    category: doc.category,
    ownerType: doc.ownerType,
    status: doc.status,
    linked,
  }
}

export function buildSponsorDocuments(
  sponsor: Sponsor,
  allDocuments: Document[],
  application: Application | null,
  template: VisaTypeTemplate | undefined
): SponsorDocumentsView {
  const eligible = allDocuments.filter((d) =>
    isSponsorEvidence(d.code, d.category)
  )
  const byId = new Map(allDocuments.map((d) => [d.id, d]))
  const linkedIds = new Set(sponsor.documentIds)

  const linked: SponsorDocRow[] = []
  const stale: string[] = []
  for (const id of sponsor.documentIds) {
    const doc = byId.get(id)
    if (doc && isSponsorEvidence(doc.code, doc.category)) {
      linked.push(toRow(doc, true))
    } else {
      // Missing entirely, or points at a now-ineligible document.
      stale.push(id)
    }
  }

  const eligibleUnlinked = eligible
    .filter((d) => !linkedIds.has(d.id))
    .map((d) => toRow(d, false))

  const presentCodes = new Set(allDocuments.map((d) => d.code))
  const missingRequirements: SponsorMissingRequirement[] = template
    ? applicableRequirements(template, application)
        .filter(
          (req) =>
            isSponsorEvidence(req.code, req.category) &&
            req.required &&
            !presentCodes.has(req.code)
        )
        .map((req) => ({
          code: req.code,
          nameKey: req.nameKey,
          required: req.required,
        }))
    : []

  return {
    linked,
    eligibleUnlinked,
    stale,
    missingRequirements,
    linkedCount: linked.length,
    readyCount: linked.filter((r) => r.status === 'ready').length,
  }
}
