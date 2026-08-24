import { describe, it, expect } from 'vitest'
import { MemoryDossierRepository } from '@/features/workspace/adapters/memory-adapter'
import { migrateRecord } from '@/features/workspace/migrations'
import {
  STORAGE_FORMAT_VERSION,
  type DossierPayload,
  type SavedDossierRecord,
} from '@/features/workspace/saved-dossier'
import {
  normalizeTitle,
  deriveDisplayTitle,
  toRecord,
  toSummary,
} from '@/features/workspace/workspace-model'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
import { exportDossier } from '@/features/import-export/services'
import { partiallyPrepared } from '@/tests/fixtures/dossiers'

/**
 * The compare-and-swap contract — the thing that actually makes two tabs safe.
 *
 * Every case here is a two-tab story told through one repository, because that
 * is exactly what two tabs are: two writers against one store.
 */

const NOW = '2026-08-23T10:00:00.000Z'

function payload(): DossierPayload {
  return {
    applicant: partiallyPrepared.applicant,
    application: partiallyPrepared.application,
    documents: partiallyPrepared.documents,
    sponsors: partiallyPrepared.sponsors,
  }
}

function record(id: string, previous?: SavedDossierRecord | null) {
  return toRecord(id, payload(), SCHEMA_VERSION, NOW, previous)
}

/** The stored record, or a clear failure — never a silently optional one. */
async function stored(repo: MemoryDossierRepository, id: string) {
  const found = await repo.get(id)
  if (!found) throw new Error(`no stored record ${id}`)
  return found
}

describe('compare-and-swap', () => {
  it('starts at revision 1 and increments on each accepted write', async () => {
    const repo = new MemoryDossierRepository()

    const first = await repo.put(record('a'))
    expect(first).toEqual({ ok: true, revision: 1 })

    const second = await repo.put(record('a', await repo.get('a')), 1)
    expect(second).toEqual({ ok: true, revision: 2 })
    expect((await repo.get('a'))?.revision).toBe(2)
  })

  it('rejects a stale write and reports the revision that actually won', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(record('a'))

    // Two tabs both loaded revision 1.
    const tabA = await stored(repo, 'a')
    const tabB = await stored(repo, 'a')

    // Tab A saves first.
    const aResult = await repo.put(
      { ...tabA, applicantName: 'A wrote this' },
      1
    )
    expect(aResult).toEqual({ ok: true, revision: 2 })

    // Tab B still believes it holds revision 1.
    const bResult = await repo.put(
      { ...tabB, applicantName: 'B wrote this' },
      1
    )
    expect(bResult).toEqual({
      ok: false,
      reason: 'conflict',
      currentRevision: 2,
    })

    // The decisive assertion: A's data is intact.
    expect((await repo.get('a'))?.applicantName).toBe('A wrote this')
  })

  it('refuses to resurrect a record deleted by another tab', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(record('a'))
    const held = await stored(repo, 'a')

    await repo.delete('a')

    const result = await repo.put({ ...held }, held.revision)
    expect(result).toEqual({ ok: false, reason: 'deleted' })
    expect(await repo.get('a')).toBeNull()
    expect(await repo.list()).toHaveLength(0)
  })

  it('lets a fresh identity be written without an expected revision', async () => {
    const repo = new MemoryDossierRepository()
    // "Save as a new dossier" after a conflict takes this path.
    const result = await repo.put(record('brand-new'))
    expect(result).toEqual({ ok: true, revision: 1 })
  })
})

