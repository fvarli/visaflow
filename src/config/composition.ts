import { isKnownOccupationCode } from '@/domain/types/common'
import type {
  AcceptanceDetailFragment,
  CitationRefinement,
  DocumentRequirement,
  LayerKind,
  RequirementActivation,
  RequirementLayer,
  RequirementSource,
  SatisfactionGroup,
  VisaTypeTemplate,
} from './types'

/**
 * Compose a visa-type template from ownership layers.
 *
 * VisaFlow ships one country pack whose file layout claims a generality it does
 * not have: `commonSchengenDocuments` reads as "proven across Schengen" while
 * carrying Türkiye-scoped citations and Turkish institution names, with no
 * override mechanism — so a second pack would inherit all of it verbatim
 * (ADR-048). This module is the mechanism that makes the three real ownership
 * layers — Common Schengen, Destination, Filing Jurisdiction — expressible
 * separately and reassembled deterministically.
 *
 * THE VOCABULARY IS DELIBERATELY TINY. A layer may `add` requirements it owns,
 * may `offer` a definition it owns and asks nobody for, may `activate` an
 * earlier layer's offer, and may `refine` an earlier layer's requirement by
 * appending citations. There is no removal, no hiding, and no way to change
 * what a requirement asks for. Every one of those was considered and rejected:
 *
 *  - **Contract-bearing override** would let a jurisdiction change `required`,
 *    `conditionalOn`, prose or `revision` on a code it does not own. That makes
 *    `satisfiedRevision: N` mean different things in different compositions, so
 *    a dossier stops being portable — the aliasing ADR-049 forbids, arriving
 *    through the revision axis instead of the label axis.
 *  - **`suppress`** ("present, but not in this composition") is a genuinely
 *    different domain concept from retirement, and nothing needs it yet.
 *    Designing it speculatively would fix its semantics before a real case
 *    could argue about them.
 *
 * If either is ever genuinely needed it arrives as its own capability with its
 * own ADR — not by widening an interface here. `assertCitationRefinementShape`
 * exists to make that widening a deliberate act rather than a one-line type
 * edit.
 *
 * `offer`/`activate` ARRIVED THAT WAY, AND ARE NOT AN EXCEPTION TO THE ABOVE.
 * They separate two assertions `add` used to make at once — *this is the
 * canonical definition of an evidence identity* and *this composition asks for
 * it* — because a third destination asks for six documents this repository
 * already defines under another destination's mission layer, and a code has
 * exactly one owner registry-wide (ADR-052d). Ownership is unamended; what is
 * new is that a definition may exist without being asked for. The normative
 * rule every guard below serves:
 *
 * > An offered requirement asserts no applicability, presence, requiredness or
 * > authority in any production composition until an authorized later layer
 * > activates it.
 *
 * Activation is additive and reaches **backwards**, exactly as refinement does.
 * It may do nothing a refinement may not do, and by itself it does not move the
 * contract key — it changes whether you are asked, not what satisfies the ask.
 *
 * Pure and synchronous. `resolveVisaTemplate` is called inside the
 * `DossierProvider` reducer, so nothing here may be async, stateful, or lazy.
 */

/** Which invariant a composition broke. */
export type CompositionErrorKind =
  | 'layer-order'
  | 'duplicate-add'
  | 'duplicate-source'
  | 'dangling-refine'
  | 'refine-inactive'
  | 'self-refine'
  | 'forward-refine'
  | 'invalid-refinement'
  | 'invalid-widening'
  | 'duplicate-offer'
  | 'dangling-activate'
  | 'activate-not-offered'
  | 'duplicate-activate'
  | 'self-activate'
  | 'forward-activate'
  | 'invalid-activation'
  | 'dangling-source-ref'
  | 'order-mismatch'
  | 'invalid-group'

/**
 * A layer set that cannot be composed.
 *
 * `kind` is the contract tests assert on. The message is prose for a human
 * reading a stack trace and will drift as wording improves; the discriminant
 * will not, so nothing has to match error text to know what failed.
 */
export class CompositionError extends Error {
  readonly kind: CompositionErrorKind

  constructor(kind: CompositionErrorKind, message: string) {
    super(message)
    this.name = 'CompositionError'
    this.kind = kind
  }
}

