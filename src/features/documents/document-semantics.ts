import { isRequirementApplicable } from '@/config/types'
import { isRetiredRequirement } from '@/config/countries/retired'
import { isCustomCode } from '@/features/documents/template-sync'
import type { DocumentRequirement, VisaTypeTemplate } from '@/config/types'
import type { Document } from '@/domain/schemas/document.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type {
  DocumentCategory,
  DocumentStatus,
  OwnerType,
} from '@/domain/types/common'

/**
 * What a stored document *currently means*, as opposed to what it meant when it
 * was created.
 *
 * `documentFromRequirement` copies `required`, `category` and `ownerType` out of
 * the template at seed time and then never touches them again. Nothing updates
 * them: sync is add-only, storage migrations only touch the record envelope,
 * and no screen exposes an editor. So a correction to the pack could not reach
 * a dossier that already existed — the SGK documents became required of
 * employed applicants and every existing dossier carried on treating them as
 * optional (ADR-048, ADR-049).
 *
 * Worse, the codebase had already half-solved this and disagreed with itself:
 * `documentLabel` and `classifyDoc` re-derive from the template on read, while
 * readiness trusted the frozen snapshot. The same document could show a
 * "required" badge and be counted as optional in the same percentage.
 *
 * This is the one place that decides. Template-owned facts come from the
 * template; user-owned state — status, notes, dates, files — is never derived
 * and never touched.
 *
 * Nothing here mutates the document or writes back to storage. The persisted
 * fields stay exactly as they are: they remain the export format, and they are
 * the fallback for a code the template no longer knows.
 */
export type DocumentMembership = 'active' | 'retired' | 'custom' | 'unknown'

export interface DocumentSemantics {
  required: boolean
  category: DocumentCategory
  ownerType: OwnerType
  /**
   * Whether the requirement applies to this dossier right now. A record left
   * behind by an applicability change stays visible and keeps its user state,
   * but must not be counted as outstanding work.
   */
  isApplicable: boolean
  /**
   * Which requirement set this document's code belongs to.
   *
   * This replaces a boolean that collapsed three different domain states into
   * one, which is exactly how a retired obligation ended up counted as live
   * work: `retired`, `custom` and `unknown` all fell into the same branch and
   * inherited the persisted `required` flag (ADR-050).
   *
   * - `active` — a requirement in the current template. The only membership
   *   that participates in current readiness.
   * - `retired` — an identity VisaFlow *recognises* and has withdrawn. Decided
   *   by the registry, never by absence from the template.
   * - `custom` — a supporting document the applicant added themselves.
   * - `unknown` — a code this build cannot account for, from an older or
   *   foreign export.
   *
   * The last three all preserve the persisted snapshot, which is what stops
   * read-time derivation from handing an old record the meaning of whatever
   * requirement now occupies its slot. They differ in what they *mean*, and
   * therefore in how they are presented.
   */
  membership: DocumentMembership
  /** The matching requirement, when there is one. */
  requirement?: DocumentRequirement
}

/**
 * Resolve the effective, template-owned meaning of a stored document.
 *
 * `application` is optional so callers that only need requiredness need not
 * thread it through; without it applicability cannot be evaluated and a known
 * requirement is treated as applicable, matching the template's own default.
 */
export function resolveDocumentSemantics(
  document: Document,
  template: VisaTypeTemplate | undefined,
  application?: Application | null
): DocumentSemantics {
  const requirement = template?.documentRequirements.find(
    (r) => r.code === document.code
  )

  if (!requirement) {
    // Not current work. The record describes itself, and *which kind* of
    // non-current it is decides how it is counted and how it is presented.
    // Order matters: the registry is consulted before the custom prefix, so a
    // withdrawn requirement is never mistaken for something the user typed in.
    return {
      required: document.required,
      category: document.category,
      ownerType: document.ownerType,
      isApplicable: true,
      membership: isRetiredRequirement(document.code)
        ? 'retired'
        : isCustomCode(document.code)
          ? 'custom'
          : 'unknown',
    }
  }

  const isApplicable =
    application === undefined
      ? true
      : isRequirementApplicable(requirement, {
          employment: application?.employment,
          financing: application?.financing,
        })

  return {
    required: requirement.required,
    category: requirement.category,
    ownerType: requirement.ownerType,
    isApplicable,
    membership: 'active',
    requirement,
  }
}

