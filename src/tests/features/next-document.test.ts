import { describe, it, expect } from 'vitest'
import {
  deriveNextDocument,
  buildDocumentsModel,
} from '@/features/documents/documents-model'
import type { Document } from '@/domain/schemas/document.schema'
import type { DocumentStatus } from '@/domain/types/common'
import {
  ALL_FIXTURE_ENTRIES,
  allApplicableReady,
  canonicalReadiness,
  emptyDossier,
  manyNotApplicable,
  partiallyPrepared,
  receivedHeavy,
} from '@/tests/fixtures/dossiers'

const NOW = new Date('2099-01-15T00:00:00.000Z')

function doc(
  status: DocumentStatus,
  code = `C-${status}`,
  required = true
): Document {
  return {
    id: `d-${code}`,
    code,
    category: 'supporting',
    ownerType: 'applicant',
    ownerId: 'a1',
    required,
    status,
    verified: false,
  }
}

const canonical = canonicalReadiness

describe('deriveNextDocument — every status maps to a coherent action', () => {
  it('recommends obtaining a not-started document', () => {
    const next = deriveNextDocument([doc('not_started')])
    expect(next?.action).toBe('obtain')
    expect(next?.document?.status).toBe('not_started')
  })

  it('never calls a requested document missing — it says follow up', () => {
    const next = deriveNextDocument([doc('requested')])
    expect(next?.action).toBe('followUp')
    expect(next?.action).not.toBe('obtain')
  })

  it('never tells the applicant to obtain a received document again', () => {
    const next = deriveNextDocument([doc('received')])
    expect(next?.action).toBe('confirm')
    expect(next?.action).not.toBe('obtain')
  })

  it('recommends updating a document that needs updating', () => {
    const next = deriveNextDocument([doc('needs_update')])
    expect(next?.action).toBe('update')
  })

  it('skips ready and not_applicable documents entirely', () => {
    expect(
      deriveNextDocument([doc('ready', 'A'), doc('not_applicable', 'B')])
    ).toBeNull()
  })

  it('skips optional documents', () => {
    expect(deriveNextDocument([doc('not_started', 'OPT', false)])).toBeNull()
  })
})

describe('deriveNextDocument — priority matches the app-wide convention', () => {
  // `deriveNextActions` orders: completeMissingDocs → updateDocuments →
  // confirmDocuments. The Documents workspace must not contradict it.
  const all = [
    doc('received', 'R'),
    doc('needs_update', 'U'),
    doc('requested', 'Q'),
    doc('not_started', 'N'),
  ]

  it('puts not-in-hand work first', () => {
    expect(deriveNextDocument(all)?.code).toBe('N')
  })

  it('then requested, then needs_update, then received', () => {
    expect(deriveNextDocument(all.filter((d) => d.code !== 'N'))?.code).toBe(
      'Q'
    )
    expect(
      deriveNextDocument(all.filter((d) => !['N', 'Q'].includes(d.code)))?.code
    ).toBe('U')
    expect(deriveNextDocument([doc('received', 'R')])?.code).toBe('R')
  })
})

describe('deriveNextDocument — un-instantiated requirements participate', () => {
  it('recommends a required requirement that has no record at all', () => {
    const next = deriveNextDocument([], ['PASSPORT_CURRENT', 'PHOTOS'])
    expect(next?.code).toBe('PASSPORT_CURRENT')
    expect(next?.document).toBeNull()
    expect(next?.action).toBe('obtain')
  })

  it('ignores requirements that already have a record', () => {
    const next = deriveNextDocument(
      [doc('ready', 'PASSPORT_CURRENT')],
      ['PASSPORT_CURRENT']
    )
    expect(next).toBeNull()
  })

  it('prefers an existing not-started record over a bare requirement', () => {
    const next = deriveNextDocument(
      [doc('not_started', 'HAVE_RECORD')],
      ['NO_RECORD']
    )
    expect(next?.code).toBe('HAVE_RECORD')
    expect(next?.document).not.toBeNull()
  })

  it('still recommends work for a dossier that has never been seeded', () => {
    // The exact bug: `documents: []` with a country pack full of requirements
    // used to report "all caught up" beside a 0% readiness bar.
    const model = buildDocumentsModel(
      {
        applicant: partiallyPrepared.applicant,
        application: partiallyPrepared.application,
        documents: [],
        sponsors: [],
      },
      NOW
    )
    expect(model.readiness.outstanding).toBeGreaterThan(0)
    expect(model.nextDocument).not.toBeNull()
    expect(model.nextDocument?.document).toBeNull()
  })
})

describe('deriveNextDocument — never contradicts canonical readiness', () => {
  it.each(ALL_FIXTURE_ENTRIES)(
    'has a recommendation iff there is outstanding work (%s)',
    (_name, fixture) => {
      const model = buildDocumentsModel(fixture, NOW)
      const readiness = canonical(fixture)
      expect(model.readiness).toEqual(readiness)
      // The load-bearing invariant: "all caught up" is only ever true when
      // canonical readiness agrees there is nothing outstanding.
      expect(model.nextDocument !== null).toBe(readiness.outstanding > 0)
    }
  )

  it('is null for a dossier with no applicable work at all', () => {
    expect(buildDocumentsModel(emptyDossier, NOW).nextDocument).toBeNull()
    expect(buildDocumentsModel(manyNotApplicable, NOW).nextDocument).toBeNull()
  })

  it('is null once every applicable document is confirmed ready', () => {
    const model = buildDocumentsModel(allApplicableReady, NOW)
    expect(model.readiness.complete).toBe(true)
    expect(model.nextDocument).toBeNull()
  })

  it('recommends confirming when everything is obtained but unconfirmed', () => {
    const model = buildDocumentsModel(receivedHeavy, NOW)
    expect(model.readiness.obtained).toBeGreaterThan(0)
    expect(model.nextDocument?.action).toBe('confirm')
  })
})
