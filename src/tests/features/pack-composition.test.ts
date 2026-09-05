import { describe, it, expect } from 'vitest'
import type { CompositionResult } from '@/config/composition'
import type { DocumentRequirement } from '@/config/types'
import {
  TEST_COMPOSITIONS,
  composeContaminated,
  composeTestPack,
  jurisdictionScopedCodes,
  TEST_BLOC,
  jxSource,
  jySource,
  testCommonLayer,
  testJxLayer,
  testJyLayer,
  testlandALayer,
  testlandBLayer,
  treatySource,
  type TestCompositionName,
} from '@/tests/fixtures/test-packs'

/**
 * Proof that the composition model is genuinely compositional.
 *
 * `composition.test.ts` establishes that the composer behaves correctly given
 * one layer set. That is necessary and not sufficient: a composer that quietly
 * ignored its jurisdiction layer would pass every one of those tests. What
 * cannot be faked is a *relationship between compositions* — that two
 * destinations inherit the same common requirements identically, that a filing
 * jurisdiction's requirements appear in its compositions and no others, and
 * that a requirement's acceptance contract is the same wherever it appears.
 *
 * So every test here spans two or more compositions or asserts something about
 * how they relate. If an assertion would pass against a single composition it
 * belongs in the other file, not this one.
 *
 * The topology is two destinations × two filing jurisdictions (see
 * `test-packs.ts`), which is the smallest arrangement in which inheritance,
 * destination isolation and jurisdiction isolation are three different claims
 * rather than three phrasings of one.
 */

const NAMES = Object.keys(TEST_COMPOSITIONS) as TestCompositionName[]

const composed = (name: TestCompositionName) => TEST_COMPOSITIONS[name]()

const codesOf = (result: CompositionResult) =>
  result.template.documentRequirements.map((r) => r.code)

const find = (result: CompositionResult, code: string) =>
  result.template.documentRequirements.find((r) => r.code === code)

/** Which filing jurisdiction each composition actually includes. */
const JURISDICTION_OF: Record<TestCompositionName, string> = {
  'A+JX': 'JX',
  'A+JY': 'JY',
  'B+JX': 'JX',
  'B+JY': 'JY',
}

describe('composition — the common layer is inherited, not copied', () => {
  it.each(NAMES)('%s contains every common requirement', (name) => {
    expect(codesOf(composed(name))).toEqual(
      expect.arrayContaining(['TEST_FORM', 'TEST_PASSPORT', 'TEST_OPTIONAL'])
    )
  })

  it('gives every composition an identical unrefined common requirement', () => {
    // TEST_FORM and TEST_OPTIONAL are refined by nothing, so all four
    // compositions must present exactly the same object content. A composer
    // that rebuilt or mutated shared requirements per composition would drift
    // here first.
    for (const code of ['TEST_FORM', 'TEST_OPTIONAL']) {
      const seen = NAMES.map((name) => find(composed(name), code))
      expect(seen[0]).toBeDefined()
      for (const requirement of seen) {
        expect(requirement).toEqual(seen[0])
      }
    }
  })

  it('does not let one composition mutate a shared declaration', () => {
    // The layers are module-level constants shared by every composition; if
    // composition mutated in place rather than rebuilding, composing A+JX would
    // silently change what B+JY later sees.
    composed('A+JX')
    const declared = testCommonLayer.add?.find(
      (r) => r.code === 'TEST_PASSPORT'
    )
    expect(declared?.sourceRefs).toEqual([treatySource.id])
  })
})

describe('composition — destinations stay isolated', () => {
  it('puts a destination requirement only in that destination', () => {
    expect(codesOf(composed('A+JX'))).toContain('TEST_A_ENTRY')
    expect(codesOf(composed('A+JY'))).toContain('TEST_A_ENTRY')
    expect(codesOf(composed('B+JX'))).not.toContain('TEST_A_ENTRY')
    expect(codesOf(composed('B+JY'))).not.toContain('TEST_A_ENTRY')
  })

  it('holds symmetrically for the other destination', () => {
    expect(codesOf(composed('B+JX'))).toContain('TEST_B_PERMIT')
    expect(codesOf(composed('B+JY'))).toContain('TEST_B_PERMIT')
    expect(codesOf(composed('A+JX'))).not.toContain('TEST_B_PERMIT')
    expect(codesOf(composed('A+JY'))).not.toContain('TEST_B_PERMIT')
  })
})

