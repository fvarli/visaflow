import { isRequirementApplicable } from '@/config/types'
import { isRetiredRequirement } from '@/config/countries/retired'
import { isCustomCode } from '@/features/documents/template-sync'
import type { DocumentRequirement, VisaTypeTemplate } from '@/config/types'
import type { Document } from '@/domain/schemas/document.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { DocumentCategory, OwnerType } from '@/domain/types/common'

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
