import { describe, it, expect } from 'vitest'
import {
  buildDocumentReadiness,
  classifyStatus,
  isApplicable,
  isDossierReady,
  isObtained,
} from '@/features/readiness/document-readiness'
import type { Document } from '@/domain/schemas/document.schema'
import type { DocumentCategory, DocumentStatus } from '@/domain/types/common'
import {
  allApplicableReady,
  manyNotApplicable,
  partiallyPrepared,
  receivedHeavy,
} from '@/tests/fixtures/dossiers'

const ALL_STATUSES: DocumentStatus[] = [
  'not_started',
  'requested',
  'received',
  'needs_update',
  'ready',
  'not_applicable',
]

function doc(
  status: DocumentStatus,
  required = true,
  category: DocumentCategory = 'supporting',
  code = `C-${status}-${required}`
): Document {
  return {
    id: `d-${code}`,
    code,
    category,
    ownerType: 'applicant',
    ownerId: 'a1',
    required,
    status,
    verified: false,
  }
}

describe('readiness — status classification', () => {
  it('maps every status to exactly one class', () => {
    const classes = ALL_STATUSES.map(classifyStatus)
    expect(classes).toEqual([
      'notStarted',
      'inProgress',
      'obtained',
      'needsUpdate',
      'ready',
      'notApplicable',
    ])
  })

  it('treats only `ready` as dossier-ready', () => {
    for (const status of ALL_STATUSES) {
      expect(isDossierReady(status)).toBe(status === 'ready')
    }
  })

  it('treats `received` and `ready` as in hand', () => {
    for (const status of ALL_STATUSES) {
      expect(isObtained(status)).toBe(
        status === 'received' || status === 'ready'
      )
    }
  })

  it('excludes only `not_applicable` from the denominator', () => {
    for (const status of ALL_STATUSES) {
      expect(isApplicable(status)).toBe(status !== 'not_applicable')
    }
  })
})

describe('readiness — the two structural invariants', () => {
  const cases = [
    ['partiallyPrepared', partiallyPrepared],
    ['receivedHeavy', receivedHeavy],
    ['manyNotApplicable', manyNotApplicable],
    ['allApplicableReady', allApplicableReady],
  ] as const

  it.each(cases)(
    'the five applicable classes partition `applicable` (%s)',
    (_name, fixture) => {
      const r = buildDocumentReadiness({ documents: fixture.documents })
      expect(
        r.ready + r.obtained + r.inProgress + r.notStarted + r.needsUpdate
      ).toBe(r.applicable)
    }
  )

  it.each(cases)(
    'applicable + notApplicable === requiredTotal (%s)',
    (_name, fixture) => {
      const r = buildDocumentReadiness({ documents: fixture.documents })
      expect(r.applicable + r.notApplicable).toBe(r.requiredTotal)
    }
  )

  it('partitions even with every status present at once', () => {
    const r = buildDocumentReadiness({
      documents: ALL_STATUSES.map((s) => doc(s)),
    })
    expect(r.requiredTotal).toBe(6)
    expect(r.applicable).toBe(5)
    expect(r.notApplicable).toBe(1)
    expect(
      r.ready + r.obtained + r.inProgress + r.notStarted + r.needsUpdate
    ).toBe(5)
  })
})

describe('readiness — the percentage', () => {
  it('is ready over applicable', () => {
    const r = buildDocumentReadiness({ documents: partiallyPrepared.documents })
    // 2 ready of 6 required, none not-applicable.
    expect(r.ready).toBe(2)
    expect(r.applicable).toBe(6)
    expect(r.percent).toBe(33)
    expect(r.outstanding).toBe(4)
    expect(r.complete).toBe(false)
  })

  it('reaches 100% when every applicable document is confirmed', () => {
    const r = buildDocumentReadiness({
      documents: allApplicableReady.documents,
    })
    expect(r.percent).toBe(100)
    expect(r.complete).toBe(true)
    expect(r.outstanding).toBe(0)
  })

  it('reports 0 with no documents at all, and no applicable work', () => {
    const r = buildDocumentReadiness({ documents: [] })
    expect(r.percent).toBe(0)
    expect(r.requiredTotal).toBe(0)
    expect(r.hasApplicableWork).toBe(false)
    expect(r.complete).toBe(false)
  })
})

