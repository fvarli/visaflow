import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
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
import { StorageUnavailableError } from '@/features/workspace/adapters/indexeddb-adapter'
import {
  downloadDossier,
  downloadJson,
} from '@/features/import-export/services'
import {
  createWorkspaceChannel,
  type WorkspaceChannel,
  type WorkspaceEvent,
  type WorkspaceEventInput,
} from '@/features/workspace/workspace-channel'
import {
  createSavedDossierId,
  hasMeaningfulContent,
  normalizeTitle,
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
 * v1.0 conflated them behind reducer fields that only ever moved on export, so
 * "Saved 5 minutes ago" actually meant "exported". Those fields are gone: this
 * says whether the browser holds the dossier, and `BackupState` — read from the
 * stored record, not from memory — says how current the user's own file is. A
 * user can be safely saved and months overdue for a backup (ADR-038).
 */
export type PersistenceStatus =
  'idle' | 'saving' | 'saved' | 'error' | 'sessionOnly' | 'unavailable'

/**
 * Why this tab cannot save right now.
 *
 * `remote-change` — another tab wrote a newer revision of this dossier.
 * `remote-delete` — another tab deleted it.
 *
 * In both cases autosave stops rather than retrying, and neither version is
 * discarded until the user picks one (ADR-037).
 */
export type WorkspaceConflict =
  | { kind: 'remote-change'; dossierId: string }
  | { kind: 'remote-delete'; dossierId: string }

/**
 * A dossier switch that is waiting for the user to decide.
 *
 * Session-only work exists nowhere but this tab, so replacing it is
 * unrecoverable. Rather than each caller remembering to ask, the provider
 * refuses to proceed and records what was wanted; one dialog resolves it for
 * the header switcher, the dossiers page and the import flow alike (ADR-039).
 */
export type PendingLeave =
  | { kind: 'open'; dossierId: string }
  | { kind: 'create'; destinationCountry: string; asSessionOnly: boolean }
  | { kind: 'import'; payload: DossierPayload; asSessionOnly: boolean }

interface WorkspaceContextValue {
  ready: boolean
  conflict: WorkspaceConflict | null
  /** Set when a switch is blocked pending a session-only decision. */
  pendingLeave: PendingLeave | null
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
  renameDossier: (id: string, title: string) => Promise<void>
  /** Download a dossier's own file without opening or disturbing it. */
  exportDossier: (id: string) => Promise<void>
  /** Download the stored bytes of a record this build cannot read. */
  exportRawRecord: (id: string) => Promise<void>
  /** Turn the open session-only dossier into a saved one. */
  promoteToDevice: () => Promise<boolean>
  /** Abandon a blocked switch and stay where we are. */
  cancelLeave: () => void
  /** Throw away the session-only dossier and complete the blocked switch. */
  discardAndLeave: () => Promise<void>
  /** Persist the session-only dossier first, then complete the switch. */
  saveAndLeave: () => Promise<void>
  /** Close the open dossier without deleting anything it is saved into. */
  closeDossier: () => Promise<void>
  /** Record that the open dossier was exported, for backup freshness. */
  noteExported: () => Promise<void>
  /** Discard this tab's unsaved edits and adopt the stored record. */
  reloadLatest: () => Promise<void>
  /** Keep this tab's edits under a brand-new id, leaving the other untouched. */
  saveAsNew: () => Promise<void>
  /** Write any pending edit immediately — used before switching and on unload. */
  flush: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

/** How long to coalesce keystrokes before writing. */
const AUTOSAVE_DELAY_MS = 600

/**
 * Cheap identity for "is this exactly what storage already holds".
 *
 * Both sides are produced by the same code paths, so key order matches; if it
 * ever did not, the only cost is one redundant write — the same behaviour we
 * had before this check existed.
 */
function serializePayload(payload: DossierPayload): string {
  return JSON.stringify(payload)
}

interface WorkspaceProviderProps {
  children: React.ReactNode
  /** Injected in tests; production uses IndexedDB. */
  repository?: DossierRepository
  /**
   * What an unnamed dossier is called. Optional, but never an English literal
   * by default: the app forgot to pass it and Turkish users read "Untitled".
   */
  untitledLabel?: string
}

export function WorkspaceProvider({
  children,
  repository,
  untitledLabel,
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
  const { t } = useTranslation('workspace')
  // Resolved here rather than defaulted to a literal, so no caller can ship an
  // untranslated fallback by forgetting a prop.
  const untitled = untitledLabel ?? t('card.untitled')
  /**
   * Read through a ref so the label does not enter `refreshSummaries`'s
   * identity: hydration depends on that callback, and a language switch must
   * not re-run hydration and remount every form the user is typing in.
   */
  const untitledRef = useRef(untitled)
  useEffect(() => {
    untitledRef.current = untitled
  }, [untitled])
  const [conflict, setConflict] = useState<WorkspaceConflict | null>(null)
  const [pendingLeave, setPendingLeave] = useState<PendingLeave | null>(null)

  // The revision this tab believes it is editing. Every write asserts it, so a
  // tab that has fallen behind is rejected instead of clobbering.
  const revisionRef = useRef<number | null>(null)
  const conflictRef = useRef<WorkspaceConflict | null>(null)
  /**
   * Owned by the subscription effect below, not by a `useMemo`.
   *
   * A memoized channel with its own cleanup effect looks equivalent and is not:
   * React 19's StrictMode mounts, cleans up, and mounts again, which closed the
   * one `BroadcastChannel` the memo would never rebuild. The tab then went
   * silent — writes stayed safe, because revisions are what protect them, but
   * every notification was lost. Create and destroy the resource in the same
   * effect so a second mount gets a second channel.
   */
  const channelRef = useRef<WorkspaceChannel | null>(null)
  const postEvent = useCallback((event: WorkspaceEventInput) => {
    channelRef.current?.post(event)
  }, [])

  // Refs rather than state: the autosave effect must read the *current* values
  // without re-subscribing on every keystroke.
  const activeIdRef = useRef<string | null>(null)
  const sessionOnlyRef = useRef(false)
  const pendingRef = useRef<DossierPayload | null>(null)
  /** What storage is known to hold, so we never write it back unchanged. */
  const lastWrittenRef = useRef<string | null>(null)
  /**
   * The live dossier, readable from a callback without making every callback
   * depend on it. `openDossier` must not get a new identity on each keystroke.
   */
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])
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
  useEffect(() => {
    conflictRef.current = conflict
  }, [conflict])

  const currentPayload = useCallback((): DossierPayload => {
    const live = stateRef.current
    return {
      applicant: live.applicant,
      application: live.application,
      documents: live.documents,
      sponsors: live.sponsors,
    }
  }, [])

  /**
   * Storage refusing to exist is not the same failure as a write going wrong,
   * and the user needs different words for each.
   */
  const reportFailure = useCallback((error: unknown) => {
    setStatus(
      error instanceof StorageUnavailableError ? 'unavailable' : 'error'
    )
  }, [])

  const refreshSummaries = useCallback(async (): Promise<
    SavedDossierSummary[]
  > => {
    if (!repo) return []
    try {
      const [records, broken] = await Promise.all([
        repo.list(),
        repo.listUnreadable(),
      ])
      const next = sortSummaries([
        ...records.map((record) => toSummary(record, untitledRef.current)),
        ...broken.map((record) =>
          unreadableSummary(record, untitledRef.current)
        ),
      ])
      setSummaries(next)
      return next
    } catch (error) {
      // Losing the list is worth saying out loud; it used to reject silently.
      reportFailure(error)
      return []
    }
  }, [repo, reportFailure])

  const writeNow = useCallback(
    async (payload: DossierPayload) => {
      const id = activeIdRef.current
      if (!repo || !id || sessionOnlyRef.current) return
      // A conflicted dossier stops writing entirely: retrying a doomed save
      // would either fail forever or, worse, eventually succeed and overwrite
      // the other tab.
      if (conflictRef.current) return

      setStatus('saving')
      try {
        const previous = await repo.get(id)
        const now = new Date().toISOString()
        const expected = revisionRef.current ?? undefined
        const result = await repo.put(
          toRecord(id, payload, SCHEMA_VERSION, now, previous),
          expected
        )

        if (!result.ok) {
          // Someone else got there first. Say so; change nothing.
          setConflict({
            kind:
              result.reason === 'deleted' ? 'remote-delete' : 'remote-change',
            dossierId: id,
          })
          setStatus('error')
          await refreshSummaries()
          return
        }

        revisionRef.current = result.revision
        lastWrittenRef.current = serializePayload(payload)
        setLastPersistedAt(now)
        setStatus('saved')
        postEvent({
          type: 'updated',
          dossierId: id,
          revision: result.revision,
        })
        await refreshSummaries()
      } catch (error) {
        // Surfaced, never swallowed — and never reported as "Saved". The
        // in-memory dossier is untouched, so the user's work still exists.
        // A browser that refuses storage entirely gets its own wording.
        reportFailure(error)
      }
    },
    [repo, refreshSummaries, postEvent, reportFailure]
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
            revisionRef.current = record.revision
            setLastPersistedAt(record.updatedAt)
            setStatus('saved')
            lastWrittenRef.current = serializePayload(record.payload)
            replaceDossier(record.payload)
          }
        }
      } catch (error) {
        // A read that fails is usually storage refusing us entirely, not a
        // failed save — say which.
        if (!cancelled) reportFailure(error)
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

  // The label lives outside `refreshSummaries`'s identity, so a language switch
  // has to ask for the list to be re-derived explicitly.
  useEffect(() => {
    if (!ready) return
    void refreshSummaries()
  }, [untitled, ready, refreshSummaries])

  // Autosave: coalesce edits, then write once.
  useEffect(() => {
    if (!repo || hydratingRef.current || !activeId || sessionOnly) return
    if (conflict) return
    if (!state.applicant && !state.application) return

    const payload: DossierPayload = {
      applicant: state.applicant,
      application: state.application,
      documents: state.documents,
      sponsors: state.sponsors,
    }
    // Hydrating, reloading and switching all push a payload into state that is
    // already in storage. Writing it back would bump the revision, touch
    // `updatedAt`, and make a tab that merely *looked* at a dossier announce a
    // change to every other tab. Compare first.
    if (serializePayload(payload) === lastWrittenRef.current) return

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
  }, [repo, state, activeId, sessionOnly, conflict, writeNow])

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
      revisionRef.current = null
      lastWrittenRef.current = null
      setConflict(null)
      conflictRef.current = null
      setLastPersistedAt(null)

      if (!repo || asSessionOnly) {
        setStatus(repo ? 'sessionOnly' : 'unavailable')
        return null
      }
      setStatus('idle')
      try {
        await repo.writeMeta({ activeDossierId: id })
      } catch (error) {
        // The dossier still exists in the editor; only the "reopen this next
        // time" pointer failed. Report it rather than letting it escape.
        reportFailure(error)
        return null
      }
      return id
    },
    [repo, reportFailure]
  )

  /**
   * Refuse to replace unsaved session-only work, and remember what was wanted.
   *
   * Returns `true` when the caller must stand down. Deliberately asks the
   * payload whether there is anything worth losing rather than trusting a dirty
   * flag: choosing a destination country during setup is not work (ADR-039).
   */
  const guardLeave = useCallback(
    (intent: PendingLeave): boolean => {
      if (!sessionOnlyRef.current) return false
      if (!hasMeaningfulContent(currentPayload())) return false
      setPendingLeave(intent)
      return true
    },
    [currentPayload]
  )

  const performCreate = useCallback(
    async (destinationCountry: string, asSessionOnly: boolean) => {
      await flush()
      await adoptIdentity(asSessionOnly)
      // No eager write: `initializeEmpty` lands in the reducer and autosave
      // performs the first save from the real state. Writing a placeholder here
      // would briefly persist an empty dossier and report it as saved.
      initializeEmpty(destinationCountry)
    },
    [flush, adoptIdentity, initializeEmpty]
  )

  const createDossier = useCallback(
    async (destinationCountry: string, asSessionOnly = false) => {
      if (guardLeave({ kind: 'create', destinationCountry, asSessionOnly }))
        return
      await performCreate(destinationCountry, asSessionOnly)
    },
    [guardLeave, performCreate]
  )

  const performImport = useCallback(
    async (payload: DossierPayload, asSessionOnly: boolean) => {
      await flush()
      const id = await adoptIdentity(asSessionOnly)
      replaceDossier(payload)
      // Imports are worth writing immediately: the user just handed us a file
      // and expects it to be in the workspace, not 600ms from now.
      if (id) {
        await writeNow(payload)
        postEvent({
          type: 'created',
          dossierId: id,
          revision: revisionRef.current ?? 1,
        })
      }
    },
    [flush, adoptIdentity, replaceDossier, writeNow, postEvent]
  )

  const adoptImported = useCallback(
    async (payload: DossierPayload, asSessionOnly = false) => {
      if (guardLeave({ kind: 'import', payload, asSessionOnly })) return
      await performImport(payload, asSessionOnly)
    },
    [guardLeave, performImport]
  )

  const performOpen = useCallback(
    async (id: string) => {
      if (!repo || id === activeIdRef.current) return
      // Finish writing the outgoing dossier before the incoming one replaces
      // it, so a pending debounce can never land on the wrong record.
      await flush()
      const record = await repo.get(id)
      if (!record) return

      // `lastOpenedAt` is a sorting convenience, not dossier data. Touch it
      // under the same compare-and-swap as everything else so that *opening* a
      // dossier can never overwrite an edit another tab just made — and if we
      // lose that race, take their version instead of fighting for a timestamp.
      const now = new Date().toISOString()
      const touched = await repo.put(
        { ...record, lastOpenedAt: now },
        record.revision
      )
      const current = touched.ok
        ? { ...record, lastOpenedAt: now, revision: touched.revision }
        : await repo.get(id)
      if (!current) return

      await repo.writeMeta({ activeDossierId: id })
      setActiveId(id)
      activeIdRef.current = id
      revisionRef.current = current.revision
      setSessionOnly(false)
      sessionOnlyRef.current = false
      setConflict(null)
      conflictRef.current = null
      setLastPersistedAt(current.updatedAt)
      setStatus('saved')
      lastWrittenRef.current = serializePayload(current.payload)
      replaceDossier(current.payload)
      await refreshSummaries()
    },
    [repo, flush, replaceDossier, refreshSummaries]
  )

  const openDossier = useCallback(
    async (id: string) => {
      if (id === activeIdRef.current) return
      if (guardLeave({ kind: 'open', dossierId: id })) return
      try {
        await performOpen(id)
      } catch (error) {
        // Opening used to fail silently — the user clicked and nothing moved.
        reportFailure(error)
      }
    },
    [guardLeave, performOpen, reportFailure]
  )

  const deleteDossier = useCallback(
    async (id: string) => {
      if (!repo) return
      await repo.delete(id)
      postEvent({ type: 'deleted', dossierId: id })
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
    [repo, refreshSummaries, openDossier, reset, postEvent]
  )

  /**
   * Give a dossier an explicit name.
   *
   * A rename is a persisted workspace change like any other, so it goes through
   * the same compare-and-swap — renaming from a stale tab must not clobber a
   * newer edit either.
   */
  const renameDossier = useCallback(
    async (id: string, title: string) => {
      if (!repo) return
      const record = await repo.get(id)
      if (!record) return
      const result = await repo.put(
        { ...record, title: normalizeTitle(title) },
        record.revision
      )
      if (result.ok) {
        if (id === activeIdRef.current) revisionRef.current = result.revision
        postEvent({
          type: 'updated',
          dossierId: id,
          revision: result.revision,
        })
      }
      await refreshSummaries()
    },
    [repo, refreshSummaries, postEvent]
  )

  /** Resolve a conflict by taking the stored version. Discards local edits. */
  const reloadLatest = useCallback(async () => {
    const id = conflictRef.current?.dossierId ?? activeIdRef.current
    if (!repo || !id) return

    const record = await repo.get(id)
    if (!record) {
      // Deleted while we were deciding — there is nothing to reload.
      setConflict({ kind: 'remote-delete', dossierId: id })
      return
    }
    revisionRef.current = record.revision
    setConflict(null)
    conflictRef.current = null
    setLastPersistedAt(record.updatedAt)
    setStatus('saved')
    lastWrittenRef.current = serializePayload(record.payload)
    replaceDossier(record.payload)
    await refreshSummaries()
  }, [repo, replaceDossier, refreshSummaries])

  /**
   * Resolve a conflict by keeping *this* tab's version under a new identity.
   *
   * Deliberately a fresh id: reusing the conflicted one would overwrite the
   * other tab's work, and reusing a deleted one would resurrect something the
   * user deleted on purpose. Both versions survive and the user sorts it out.
   */
  const saveAsNew = useCallback(async () => {
    if (!repo) return
    const payload: DossierPayload = {
      applicant: state.applicant,
      application: state.application,
      documents: state.documents,
      sponsors: state.sponsors,
    }
    const id = createSavedDossierId()

    setConflict(null)
    conflictRef.current = null
    setActiveId(id)
    activeIdRef.current = id
    revisionRef.current = null

    const now = new Date().toISOString()
    try {
      const result = await repo.put(toRecord(id, payload, SCHEMA_VERSION, now))
      if (result.ok) {
        revisionRef.current = result.revision
        lastWrittenRef.current = serializePayload(payload)
        setLastPersistedAt(now)
        setStatus('saved')
        await repo.writeMeta({ activeDossierId: id })
        postEvent({
          type: 'created',
          dossierId: id,
          revision: result.revision,
        })
      } else {
        setStatus('error')
      }
    } catch (error) {
      // This is the escape hatch from a conflict. If it throws and says
      // nothing, the user is stranded with no working exit.
      reportFailure(error)
    }
    await refreshSummaries()
  }, [repo, state, refreshSummaries, postEvent, reportFailure])

  /**
   * Turn the open session-only dossier into a saved one, keeping its identity.
   *
   * The id was already minted when the dossier was created, so nothing is
   * re-created and nothing is duplicated — it simply gains a record. Returns
   * whether the write actually committed, because the caller may only continue
   * on a real success: reporting a promotion that did not happen would be the
   * one lie this whole sprint exists to remove (ADR-039).
   */
  const promoteToDevice = useCallback(async (): Promise<boolean> => {
    const id = activeIdRef.current
    if (!repo || !id || !sessionOnlyRef.current) return false

    const payload = currentPayload()
    // Flipped imperatively and first: `writeNow` and the autosave effect both
    // read the ref, and the state-syncing effect would not have run yet.
    sessionOnlyRef.current = false
    const now = new Date().toISOString()

    try {
      // The record before the pointer: a record with no pointer still shows up
      // in the dossiers list, whereas a pointer to nothing restores nothing.
      const result = await repo.put(toRecord(id, payload, SCHEMA_VERSION, now))
      if (!result.ok) throw new Error('promotion was refused by storage')
      await repo.writeMeta({ activeDossierId: id })

      revisionRef.current = result.revision
      lastWrittenRef.current = serializePayload(payload)
      setSessionOnly(false)
      setLastPersistedAt(now)
      setStatus('saved')
      // Only now is there anything for another tab to know about.
      postEvent({ type: 'created', dossierId: id, revision: result.revision })
      await refreshSummaries()
      return true
    } catch (error) {
      // Put it back exactly as it was: still session-only, still unsaved,
      // still entirely in this tab. Autosave must not quietly start writing.
      sessionOnlyRef.current = true
      reportFailure(error)
      return false
    }
  }, [repo, currentPayload, refreshSummaries, postEvent, reportFailure])

  const runPendingLeave = useCallback(
    async (intent: PendingLeave) => {
      if (intent.kind === 'open') await performOpen(intent.dossierId)
      else if (intent.kind === 'create')
        await performCreate(intent.destinationCountry, intent.asSessionOnly)
      else await performImport(intent.payload, intent.asSessionOnly)
    },
    [performOpen, performCreate, performImport]
  )

  const cancelLeave = useCallback(() => setPendingLeave(null), [])

  const discardAndLeave = useCallback(async () => {
    const intent = pendingLeave
    if (!intent) return
    setPendingLeave(null)
    // The user was told plainly what this does; the session dossier goes.
    await runPendingLeave(intent)
  }, [pendingLeave, runPendingLeave])

  const saveAndLeave = useCallback(async () => {
    const intent = pendingLeave
    if (!intent) return
    const promoted = await promoteToDevice()
    // Stay put on failure. Continuing would discard the work we just failed to
    // save, which is precisely the outcome the dialog exists to prevent.
    if (!promoted) return
    setPendingLeave(null)
    await runPendingLeave(intent)
  }, [pendingLeave, promoteToDevice, runPendingLeave])

  /**
   * Close the open dossier without destroying it.
   *
   * Clears the "reopen this next time" pointer as well, so closing actually
   * stays closed after a reload. The saved record is untouched — deletion lives
   * on the dossiers page and nowhere else.
   */
  const closeDossier = useCallback(async () => {
    setActiveId(null)
    activeIdRef.current = null
    revisionRef.current = null
    lastWrittenRef.current = null
    setSessionOnly(false)
    sessionOnlyRef.current = false
    setConflict(null)
    conflictRef.current = null
    setLastPersistedAt(null)
    setStatus(repo ? 'idle' : 'unavailable')
    if (repo) {
      try {
        await repo.writeMeta({ activeDossierId: null })
      } catch (error) {
        reportFailure(error)
      }
    }
    reset()
  }, [repo, reset, reportFailure])

  /** Remember that the open dossier was exported. Session-only has no record. */
  const noteExported = useCallback(async () => {
    const id = activeIdRef.current
    if (!repo || !id || sessionOnlyRef.current) return
    try {
      await repo.markExported(id, new Date().toISOString())
      await refreshSummaries()
    } catch (error) {
      reportFailure(error)
    }
  }, [repo, refreshSummaries, reportFailure])

  /**
   * Export a dossier without opening it.
   *
   * Reads that record's own payload, so backing up dossier B never disturbs
   * dossier A: no switch, no last-opened change, no form remount, and no
   * revision or `updatedAt` movement on B either — exporting is not an edit
   * (ADR-038).
   */
  const exportDossier = useCallback(
    async (id: string) => {
      if (!repo) return
      try {
        const record = await repo.get(id)
        if (!record) return
        downloadDossier(
          record.payload.applicant,
          record.payload.application,
          record.payload.documents,
          record.payload.sponsors
        )
        await repo.markExported(id, new Date().toISOString())
        await refreshSummaries()
      } catch (error) {
        reportFailure(error)
      }
    },
    [repo, refreshSummaries, reportFailure]
  )

  /**
   * Download the stored bytes of a record this build cannot read.
   *
   * Deliberately not a dossier export: the payload could not be decoded, so
   * calling it a backup would be a claim we cannot support. It never marks the
   * record as backed up — it is a way to get the data out to a build that can
   * read it, which is exactly what the unreadable card already advises.
   */
  const exportRawRecord = useCallback(
    async (id: string) => {
      if (!repo) return
      try {
        const broken = await repo.listUnreadable()
        const found = broken.find((record) => record.id === id)
        if (!found) return
        const date = new Date().toISOString().split('T')[0] ?? 'recovery'
        downloadJson(
          JSON.stringify(found.raw, null, 2),
          `visaflow-recovery-${date}.json`
        )
      } catch (error) {
        reportFailure(error)
      }
    },
    [repo, reportFailure]
  )

  // Listen for what other tabs did. Hints only — the compare-and-swap above is
  // what actually keeps writes safe, so a missed message costs nothing.
  const handleEvent = useCallback(
    (event: WorkspaceEvent) => {
      const openId = activeIdRef.current

      if (event.type === 'deleted') {
        if (event.dossierId === openId) {
          setConflict({ kind: 'remote-delete', dossierId: event.dossierId })
          setStatus('error')
        }
        void refreshSummaries()
        return
      }

      if (event.type === 'created') {
        void refreshSummaries()
        return
      }

      // A remote write can change the list itself (a rename), so the summaries
      // are refreshed for every `updated` event, not only for our own dossier.
      void refreshSummaries()
      if (event.dossierId !== openId) return

      // Our open dossier moved on elsewhere. If this tab has nothing pending,
      // adopting the newer version loses nothing and is the calmer outcome.
      // With edits in flight, say so instead — never overwrite silently.
      if (
        pendingRef.current === null &&
        revisionRef.current !== event.revision
      ) {
        void reloadLatest()
      } else if (revisionRef.current !== event.revision) {
        setConflict({ kind: 'remote-change', dossierId: event.dossierId })
        setStatus('error')
      }
    },
    [refreshSummaries, reloadLatest]
  )

  // The handler goes through a ref so the effect below can have empty
  // dependencies: the channel is a browser resource, and reopening it whenever
  // a callback's identity changed would drop messages for no reason.
  const handlerRef = useRef(handleEvent)
  useEffect(() => {
    handlerRef.current = handleEvent
  }, [handleEvent])

  useEffect(() => {
    const channel = createWorkspaceChannel()
    channelRef.current = channel
    const unsubscribe = channel.subscribe((event) => handlerRef.current(event))
    return () => {
      unsubscribe()
      channel.close()
      channelRef.current = null
    }
  }, [])

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ready,
      conflict,
      summaries,
      activeId,
      status,
      lastPersistedAt,
      sessionOnly,
      createDossier,
      adoptImported,
      openDossier,
      deleteDossier,
      renameDossier,
      reloadLatest,
      saveAsNew,
      flush,
      pendingLeave,
      exportDossier,
      exportRawRecord,
      promoteToDevice,
      cancelLeave,
      discardAndLeave,
      saveAndLeave,
      closeDossier,
      noteExported,
    }),
    [
      ready,
      conflict,
      summaries,
      activeId,
      status,
      lastPersistedAt,
      sessionOnly,
      createDossier,
      adoptImported,
      openDossier,
      deleteDossier,
      renameDossier,
      reloadLatest,
      saveAsNew,
      flush,
      pendingLeave,
      exportDossier,
      exportRawRecord,
      promoteToDevice,
      cancelLeave,
      discardAndLeave,
      saveAndLeave,
      closeDossier,
      noteExported,
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