/**
 * Does this document count as outstanding work right now?
 *
 * Three gates, and all must pass: the code must name a requirement the current
 * template still asks for, that requirement must apply to this dossier, and it
 * must be required.
 *
 * The first gate is the one this project learned the hard way. A retired
 * obligation carries `required: true` in storage forever, so without a
 * membership check a withdrawn requirement counts as satisfied work and pushes
 * the readiness percentage *up* — the applicant looks better prepared because
 * of something nobody asks for any more (ADR-050).
 */
export function countsTowardReadiness(
  document: Document,
  template: VisaTypeTemplate | undefined,
  application?: Application | null
): boolean {
  const semantics = resolveDocumentSemantics(document, template, application)
  return (
    semantics.membership === 'active' &&
    semantics.isApplicable &&
    semantics.required
  )
}

/**
 * The acceptance-contract revision a requirement currently asks for.
 *
 * Only an active requirement has one. A retired, custom or unrecognised code
 * has no current contract to satisfy, so there is nothing to stamp.
 *
 * No fallback: `revision` is required on every requirement, so a missing value
 * is a pack that does not compile rather than a silent 1 (ADR-051).
 */
export function requirementRevision(
  code: string,
  template: VisaTypeTemplate | undefined
): number | undefined {
  return template?.documentRequirements.find((r) => r.code === code)?.revision
}

/**
 * Apply a document edit, keeping the completion stamp honest.
 *
 * The stamp records which requirement definition the user is claiming to
 * satisfy — so it is written when they assert `ready`, and removed when they
 * assert anything else. Seeding is deliberately not the seam: a freshly seeded
 * record is `not_started`, which claims nothing, and stamping it there is what
 * would leave a user who later complies looking permanently stale (ADR-049).
 *
 * The trigger is an update that *speaks about status*, not one that changes it.
 * Re-asserting `ready` on an already-`ready` record is the whole point: it is
 * how somebody whose claim was superseded says "I have the new evidence too",
 * and a change-detecting guard would silently drop exactly that assertion. An
 * update that says nothing about status — a note, a date, a file reference —
 * is not a claim and leaves the stamp alone.
 *
 * Pure. Every other field passes through untouched.
 */
export function applyDocumentUpdate(
  document: Document,
  updates: Partial<Document>,
  template: VisaTypeTemplate | undefined
): Document {
  const next = { ...document, ...updates }
  if (updates.status === undefined) return next

  if (next.status === 'ready') {
    const revision = requirementRevision(next.code, template)
    return revision === undefined
      ? next
      : { ...next, satisfiedRevision: revision }
  }

  // The claim no longer stands, so neither does its provenance. Leaving it
  // would make the field a record of the past contradicting the status beside
  // it — a different concept, and not this one.
  const { satisfiedRevision: _released, ...withoutClaim } = next
  return withoutClaim
}

/**
 * How a completion claim stands against the requirement as it is now.
 *
 * - `none` — no claim is being made.
 * - `current` — claimed against the definition in force.
 * - `superseded` — the bar rose after the claim was made.
 * - `unrecorded` — a claim from before provenance existed. **Not** superseded:
 *   absence of a stamp is not evidence about the evidence.
 */
export type CompletionStanding =
  'none' | 'current' | 'superseded' | 'unrecorded'

/**
 * The status the rest of the product should *count and filter* this document
 * under, as opposed to the status stored on it.
 *
 * They differ in exactly one case. A claim made against a superseded
 * requirement keeps `status: 'ready'` — that is the applicant's own assertion
 * and is never rewritten — while the derived answer is that the requirement is
 * not satisfied today, which is `needs_update`: "obtained, but needing
 * correction" (ADR-051).
 *
 * This exists because that reclassification was written inline in the readiness
 * counter and nowhere else, so the Documents chips filtered on the persisted
 * field and contradicted the very numbers they were labelled with: "Needs
 * update 1" revealed no rows, and "Ready 6" revealed seven, the seventh being
 * the superseded claim displayed among the satisfied. One definition, used by
 * both.
 */
export function effectiveStatus(
  document: Document,
  template: VisaTypeTemplate | undefined
): DocumentStatus {
  return completionStanding(document, template) === 'superseded'
    ? 'needs_update'
    : document.status
}

export function completionStanding(
  document: Document,
  template: VisaTypeTemplate | undefined
): CompletionStanding {
  if (document.status !== 'ready') return 'none'
  const revision = requirementRevision(document.code, template)
  if (revision === undefined) return 'current'
  if (document.satisfiedRevision === undefined) return 'unrecorded'
  return document.satisfiedRevision < revision ? 'superseded' : 'current'
}