describe('rename', () => {
  it('persists an explicit title without touching the payload', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(record('a'))
    const before = await stored(repo, 'a')

    await repo.put(
      { ...before, title: 'Greece September 2026' },
      before.revision
    )
    const after = await repo.get('a')

    expect(after?.title).toBe('Greece September 2026')
    expect(after?.payload).toEqual(before?.payload)
  })

  it('lets an explicit title win over the derived one', () => {
    const named = { ...record('a'), title: 'Greece September 2026' }
    expect(deriveDisplayTitle(named, 'Untitled')).toBe('Greece September 2026')
  })

  it('does not rename itself when applicant data later changes', () => {
    const named = { ...record('a'), title: 'My trip', applicantName: 'Renamed' }
    expect(deriveDisplayTitle(named, 'Untitled')).toBe('My trip')
  })

  it('clears back to the derived title rather than storing a blank', () => {
    expect(normalizeTitle('   ')).toBeNull()
    expect(normalizeTitle('  Trip  ')).toBe('Trip')

    const cleared = { ...record('a'), title: normalizeTitle('   ') }
    expect(deriveDisplayTitle(cleared, 'Untitled')).not.toBe('')
  })

  it('never leaks the local title into the exported dossier', () => {
    const named = { ...record('a'), title: 'Greece September 2026' }
    const json = exportDossier(
      named.payload.applicant,
      named.payload.application,
      named.payload.documents,
      named.payload.sponsors
    )

    expect(json).not.toContain('Greece September 2026')
    const parsed = JSON.parse(json) as Record<string, unknown>
    expect(Object.keys(parsed).sort()).toEqual(
      [
        'applicant',
        'application',
        'documents',
        'exportedAt',
        'schemaVersion',
        'sponsors',
      ].sort()
    )
    expect(parsed.schemaVersion).toBe('1.0.0')
  })

  it("reports whether a title is the user's or derived", () => {
    expect(toSummary(record('a'), 'Untitled').named).toBe(false)
    expect(toSummary({ ...record('a'), title: 'Mine' }, 'Untitled').named).toBe(
      true
    )
  })
})

describe('storage migration v1 → v2', () => {
  /** A record exactly as the previous build wrote it: no revision, no title. */
  function v1Record(): unknown {
    const current = record('legacy') as unknown as Record<string, unknown>
    const { revision: _r, title: _t, ...rest } = current
    return { ...rest, storageVersion: 1 }
  }

  it('upgrades a v1 record without losing the dossier', () => {
    const result = migrateRecord(v1Record())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.migrated).toBe(true)
    expect(result.record.storageVersion).toBe(STORAGE_FORMAT_VERSION)
    expect(result.record.revision).toBe(1)
    expect(result.record.title).toBeNull()
    // The point of the migration: the dossier itself is untouched.
    expect(result.record.payload.documents).toHaveLength(
      partiallyPrepared.documents.length
    )
  })

  it('shows a migrated record under exactly the name it had before', () => {
    // What the previous build displayed: derived, since v1 had no title field.
    const before = deriveDisplayTitle(
      v1Record() as Parameters<typeof deriveDisplayTitle>[0],
      'Untitled'
    )
    const result = migrateRecord(v1Record())
    if (!result.ok) throw new Error('expected migration to succeed')

    expect(before).not.toBe('Untitled')
    expect(deriveDisplayTitle(result.record, 'Untitled')).toBe(before)
  })

  it('can still be written after migrating — the whole point of the ladder', async () => {
    // The bug this exists for: `get()` migrated a v1 row (revision 1) while
    // `put()` compared against the *raw* row, whose `revision` is `undefined`.
    // `undefined !== 1` reported a conflict, so every dossier carried over from
    // an older storage format became permanently unsaveable and blamed a second
    // tab that did not exist.
    const repo = new MemoryDossierRepository()
    repo.seedRaw('legacy', v1Record())

    const loaded = await stored(repo, 'legacy')
    expect(loaded.revision).toBe(1)

    const result = await repo.put(
      { ...loaded, applicantName: 'Edited after migrating' },
      loaded.revision
    )
    expect(result).toEqual({ ok: true, revision: 2 })

    const after = await stored(repo, 'legacy')
    expect(after.applicantName).toBe('Edited after migrating')
    // …and the row heals to the current format on that first write.
    expect(after.storageVersion).toBe(STORAGE_FORMAT_VERSION)
    expect(after.payload.documents).toHaveLength(
      partiallyPrepared.documents.length
    )
  })

  it('is readable through the repository after migrating', async () => {
    const repo = new MemoryDossierRepository()
    repo.seedRaw('legacy', v1Record())

    const loaded = await repo.get('legacy')
    expect(loaded?.storageVersion).toBe(STORAGE_FORMAT_VERSION)
    expect(await repo.list()).toHaveLength(1)
    expect(await repo.listUnreadable()).toHaveLength(0)
  })
})