export interface CompositionResult {
  template: VisaTypeTemplate
  /**
   * **Present** requirement `code` → the id of the layer that owns it.
   *
   * Structural: derived from which layer declared the code, never stored, and
   * deliberately **not** a field on `DocumentRequirement`. Putting it on the
   * requirement would change the shape every consumer sees for the sake of
   * information only the composer and its invariants need.
   *
   * An offered code appears here **only once something activates it**, and even
   * then it maps to the layer that *offered* it — ownership is unamended by
   * ADR-052d, and the activating layer owns nothing. An offer nobody activated
   * is absent, because this map is what the registry invariants read to decide
   * whether a layer actually composed, and an inert definition did not.
   */
  ownership: ReadonlyMap<string, string>
  /**
   * Every offered `code` → its offering layer, activated or not.
   *
   * The reachability question runs in both directions and `ownership` can only
   * answer one of them. A definition nobody ever activates is precisely the
   * inert registry ADR-050 warns about — it looks authoritative, is read by
   * nothing, and drifts — so the registry invariants need to be able to see an
   * offer that never became present. They cannot see it in `ownership` by
   * construction, so it is published here.
   */
  offered: ReadonlyMap<string, string>
  /**
   * Activated `code` → the layer that asserted this composition asks for it.
   *
   * Activation is the authority-bearing half of ADR-052d, so *who* asserted it
   * is not bookkeeping: the pin lives in a layer's `activate` list, and this is
   * what lets an invariant check that the composed result matches it rather
   * than trusting that it does.
   */
  activations: ReadonlyMap<string, string>
  /** Every source record the composed layers contribute, in layer order. */
  sources: RequirementSource[]
}

export interface CompositionInput {
  /** Everything about the template except its requirements. */
  base: Omit<VisaTypeTemplate, 'documentRequirements'>
  /** Layers in composition order: common, then destination, then jurisdiction. */
  layers: RequirementLayer[]
  /**
   * The canonical code sequence for this template.
   *
   * Order is load-bearing, not presentational: it decides the order documents
   * are seeded into a new dossier, and `deriveNextDocument` picks the *first*
   * required requirement with no record yet — so a reordering changes which
   * document the workspace recommends next. A pack that has an established
   * order states it here so composition reproduces it exactly rather than
   * inheriting whatever falls out of layer concatenation.
   *
   * Omit it and layer order applies, which is the right default for a new pack
   * with no order to preserve.
   */
  requirementOrder?: string[]
}

const KIND_RANK: Record<LayerKind, number> = {
  common: 0,
  destination: 1,
  jurisdiction: 2,
}

/**
 * A refinement may carry these keys and no others.
 *
 * The type already forbids more, so this guard is not for today's callers — it
 * is for the next person who widens `CitationRefinement`. Adding `required?:`
 * to the interface would silently start changing acceptance contracts through
 * composition; with this here, it also has to get past a runtime assertion that
 * says why that is not allowed.
 *
 * `addDetail` was added deliberately and is the *only* widening since. It is
 * additive — it appends rendered criteria and moves the composed revision — and
 * it still cannot touch identity, requiredness, applicability or the owner's
 * own prose. The nested guard below keeps it that way: a fragment carrying
 * `required` or `descriptionKey` is refused with the same message, because the
 * cheapest way to smuggle an override in would be through the fragment rather
 * than past this set.
 */
const ALLOWED_REFINEMENT_KEYS = new Set([
  'code',
  'addSourceRefs',
  'addDetail',
  'addApplicableOccupations',
])
const ALLOWED_DETAIL_KEYS = new Set(['detailKeys', 'revision'])

/**
 * An activation's payload is a refinement's payload, deliberately.
 *
 * Not a separate list that happens to match today. ADR-052b decision 6's
 * prohibition list is untouched by ADR-052d: an activation is not a fragment
 * and may do none of the things a fragment may not do. Sharing the set is how
 * that stays true when the refinement set next moves — two lists would drift,
 * and the direction they would drift in is the permissive one.
 */
const ALLOWED_ACTIVATION_KEYS = ALLOWED_REFINEMENT_KEYS

/**
 * The occupations a requirement's own condition already names.
 *
 * Only an occupational condition has any, which is the point: a widening may
 * only decorate a row that already routes on occupation, so the effective
 * population is a set union rather than a disjunction across two different
 * fields — and a row is corrected to its own citation before it is widened,
 * never the other way round.
 */
function baseOccupations(
  requirement: DocumentRequirement
): readonly string[] | undefined {
  const condition = requirement.conditionalOn
  if (!condition || condition.field !== 'employment.occupation')
    return undefined
  if (condition.operator === 'equals') return [String(condition.value)]
  if (condition.operator === 'oneOf') return condition.values.map(String)
  return undefined
}

/**
 * A widening is a **delta**, and every rule here exists to keep it one.
 *
 * The type already refuses an unknown occupation; these are the failures a type
 * cannot see — an empty list, a repeat, a restatement of what the base already
 * asks, or a widening bolted onto a condition that does not route on occupation
 * at all ([ADR-052c](#adr-052c) decisions 3 and 4).
 */
