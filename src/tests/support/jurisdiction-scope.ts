import type { CompositionResult } from '@/config/composition'

/**
 * Which requirements in a composition carry evidence scoped to one filing
 * jurisdiction, grouped by that jurisdiction.
 *
 * Logic with no data in it, deliberately. This used to live beside the
 * synthetic A/B × JX/JY layers in `fixtures/test-packs.ts`, which made the
 * production invariants import their detector from a module of made-up packs —
 * so a fixture edit could quietly change what the real pack was measured
 * against. The two proof scopes have to stay separate:
 *
 *  - the **synthetic** scope proves the generic composition and quarantine
 *    property, and that the property's negative controls fire;
 *  - the **production** scope asks whether the real layers and the real
 *    composed pack satisfy it, reading only production declarations.
 *
 * A shared helper is not a shared source of truth. Both scopes call this; each
 * supplies its own data and its own supra-national marker.
 *
 * DERIVED FROM CITATIONS, NEVER FROM LAYER MEMBERSHIP. Asking "is this
 * requirement in the jurisdiction layer" only restates how the pack was
 * assembled. Asking "does this requirement cite an authority scoped to a
 * jurisdiction" is the question ADR-048 actually poses, and it is the one that
 * still works when a refinement moves a citation across layers.
 */
export function jurisdictionScopedCodes(
  result: CompositionResult,
  /**
   * The marker meaning "authority spans the whole bloc, not one filing
   * jurisdiction" — `EU` for the production packs, `TESTBLOC` for the synthetic
   * ones.
   *
   * Required rather than defaulted, and the absent default is the point. This
   * hardcoded the synthetic constant at first, which made it silently wrong the
   * first time it was pointed at a real pack: every EU source counted as
   * jurisdiction-scoped and the invariant reported `EU` itself as foreign
   * evidence. A supra-national marker is not something a shared helper can
   * assume, so it has to be told.
   */
  supranational: string
): Map<string, string[]> {
  const scopedSourceJurisdiction = new Map<string, string>()
  for (const s of result.sources) {
    if (
      typeof s.jurisdiction === 'string' &&
      s.jurisdiction !== supranational
    ) {
      scopedSourceJurisdiction.set(s.id, s.jurisdiction)
    }
  }

  const byJurisdiction = new Map<string, string[]>()
  for (const requirement of result.template.documentRequirements) {
    for (const ref of requirement.sourceRefs ?? []) {
      const jurisdiction = scopedSourceJurisdiction.get(ref)
      if (!jurisdiction) continue
      const codes = byJurisdiction.get(jurisdiction) ?? []
      if (!codes.includes(requirement.code)) codes.push(requirement.code)
      byJurisdiction.set(jurisdiction, codes)
    }
  }
  return byJurisdiction
}
