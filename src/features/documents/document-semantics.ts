import { isRequirementApplicable } from '@/config/types'
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
   * Whether the code resolves to a requirement in the current template.
   *
   * False for custom documents, for retired codes, and for anything written by
   * a build this one does not know. **This is the load-bearing flag**: when it
   * is false the persisted snapshot wins, which is what stops read-time
   * derivation from doing the very thing it was written to prevent — handing an
   * old record the meaning of whatever requirement now occupies its slot.
   */
  isKnown: boolean
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
    // Custom, retired or unknown. The record describes itself.
    return {
      required: document.required,
      category: document.category,
      ownerType: document.ownerType,
      isApplicable: true,
      isKnown: false,
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
    isKnown: true,
    requirement,
  }
}

/**
 * Does this document count as outstanding work right now?
 *
 * Two independent gates, and both must pass: the requirement must still apply
 * to this dossier, and it must still be required. An optional document is real
 * work a person may choose to do — it is simply not work the readiness figure
 * is allowed to demand.
 */
export function countsTowardReadiness(
  document: Document,
  template: VisaTypeTemplate | undefined,
  application?: Application | null
): boolean {
  const semantics = resolveDocumentSemantics(document, template, application)
  return semantics.isApplicable && semantics.required
}