function assertWideningShape(
  layerId: string,
  code: string,
  base: DocumentRequirement,
  added: readonly string[]
): void {
  const refuse = (why: string): never => {
    throw new CompositionError(
      'invalid-widening',
      `Layer "${layerId}" widens "${code}" ${why}`
    )
  }

  if (added.length === 0) {
    refuse(
      'with an empty list. A widening that adds nobody is either a mistake or ' +
        'a leftover; remove the field instead.'
    )
  }

  /**
   * Checked before the relational rules below, because a value that is not an
   * occupation cannot meaningfully duplicate or overlap anything.
   *
   * The type says this already and the type is not enough: the composer takes
   * runtime objects, and a misspelling would otherwise merge cleanly and then
   * match nobody — the effective occupation it is compared against is always a
   * known code. A widening that silently adds no one, reading in a census as
   * though it added someone.
   */
  const unknown = added.filter((o) => !isKnownOccupationCode(o))
  if (unknown.length > 0) {
    refuse(
      `with "${unknown[0]}", which is not an occupation this build knows. The ` +
        'vocabulary lives in `domain/types/common`; a widening naming anything ' +
        'else would merge and then match nobody.'
    )
  }

  const duplicates = added.filter((o, i) => added.indexOf(o) !== i)
  if (duplicates.length > 0) {
    refuse(
      `and names ${duplicates[0]} twice. The list is a set, and a repeat hides ` +
        'whichever entry was meant.'
    )
  }

  const owned = baseOccupations(base)
  if (owned === undefined) {
    refuse(
      'whose own condition does not route on occupation. A widening may only ' +
        'extend an occupational population, so correct the requirement to its ' +
        'own citation first and widen it after.'
    )
  }

  const overlap = added.filter((o) => owned?.includes(o))
  if (overlap.length > 0) {
    refuse(
      `and re-states ${overlap[0]}, which its own condition already names. A ` +
        'widening is a delta — restating the base makes a census of widenings ' +
        'read as a mixture of differences and noise.'
    )
  }
}

/**
 * What the shape guard is checking, so one implementation can serve both verbs.
 *
 * Shared because the rules are genuinely the same rules — an activation may do
 * nothing a refinement may not do — and a second copy would be a second place
 * for the permissive edit to land. What differs is only what the failure should
 * tell the author to do about it, which is what `verb` and `kind` carry.
 */
interface AdditiveVerb {
  kind: 'invalid-refinement' | 'invalid-activation'
  /** Reads into `Layer "x" <verb> "CODE"`. */
  verb: string
  /** Reads into `A <noun> may only append…`. */
  noun: string
  allowedKeys: Set<string>
}

const REFINEMENT_VERB: AdditiveVerb = {
  kind: 'invalid-refinement',
  verb: 'refines',
  noun: 'refinement',
  allowedKeys: ALLOWED_REFINEMENT_KEYS,
}

const ACTIVATION_VERB: AdditiveVerb = {
  kind: 'invalid-activation',
  verb: 'activates',
  noun: 'activation',
  allowedKeys: ALLOWED_ACTIVATION_KEYS,
}

function refuseAdditive(
  verb: AdditiveVerb,
  layerId: string,
  code: string,
  extra: string[],
  where: string
): never {
  throw new CompositionError(
    verb.kind,
    `Layer "${layerId}" ${verb.verb} "${code}" with ${extra
      .map((k) => `"${k}"`)
      .join(', ')}${where}. A ${verb.noun} may only append citations and ` +
      'acceptance detail — a layer that needs different requiredness, ' +
      'applicability or base prose must own the requirement instead.'
  )
}

function assertAdditiveShape(
  verb: AdditiveVerb,
  layerId: string,
  payload: CitationRefinement | RequirementActivation
): void {
  const extra = Object.keys(payload).filter((key) => !verb.allowedKeys.has(key))
  if (extra.length > 0) refuseAdditive(verb, layerId, payload.code, extra, '')

  const detail = payload.addDetail
  if (detail === undefined) return

  const detailExtra = Object.keys(detail).filter(
    (key) => !ALLOWED_DETAIL_KEYS.has(key)
  )
  if (detailExtra.length > 0)
    refuseAdditive(verb, layerId, payload.code, detailExtra, ' in `addDetail`')

  // A fragment that renders nothing but still moves the revision would
  // supersede live claims for no applicant-visible reason.
  if (detail.detailKeys.length === 0) {
    throw new CompositionError(
      verb.kind,
      `Layer "${layerId}" attaches an empty detail fragment to ` +
        `"${payload.code}". A fragment that renders nothing still moves ` +
        'the composed revision, which would supersede claims over nothing.'
    )
  }
  if (!Number.isInteger(detail.revision) || detail.revision < 1) {
    throw new CompositionError(
      verb.kind,
      `Layer "${layerId}" attaches detail to "${payload.code}" with ` +
        `revision ${detail.revision}. Fragments start at 1, for the same ` +
        'reason requirements do (ADR-051a).'
    )
  }
}

function assertCitationRefinementShape(
  layerId: string,
  refinement: CitationRefinement
): void {
  assertAdditiveShape(REFINEMENT_VERB, layerId, refinement)
}

function assertActivationShape(
  layerId: string,
  activation: RequirementActivation
): void {
  assertAdditiveShape(ACTIVATION_VERB, layerId, activation)
}

/** A fragment, plus the layer that attached it — the key needs both. */
interface AttachedFragment {
  layerId: string
  fragment: AcceptanceDetailFragment
}

