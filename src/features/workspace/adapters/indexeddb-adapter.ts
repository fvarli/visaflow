import { migrateRecord } from '@/features/workspace/migrations'
import type {
  DossierRepository,
  PutResult,
  SavedDossierRecord,
  UnreadableRecord,
  WorkspaceMeta,
} from '@/features/workspace/saved-dossier'

/**
 * The production persistence adapter.
 *
 * IndexedDB rather than localStorage, and not for capacity — a dossier is ~6 KB,
 * so localStorage's quota would hold hundreds. It is for write behaviour:
 * localStorage is synchronous and string-only, so every autosave would serialize
 * and rewrite a blob on the main thread, with no per-record atomicity. IndexedDB
 * writes one record in one transaction, off the main thread, and stores
 * structured clones so there is no `JSON.stringify` cost per keystroke.
 *
 * jsdom implements no IndexedDB, so **this file is verified in real Chrome**, not
 * in unit tests. Everything that could be tested without a browser — migration,
 * record assembly, summary derivation, sorting — deliberately lives in the pure
 * modules beside it, leaving this adapter as thin request plumbing.
 */

const DATABASE_NAME = 'visaflow'
const DATABASE_VERSION = 1
const DOSSIER_STORE = 'dossiers'
const META_STORE = 'meta'
const META_KEY = 'workspace'

/** Whether this browser/context can persist at all (private modes can refuse). */
export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () =>
      reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

/**
 * The browser refused to give us a database at all.
 *
 * Distinct from a failed write: nothing is wrong with VisaFlow or with the
 * dossier, the store is simply not available — private browsing, a blocked
 * upgrade, a locked-down profile. The user needs different words and a
 * different action for it, so the difference is carried in the type rather than
 * inferred from a message string.
 */
export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StorageUnavailableError'
  }
}

export class IndexedDbDossierRepository implements DossierRepository {
  private db: Promise<IDBDatabase> | null = null

