import { migrateRecord } from '@/features/workspace/migrations'
import type {
  DossierRepository,
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

export class IndexedDbDossierRepository implements DossierRepository {
  private db: Promise<IDBDatabase> | null = null

  private open(): Promise<IDBDatabase> {
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
        reject(req.error ?? new Error('Could not open the dossier database'))
      // Another tab holding an older version open would otherwise hang forever.
      req.onblocked = () =>
        reject(new Error('The dossier database is blocked by another tab'))
    })
    return this.db
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

  async put(record: SavedDossierRecord): Promise<void> {
    await this.run(DOSSIER_STORE, 'readwrite', async (store) => {
      await request(store.put(record))
    })
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
