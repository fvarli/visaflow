import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useDossier } from '@/app/providers/DossierProvider'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
import {
  IndexedDbDossierRepository,
  isIndexedDbAvailable,
} from '@/features/workspace/adapters/indexeddb-adapter'
import type {
  DossierPayload,
  DossierRepository,
  SavedDossierSummary,
} from '@/features/workspace/saved-dossier'
import {
  createSavedDossierId,
  nextActiveAfterDelete,
  sortSummaries,
  toRecord,
  toSummary,
  unreadableSummary,
} from '@/features/workspace/workspace-model'

/**
 * Owns the saved-dossier workspace: which dossiers exist, which one is open, and
 * keeping the open one written down.
 *
 * It sits *inside* `DossierProvider` so it can both observe working state (to
 * autosave) and drive it (to switch), and *outside* the router so every route
 * sees the same workspace. `DossierProvider` itself is untouched — the reducer
 * stays synchronous and storage-unaware rather than growing into a god object.
 *
 * No component below here knows IndexedDB exists; they see this context.
 */

/**
 * Local persistence state — deliberately **not** the same concept as export.
 *
 * v1.0 conflated them: `isDirty`/`lastSaved` were set by `markSaved()`, which
 * only ever fired on export, so "Saved 5 minutes ago" actually meant "exported".
 * Now "saved" means written to this browser and "exported" means a portable file
 * was produced. A user can be safely saved and months overdue for a backup.
 */
export type PersistenceStatus =
  'idle' | 'saving' | 'saved' | 'error' | 'sessionOnly' | 'unavailable'

interface WorkspaceContextValue {
  ready: boolean
  summaries: SavedDossierSummary[]
  activeId: string | null
  status: PersistenceStatus
  lastPersistedAt: string | null
  /** True when storage exists but this dossier was opted out of it. */
  sessionOnly: boolean
  createDossier: (
    destinationCountry: string,
    sessionOnly?: boolean
  ) => Promise<void>
  adoptImported: (
    payload: DossierPayload,
    sessionOnly?: boolean
  ) => Promise<void>
  openDossier: (id: string) => Promise<void>
  deleteDossier: (id: string) => Promise<void>
  /** Write any pending edit immediately — used before switching and on unload. */
  flush: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

/** How long to coalesce keystrokes before writing. */
const AUTOSAVE_DELAY_MS = 600

interface WorkspaceProviderProps {
  children: React.ReactNode
  /** Injected in tests; production uses IndexedDB. */
  repository?: DossierRepository
  /** Fallback label when a dossier has neither a name nor a destination yet. */
  untitledLabel?: string
}

export function WorkspaceProvider({
  children,
  repository,
  untitledLabel = 'Untitled',
}: WorkspaceProviderProps) {
  const { state, replaceDossier, initializeEmpty, reset } = useDossier()

  const repo = useMemo(() => {
    if (repository) return repository
    return isIndexedDbAvailable() ? new IndexedDbDossierRepository() : null
  }, [repository])

  // With no storage there is nothing to hydrate, so the provider is ready
  // immediately and performs no asynchronous work at all. That keeps every
  // component test that merely mounts the app free of pending state updates.
  const [ready, setReady] = useState(repo === null)
  const [summaries, setSummaries] = useState<SavedDossierSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sessionOnly, setSessionOnly] = useState(false)
  const [status, setStatus] = useState<PersistenceStatus>(
    repo ? 'idle' : 'unavailable'
  )
  const [lastPersistedAt, setLastPersistedAt] = useState<string | null>(null)

  // Refs rather than state: the autosave effect must read the *current* values
  // without re-subscribing on every keystroke.
  const activeIdRef = useRef<string | null>(null)
  const sessionOnlyRef = useRef(false)
  const pendingRef = useRef<DossierPayload | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratingRef = useRef(true)

