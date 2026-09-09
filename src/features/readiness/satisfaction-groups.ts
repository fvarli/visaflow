import type { Document } from '@/domain/schemas/document.schema'
import type { SatisfactionGroup, VisaTypeTemplate } from '@/config/types'
import type { ApplicabilityContext } from '@/config/types'
import { isApplicable } from '@/features/documents/applicability'
import { effectiveStatus } from '@/features/documents/document-semantics'
import { READINESS_CLASS, type ReadinessClass } from './readiness-types'

/**
 * How an obligation with more than one accepted document is counted.
 *
 * A group occupies **one** slot in readiness no matter how many members it has,
 * and that slot is satisfied by the best any member has reached. Everything here
 * is pure and template-driven; nothing reads a persisted `required` flag.
 *
 * The rule this file exists to enforce, stated once: *the obligation is real and
 * the choice is real.* Counting each member separately would demand three
 * documents where the authority asks for one; dropping the members from the
 * denominator would let a dossier with none of them read as complete. One slot
 * is the only count that is true.
 */

/**
 * Best-first, because a group's slot takes the furthest any member has reached.
 *
 * `notApplicable` is absent deliberately: a member that does not apply is not a
 * worse outcome than one not started, it is simply not a route this applicant
 * has. Groups where *no* member applies are dropped before this is consulted.
 */
const CLASS_RANK: ReadinessClass[] = [
  'ready',
  'obtained',
  'inProgress',
  'needsUpdate',
  'notStarted',
]

export interface GroupSlot {
  group: SatisfactionGroup
  /** The members that apply to this dossier, in the authority's order. */
  applicableCodes: string[]
  /** How far the group has got — the best of its members. */
  status: ReadinessClass
  /** Which member reached it, when one has a record. */
  satisfiedBy: string | null
}

/** Every code that belongs to some group, for callers that must skip them. */
export function groupedCodes(
  template: VisaTypeTemplate | undefined
): Set<string> {
  return new Set(
    (template?.satisfactionGroups ?? []).flatMap((group) => group.anyOf)
  )
}

/**
 * The groups that apply to this dossier, with the status of each.
 *
 * A group is dropped entirely when none of its members applies — Greece's
 * employer-letter choice is conditional on being employed, so a student owes
 * nothing here and must not see a slot for it. It is also dropped when no
 * applicable member is `required`: an obligation nobody is obliged to meet is
 * not one, and the members stay countable individually as the optional
 * documents they are.
 */
export function resolveGroupSlots(
  template: VisaTypeTemplate | undefined,
  documents: Document[],
  context?: ApplicabilityContext
): GroupSlot[] {
  const groups = template?.satisfactionGroups ?? []
  if (groups.length === 0 || !template) return []

  const applicability: ApplicabilityContext = context ?? {}
  const byCode = new Map(documents.map((doc) => [doc.code, doc]))
  const slots: GroupSlot[] = []

  for (const group of groups) {
    const members = group.anyOf
      .map((code) => template.documentRequirements.find((r) => r.code === code))
      .filter((r) => r !== undefined)
      .filter((r) => isApplicable(r, applicability))

    if (members.length === 0) continue
    if (!members.some((r) => r.required)) continue

    let status: ReadinessClass = 'notStarted'
    let satisfiedBy: string | null = null

    for (const member of members) {
      const doc = byCode.get(member.code)
      // No record is `notStarted`, which is already the floor — so only a
      // record can improve the slot.
      if (!doc) continue
      const memberClass = READINESS_CLASS[effectiveStatus(doc, template)]
      // A member the applicant marked not-applicable is a route they declined,
      // not progress and not an obstacle.
      if (memberClass === 'notApplicable') continue
      if (CLASS_RANK.indexOf(memberClass) < CLASS_RANK.indexOf(status)) {
        status = memberClass
        satisfiedBy = member.code
      }
    }

    slots.push({
      group,
      applicableCodes: members.map((r) => r.code),
      status,
      satisfiedBy,
    })
  }

  return slots
}

/**
 * Codes the workspace must stop recommending because their group is done.
 *
 * Once one member is `ready` the obligation is met, so the other routes are not
 * outstanding work — recommending an itinerary to somebody who already has a
 * flight booking is the same false demand C3a removed from readiness, arriving
 * one screen later.
 */
export function satisfiedGroupMembers(
  template: VisaTypeTemplate | undefined,
  documents: Document[],
  context?: ApplicabilityContext
): Set<string> {
  const satisfied = new Set<string>()
  for (const slot of resolveGroupSlots(template, documents, context)) {
    if (slot.status !== 'ready') continue
    for (const code of slot.group.anyOf) satisfied.add(code)
  }
  return satisfied
}

/** The group a code belongs to, for surfaces that label it. */
export function groupFor(
  code: string,
  template: VisaTypeTemplate | undefined
): SatisfactionGroup | undefined {
  return (template?.satisfactionGroups ?? []).find((group) =>
    group.anyOf.includes(code)
  )
}
