import { migrateRecord } from '@/features/workspace/migrations'
import type {
  DossierRepository,
  PutResult,
  SavedDossierRecord,
  UnreadableRecord,
  WorkspaceMeta,
} from '@/features/workspace/saved-dossier'

/**
 * A deterministic in-memory implementation of the persistence port.
 *
 * This exists because jsdom ships no IndexedDB, so unit tests cannot exercise
 * the production adapter at all. Rather than add a polyfill dependency to make
 * the browser adapter convenient to test, the *contract* is tested here and the
 * production adapter is verified in real Chrome over CDP.
 *
 * Be clear about what that buys and what it does not: passing tests here prove
 * workspace semantics — isolation between dossiers, migration behaviour, meta
 * handling. They prove nothing about IndexedDB itself.
 *
 * `failNext` exists so failure handling is testable without contriving a quota.
 */
export class MemoryDossierRepository implements DossierRepository {
  private records = new Map<string, unknown>()
  private meta: WorkspaceMeta = { activeDossierId: null }

  /** Make the next mutating call reject once, to exercise the failure path. */
  failNext: Error | null = null

  constructor(seed: SavedDossierRecord[] = []) {
    for (const record of seed) this.records.set(record.id, record)
  }

  private takeFailure(): void {
    const failure = this.failNext
    if (failure) {
      this.failNext = null
      throw failure
    }
  }

  list(): Promise<SavedDossierRecord[]> {
    const readable: SavedDossierRecord[] = []
    for (const stored of this.records.values()) {
      const result = migrateRecord(stored)
      if (result.ok) readable.push(result.record)
    }
    return Promise.resolve(readable)
  }

  listUnreadable(): Promise<UnreadableRecord[]> {
    const broken: UnreadableRecord[] = []
    for (const [id, stored] of this.records.entries()) {
      const result = migrateRecord(stored)
      if (result.ok) continue
      const version =
        typeof stored === 'object' && stored !== null
          ? ((stored as { storageVersion?: unknown }).storageVersion ?? null)
          : null
      broken.push({
        id,
        storageVersion: typeof version === 'number' ? version : null,
        raw: stored,
      })
    }
    return Promise.resolve(broken)
  }

  get(id: string): Promise<SavedDossierRecord | null> {
    const stored = this.records.get(id)
    if (stored === undefined) return Promise.resolve(null)
    const result = migrateRecord(stored)
    return Promise.resolve(result.ok ? result.record : null)
  }

  /** Same compare-and-swap semantics as the IndexedDB adapter, synchronously. */
  put(
    record: SavedDossierRecord,
    expectedRevision?: number
  ): Promise<PutResult> {
    try {
      this.takeFailure()
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error))
      )
    }

    const stored = this.records.get(record.id) as SavedDossierRecord | undefined

    if (expectedRevision === undefined) {
      const fresh = { ...record, revision: 1 }
      // Structured-clone-equivalent: stored records must not alias live state.
      this.records.set(record.id, structuredClone(fresh))
      return Promise.resolve({ ok: true, revision: 1 })
    }

    if (stored === undefined) {
      // Deleted elsewhere. Do not recreate it.
      return Promise.resolve({ ok: false, reason: 'deleted' })
    }

    if (stored.revision !== expectedRevision) {
      return Promise.resolve({
        ok: false,
        reason: 'conflict',
        currentRevision: stored.revision,
      })
    }

    const next = { ...record, revision: stored.revision + 1 }
    this.records.set(record.id, structuredClone(next))
    return Promise.resolve({ ok: true, revision: next.revision })
  }

  /** Same semantics as the IndexedDB adapter: only `lastExportedAt` moves. */
  markExported(id: string, at: string): Promise<boolean> {
    const stored = this.records.get(id) as SavedDossierRecord | undefined
    if (stored === undefined) return Promise.resolve(false)
    this.records.set(id, structuredClone({ ...stored, lastExportedAt: at }))
    return Promise.resolve(true)
  }

  delete(id: string): Promise<void> {
    try {
      this.takeFailure()
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error))
      )
    }
    this.records.delete(id)
    return Promise.resolve()
  }

  readMeta(): Promise<WorkspaceMeta> {
    return Promise.resolve({ ...this.meta })
  }

  writeMeta(meta: WorkspaceMeta): Promise<void> {
    try {
      this.takeFailure()
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error))
      )
    }
    this.meta = { ...meta }
    return Promise.resolve()
  }

  /** Test-only: plant a raw value to simulate a foreign or corrupted record. */
  seedRaw(id: string, value: unknown): void {
    this.records.set(id, value)
  }
}
