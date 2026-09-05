import { composeVisaTemplate } from '@/config/composition'
import type { CompositionResult } from '@/config/composition'
import type {
  DocumentRequirement,
  RequirementLayer,
  RequirementSource,
  VisaTypeTemplate,
} from '@/config/types'

/**
 * A synthetic multi-pack topology, for proving the architecture is genuinely
 * compositional rather than Greece rearranged into folders.
 *
 * Greece cannot demonstrate this on its own. With one production pack, "the
 * common layer is inherited" and "the jurisdiction layer is isolated" are the
 * same sentence — there is no second composition to be isolated *from*. So this
 * declares five layers that form **four** compositions (two destinations × two
 * filing jurisdictions), which is the smallest topology where inheritance,
 * destination isolation and jurisdiction isolation are three distinguishable
 * claims.
 *
 * NOT REGISTERED, DELIBERATELY. Nothing here goes into `countryRegistry`. The
 * registry's own rule is that only templates backed by real content belong in
 * it, because a half-populated country in the picker implies support that does
 * not exist. These layers exist to be composed by tests and by nothing else.
 *
 * Every code is `TEST_*`, so it can never collide with a shipped identity, the
 * retirement registry or the acceptance-contract ledger.
 */

/**
 * The synthetic equivalent of `EU` — a source whose authority spans the whole
 * bloc rather than one filing jurisdiction.
 *
 * Its own constant rather than reusing the production literal: this fixture
 * should mirror the *shape* of the real quarantine rule, not inherit its
 * content. If the real rule's supra-national marker ever changes, that is a
 * production decision and this should not silently follow it.
 */
export const TEST_BLOC = 'TESTBLOC'

const source = (id: string, jurisdiction: string): RequirementSource => ({
  id,
  authority: `Test Authority (${jurisdiction})`,
  titleKey: `test:sources.${id}.title`,
  sourceType: 'government',
  jurisdiction,
})

export const treatySource = source('test-src-treaty', TEST_BLOC)
export const jxSource = source('test-src-jx', 'JX')
export const jySource = source('test-src-jy', 'JY')

const req = (
  code: string,
  overrides: Partial<DocumentRequirement> = {}
): DocumentRequirement => ({
  code,
  nameKey: `test:requirements.${code}.name`,
  descriptionKey: `test:requirements.${code}.description`,
  category: 'supporting',
  ownerType: 'applicant',
  required: true,
  revision: 1,
  ...overrides,
})

/** Shared by every composition. Nothing here may know its filing jurisdiction. */
export const testCommonLayer: RequirementLayer = {
  id: 'test-common',
  kind: 'common',
  add: [
    req('TEST_FORM', { sourceRefs: [treatySource.id] }),
    // Revision above 1 on purpose: it is what proves a refining overlay cannot
    // move an acceptance contract it does not own.
    req('TEST_PASSPORT', { revision: 2, sourceRefs: [treatySource.id] }),
    req('TEST_OPTIONAL', { required: false }),
  ],
  sources: [treatySource],
}

export const testlandALayer: RequirementLayer = {
  id: 'testland-a',
  kind: 'destination',
  add: [req('TEST_A_ENTRY')],
}

export const testlandBLayer: RequirementLayer = {
  id: 'testland-b',
  kind: 'destination',
  add: [req('TEST_B_PERMIT')],
}

/** Filing jurisdiction JX: owns a local requirement, and cites its consulate. */
export const testJxLayer: RequirementLayer = {
  id: 'test-jx',
  kind: 'jurisdiction',
  add: [req('TEST_JX_REGISTRY', { sourceRefs: [jxSource.id] })],
  refine: [{ code: 'TEST_PASSPORT', addSourceRefs: [jxSource.id] }],
  sources: [jxSource],
}

export const testJyLayer: RequirementLayer = {
  id: 'test-jy',
  kind: 'jurisdiction',
  add: [req('TEST_JY_STATEMENT', { sourceRefs: [jySource.id] })],
  refine: [{ code: 'TEST_PASSPORT', addSourceRefs: [jySource.id] }],
  sources: [jySource],
}

const baseFor = (
  destination: RequirementLayer,
  jurisdiction: RequirementLayer
): Omit<VisaTypeTemplate, 'documentRequirements'> => ({
  id: `${destination.id}-${jurisdiction.id}`,
  visaType: 'short_stay_tourism',
  nameKey: `test:templates.${destination.id}.name`,
  preparationMilestones: [],
  templateVersion: '1.0.0',
  reviewStatus: 'unverified',
})

/** Compose one destination against one filing jurisdiction. */
export function composeTestPack(
  destination: RequirementLayer,
  jurisdiction: RequirementLayer,
  requirementOrder?: string[]
): CompositionResult {
  return composeVisaTemplate({
    base: baseFor(destination, jurisdiction),
    layers: [testCommonLayer, destination, jurisdiction],
    requirementOrder,
  })
}

/** The four compositions this topology produces, named for readable failures. */
export const TEST_COMPOSITIONS = {
  'A+JX': () => composeTestPack(testlandALayer, testJxLayer),
  'A+JY': () => composeTestPack(testlandALayer, testJyLayer),
  'B+JX': () => composeTestPack(testlandBLayer, testJxLayer),
  'B+JY': () => composeTestPack(testlandBLayer, testJyLayer),
} as const

export type TestCompositionName = keyof typeof TEST_COMPOSITIONS

/**
 * The jurisdiction-scope detector used to live here, and no longer does.
 *
 * Keeping it beside these synthetic layers meant the production invariants
 * imported their detector from a module of made-up packs. It now lives in
 * `@/tests/support/jurisdiction-scope`, so this fixture and the production
 * invariants share the logic without either being the other's source of truth.
 */

/**
 * A deliberately broken topology: a jurisdiction-scoped requirement declared in
 * the shared layer.
 *
 * This is ADR-048's defect reproduced in miniature — exactly what
 * `commonSchengenDocuments` does today by carrying Türkiye-scoped citations.
 * It exists so the detector above can be shown to *fire*. A quarantine check
 * that has never been observed to report anything is indistinguishable from one
 * that reports nothing, which is the failure mode the production invariant fell
 * into by asserting an empty list while only one pack existed.
 */
export const contaminatedCommonLayer: RequirementLayer = {
  id: 'test-common-contaminated',
  kind: 'common',
  add: [
    req('TEST_FORM', { sourceRefs: [treatySource.id] }),
    // Declared so an overlay's refinement still resolves — otherwise the
    // composition fails on a dangling refine before the leak can be observed,
    // and the test would prove the wrong thing.
    req('TEST_PASSPORT', { revision: 2, sourceRefs: [treatySource.id] }),
    // Belongs to JX, sitting in the layer every composition inherits.
    req('TEST_LEAKED', { sourceRefs: [jxSource.id] }),
  ],
  sources: [treatySource, jxSource],
}

export function composeContaminated(
  destination: RequirementLayer,
  jurisdiction: RequirementLayer
): CompositionResult {
  return composeVisaTemplate({
    base: baseFor(destination, jurisdiction),
    layers: [contaminatedCommonLayer, destination, jurisdiction],
  })
}