  private open(): Promise<IDBDatabase> {
    // A *rejected* promise must not be cached. Keeping it would turn one
    // transient refusal — a blocked upgrade from another tab, a browser that
    // was busy — into a permanently dead adapter for the life of the tab, with
    // no way back short of a reload.
    this.db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(DOSSIER_STORE)) {
          db.createObjectStore(DOSSIER_STORE, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () =>
        reject(
          new StorageUnavailableError(
            req.error?.message ?? 'Could not open the dossier database'
          )
        )
      // Another tab holding an older version open would otherwise hang forever.
      req.onblocked = () =>
        reject(
          new StorageUnavailableError(
            'The dossier database is blocked by another tab'
          )
        )
    })
    return this.db.catch((error: unknown) => {
      this.db = null
      throw error
    })
  }

  private async run<T>(
    store: string,
    mode: IDBTransactionMode,
    body: (store: IDBObjectStore) => Promise<T>
  ): Promise<T> {
    const db = await this.open()
    const tx = db.transaction(store, mode)
    const result = await body(tx.objectStore(store))
    // Resolve on the transaction, not the request: a write is only durable once
    // the whole transaction commits.
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
      tx.onerror = () => reject(tx.error ?? new Error('Transaction failed'))
    })
    return result
  }

  private async readAll(): Promise<unknown[]> {
    return this.run(DOSSIER_STORE, 'readonly', (store) =>
      request(store.getAll() as IDBRequest<unknown[]>)
    )
  }

  async list(): Promise<SavedDossierRecord[]> {
    const readable: SavedDossierRecord[] = []
    for (const stored of await this.readAll()) {
      const result = migrateRecord(stored)
      if (result.ok) readable.push(result.record)
    }
    return readable
  }

  async listUnreadable(): Promise<UnreadableRecord[]> {
    const broken: UnreadableRecord[] = []
    for (const stored of await this.readAll()) {
      const result = migrateRecord(stored)
      if (result.ok) continue
      const candidate = stored as { id?: unknown; storageVersion?: unknown }
      broken.push({
        id: typeof candidate.id === 'string' ? candidate.id : 'unknown',
        storageVersion:
          typeof candidate.storageVersion === 'number'
            ? candidate.storageVersion
            : null,
        raw: stored,
      })
    }
    return broken
  }

  async get(id: string): Promise<SavedDossierRecord | null> {
    const stored = await this.run(DOSSIER_STORE, 'readonly', (store) =>
      request(store.get(id) as IDBRequest<unknown>)
    )
    if (stored === undefined) return null
    const result = migrateRecord(stored)
    return result.ok ? result.record : null
  }

  /**
   * Compare-and-swap.
   *
   * The read and the write happen in **one** `readwrite` transaction, which is
   * what makes this safe: IndexedDB serialises transactions per object store,
   * so no other tab can commit between the comparison and the write. Doing the
   * same two steps in two transactions — as this adapter originally did — is
   * exactly the last-write-wins hole this closes (ADR-037).
   */
  async put(
    record: SavedDossierRecord,
    expectedRevision?: number
  ): Promise<PutResult> {
    let result: PutResult = { ok: true, revision: record.revision }

    await this.run(DOSSIER_STORE, 'readwrite', async (store) => {
      const raw = await request(store.get(record.id) as IDBRequest<unknown>)

      if (expectedRevision === undefined) {
        // First write for this id.
        const fresh = { ...record, revision: 1 }
        await request(store.put(fresh))
        result = { ok: true, revision: 1 }
        return
      }

      if (raw === undefined) {
        // Deleted elsewhere. Do not recreate it.
        result = { ok: false, reason: 'deleted' }
        return
      }

      // Compare against the **migrated** view — the same one `get()` handed the
      // caller whose revision we are about to check. Reading the raw row here
      // instead meant an older storage format had no `revision` at all, so
      // `undefined !== 1` reported a conflict and every migrated dossier became
      // permanently unsaveable, blaming a second tab that did not exist.
      const migrated = migrateRecord(raw)
      const stored = migrated.ok ? migrated.record : undefined

      if (stored === undefined || stored.revision !== expectedRevision) {
        result = {
          ok: false,
          reason: 'conflict',
          currentRevision: stored?.revision ?? 0,
        }
        return
      }

      // `record` already carries the current STORAGE_FORMAT_VERSION, so a
      // migrated row heals to the new format on its first successful write.
      // `lastExportedAt` belongs to the store, not to the caller. A content
      // write carries whatever value the editor was hydrated with, which can be
      // minutes old, and `markExported` deliberately does not move `revision`
      // (ADR-038) — so compare-and-swap cannot see that the backup mark has
      // since moved. Reading it from the row inside *this* transaction is the
      // only point where both facts are known at the same instant.
      const next = {
        ...record,
        revision: stored.revision + 1,
        lastExportedAt: stored.lastExportedAt,
      }
      await request(store.put(next))
      result = { ok: true, revision: next.revision }
    })

    return result
  }

  async markExported(id: string, at: string): Promise<boolean> {
    let marked = false
    await this.run(DOSSIER_STORE, 'readwrite', async (store) => {
      const stored = (await request(store.get(id) as IDBRequest<unknown>)) as
        SavedDossierRecord | undefined
      if (stored === undefined) return

      // Read and write in the same transaction, but with no revision check:
      // exporting is not a change to the dossier, so it neither asserts nor
      // advances the concurrency counter (ADR-038). Writing the freshly read
      // record back means a concurrent content write cannot be lost.
      await request(store.put({ ...stored, lastExportedAt: at }))
      marked = true
    })
    return marked
  }

  async delete(id: string): Promise<void> {
    await this.run(DOSSIER_STORE, 'readwrite', async (store) => {
      await request(store.delete(id))
    })
  }

  async readMeta(): Promise<WorkspaceMeta> {
    const stored = await this.run(META_STORE, 'readonly', (store) =>
      request(store.get(META_KEY) as IDBRequest<unknown>)
    )
    const activeDossierId =
      typeof stored === 'object' && stored !== null
        ? ((stored as WorkspaceMeta).activeDossierId ?? null)
        : null
    return {
      activeDossierId:
        typeof activeDossierId === 'string' ? activeDossierId : null,
    }
  }

  async writeMeta(meta: WorkspaceMeta): Promise<void> {
    await this.run(META_STORE, 'readwrite', async (store) => {
      await request(store.put(meta, META_KEY))
    })
  }
}