describe('composition — filing jurisdictions stay isolated', () => {
  it('puts a jurisdiction requirement only in that jurisdiction', () => {
    expect(codesOf(composed('A+JX'))).toContain('TEST_JX_REGISTRY')
    expect(codesOf(composed('B+JX'))).toContain('TEST_JX_REGISTRY')
    expect(codesOf(composed('A+JY'))).not.toContain('TEST_JX_REGISTRY')
    expect(codesOf(composed('B+JY'))).not.toContain('TEST_JX_REGISTRY')
  })

  it('holds symmetrically for the other jurisdiction', () => {
    expect(codesOf(composed('A+JY'))).toContain('TEST_JY_STATEMENT')
    expect(codesOf(composed('B+JY'))).toContain('TEST_JY_STATEMENT')
    expect(codesOf(composed('A+JX'))).not.toContain('TEST_JY_STATEMENT')
    expect(codesOf(composed('B+JX'))).not.toContain('TEST_JY_STATEMENT')
  })

  it('keeps a jurisdiction citation out of the compositions without it', () => {
    // Not just the requirement — the *citation* too. This is the half ADR-048
    // is really about: a shared requirement that quietly carries one
    // jurisdiction's source is inherited by every pack.
    const refsIn = (name: TestCompositionName) =>
      composed(name).template.documentRequirements.flatMap(
        (r) => r.sourceRefs ?? []
      )
    expect(refsIn('A+JX')).not.toContain(jySource.id)
    expect(refsIn('A+JY')).not.toContain(jxSource.id)
  })
})

describe('composition — the ADR-048 quarantine property', () => {
  /**
   * Stated as the ADR states it: a requirement whose evidence is scoped to one
   * filing jurisdiction must not appear in a composition that does not include
   * that jurisdiction. Derived from composed sources, never from layer
   * membership — asserting "the JX requirement is missing from a JY
   * composition" would only restate how the fixture was built.
   */
  it.each(NAMES)('%s carries no foreign jurisdiction evidence', (name) => {
    const scoped = jurisdictionScopedCodes(composed(name), TEST_BLOC)
    expect([...scoped.keys()].sort()).toEqual([JURISDICTION_OF[name]])
  })

  it('reports a jurisdiction requirement that leaked into the shared layer', () => {
    // The negative control, and the most important test in this file. ADR-048's
    // defect reproduced in miniature: a JX-scoped requirement sitting in the
    // layer every composition inherits. A detector that never fires is
    // indistinguishable from one that cannot, which is exactly how the
    // production invariant became a tripwire that asserts an empty list.
    const leaked = composeContaminated(testlandALayer, testJyLayer)
    const scoped = jurisdictionScopedCodes(leaked, TEST_BLOC)

    expect([...scoped.keys()].sort()).toEqual(['JX', 'JY'])
    expect(scoped.get('JX')).toContain('TEST_LEAKED')
  })

  it('names the leaked requirement rather than only failing', () => {
    // A quarantine failure has to say which requirement must be split out,
    // otherwise it reports that something is wrong and leaves the reader to
    // find it.
    const leaked = composeContaminated(testlandBLayer, testJyLayer)
    expect(jurisdictionScopedCodes(leaked, TEST_BLOC).get('JX')).toEqual([
      'TEST_LEAKED',
    ])
  })
})

describe('composition — refinement changes citations and nothing else', () => {
  const passportIn = (name: TestCompositionName) =>
    find(composed(name), 'TEST_PASSPORT')

  it('appends only the citation of the jurisdiction that composed it', () => {
    expect(passportIn('A+JX')?.sourceRefs).toEqual([
      treatySource.id,
      jxSource.id,
    ])
    expect(passportIn('A+JY')?.sourceRefs).toEqual([
      treatySource.id,
      jySource.id,
    ])
  })

  it('leaves every other field identical across jurisdictions', () => {
    // Field-wise rather than "sourceRefs looks right": if the refinement
    // contract is ever widened, this is what notices a second field moving.
    const strip = (r: DocumentRequirement | undefined) => {
      // Asserted rather than defaulted: `?? {}` on both sides would make this
      // pass by comparing two empty objects if the lookup ever broke.
      expect(r).toBeDefined()
      const { sourceRefs: _refs, ...rest } = r ?? ({} as DocumentRequirement)
      return rest
    }
    expect(strip(passportIn('A+JX'))).toEqual(strip(passportIn('A+JY')))
  })

  it('leaves the same field set as the owning layer declared', () => {
    const owner = testCommonLayer.add?.find((r) => r.code === 'TEST_PASSPORT')
    const composedPassport = passportIn('A+JX')
    // Two empty key lists would otherwise compare equal and prove nothing.
    expect(owner).toBeDefined()
    expect(composedPassport).toBeDefined()
    expect(Object.keys(composedPassport ?? {}).sort()).toEqual(
      Object.keys(owner ?? {}).sort()
    )
  })
})

