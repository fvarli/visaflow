import { describe, it, expect } from 'vitest'
import { MemoryDossierRepository } from '@/features/workspace/adapters/memory-adapter'
import type {
  DossierPayload,
  SavedDossierRecord,
} from '@/features/workspace/saved-dossier'
import {
  backupStateOf,
  hasMeaningfulContent,
  toRecord,
  toSummary,
} from '@/features/workspace/workspace-model'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
import { partiallyPrepared } from '@/tests/fixtures/dossiers'

/**
 * Backup is a different promise from saving, and this is where the difference
 * is enforced (ADR-038).
 *
 * The bug these guard against shipped: `lastExportedAt` was declared, stored,
 * migrated, summarised and rendered — and never once assigned, so the dossiers
 * page said "Never exported" forever, including for a dossier exported seconds
 * earlier.
 */

const EARLY = '2026-08-20T09:00:00.000Z'
const LATE = '2026-08-24T09:00:00.000Z'

function payload(): DossierPayload {
  return {
    applicant: partiallyPrepared.applicant,
    application: partiallyPrepared.application,
    documents: partiallyPrepared.documents,
    sponsors: partiallyPrepared.sponsors,
  }
}

function record(id: string, previous?: SavedDossierRecord | null) {
  return toRecord(id, payload(), SCHEMA_VERSION, EARLY, previous)
}

async function stored(repo: MemoryDossierRepository, id: string) {
  const found = await repo.get(id)
  if (!found) throw new Error(`no stored record ${id}`)
  return found
}

describe('backup freshness', () => {
  const at = (lastExportedAt: string | null, updatedAt: string) => ({
    lastExportedAt,
    updatedAt,
  })

  it('is "never" until an export actually happens', () => {
    expect(backupStateOf(at(null, LATE))).toBe('never')
  })

  it('is "fresh" while the export is at least as new as the dossier', () => {
    expect(backupStateOf(at(LATE, EARLY))).toBe('fresh')
    // Exporting immediately after a save leaves the two equal.
    expect(backupStateOf(at(LATE, LATE))).toBe('fresh')
  })

  it('is "stale" once the dossier moves on', () => {
    expect(backupStateOf(at(EARLY, LATE))).toBe('stale')
  })
})

describe('markExported', () => {
  it('records the export without touching the dossier', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(record('a'))
    const before = await stored(repo, 'a')

    expect(await repo.markExported('a', LATE)).toBe(true)
    const after = await stored(repo, 'a')

    expect(after.lastExportedAt).toBe(LATE)
    // The decisive assertion: exporting is not an edit. A revision bump would
    // hand a tab that is editing this dossier a conflict it did not cause, and
    // moving `updatedAt` would make the dossier look changed since its backup
    // the instant it was backed up.
    expect(after.revision).toBe(before.revision)
    expect(after.updatedAt).toBe(before.updatedAt)
    expect(after.payload).toEqual(before.payload)
    expect(backupStateOf(after)).toBe('fresh')
  })

  it('leaves the dossier writable at the revision the editor still holds', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(record('a'))
    const held = await stored(repo, 'a')
    await repo.markExported('a', LATE)

    // A tab that loaded revision 1 before the export can still save.
    const result = await repo.put(record('a', held), held.revision)
    expect(result).toEqual({ ok: true, revision: held.revision + 1 })
  })

  it('does not resurrect a record deleted in the meantime', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(record('a'))
    await repo.delete('a')

    expect(await repo.markExported('a', LATE)).toBe(false)
    expect(await repo.get('a')).toBeNull()
    expect(await repo.list()).toHaveLength(0)
  })

  it('keeps export history per dossier', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(record('a'))
    await repo.put(record('b'))
    await repo.markExported('a', LATE)

    expect((await stored(repo, 'a')).lastExportedAt).toBe(LATE)
    expect((await stored(repo, 'b')).lastExportedAt).toBeNull()
    expect(toSummary(await stored(repo, 'a'), 'Untitled').backup).toBe('fresh')
    expect(toSummary(await stored(repo, 'b'), 'Untitled').backup).toBe('never')
  })

  it('survives further edits as a stale backup rather than being forgotten', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(record('a'))
    await repo.markExported('a', EARLY)

    // Edit after the export: a later `updatedAt`, same export timestamp.
    const held = await stored(repo, 'a')
    await repo.put(
      toRecord('a', payload(), SCHEMA_VERSION, LATE, held),
      held.revision
    )

    const after = await stored(repo, 'a')
    expect(after.lastExportedAt).toBe(EARLY)
    expect(backupStateOf(after)).toBe('stale')
  })

  it('is never carried into the exported file', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(record('a'))
    await repo.markExported('a', LATE)
    const after = await stored(repo, 'a')

    // The payload is what export serialises; workspace metadata sits beside it.
    expect(Object.keys(after.payload).sort()).toEqual(
      ['applicant', 'application', 'documents', 'sponsors'].sort()
    )
    expect(JSON.stringify(after.payload)).not.toContain('lastExportedAt')
  })
})

describe('hasMeaningfulContent', () => {
  const empty = (): DossierPayload => ({
    applicant: null,
    application: null,
    documents: [],
    sponsors: [],
  })

  it('is false for a dossier nobody has typed into', () => {
    expect(hasMeaningfulContent(empty())).toBe(false)
  })

  it('is false for the destination chosen by the create flow itself', () => {
    // Creating a dossier writes a country before the user types anything, so
    // treating that as work would interrupt everyone who changed their mind.
    const seeded = partiallyPrepared.application
    if (!seeded) throw new Error('fixture has no application')
    const {
      trip: _trip,
      employment: _employment,
      financing: _financing,
      appointment: _appointment,
      ...bare
    } = seeded
    const justCreated = empty()
    justCreated.application = { ...bare, notes: [] }
    justCreated.applicant = null
    expect(hasMeaningfulContent(justCreated)).toBe(false)

    // …and the stripping is what made the difference, not an empty fixture.
    expect(
      hasMeaningfulContent({
        ...justCreated,
        application: partiallyPrepared.application,
      })
    ).toBe(true)
  })

  it('is true once there is anything worth losing', () => {
    expect(hasMeaningfulContent(payload())).toBe(true)

    const named = empty()
    named.applicant = partiallyPrepared.applicant
    expect(hasMeaningfulContent(named)).toBe(true)

    const withDocuments = empty()
    withDocuments.documents = partiallyPrepared.documents
    expect(hasMeaningfulContent(withDocuments)).toBe(true)
  })
})