/**
 * Apply one additive payload — a refinement's or an activation's — to a
 * requirement, registering any fragment it attaches.
 *
 * Shared by both verbs because the merge is the same merge. An activation that
 * appended citations differently from a refinement would be a second, quieter
 * set of rules about what a layer may do to a requirement it does not own, and
 * the whole point of ADR-052d is that activation adds presence and **nothing
 * else** to that list.
 *
 * Only a touched requirement is rebuilt. Everything else is returned by
 * identity, so composition creates the minimum number of new references — which
 * is what keeps the memoized resolver's output stable downstream.
 *
 * Fragments accumulate rather than replace, and both are append-only: a second
 * refining layer can add to what the first attached, and neither can take
 * anything away.
 *
 * `revision` is untouched, and that is the correction: it belongs to the owner
 * and means the same thing in every composition (ADR-051 Decision 4). What
 * varies by composition is the contract *key*, applied to every requirement in
 * one pass at the end.
 */
function applyAdditive(
  current: DocumentRequirement,
  layerId: string,
  payload: CitationRefinement | RequirementActivation,
  fragmentsFor: Map<string, AttachedFragment[]>
): DocumentRequirement {
  if (payload.addApplicableOccupations) {
    assertWideningShape(
      layerId,
      payload.code,
      current,
      payload.addApplicableOccupations
    )
  }

  if (payload.addDetail) {
    fragmentsFor.set(payload.code, [
      ...(fragmentsFor.get(payload.code) ?? []),
      { layerId, fragment: payload.addDetail },
    ])
  }

  return {
    ...current,
    sourceRefs: appendRefs(current.sourceRefs, payload.addSourceRefs),
    ...(payload.addDetail
      ? {
          detailKeys: appendRefs(
            current.detailKeys,
            payload.addDetail.detailKeys
          ),
        }
      : {}),
    // Merged here and nowhere else, which is what keeps it out of the contract
    // key: the key is built from acceptance fragments alone, and a widening
    // registers none. It changes who is asked, not what satisfies the ask
    // (ADR-052c decision 5) — the same reason a bare activation is key-neutral.
    ...(payload.addApplicableOccupations
      ? {
          applicableOccupations: [
            ...(current.applicableOccupations ?? []),
            ...payload.addApplicableOccupations,
          ],
        }
      : {}),
  }
}

/**
 * The identity of the acceptance contract a composition actually renders.
 *
 * THIS REPLACED AN ADDITIVE REVISION, AND THE FAILURE IS WORTH KEEPING. C1
 * first expressed the composed contract by *summing* the owner's revision and
 * its fragments' — monotonic, so a tightened bar always superseded, which was
 * the property being aimed at. Addition is not injective, and that is the
 * property that mattered: `1 + 1` is `2` whether the fragment is the Greek
 * consulate asking for a recent photograph or the German mission asking for
 * 35 x 45 mm. Both packs shipped `PHOTOS` at revision 2 with different bars, and
 * a claim carried across a destination change read as satisfied.
 *
 * The root cause was representational, not arithmetical: `satisfiedRevision <
 * revision` presumes a total order — one contract tightening over time — and C1
 * turned the contract space into a tree, one branch per composition. No integer
 * can encode a tree, so no cleverer sum would have worked.
 *
 * The key is that tree's address. It moves when, and only when, something
 * contract-bearing moves: the owner's revision, or which fragments apply, or a
 * fragment's own revision. Copy edits, translations and added citations leave it
 * alone, which is exactly the ADR-051a boundary.
 */
function contractKeyFor(
  code: string,
  base: number,
  fragments: AttachedFragment[]
): string {
  const attached = fragments
    .map(({ layerId, fragment }) => `+${layerId}:${fragment.revision}`)
    .join('')
  return `${code}@${base}${attached}`
}

/** Same id must mean the same record; differing ones are a real conflict. */
function mergeSources(layers: RequirementLayer[]): RequirementSource[] {
  const byId = new Map<string, { source: RequirementSource; layerId: string }>()
  const ordered: RequirementSource[] = []

  for (const layer of layers) {
    for (const source of layer.sources ?? []) {
      const seen = byId.get(source.id)
      if (!seen) {
        byId.set(source.id, { source, layerId: layer.id })
        ordered.push(source)
        continue
      }
      // Identical re-declaration is harmless — two layers citing the same
      // regulation is expected. Two *different* records under one id is not:
      // keeping whichever came first would be the silent overwrite this whole
      // phase exists to close, one field over.
      if (JSON.stringify(seen.source) !== JSON.stringify(source)) {
        throw new CompositionError(
          'duplicate-source',
          `Source "${source.id}" is declared differently by layers ` +
            `"${seen.layerId}" and "${layer.id}". One id must mean one record.`
        )
      }
    }
  }

  return ordered
}

function assertLayerOrder(layers: RequirementLayer[]): void {
  let previous: RequirementLayer | undefined
  for (const current of layers) {
    if (previous && KIND_RANK[current.kind] < KIND_RANK[previous.kind]) {
      throw new CompositionError(
        'layer-order',
        `Layer "${current.id}" (${current.kind}) follows "${previous.id}" ` +
          `(${previous.kind}). Layers compose common → destination → ` +
          'jurisdiction, so a later layer can only ever refine an earlier one.'
      )
    }
    previous = current
  }
}

