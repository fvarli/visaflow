import { describe, it, expect } from 'vitest'
import { ALL_REQUIREMENT_LAYERS } from '@/config/countries/layers'
import type { ConditionalRequirement } from '@/config/types'

/**
 * What a pack may author as a condition, checked across every layer.
 *
 * `ConditionalRequirement` is a discriminated union, so most malformed
 * combinations cannot be written at all — `oneOf` with a scalar, `equals` with
 * a set, a presence operator carrying either, an empty authored set. This file
 * is the defence-in-depth half: it covers what the type cannot see (duplicates,
 * values that are not literal primitives) and it keeps the census honest about
 * which operators production actually uses.
 *
 * It is about the condition *language*, which is why it lives apart from the
 * pack-provenance and occupation suites — a second operator, or a pack reaching
 * for one nothing has used yet, is this file's business rather than theirs.
 */

const CONDITIONS: {
  layer: string
  code: string
  on: ConditionalRequirement
}[] = ALL_REQUIREMENT_LAYERS.flatMap((layer) =>
  (layer.add ?? [])
    .filter((r) => r.conditionalOn)
    .map((r) => ({
      layer: layer.id,
      code: r.code,
      on: r.conditionalOn as ConditionalRequirement,
    }))
)

const label = (c: (typeof CONDITIONS)[number]) => `${c.layer} -> ${c.code}`

describe('condition vocabulary — every authored condition is well formed', () => {
  it('has conditions to check, so nothing below passes on an absence', () => {
    expect(CONDITIONS.length).toBeGreaterThan(5)
  })

  it('authors only literal primitives', () => {
    // A computed or object-valued payload would compare by reference against a
    // projected scalar and silently never match.
    const isPrimitive = (v: unknown) =>
      typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'

    const offenders = CONDITIONS.filter(({ on }) => {
      if ('values' in on) return !on.values.every(isPrimitive)
      if ('value' in on) return !isPrimitive(on.value)
      return false
    }).map(label)

    expect(offenders).toEqual([])
  })

  it('never repeats a value inside a oneOf set', () => {
    /**
     * Rejected rather than de-duplicated, deliberately. A repeat changes no
     * behaviour, which is exactly why normalising it away is the wrong answer:
     * it is a sign the author lost track of the set, and these sets are three or
     * four items long — small enough that the right fix is to read them.
     */
    const offenders = CONDITIONS.filter(
      ({ on }) => 'values' in on && new Set(on.values).size !== on.values.length
    ).map(label)

    expect(offenders).toEqual([])
  })

  it('uses a non-empty set wherever it uses oneOf', () => {
    // The type already forbids `[]`. This catches the object that reached the
    // registry through a cast, which is the only way an empty set can now get in.
    const offenders = CONDITIONS.filter(
      ({ on }) => 'values' in on && on.values.length === 0
    ).map(label)

    expect(offenders).toEqual([])
  })
})

describe('condition vocabulary — the operators production actually uses', () => {
  it('uses equals, notEquals and oneOf today', () => {
    /**
     * A census rather than a prohibition, so that an operator cannot acquire a
     * production caller quietly. `oneOf` arrived in H4c2d2i with one caller and
     * an argument for it, and is used only where a population has more than one
     * member; `notEquals` is the one still worth seeing arrive,
     * because under fail-closed semantics it is false for every dossier that
     * has not answered the field, so a pack reaching for it is making a
     * subtractive change.
     */
    const used = [...new Set(CONDITIONS.map(({ on }) => on.operator))].sort()
    expect(used).toEqual(['equals', 'notEquals', 'oneOf'])
  })

  it('uses oneOf only where a population genuinely has several members', () => {
    const using = CONDITIONS.filter(({ on }) => on.operator === 'oneOf').map(
      label
    )
    expect(using).toHaveLength(2)
    for (const code of ['EMPLOYER_SIGNATURE_CIRCULAR', 'EMPLOYER_TAX_PLATE']) {
      expect(using.join(' '), code).toContain(code)
    }
  })

  it('never writes a one-member oneOf where equals is the same statement', () => {
    /**
     * `TAX_PAYMENT_STATEMENT` shipped in H4c2d2m as `oneOf(['company_owner'])`
     * and was normalised to `occupationIs` afterwards. Behaviour was identical
     * either way — the migration router swaps the whole condition before it
     * reads an operator — so nothing failed, and the only cost was a census
     * that said three rows route on several occupations when two do.
     *
     * That is what this guard protects: the census is only worth reading if a
     * `oneOf` means what it says.
     */
    const singletons = CONDITIONS.filter(
      ({ on }) => on.operator === 'oneOf' && on.values.length === 1
    ).map(label)
    expect(singletons).toEqual([])
  })
})
