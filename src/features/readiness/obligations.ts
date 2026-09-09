import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { DocumentCategory } from '@/domain/types/common'
import type { VisaTypeTemplate } from '@/config/types'
import {
  resolveDocumentSemantics,
  effectiveStatus,
} from '@/features/documents/document-semantics'
import { READINESS_CLASS, type ReadinessClass } from './readiness-types'
import { groupedCodes, resolveGroupSlots } from './satisfaction-groups'

/**
 * What this dossier currently owes, one entry per obligation.
 *
 * This is the walk `buildDocumentReadiness` used to do inline, lifted out so
 * that the percentage and anything else that counts obligations read the same
 * list rather than two implementations that agree until one is edited. That is
 * not hypothetical: the Documents category caption was a second implementation,
 * it counted required *requirements*, and it went on reading "1/4" under a hero
 * reading "1 of 11" for an obligation the authority states as one-of-two.
 *
 * An obligation is not a document. Three shapes produce one:
 *
 *  - an active, applicable, required requirement with a record — classified by
 *    its **effective** status, so a claim made against a superseded contract
 *    counts as needing an update rather than as satisfied (ADR-051);
 *  - the same, with no record at all — work that has not been started;
 *  - a satisfaction group — **one** entry however many documents can satisfy it,
 *    taking the best status any member reached (C3a).
 *
 * Optional requirements, custom documents and retired records are deliberately
 * absent: none of them is work this dossier owes, and the readiness model counts
 * them on their own axes.
 */
export interface Obligation {
  /** A requirement code, or `group:<id>` for a satisfaction group. */
  id: string
  /**
   * Where the obligation is shown.
   *
   * A group takes the category of its first applicable member. Every production
   * group's members share one category, so the choice is not currently visible;
   * it is deterministic rather than enforced, because requiring members to share
   * a category would be a new rule about groups and this is not the place to
   * make one.
   *
   * Absent when the caller passed no template: a category places an obligation
   * on a screen, and a caller without a pack has no screen to place it on. It is
   * never absent for anything that counts — readiness ignores this field, and
   * the surfaces that group by it always resolve a template first.
   */
  category?: DocumentCategory
  status: ReadinessClass
}

export interface ObligationInput {
  documents: Document[]
  /** Applicable **required** requirement codes, from `requirement-readiness`. */
  requiredRequirementCodes?: string[]
  template?: VisaTypeTemplate
  application?: Application | null
}

export function resolveObligations({
  documents,
  requiredRequirementCodes = [],
  template,
  application,
}: ObligationInput): Obligation[] {
  const grouped = groupedCodes(template)
  const present = new Set(documents.map((doc) => doc.code))
  const obligations: Obligation[] = []

  for (const doc of documents) {
    const semantics = resolveDocumentSemantics(doc, template, application)

    // Retirement is a registry fact, true with or without a template, and a
    // withdrawn requirement is not current work (ADR-050).
    if (semantics.membership === 'retired') continue

    // Activeness cannot be judged without a template — every code would look
    // unresolved — so callers that omit it keep counting the records in front
    // of them, which is correct for them.
    if (template) {
      if (semantics.membership === 'unknown') continue
      // Real work somebody chose to do, never an authoritative requirement.
      if (semantics.membership === 'custom') continue
    }

    // A record left behind by an applicability change keeps its user state and
    // stays visible, but it is not work this dossier still owes (ADR-049).
    if (!semantics.isApplicable) continue
    if (!semantics.required) continue
    // Counted as its group, once, below.
    if (grouped.has(doc.code)) continue

    obligations.push({
      id: doc.code,
      category: semantics.category,
      status: READINESS_CLASS[effectiveStatus(doc, template)],
    })
  }

  // A requirement with no record at all is work that has not been started.
  for (const code of requiredRequirementCodes) {
    if (present.has(code) || grouped.has(code)) continue
    // Emitted with or without a template: this is an obligation the caller
    // told us is required, and dropping it because no pack is resolved would
    // hide uncollected work behind a 100% ring.
    const requirement = template?.documentRequirements.find(
      (r) => r.code === code
    )
    obligations.push({
      id: code,
      ...(requirement ? { category: requirement.category } : {}),
      status: 'notStarted',
    })
  }

  /**
   * One entry per applicable group, whatever its size.
   *
   * A group enters on exactly the terms an ungrouped requirement does: some
   * member has a record, or some member is in the caller's
   * `requiredRequirementCodes`. Callers passing an empty list are counting the
   * records in front of them rather than the obligations a pack imposes, and a
   * group must not be the one thing that ignores them.
   */
  const countable = new Set(requiredRequirementCodes)
  for (const slot of resolveGroupSlots(template, documents, application)) {
    const enters = slot.applicableCodes.some(
      (code) => present.has(code) || countable.has(code)
    )
    if (!enters) continue
    const first = template?.documentRequirements.find(
      (r) => r.code === slot.applicableCodes[0]
    )
    if (!first) continue
    obligations.push({
      id: `group:${slot.group.id}`,
      category: first.category,
      status: slot.status,
    })
  }

  return obligations
}
