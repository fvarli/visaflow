import { germanyTourismComposition } from '@/config/countries/germany/tourism'
import { greeceTourismComposition } from '@/config/countries/greece/tourism'
import type { CompositionResult } from '@/config/composition'

/**
 * Every production pack's composition, addressed by country code.
 *
 * THIS IS DATA, NOT A DETECTOR, AND THE DISTINCTION IS DELIBERATE. The helpers
 * beside it — `jurisdiction-scope.ts`, `source-authority.ts` — are data-free on
 * purpose so that the synthetic proofs and the production invariants never take
 * their truth from each other. This module is the opposite thing: the list of
 * real packs, in one place, so that an invariant written for "every pack" reads
 * every pack instead of the one whose name the author happened to type.
 *
 * It exists because that failure had already happened. `provenance-authority`
 * mapped the registry to get each pack's `countryCode` and `sources`, then
 * attached **Greece's composition** to every row. With one pack that is
 * invisible. With two, the second pack's row evaluates Greece's requirements
 * against the second pack's country code — a green assertion about nothing, and
 * precisely the case that file was written to catch: a German checklist whose
 * only authority for SGK documents is the Hellenic Republic.
 *
 * A hand-maintained list can drift out of the registry, so it is cross-checked
 * in both directions in `country-pack-provenance.test.ts` — the same treatment
 * `ALL_REQUIREMENT_LAYERS` gets, and for the same reason. A registered pack
 * missing from here fails; an entry here for a pack no longer registered fails.
 *
 * The composition cannot be reached from `CountryConfig` — that type carries
 * the composed template and sources, not the `CompositionResult` with its
 * `ownership` map — and putting one there to serve the tests would be the
 * inert-production-field shape ADR-050 warns about.
 */
export interface ProductionComposition {
  countryCode: string
  composition: CompositionResult
}

export const PRODUCTION_COMPOSITIONS: ProductionComposition[] = [
  { countryCode: 'GR', composition: greeceTourismComposition },
  { countryCode: 'DE', composition: germanyTourismComposition },
]

/**
 * Throws rather than returning `undefined`.
 *
 * A missing entry means an invariant is about to run over the wrong pack or no
 * pack at all, and both of those are failures that must be loud. Returning
 * `undefined` would let a caller quietly skip a row.
 */
export function compositionFor(countryCode: string): CompositionResult {
  const found = PRODUCTION_COMPOSITIONS.find(
    (entry) => entry.countryCode === countryCode
  )
  if (!found) {
    throw new Error(
      `No production composition registered for "${countryCode}". ` +
        'Add it to src/tests/support/production-compositions.ts.'
    )
  }
  return found.composition
}