  // Synced in an effect, never during render: the autosave timeout and the
  // switch/flush paths read these outside React's render cycle.
  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])
  useEffect(() => {
    sessionOnlyRef.current = sessionOnly
  }, [sessionOnly])

  const refreshSummaries = useCallback(async (): Promise<
    SavedDossierSummary[]
  > => {
    if (!repo) return []
    const [records, broken] = await Promise.all([
      repo.list(),
      repo.listUnreadable(),
    ])
    const next = sortSummaries([
      ...records.map((record) => toSummary(record, untitledLabel)),
      ...broken.map((record) => unreadableSummary(record, untitledLabel)),
    ])
    setSummaries(next)
    return next
  }, [repo, untitledLabel])

  const writeNow = useCallback(
    async (payload: DossierPayload) => {
      const id = activeIdRef.current
      if (!repo || !id || sessionOnlyRef.current) return
      setStatus('saving')
      try {
        const previous = await repo.get(id)
        const now = new Date().toISOString()
        await repo.put(toRecord(id, payload, SCHEMA_VERSION, now, previous))
        setLastPersistedAt(now)
        setStatus('saved')
        await refreshSummaries()
      } catch {
        // Surfaced, never swallowed — and never reported as "Saved". The
        // in-memory dossier is untouched, so the user's work still exists.
        setStatus('error')
      }
    },
    [repo, refreshSummaries]
  )

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending) await writeNow(pending)
  }, [writeNow])

  // Hydrate once: restore the last active dossier so a refresh is a non-event.
  useEffect(() => {
    if (!repo) {
      hydratingRef.current = false
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const [meta] = await Promise.all([repo.readMeta(), refreshSummaries()])
        if (cancelled) return
        if (meta.activeDossierId) {
          const record = await repo.get(meta.activeDossierId)
          if (!cancelled && record) {
            setActiveId(record.id)
            activeIdRef.current = record.id
            setLastPersistedAt(record.updatedAt)
            setStatus('saved')
            replaceDossier(record.payload)
          }
        }
      } catch {
        if (!cancelled) setStatus('error')
      } finally {
        if (!cancelled) {
          setReady(true)
          // Let the hydrating load settle before autosave starts observing.
          hydratingRef.current = false
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [repo, refreshSummaries, replaceDossier])

  // Autosave: coalesce edits, then write once.
  useEffect(() => {
    if (!repo || hydratingRef.current || !activeId || sessionOnly) return
    if (!state.applicant && !state.application) return

    const payload: DossierPayload = {
      applicant: state.applicant,
      application: state.application,
      documents: state.documents,
      sponsors: state.sponsors,
    }
    pendingRef.current = payload

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      pendingRef.current = null
      void writeNow(payload)
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [repo, state, activeId, sessionOnly, writeNow])

  // A tab being hidden or closed is the moment a debounce would lose work.
  useEffect(() => {
    const onHide = () => {
      if (pendingRef.current) void flush()
    }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [flush])

  /**
   * Claim a new workspace slot for whatever is about to be in the editor.
   *
   * Always a freshly generated local id: an imported file is a portable
   * document, never a claim on a slot in this browser's workspace. Two imports
   * of the same file are two dossiers, which is honest — inventing duplicate
   * detection from names or passport numbers would be brittle and wrong.
   */
  const adoptIdentity = useCallback(
    async (asSessionOnly: boolean) => {
      const id = createSavedDossierId()
      setActiveId(id)
      activeIdRef.current = id
      setSessionOnly(asSessionOnly)
      sessionOnlyRef.current = asSessionOnly
      setLastPersistedAt(null)

      if (!repo || asSessionOnly) {
        setStatus(repo ? 'sessionOnly' : 'unavailable')
        return null
      }
      setStatus('idle')
      try {
        await repo.writeMeta({ activeDossierId: id })
      } catch {
        // The dossier still exists in the editor; only the "reopen this next
        // time" pointer failed. Report it rather than letting it escape.
        setStatus('error')
        return null
      }
      return id
    },
    [repo]
  )

  const createDossier = useCallback(
    async (destinationCountry: string, asSessionOnly = false) => {
      await flush()
      await adoptIdentity(asSessionOnly)
      // No eager write: `initializeEmpty` lands in the reducer and autosave
      // performs the first save from the real state. Writing a placeholder here
      // would briefly persist an empty dossier and report it as saved.
      initializeEmpty(destinationCountry)
    },
    [flush, adoptIdentity, initializeEmpty]
  )

  const adoptImported = useCallback(
    async (payload: DossierPayload, asSessionOnly = false) => {
      await flush()
      const id = await adoptIdentity(asSessionOnly)
      replaceDossier(payload)
      // Imports are worth writing immediately: the user just handed us a file
      // and expects it to be in the workspace, not 600ms from now.
      if (id) await writeNow(payload)
    },
    [flush, adoptIdentity, replaceDossier, writeNow]
  )

  const openDossier = useCallback(
    async (id: string) => {
      if (!repo || id === activeIdRef.current) return
      // Finish writing the outgoing dossier before the incoming one replaces
      // it, so a pending debounce can never land on the wrong record.
      await flush()
      const record = await repo.get(id)
      if (!record) return
      const now = new Date().toISOString()
      await repo.put({ ...record, lastOpenedAt: now })
      await repo.writeMeta({ activeDossierId: id })
      setActiveId(id)
      activeIdRef.current = id
      setSessionOnly(false)
      sessionOnlyRef.current = false
      setLastPersistedAt(record.updatedAt)
      setStatus('saved')
      replaceDossier(record.payload)
      await refreshSummaries()
    },
    [repo, flush, replaceDossier, refreshSummaries]
  )

  const deleteDossier = useCallback(
    async (id: string) => {
      if (!repo) return
      await repo.delete(id)
      const remaining = await refreshSummaries()
      if (id !== activeIdRef.current) return

      const next = nextActiveAfterDelete(remaining, id)
      if (next) {
        activeIdRef.current = null
        await openDossier(next)
        return
      }
      // Nothing left to open: return to a genuinely empty workspace rather than
      // leaving the deleted dossier on screen.
      setActiveId(null)
      activeIdRef.current = null
      setStatus('idle')
      setLastPersistedAt(null)
      await repo.writeMeta({ activeDossierId: null })
      reset()
    },
    [repo, refreshSummaries, openDossier, reset]
  )

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ready,
      summaries,
      activeId,
      status,
      lastPersistedAt,
      sessionOnly,
      createDossier,
      adoptImported,
      openDossier,
      deleteDossier,
      flush,
    }),
    [
      ready,
      summaries,
      activeId,
      status,
      lastPersistedAt,
      sessionOnly,
      createDossier,
      adoptImported,
      openDossier,
      deleteDossier,
      flush,
    ]
  )

  return <WorkspaceContext value={value}>{children}</WorkspaceContext>
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext)
  if (!context)
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  return context
}