/**
 * Append, order-stable, no duplicates.
 *
 * `added` is optional because a refinement may now carry detail without
 * citations, or citations without detail.
 */
function appendRefs(
  existing: string[] | undefined,
  added: string[] | undefined
): string[] {
  const out = [...(existing ?? [])]
  for (const ref of added ?? []) {
    if (!out.includes(ref)) out.push(ref)
  }
  return out
}

function applyOrder(
  composed: DocumentRequirement[],
  requirementOrder: string[]
): DocumentRequirement[] {
  const duplicates = requirementOrder.filter(
    (code, i) => requirementOrder.indexOf(code) !== i
  )
  if (duplicates.length > 0) {
    throw new CompositionError(
      'order-mismatch',
      `requirementOrder repeats ${[...new Set(duplicates)]
        .map((c) => `"${c}"`)
        .join(', ')}.`
    )
  }

  const byCode = new Map(composed.map((r) => [r.code, r]))
  const ordered: DocumentRequirement[] = []
  const missing: string[] = []

  // Built in the same pass that validates it, so there is no second lookup to
  // assert away afterwards.
  for (const code of requirementOrder) {
    const requirement = byCode.get(code)
    if (requirement) ordered.push(requirement)
    else missing.push(code)
  }

  const unlisted = composed
    .map((r) => r.code)
    .filter((code) => !requirementOrder.includes(code))

  // Both directions, reported together: a move usually produces one of each,
  // and seeing only half of that sends the reader looking for the wrong thing.
  if (missing.length > 0 || unlisted.length > 0) {
    throw new CompositionError(
      'order-mismatch',
      'requirementOrder does not match the composed set. ' +
        `Listed but not composed: [${missing.join(', ')}]. ` +
        `Composed but not listed: [${unlisted.join(', ')}].`
    )
  }

  return ordered
}

/**
 * Compose layers into one template.
 *
 * Throws `CompositionError` rather than returning a partial result: a template
 * that silently dropped a requirement would show an applicant a checklist
 * missing something they were asked for, which is worse than a build that stops.
 */
