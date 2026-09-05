import { commonSchengenLayer } from './common/schengen-short-stay'
import { greeceDestinationLayer } from './greece/tourism'
import { trFilingLayer } from './jurisdictions/tr-filing'
import type { RequirementLayer } from '../types'

/**
 * Every ownership layer this build declares.
 *
 * A requirement `code` is the identity of a record in somebody's dossier
 * (ADR-049), so it has to mean one thing across the whole registry — not one
 * thing per composition. That is a claim about *layers*, and it cannot be
 * checked one composition at a time: if a Türkiye overlay and a future German
 * overlay both declared `SOCIAL_SECURITY`, no single composition would ever
 * contain both, and per-composition checking would never see the collision
 * while global identity was already broken.
 *
 * This is the list that makes that question answerable. It exists for the
 * invariants in `requirement-identity.test.ts` and
 * `country-pack-provenance.test.ts`; no production code path reads it.
 *
 * THAT IS EXACTLY THE SHAPE ADR-050 WARNS ABOUT — a registry that looks
 * authoritative and is never consulted drifts silently and then lies. So it is
 * cross-checked in both directions rather than trusted: every layer id that
 * appears in a composition's `ownership` map must be present here, and every
 * layer here that declares requirements must be reachable from a composition.
 * A layer added without registering it fails; a layer registered but composed
 * by nothing fails too.
 */
export const ALL_REQUIREMENT_LAYERS: RequirementLayer[] = [
  commonSchengenLayer,
  greeceDestinationLayer,
  trFilingLayer,
]