describe('readiness — not_applicable is neutral', () => {
  it('leaves the percentage unchanged when work is marked not applicable', () => {
    const base = [
      doc('ready', true, 'passport', 'A'),
      doc('not_started', true, 'financial', 'B'),
    ]
    const before = buildDocumentReadiness({ documents: base })
    expect(before.percent).toBe(50)

    // Marking a THIRD, irrelevant requirement N/A must not move the number.
    const withNa = [...base, doc('not_applicable', true, 'employment', 'C')]
    const after = buildDocumentReadiness({ documents: withNa })
    expect(after.percent).toBe(50)
    expect(after.applicable).toBe(2)
    expect(after.notApplicable).toBe(1)
    expect(after.requiredTotal).toBe(3)
  })

  it('never inflates: N/A is not counted as completed work', () => {
    const r = buildDocumentReadiness({ documents: manyNotApplicable.documents })
    // Disclaimed documents leave both sides: the numerator counts only the
    // applicable ones that are ready, never the disclaimed ones as done.
    expect(r.notApplicable).toBeGreaterThan(0)
    expect(r.ready).toBe(r.applicable)
    expect(r.ready).toBeLessThan(r.requiredTotal)
    expect(r.percent).toBe(100)
  })

  it('never deflates: 100% stays reachable alongside N/A documents', () => {
    const r = buildDocumentReadiness({ documents: manyNotApplicable.documents })
    expect(r.percent).toBe(100)
    expect(r.complete).toBe(true)
  })

  it('reports no applicable work when everything is marked not applicable', () => {
    const r = buildDocumentReadiness({
      documents: [
        doc('not_applicable', true, 'employment', 'A'),
        doc('not_applicable', true, 'sponsor', 'B'),
      ],
    })
    expect(r.hasApplicableWork).toBe(false)
    expect(r.applicable).toBe(0)
    expect(r.percent).toBe(0)
    expect(r.outstanding).toBe(0)
    expect(r.requiredTotal).toBe(2)
  })
})

describe('readiness — received is obtained, never missing, never ready', () => {
  it('counts received in its own class', () => {
    const r = buildDocumentReadiness({ documents: receivedHeavy.documents })
    expect(r.obtained).toBeGreaterThan(0)
    expect(r.notStarted).toBe(0)
    expect(r.inProgress).toBe(0)
    expect(r.ready).toBe(1)
  })

  it('keeps received out of the numerator', () => {
    const r = buildDocumentReadiness({ documents: receivedHeavy.documents })
    // Everything is in hand, yet only the one confirmed document counts.
    expect(r.percent).toBe(Math.round((1 / r.applicable) * 100))
    expect(r.complete).toBe(false)
  })

  it('keeps received inside the denominator', () => {
    const r = buildDocumentReadiness({ documents: receivedHeavy.documents })
    expect(r.applicable).toBe(r.ready + r.obtained)
    expect(r.outstanding).toBe(r.obtained)
  })

  it('never reports a received document as not started', () => {
    const r = buildDocumentReadiness({
      documents: [doc('received', true, 'financial', 'A')],
    })
    expect(r.notStarted).toBe(0)
    expect(r.obtained).toBe(1)
  })
})

describe('readiness — optional documents', () => {
  it('never enter the numerator or the denominator', () => {
    const withOptional = buildDocumentReadiness({
      documents: [
        doc('ready', true, 'passport', 'A'),
        doc('not_started', false, 'supporting', 'B'),
        doc('ready', false, 'supporting', 'C'),
      ],
    })
    expect(withOptional.applicable).toBe(1)
    expect(withOptional.ready).toBe(1)
    expect(withOptional.percent).toBe(100)
    expect(withOptional.optional).toBe(2)
  })
})

describe('readiness — pending requirements with no record', () => {
  it('counts an applicable requirement that has no document as not started', () => {
    const r = buildDocumentReadiness({
      documents: [doc('ready', true, 'passport', 'PASSPORT_CURRENT')],
      requiredRequirementCodes: ['PHOTOS', 'BANK_STATEMENTS'],
    })
    expect(r.applicable).toBe(3)
    expect(r.notStarted).toBe(2)
    expect(r.percent).toBe(33)
  })

  it('does not double-count a requirement that already has a record', () => {
    const r = buildDocumentReadiness({
      documents: [doc('ready', true, 'passport', 'PASSPORT_CURRENT')],
      requiredRequirementCodes: ['PASSPORT_CURRENT'],
    })
    expect(r.applicable).toBe(1)
    expect(r.percent).toBe(100)
  })

  it('prevents a 100% reading while requirements are still uncollected', () => {
    const withoutPending = buildDocumentReadiness({
      documents: [doc('ready', true, 'passport', 'PASSPORT_CURRENT')],
    })
    expect(withoutPending.percent).toBe(100)

    const withPending = buildDocumentReadiness({
      documents: [doc('ready', true, 'passport', 'PASSPORT_CURRENT')],
      requiredRequirementCodes: ['PHOTOS'],
    })
    expect(withPending.percent).toBe(50)
  })
})