export function composeVisaTemplate(
  input: CompositionInput
): CompositionResult {
  const { base, layers, requirementOrder } = input

  assertLayerOrder(layers)

  /**
   * Every declared code → the layer that owns it, **offered or added**.
   *
   * Not the same map as the `ownership` this function returns. Uniqueness is a
   * claim about declarations and has to see offers, or an offered code could
   * collide with an added one and nothing would object; presence is a claim
   * about what composed, and an offer nobody activated did not. The public map
   * is derived from `layerOrder` at the end, so the two cannot drift.
   */
  const declaredOwner = new Map<string, string>()
  /** Which verb declared each code — the collision message needs to say. */
  const declaredVerb = new Map<string, 'add' | 'offer'>()
  /**
   * Which layer *position* declared each code.
   *
   * Position rather than layer id, because that is what the visibility rule is
   * actually about, and because two layers sharing an id would defeat an
   * id comparison. The composer does not police layer-id uniqueness — the
   * registry-wide invariant does, over the whole registry rather than over one
   * composition.
   */
  const declaredAt = new Map<string, number>()
  /** Composition order, by code. The requirements themselves live in `byCode`. */
  const layerOrder: string[] = []
  const byCode = new Map<string, DocumentRequirement>()
  /** Offered definitions, held inert until something activates them. */
  const offeredByCode = new Map<string, DocumentRequirement>()
  /** Offered code → the layer that offered it, activated or not. */
  const offered = new Map<string, string>()
  /** Activated code → the layer that asserted this composition asks for it. */
  const activations = new Map<string, string>()
  /** And at which position, which is what refinement direction is measured against. */
  const activatedAt = new Map<string, number>()
  /** Detail fragments attached to each code, in the order layers composed. */
  const fragmentsFor = new Map<string, AttachedFragment[]>()

  const claim = (
    requirement: DocumentRequirement,
    layer: RequirementLayer,
    index: number,
    verb: 'add' | 'offer'
  ): void => {
    const owner = declaredOwner.get(requirement.code)
    if (owner !== undefined) {
      const previous = declaredVerb.get(requirement.code)
      // An offer on either side is its own failure kind, because the fix is a
      // different one: a duplicate `add` means two layers both think they own
      // a requirement, while a collision with an offer usually means somebody
      // defined an identity that already had a canonical home, which is the
      // exact mistake ADR-052d exists to make unnecessary.
      const involvesOffer = verb === 'offer' || previous === 'offer'
      throw new CompositionError(
        involvesOffer ? 'duplicate-offer' : 'duplicate-add',
        `Requirement "${requirement.code}" is declared by both layer ` +
          `"${owner}" (${previous}) and layer "${layer.id}" (${verb}). A code ` +
          "is a dossier record's identity (ADR-049), so exactly one layer may " +
          'own it — and offering a definition is owning it, inert or not ' +
          '(ADR-052d decision 1).'
      )
    }
    declaredOwner.set(requirement.code, layer.id)
    declaredVerb.set(requirement.code, verb)
    declaredAt.set(requirement.code, index)
  }

  // Pass 1 — ownership. Every code is claimed exactly once, and a code's owner
  // owns everything about it including its `revision`. An offer is claimed the
  // same way and put somewhere else: owned, defined, and present for nobody.
  for (const [index, layer] of layers.entries()) {
    for (const requirement of layer.add ?? []) {
      claim(requirement, layer, index, 'add')
      layerOrder.push(requirement.code)
      byCode.set(requirement.code, requirement)
    }
    for (const requirement of layer.offer ?? []) {
      claim(requirement, layer, index, 'offer')
      offeredByCode.set(requirement.code, requirement)
      offered.set(requirement.code, layer.id)
    }
  }

  // Pass 2 — activation: which offered identities this composition asks for.
  //
  // Between ownership and citation, and over every layer before any refinement
  // runs, so that a later layer may cite a row an earlier layer activated
  // without the two passes having to be interleaved. Activated codes append to
  // `layerOrder` after every added one; a pack that cares states
  // `requirementOrder`, which it must do anyway for the activation to be a
  // pinned, reviewable line rather than a side effect.
  for (const [index, layer] of layers.entries()) {
    const refinedHere = new Set((layer.refine ?? []).map((r) => r.code))
    for (const activation of layer.activate ?? []) {
      assertActivationShape(layer.id, activation)

      // One assertion, one line. Provenance belongs to the activating
      // assertion (ADR-052d decision 6), so the citations go on the activation
      // itself — the same reasoning that refuses a layer refining what it owns.
      if (refinedHere.has(activation.code)) {
        throw new CompositionError(
          'invalid-activation',
          `Layer "${layer.id}" both activates and refines "${activation.code}". ` +
            'An activation carries its own citations and detail, so there is ' +
            'one way to say this rather than two — fold the refinement into ' +
            'the activation.'
        )
      }

      const declaringIndex = declaredAt.get(activation.code)
      if (declaringIndex === undefined) {
        throw new CompositionError(
          'dangling-activate',
          `Layer "${layer.id}" activates "${activation.code}", which no layer ` +
            'in this composition declares.'
        )
      }
      // Four kinds rather than one, because each names a different mistake:
      // the code is not an offer at all, it is already being asked for, you
      // are activating your own definition, or you are reaching forward. The
      // first lookup doubles as its own guard, so the definition is proven to
      // exist by the check rather than asserted afterwards.
      const definition = offeredByCode.get(activation.code)
      if (definition === undefined) {
        throw new CompositionError(
          'activate-not-offered',
          `Layer "${layer.id}" activates "${activation.code}", which layer ` +
            `"${declaredOwner.get(activation.code)}" declares with \`add\`. An ` +
            'added requirement is already asked for by every composition that ' +
            'includes its layer; only an offered definition is activated.'
        )
      }
      const activatedBy = activations.get(activation.code)
      if (activatedBy !== undefined) {
        throw new CompositionError(
          'duplicate-activate',
          `Requirement "${activation.code}" is activated by both layer ` +
            `"${activatedBy}" and layer "${layer.id}". Asking twice for one ` +
            'document would count its readiness twice; the second layer ' +
            'should attach its evidence with `refine` instead.'
        )
      }
      if (declaringIndex === index) {
        throw new CompositionError(
          'self-activate',
          `Layer "${layer.id}" activates "${activation.code}", which it offers. ` +
            'A layer that asks for its own definition should declare it with ' +
            '`add` — an offer exists precisely to be asked for by somebody ' +
            'else, on their evidence (ADR-052d decision 5).'
        )
      }
      if (declaringIndex > index) {
        throw new CompositionError(
          'forward-activate',
          `Layer "${layer.id}" activates "${activation.code}", which is offered ` +
            `by the later layer "${declaredOwner.get(activation.code)}". ` +
            'Activation travels backwards exactly as refinement does, so it ' +
            'may only reach an offer an earlier layer made.'
        )
      }

      byCode.set(
        activation.code,
        applyAdditive(definition, layer.id, activation, fragmentsFor)
      )
      layerOrder.push(activation.code)
      activations.set(activation.code, layer.id)
      activatedAt.set(activation.code, index)
    }
  }

  // Pass 3 — citations, and the direction they may travel.
  //
  // Separate passes so that *within* one layer the order of `add`, `activate`
  // and `refine` does not decide whether a composition is valid. Across layers
  // the rule is stricter and is enforced here: a refinement may only reach
  // **backwards**, to a requirement an earlier layer declared. That is what
  // ADR-052 always said, and until this guard existed the multi-pass design
  // quietly permitted the opposite — a destination layer could refine a
  // jurisdiction-owned requirement even though it composes first, and nothing
  // objected.
  for (const [index, layer] of layers.entries()) {
    for (const refinement of layer.refine ?? []) {
      assertCitationRefinementShape(layer.id, refinement)

      // This lookup is also the dangling-refine guard, so the requirement is
      // proven to exist by the check rather than asserted afterwards.
      const current = byCode.get(refinement.code)
      if (current === undefined) {
        // Offered-but-inert is its own failure. Reporting it as dangling would
        // send the author looking for a missing declaration when the
        // declaration is right there and nothing has asked for it — and the
        // fix is the opposite one: activate it, or cite something you are
        // actually asked for.
        const offeredBy = offered.get(refinement.code)
        if (offeredBy !== undefined) {
          throw new CompositionError(
            'refine-inactive',
            `Layer "${layer.id}" refines "${refinement.code}", which layer ` +
              `"${offeredBy}" offers and no layer activates. An offered ` +
              'definition asserts nothing until it is activated, so there is ' +
              'nothing here for a citation to vouch for (ADR-052d decision 6).'
          )
        }
        throw new CompositionError(
          'dangling-refine',
          `Layer "${layer.id}" refines "${refinement.code}", which no layer ` +
            'in this composition declares.'
        )
      }
      // Several kinds rather than one, because they call for different fixes:
      // move the citation into your own declaration, fold it into your
      // activation, move your layer, or find out why nothing declares the code
      // at all. A shared discriminant would make a failure name the wrong
      // mistake.
      const declaringIndex = declaredAt.get(refinement.code)
      if (declaringIndex === index) {
        throw new CompositionError(
          'self-refine',
          `Layer "${layer.id}" refines "${refinement.code}", which it ` +
            `${declaredVerb.get(refinement.code) === 'offer' ? 'offers' : 'owns'}. ` +
            'Citations belonging to the owner go in the declaration itself, ' +
            'so there is one way to say this rather than two.'
        )
      }
      if (declaringIndex !== undefined && declaringIndex > index) {
        throw new CompositionError(
          'forward-refine',
          `Layer "${layer.id}" refines "${refinement.code}", which is declared ` +
            `by the later layer "${declaredOwner.get(refinement.code)}". Layers ` +
            'compose in one direction, so a refinement may only reach a ' +
            'requirement an earlier layer declared — move this layer after ' +
            'the one that owns the code.'
        )
      }
      // Presence can arrive later than ownership now. A row offered by an
      // early layer and activated by a late one is *not* refinable from in
      // between: the citation would attach to an assertion that has not been
      // made yet, which is how one mission's authority ends up decorating
      // another's ask (ADR-052d decision 6).
      const presenceIndex = activatedAt.get(refinement.code)
      if (presenceIndex !== undefined && presenceIndex > index) {
        throw new CompositionError(
          'forward-refine',
          `Layer "${layer.id}" refines "${refinement.code}", which only ` +
            `becomes present when the later layer ` +
            `"${activations.get(refinement.code)}" activates it. Evidence for ` +
            'an activated requirement belongs to the activation itself.'
        )
      }

      byCode.set(
        refinement.code,
        applyAdditive(current, layer.id, refinement, fragmentsFor)
      )
    }
  }

  /**
   * Every requirement gets a key, including the ones no layer refined.
   *
   * Deliberately not "only where fragments apply". A stored claim carrying no
   * key at all means *legacy* — written before keys existed — and that has to
   * stay distinguishable from a claim made against a base-only contract. If
   * unrefined requirements had no key, the two would be identical on disk and
   * every pre-existing claim would read as made under whichever composition
   * happens to be resolved now.
   */
  const composed: DocumentRequirement[] = []
  for (const code of layerOrder) {
    const requirement = byCode.get(code)
    if (!requirement) continue
    composed.push({
      ...requirement,
      contractKey: contractKeyFor(
        code,
        requirement.revision,
        fragmentsFor.get(code) ?? []
      ),
    })
  }

  const sources = mergeSources(layers)
  const sourceIds = new Set(sources.map((s) => s.id))
  for (const requirement of composed) {
    for (const ref of requirement.sourceRefs ?? []) {
      if (!sourceIds.has(ref)) {
        throw new CompositionError(
          'dangling-source-ref',
          `Requirement "${requirement.code}" cites source "${ref}", which no ` +
            'composed layer provides. An unresolvable citation renders as no ' +
            'provenance at all, which reads as "unverified" (ADR-046).'
        )
      }
    }
  }

  const documentRequirements = requirementOrder
    ? applyOrder(composed, requirementOrder)
    : composed

  const satisfactionGroups = collectGroups(layers, byCode, offered, sourceIds)

  /**
   * Derived from what composed, never accumulated alongside it.
   *
   * `layerOrder` is the list of codes that are actually present — added, or
   * offered and then activated — so reading ownership off it cannot report an
   * inert definition as composed. Accumulating a second map during pass 1 and
   * hoping the two agreed is exactly how an offer would have leaked into the
   * registry invariants as a layer that "composed".
   */
  const ownership = new Map<string, string>()
  for (const code of layerOrder) {
    const owner = declaredOwner.get(code)
    if (owner !== undefined) ownership.set(code, owner)
  }

  return {
    template: {
      ...base,
      documentRequirements,
      // Absent rather than empty when a pack declares none, so a composition
      // without groups is byte-identical to one composed before they existed.
      ...(satisfactionGroups.length > 0 ? { satisfactionGroups } : {}),
    },
    ownership,
    offered,
    activations,
    sources,
  }
}

