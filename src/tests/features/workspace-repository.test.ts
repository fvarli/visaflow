import { describe, it, expect } from 'vitest'
import { MemoryDossierRepository } from '@/features/workspace/adapters/memory-adapter'
import { migrateRecord } from '@/features/workspace/migrations'
import {
  STORAGE_FORMAT_VERSION,
  type DossierPayload,
  type SavedDossierRecord,
} from '@/features/workspace/saved-dossier'
import {
  createSavedDossierId,
  deriveDisplayTitle,
  nextActiveAfterDelete,
  sortSummaries,
  toRecord,
  toSummary,
} from '@/features/workspace/workspace-model'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
import {
  partiallyPrepared,
  allApplicableReady,
} from '@/tests/fixtures/dossiers'

/**
 * The persistence *contract*, exercised against the in-memory adapter.
 *
 * What this proves: workspace semantics — isolation, migration behaviour, meta
 * handling, summary derivation. What it deliberately does not prove: that
 * IndexedDB works. jsdom has no IndexedDB, so the production adapter is verified
 * in real Chrome and recorded in `docs/manual-qa.md`.
 */

const NOW = '2026-08-23T10:00:00.000Z'
const LATER = '2026-08-24T10:00:00.000Z'

function payloadOf(fixture: {
  applicant: DossierPayload['applicant']
  application: DossierPayload['application']
  documents: DossierPayload['documents']
  sponsors: DossierPayload['sponsors']
}): DossierPayload {
  return {
    applicant: fixture.applicant,
    application: fixture.application,
    documents: fixture.documents,
    sponsors: fixture.sponsors,
  }
}

function record(
  id: string,
  payload: DossierPayload,
  now = NOW
): SavedDossierRecord {
  return toRecord(id, payload, SCHEMA_VERSION, now)
}

describe('dossier repository contract', () => {
  it('round-trips a record', async () => {
    const repo = new MemoryDossierRepository()
    const saved = record('a', payloadOf(partiallyPrepared))

    await repo.put(saved)
    const loaded = await repo.get('a')

    expect(loaded?.id).toBe('a')
    expect(loaded?.payload.documents).toHaveLength(
      partiallyPrepared.documents.length
    )
    expect(loaded?.storageVersion).toBe(STORAGE_FORMAT_VERSION)
  })

  it('keeps dossiers isolated from one another', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(record('a', payloadOf(partiallyPrepared)))
    await repo.put(record('b', payloadOf(allApplicableReady)))

    const a = await repo.get('a')
    const b = await repo.get('b')

    expect(a?.payload.documents).toHaveLength(
      partiallyPrepared.documents.length
    )
    expect(b?.payload.documents).toHaveLength(
      allApplicableReady.documents.length
    )
    expect(await repo.list()).toHaveLength(2)
  })

  it('does not alias live state — a stored record is a copy', async () => {
    const repo = new MemoryDossierRepository()
    // A private copy: `payloadOf` shallow-copies, so mutating the fixture's own
    // arrays would corrupt every other test in the suite.
    const payload: DossierPayload = {
      ...payloadOf(partiallyPrepared),
      documents: [...partiallyPrepared.documents],
    }
    const originalCount = payload.documents.length
    await repo.put(record('a', payload))

    // Mutating the source afterwards must not reach through into storage.
    payload.documents.pop()

    const loaded = await repo.get('a')
    expect(payload.documents).toHaveLength(originalCount - 1)
    expect(loaded?.payload.documents).toHaveLength(originalCount)
  })

  it('deletes only the named dossier', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(record('a', payloadOf(partiallyPrepared)))
    await repo.put(record('b', payloadOf(allApplicableReady)))

    await repo.delete('a')

    expect(await repo.get('a')).toBeNull()
    expect(await repo.get('b')).not.toBeNull()
  })

  it('persists the active dossier id in meta', async () => {
    const repo = new MemoryDossierRepository()
    expect((await repo.readMeta()).activeDossierId).toBeNull()

    await repo.writeMeta({ activeDossierId: 'b' })

    expect((await repo.readMeta()).activeDossierId).toBe('b')
  })

  it('surfaces write failures instead of swallowing them', async () => {
    const repo = new MemoryDossierRepository()
    repo.failNext = new Error('QuotaExceededError')

    await expect(
      repo.put(record('a', payloadOf(partiallyPrepared)))
    ).rejects.toThrow('QuotaExceededError')
  })
})

describe('migration seam', () => {
  it('passes a current-version record through unchanged', () => {
    const result = migrateRecord(record('a', payloadOf(partiallyPrepared)))
    expect(result).toMatchObject({ ok: true, migrated: false })
  })

  it('refuses a record from a newer build without destroying it', async () => {
    const repo = new MemoryDossierRepository()
    const future = {
      ...record('future', payloadOf(partiallyPrepared)),
      storageVersion: 99,
    }
    repo.seedRaw('future', future)

    expect(migrateRecord(future)).toEqual({
      ok: false,
      reason: 'newer-version',
    })
    // Not readable, but still present and still listed for export.
    expect(await repo.get('future')).toBeNull()
    expect(await repo.list()).toHaveLength(0)
    expect(await repo.listUnreadable()).toEqual([
      { id: 'future', storageVersion: 99, raw: future },
    ])
  })

  it('reports malformed stored values rather than throwing', () => {
    expect(migrateRecord(null)).toEqual({ ok: false, reason: 'malformed' })
    expect(migrateRecord({ nope: true })).toEqual({
      ok: false,
      reason: 'malformed',
    })
  })
})

describe('workspace model', () => {
  it('mints a fresh local id per dossier', () => {
    expect(createSavedDossierId()).not.toBe(createSavedDossierId())
  })

  it('titles a dossier by given name and destination, never the surname', () => {
    const saved = record('a', payloadOf(partiallyPrepared))
    const title = deriveDisplayTitle(saved, 'Untitled')

    expect(title).toContain(saved.destinationCountry ?? '')
    if (partiallyPrepared.applicant) {
      expect(title).toContain(partiallyPrepared.applicant.firstName)
      expect(title).not.toContain(partiallyPrepared.applicant.lastName)
    }
  })

  it('falls back rather than inventing a name', () => {
    expect(
      deriveDisplayTitle(
        { applicantName: null, destinationCountry: null, title: null },
        'Untitled'
      )
    ).toBe('Untitled')
  })

  it('carries no dossier contents into a summary', () => {
    const summary = toSummary(
      record('a', payloadOf(partiallyPrepared)),
      'Untitled'
    )
    expect(Object.keys(summary)).not.toContain('payload')
    expect(JSON.stringify(summary)).not.toContain('passport')
  })

  it('orders by most recently opened, with unreadable records last', () => {
    const older = toSummary(
      record('old', payloadOf(partiallyPrepared), NOW),
      'x'
    )
    const newer = toSummary(
      record('new', payloadOf(partiallyPrepared), LATER),
      'y'
    )
    const broken = { ...older, id: 'broken', unreadable: true }

    expect(sortSummaries([older, broken, newer]).map((s) => s.id)).toEqual([
      'new',
      'old',
      'broken',
    ])
  })

  it('picks the most recent survivor when the active dossier is deleted', () => {
    const older = toSummary(
      record('old', payloadOf(partiallyPrepared), NOW),
      'x'
    )
    const newer = toSummary(
      record('new', payloadOf(partiallyPrepared), LATER),
      'y'
    )

    expect(nextActiveAfterDelete([older, newer], 'new')).toBe('old')
    expect(nextActiveAfterDelete([newer], 'new')).toBeNull()
  })
})
