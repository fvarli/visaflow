import type {
  CitationRefinement,
  DocumentRequirement,
  LayerKind,
  RequirementLayer,
  RequirementSource,
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
 * and may `refine` an earlier layer's requirement by appending citations. There
 * is no removal, no hiding, and no way to change what a requirement asks for.
 * Every one of those was considered and rejected:
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
 * Pure and synchronous. `resolveVisaTemplate` is called inside the
 * `DossierProvider` reducer, so nothing here may be async, stateful, or lazy.
 */

/** Which invariant a composition broke. */
export type CompositionErrorKind =
  | 'layer-order'
  | 'duplicate-add'
  | 'duplicate-source'
  | 'dangling-refine'
  | 'self-refine'
  | 'invalid-refinement'
  | 'dangling-source-ref'
  | 'order-mismatch'

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
   * Requirement `code` → the id of the layer that owns it.
   *
   * Structural: derived from which layer's `add` declared the code, never
   * stored, and deliberately **not** a field on `DocumentRequirement`. Putting
   * it on the requirement would change the shape every consumer sees for the
   * sake of information only the composer and its invariants need.
   */
  ownership: ReadonlyMap<string, string>
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
 */
const ALLOWED_REFINEMENT_KEYS = new Set(['code', 'addSourceRefs'])

function assertCitationRefinementShape(
  layerId: string,
  refinement: CitationRefinement
): void {
  const extra = Object.keys(refinement).filter(
    (key) => !ALLOWED_REFINEMENT_KEYS.has(key)
  )
  if (extra.length > 0) {
    throw new CompositionError(
      'invalid-refinement',
      `Layer "${layerId}" refines "${refinement.code}" with ${extra
        .map((k) => `"${k}"`)
        .join(', ')}. A refinement may only append citations — a layer that ` +
        'needs different acceptance criteria must own the requirement instead.'
    )
  }
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

/** Append, order-stable, no duplicates. */
function appendRefs(existing: string[] | undefined, added: string[]): string[] {
  const out = [...(existing ?? [])]
  for (const ref of added) {
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

  const ownership = new Map<string, string>()
  /** Composition order, by code. The requirements themselves live in `byCode`. */
  const layerOrder: string[] = []
  const byCode = new Map<string, DocumentRequirement>()

  // Pass 1 — ownership. Every code is claimed exactly once, and a code's owner
  // owns everything about it including its `revision`.
  for (const layer of layers) {
    for (const requirement of layer.add ?? []) {
      const owner = ownership.get(requirement.code)
      if (owner !== undefined) {
        throw new CompositionError(
          'duplicate-add',
          `Requirement "${requirement.code}" is declared by both layer ` +
            `"${owner}" and layer "${layer.id}". A code is a dossier record's ` +
            'identity (ADR-049), so exactly one layer may own it.'
        )
      }
      ownership.set(requirement.code, layer.id)
      layerOrder.push(requirement.code)
      byCode.set(requirement.code, requirement)
    }
  }

  // Pass 2 — citations. Separate from pass 1 so a refinement is checked against
  // the whole composed set: within one layer, declaration order between `add`
  // and `refine` should not decide whether a composition is valid.
  for (const layer of layers) {
    for (const refinement of layer.refine ?? []) {
      assertCitationRefinementShape(layer.id, refinement)

      // This lookup is also the dangling-refine guard, so the requirement is
      // proven to exist by the check rather than asserted afterwards.
      const current = byCode.get(refinement.code)
      if (current === undefined) {
        throw new CompositionError(
          'dangling-refine',
          `Layer "${layer.id}" refines "${refinement.code}", which no layer ` +
            'in this composition declares.'
        )
      }
      // Its own kind, not folded into `invalid-refinement`: that one means "the
      // refinement contract was widened", this one means "this belongs in the
      // declaration". A shared discriminant would make a failure name the wrong
      // mistake.
      if (ownership.get(refinement.code) === layer.id) {
        throw new CompositionError(
          'self-refine',
          `Layer "${layer.id}" refines "${refinement.code}", which it owns. ` +
            'Citations belonging to the owner go in the declaration itself, ' +
            'so there is one way to say this rather than two.'
        )
      }

      // Only a refined requirement is rebuilt. Everything else is returned by
      // identity, so composition creates the minimum number of new references —
      // which is what keeps the memoized resolver's output stable downstream.
      byCode.set(refinement.code, {
        ...current,
        sourceRefs: appendRefs(current.sourceRefs, refinement.addSourceRefs),
      })
    }
  }

  const composed: DocumentRequirement[] = []
  for (const code of layerOrder) {
    const requirement = byCode.get(code)
    if (requirement) composed.push(requirement)
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

  return {
    template: { ...base, documentRequirements },
    ownership,
    sources,
  }
}