/**
 * Gather and validate the alternative-satisfaction groups.
 *
 * Three things have to hold, and each has its own failure because each calls
 * for a different fix:
 *
 *  - every member must be composed, or the group promises the applicant a route
 *    the pack does not carry;
 *  - a code belongs to at most one group, because "one of these" stops meaning
 *    anything if a document counts toward two obligations at once;
 *  - a group needs at least two members, since a group of one is a requirement
 *    with extra machinery around it.
 */
function collectGroups(
  layers: RequirementLayer[],
  byCode: Map<string, DocumentRequirement>,
  offered: Map<string, string>,
  sourceIds: Set<string>
): SatisfactionGroup[] {
  const groups: SatisfactionGroup[] = []
  const claimedBy = new Map<string, string>()
  const ids = new Set<string>()

  for (const layer of layers) {
    for (const group of layer.groups ?? []) {
      if (ids.has(group.id)) {
        throw new CompositionError(
          'invalid-group',
          `Group "${group.id}" is declared twice in this composition.`
        )
      }
      ids.add(group.id)

      if (group.anyOf.length < 2) {
        throw new CompositionError(
          'invalid-group',
          `Group "${group.id}" lists ${group.anyOf.length} requirement(s). A ` +
            'choice needs at least two, and a group of one is just a ' +
            'requirement.'
        )
      }

      for (const code of group.anyOf) {
        if (!byCode.has(code)) {
          // An offered-but-inert member is the same failure with a different
          // cause, and saying "no layer declares it" when a layer plainly does
          // would send the author to the wrong file.
          const offeredBy = offered.get(code)
          throw new CompositionError(
            'invalid-group',
            `Group "${group.id}" (layer "${layer.id}") lists "${code}", which ` +
              (offeredBy !== undefined
                ? `layer "${offeredBy}" offers and no layer activates`
                : 'no layer in this composition declares') +
              '. A group may only offer routes the pack actually carries.'
          )
        }
        const owner = claimedBy.get(code)
        if (owner !== undefined) {
          throw new CompositionError(
            'invalid-group',
            `Requirement "${code}" is in both group "${owner}" and group ` +
              `"${group.id}". One document may satisfy one obligation, or ` +
              '"any one of these" stops being a countable thing.'
          )
        }
        claimedBy.set(code, group.id)
      }

      /**
       * Whenever an optional member applies, some required member must apply
       * too — otherwise the obligation can vanish for a whole class of
       * applicant, silently.
       *
       * `resolveGroupSlots` drops a group when none of its *applicable* members
       * is required, which is right when nothing is owed and wrong when
       * something is. A group of {required-if-employed, optional-always} owes
       * nothing to a student by that rule, while its optional member is still
       * on the pack — and grouped codes are excluded from the optional tally, so
       * that member would then be counted nowhere at all.
       *
       * The test is coverage, not sameness: a required member is unconditional,
       * or carries the same condition. Deliberately not "every member shares one
       * condition", which would forbid the shape the German accommodation
       * obligation needs — a required unconditional document plus an optional
       * alternative that only a sponsored applicant can produce. That is safe
       * precisely because the required member covers everyone.
       *
       * Conservative by construction: a condition this cannot prove equal is
       * treated as not covering. Refusing a composition is recoverable; a
       * requirement that quietly stops being owed is not.
       */
      const members = group.anyOf.map((code) => byCode.get(code)!)
      const requiredMembers = members.filter((r) => r.required)
      const covers = (member: DocumentRequirement) =>
        requiredMembers.some(
          (req) =>
            req.conditionalOn === undefined ||
            JSON.stringify(req.conditionalOn) ===
              JSON.stringify(member.conditionalOn)
        )
      const uncovered = members
        .filter((member) => !member.required && !covers(member))
        .map((member) => member.code)
      if (uncovered.length > 0) {
        throw new CompositionError(
          'invalid-group',
          `Group "${group.id}" has optional member(s) ` +
            `${uncovered.map((c) => `"${c}"`).join(', ')} that can apply when no ` +
            'required member does. The obligation would disappear for those ' +
            'applicants, and the member would be counted neither in the group ' +
            'nor as optional. Give the group a required member that is ' +
            'unconditional, or that carries the same condition.'
        )
      }

      for (const ref of group.sourceRefs ?? []) {
        if (!sourceIds.has(ref)) {
          throw new CompositionError(
            'dangling-source-ref',
            `Group "${group.id}" cites source "${ref}", which no composed ` +
              'layer provides.'
          )
        }
      }

      groups.push(group)
    }
  }

  return groups
}