describe('composition — revision is composition-invariant', () => {
  it('carries one acceptance contract for a code in every composition', () => {
    // The property that makes a dossier portable: satisfiedRevision: 2 on a
    // stored TEST_PASSPORT means the same thing wherever it is read back. If a
    // jurisdiction could move a revision it did not own, the same number would
    // mean different bars in different compositions (ADR-049, ADR-051).
    const revisions = NAMES.map((name) =>
      find(composed(name), 'TEST_PASSPORT')
    ).map((r) => r?.revision)
    expect(revisions).toEqual([2, 2, 2, 2])
  })

  it('agrees with the layer that owns the code', () => {
    const owner = testCommonLayer.add?.find((r) => r.code === 'TEST_PASSPORT')
    expect(find(composed('A+JX'), 'TEST_PASSPORT')?.revision).toBe(
      owner?.revision
    )
  })

  it('reports the owning layer for every composed code', () => {
    const { ownership } = composed('A+JX')
    expect(ownership.get('TEST_PASSPORT')).toBe('test-common')
    expect(ownership.get('TEST_A_ENTRY')).toBe('testland-a')
    expect(ownership.get('TEST_JX_REGISTRY')).toBe('test-jx')
  })
})

describe('composition — provenance survives', () => {
  it.each(NAMES)('%s resolves every citation it composes', (name) => {
    // Asserted positively rather than trusting that the composer would have
    // thrown: a dangling citation renders as no provenance at all, which reads
    // to an applicant as "unverified" (ADR-046).
    const result = composed(name)
    const available = new Set(result.sources.map((s) => s.id))
    const unresolved = result.template.documentRequirements.flatMap((r) =>
      (r.sourceRefs ?? []).filter((ref) => !available.has(ref))
    )
    expect(unresolved).toEqual([])
  })

  it('exposes only the sources the composed layers contribute', () => {
    expect(composed('A+JX').sources.map((s) => s.id)).toEqual([
      treatySource.id,
      jxSource.id,
    ])
    expect(composed('B+JY').sources.map((s) => s.id)).toEqual([
      treatySource.id,
      jySource.id,
    ])
  })
})

describe('composition — order', () => {
  it('falls back to common → destination → jurisdiction', () => {
    expect(codesOf(composed('A+JX'))).toEqual([
      'TEST_FORM',
      'TEST_PASSPORT',
      'TEST_OPTIONAL',
      'TEST_A_ENTRY',
      'TEST_JX_REGISTRY',
    ])
  })

  it('is deterministic across repeated compositions', () => {
    // Composition feeds document seeding order and the next-document
    // recommendation, so an order that varied between two identical calls would
    // make the workspace non-reproducible.
    expect(codesOf(composed('B+JY'))).toEqual(codesOf(composed('B+JY')))
  })

  it('honours an explicit order without changing the composed set', () => {
    const fallback = composeTestPack(testlandALayer, testJxLayer)
    const reordered = composeTestPack(testlandALayer, testJxLayer, [
      'TEST_JX_REGISTRY',
      'TEST_A_ENTRY',
      'TEST_OPTIONAL',
      'TEST_PASSPORT',
      'TEST_FORM',
    ])

    expect(codesOf(reordered)).toEqual([
      'TEST_JX_REGISTRY',
      'TEST_A_ENTRY',
      'TEST_OPTIONAL',
      'TEST_PASSPORT',
      'TEST_FORM',
    ])
    expect(codesOf(reordered).sort()).toEqual(codesOf(fallback).sort())
  })

  it('composes the same requirement objects whichever order is used', () => {
    const fallback = composeTestPack(testlandALayer, testJxLayer)
    const reordered = composeTestPack(testlandALayer, testJxLayer, [
      'TEST_JX_REGISTRY',
      'TEST_A_ENTRY',
      'TEST_OPTIONAL',
      'TEST_PASSPORT',
      'TEST_FORM',
    ])
    for (const code of codesOf(fallback)) {
      expect(find(reordered, code)).toEqual(find(fallback, code))
    }
  })
})
