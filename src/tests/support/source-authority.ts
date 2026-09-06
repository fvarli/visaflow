import type { CompositionResult } from '@/config/composition'

/**
 * Who published a source, as distinct from whom it governs.
 *
 * These are two different facts and the model conflates them. `jurisdiction`
 * answers "which applicants does this bind" — it is `TR` for the Commission's
 * harmonised list for Türkiye *and* for the Greek mission's rendering of that
 * same list. Only one of them is destination-neutral, and no existing field
 * says which:
 *
 *  - `sourceType` answers "what kind of document". `regulation` happens to
 *    coincide with today's supranational publishers, but a member state can
 *    publish a regulation, so inferring neutrality from it would repeat the
 *    exact mistake this module exists to catch.
 *  - `authority` is a free-text proper noun. Matching strings against it would
 *    make the invariant fail the day somebody improves a ministry's name.
 *
 * So the distinction is stated rather than derived, and it is stated in test
 * metadata rather than on `RequirementSource`: nothing at runtime asks who
 * published a citation. No page, model or resolver reads it. If a product
 * surface ever needs it, promoting it to the config type is a later move with
 * a reason behind it.
 */
export type PublishingAuthority =
  { kind: 'supranational' } | { kind: 'destination'; countryCode: string }

/**
 * Requirements in a composition whose every citation belongs to some *other*
 * destination's authority.
 *
 * "Every" and not "any", deliberately. A destination citing its own mission
 * alongside the neutral instrument is the designed outcome — Greece cites the
 * Commission act and the Greek mission's rendering of it, in that order. A rule
 * that rejected any foreign citation would reject the mechanism it is meant to
 * protect. What must not happen is a pack resting *solely* on another state's
 * mission: a German checklist whose only authority for SGK documents is the
 * Hellenic Republic.
 *
 * A requirement citing nothing is not this function's business. That is
 * coverage's question (ADR-046), and answering it here would make one failure
 * mean two things.
 *
 * Data-free on purpose. The classification map is supplied by the caller so
 * that the production invariant reads production sources and the synthetic
 * proofs read their own — neither taking its truth from the other.
 */
export function soleForeignAuthorityCodes(
  result: CompositionResult,
  destinationCountry: string,
  publisherOf: (sourceId: string) => PublishingAuthority | undefined
): string[] {
  const offenders: string[] = []

  for (const requirement of result.template.documentRequirements) {
    const refs = requirement.sourceRefs ?? []
    if (refs.length === 0) continue

    const acceptable = refs.some((ref) => {
      const publisher = publisherOf(ref)
      // An unclassified source is not silently treated as acceptable. The
      // completeness assertion is what reports it; here it simply cannot
      // vouch for the requirement.
      if (!publisher) return false
      return (
        publisher.kind === 'supranational' ||
        publisher.countryCode === destinationCountry
      )
    })

    if (!acceptable) offenders.push(requirement.code)
  }

  return offenders
}
