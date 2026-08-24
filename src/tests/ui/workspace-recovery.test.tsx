import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { DossierProvider, useDossier } from '@/app/providers/DossierProvider'
import {
  WorkspaceProvider,
  useWorkspace,
} from '@/app/providers/WorkspaceProvider'
import { MemoryDossierRepository } from '@/features/workspace/adapters/memory-adapter'
import { StorageUnavailableError } from '@/features/workspace/adapters/indexeddb-adapter'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
import type { DossierPayload } from '@/features/workspace/saved-dossier'
import { toRecord } from '@/features/workspace/workspace-model'
import {
  partiallyPrepared,
  allApplicableReady,
} from '@/tests/fixtures/dossiers'

/**
 * What the workspace tells the user, and what it refuses to destroy.
 *
 * These cover the two promises this sprint had to make true: a dossier that is
 * not saved is never silently discarded (ADR-039), and the app never claims a
 * backup or a save that did not happen (ADR-038).
 */

function payloadOf(fixture: typeof partiallyPrepared): DossierPayload {
  return {
    applicant: fixture.applicant,
    application: fixture.application,
    documents: fixture.documents,
    sponsors: fixture.sponsors,
  }
}

type Workspace = ReturnType<typeof useWorkspace>
let workspace: Workspace | null = null
let editor: ReturnType<typeof useDossier> | null = null

function Probe() {
  const w = useWorkspace()
  const d = useDossier()
  useEffect(() => {
    workspace = w
    editor = d
  })
  return (
    <div>
      <span data-testid="status">{w.status}</span>
      <span data-testid="ready">{String(w.ready)}</span>
      <span data-testid="session">{String(w.sessionOnly)}</span>
      <span data-testid="pending">{w.pendingLeave?.intent.kind ?? 'none'}</span>
      <span data-testid="reason">{w.pendingLeave?.reason ?? 'none'}</span>
      <span data-testid="conflict">{w.conflict?.kind ?? 'none'}</span>
      <span data-testid="active">{w.activeId ?? 'none'}</span>
      <span data-testid="count">{w.summaries.length}</span>
      <span data-testid="backup">
        {w.summaries.find((s) => s.id === w.activeId)?.backup ?? 'none'}
      </span>
    </div>
  )
}

/** Comfortably in the past, so a real-clock export reads as newer than it. */
const SEEDED_AT = '2026-08-01T10:00:00.000Z'

/** Exact, not substring: a generated id can contain a short id like `a`. */
const activeId = () => screen.getByTestId('active').textContent

const ws = () => {
  if (!workspace) throw new Error('workspace not mounted')
  return workspace
}
const ed = () => {
  if (!editor) throw new Error('editor not mounted')
  return editor
}

const settle = async (interaction: () => void) => {
  await act(async () => {
    interaction()
    await Promise.resolve()
  })
}

function mount(repo?: MemoryDossierRepository) {
  return render(
    <DossierProvider>
      <WorkspaceProvider repository={repo} untitledLabel="Untitled">
        <Probe />
      </WorkspaceProvider>
    </DossierProvider>
  )
}

const ready = async () =>
  await waitFor(() =>
    expect(screen.getByTestId('ready')).toHaveTextContent('true')
  )

beforeEach(() => {
  workspace = null
  editor = null
})

describe('backup state through the provider', () => {
  it('starts an imported dossier as never exported, then records the export', async () => {
    const repo = new MemoryDossierRepository()
    mount(repo)
    await ready()

    await act(async () => {
      await ws().adoptImported(payloadOf(partiallyPrepared))
    })
    await waitFor(() =>
      expect(screen.getByTestId('backup')).toHaveTextContent('never')
    )

    await act(async () => {
      await ws().noteExported()
    })
    await waitFor(() =>
      expect(screen.getByTestId('backup')).toHaveTextContent('fresh')
    )
  })

  it('goes stale again when the dossier is edited after the export', async () => {
    const repo = new MemoryDossierRepository()
    mount(repo)
    await ready()

    await act(async () => {
      await ws().adoptImported(payloadOf(partiallyPrepared))
    })
    await act(async () => {
      await ws().noteExported()
    })
    await waitFor(() =>
      expect(screen.getByTestId('backup')).toHaveTextContent('fresh')
    )

    await settle(() => ed().updateApplicant({ firstName: 'EditedAfter' }))
    await act(async () => {
      await ws().flush()
    })

    await waitFor(() =>
      expect(screen.getByTestId('backup')).toHaveTextContent('stale')
    )
  })

  it('survives a reload, because it lives in the record and not in memory', async () => {
    const repo = new MemoryDossierRepository()
    const view = mount(repo)
    await ready()
    await act(async () => {
      await ws().adoptImported(payloadOf(partiallyPrepared))
    })
    await act(async () => {
      await ws().noteExported()
    })
    await waitFor(() =>
      expect(screen.getByTestId('backup')).toHaveTextContent('fresh')
    )

    // A second mount over the same storage is what a refresh looks like.
    view.unmount()
    workspace = null
    mount(repo)
    await ready()
    await waitFor(() =>
      expect(screen.getByTestId('backup')).toHaveTextContent('fresh')
    )
  })

  it('keeps each dossier’s history to itself when switching', async () => {
    const repo = new MemoryDossierRepository()
    const now = SEEDED_AT
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, now)
    )
    await repo.put(
      toRecord('b', payloadOf(allApplicableReady), SCHEMA_VERSION, now)
    )
    await repo.writeMeta({ activeDossierId: 'a' })
    mount(repo)
    await ready()

    await act(async () => {
      await ws().noteExported()
    })
    await waitFor(() =>
      expect(screen.getByTestId('backup')).toHaveTextContent('fresh')
    )

    await act(async () => {
      await ws().openDossier('b')
    })
    // B was never exported; A's timestamp must not follow the user across.
    await waitFor(() =>
      expect(screen.getByTestId('backup')).toHaveTextContent('never')
    )

    await act(async () => {
      await ws().openDossier('a')
    })
    await waitFor(() =>
      expect(screen.getByTestId('backup')).toHaveTextContent('fresh')
    )
  })

  it('exports another dossier without opening it or disturbing this one', async () => {
    const repo = new MemoryDossierRepository()
    const now = SEEDED_AT
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, now)
    )
    await repo.put(
      toRecord('b', payloadOf(allApplicableReady), SCHEMA_VERSION, now)
    )
    await repo.writeMeta({ activeDossierId: 'a' })
    mount(repo)
    await ready()

    const beforeB = await repo.get('b')
    await act(async () => {
      await ws().exportDossier('b')
    })

    const afterB = await repo.get('b')
    expect(afterB?.lastExportedAt).not.toBeNull()
    // Exporting is not an edit, and it is not a switch either.
    expect(afterB?.revision).toBe(beforeB?.revision)
    expect(afterB?.updatedAt).toBe(beforeB?.updatedAt)
    expect(afterB?.lastOpenedAt).toBe(beforeB?.lastOpenedAt)
    expect(activeId()).toBe('a')
    expect((await repo.get('a'))?.lastExportedAt).toBeNull()
  })
})

describe('when storage will not cooperate', () => {
  it('never claims to have saved', async () => {
    const repo = new MemoryDossierRepository()
    mount(repo)
    await ready()
    await act(async () => {
      await ws().adoptImported(payloadOf(partiallyPrepared))
    })

    repo.failNext = new Error('quota exceeded')
    await settle(() => ed().updateApplicant({ firstName: 'AfterFailure' }))
    await act(async () => {
      await ws().flush()
    })

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('error')
    )
    // The work is still on screen — the failure is about storage, not the user.
    expect(ed().state.applicant?.firstName).toBe('AfterFailure')
  })

  it('says the browser refused rather than blaming the save', async () => {
    const repo = new MemoryDossierRepository()
    mount(repo)
    await ready()
    await act(async () => {
      await ws().adoptImported(payloadOf(partiallyPrepared))
    })

    repo.failNext = new StorageUnavailableError('private browsing')
    await settle(() => ed().updateApplicant({ firstName: 'StorageGone' }))
    await act(async () => {
      await ws().flush()
    })

    // The two failures need different words, so they must be different states.
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unavailable')
    )
  })

  it('degrades honestly with no storage at all', async () => {
    mount()
    await ready()
    expect(screen.getByTestId('status')).toHaveTextContent('unavailable')
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })
})

describe('session-only dossiers', () => {
  const createSessionOnly = async () => {
    await act(async () => {
      await ws().createDossier('GR', true)
    })
    await waitFor(() =>
      expect(screen.getByTestId('session')).toHaveTextContent('true')
    )
  }

  it('writes nothing to storage', async () => {
    const repo = new MemoryDossierRepository()
    mount(repo)
    await ready()
    await createSessionOnly()

    await settle(() => ed().updateApplicant({ firstName: 'InMemoryOnly' }))
    await act(async () => {
      await ws().flush()
    })
    expect(await repo.list()).toHaveLength(0)
  })

  it('lets an untouched one go without an interruption', async () => {
    const repo = new MemoryDossierRepository()
    const now = SEEDED_AT
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, now)
    )
    mount(repo)
    await ready()
    await createSessionOnly()

    // Nothing typed: choosing a destination during setup is not work.
    await act(async () => {
      await ws().openDossier('a')
    })
    expect(screen.getByTestId('pending')).toHaveTextContent('none')
    expect(activeId()).toBe('a')
  })

  it('refuses to be discarded by a switch, and stays put on Cancel', async () => {
    const repo = new MemoryDossierRepository()
    const now = SEEDED_AT
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, now)
    )
    mount(repo)
    await ready()
    await createSessionOnly()
    await settle(() => ed().updateApplicant({ firstName: 'WorthKeeping' }))

    await act(async () => {
      await ws().openDossier('a')
    })
    await waitFor(() =>
      expect(screen.getByTestId('pending')).toHaveTextContent('open')
    )
    expect(activeId()).not.toBe('a')

    await settle(() => ws().cancelLeave())
    expect(screen.getByTestId('pending')).toHaveTextContent('none')
    expect(screen.getByTestId('session')).toHaveTextContent('true')
    expect(ed().state.applicant?.firstName).toBe('WorthKeeping')
  })

  it('persists before switching when the user chooses to keep it', async () => {
    const repo = new MemoryDossierRepository()
    const now = SEEDED_AT
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, now)
    )
    mount(repo)
    await ready()
    await createSessionOnly()
    await settle(() => ed().updateApplicant({ firstName: 'PromoteMe' }))
    const sessionId = activeId()

    await act(async () => {
      await ws().openDossier('a')
    })
    await act(async () => {
      await ws().saveAndLeave()
    })

    // Exactly one new record, under the identity it already had.
    await waitFor(async () => expect(await repo.list()).toHaveLength(2))
    const promoted = await repo.get(sessionId ?? '')
    expect(promoted?.payload.applicant?.firstName).toBe('PromoteMe')
    // …and only then did the switch happen.
    expect(activeId()).toBe('a')
    expect(screen.getByTestId('pending')).toHaveTextContent('none')
  })

  it('discards nothing when the promotion fails', async () => {
    const repo = new MemoryDossierRepository()
    const now = SEEDED_AT
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, now)
    )
    mount(repo)
    await ready()
    await createSessionOnly()
    await settle(() => ed().updateApplicant({ firstName: 'MustSurvive' }))

    await act(async () => {
      await ws().openDossier('a')
    })
    repo.failNext = new Error('storage refused the promotion')
    await act(async () => {
      await ws().saveAndLeave()
    })

    // The switch must not happen: continuing would throw away exactly the work
    // we just failed to save.
    expect(ed().state.applicant?.firstName).toBe('MustSurvive')
    expect(activeId()).not.toBe('a')
    expect(await repo.list()).toHaveLength(1)
    expect(screen.getByTestId('session')).toHaveTextContent('true')
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('error')
    )
  })

  it('keeps saving after a promotion, like any other saved dossier', async () => {
    const repo = new MemoryDossierRepository()
    mount(repo)
    await ready()
    await createSessionOnly()
    await settle(() => ed().updateApplicant({ firstName: 'NowPersisted' }))

    await act(async () => {
      await ws().promoteToDevice()
    })
    await waitFor(() =>
      expect(screen.getByTestId('session')).toHaveTextContent('false')
    )

    await settle(() => ed().updateApplicant({ firstName: 'AndStillSaving' }))
    await act(async () => {
      await ws().flush()
    })
    const [only] = await repo.list()
    expect(only?.payload.applicant?.firstName).toBe('AndStillSaving')
    expect(await repo.list()).toHaveLength(1)
  })

  it('really does discard when the user says so', async () => {
    const repo = new MemoryDossierRepository()
    const now = SEEDED_AT
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, now)
    )
    mount(repo)
    await ready()
    await createSessionOnly()
    await settle(() => ed().updateApplicant({ firstName: 'Goodbye' }))

    await act(async () => {
      await ws().openDossier('a')
    })
    await act(async () => {
      await ws().discardAndLeave()
    })

    expect(activeId()).toBe('a')
    expect(screen.getByTestId('session')).toHaveTextContent('false')
    expect(await repo.list()).toHaveLength(1)
  })
})

describe('closing a dossier', () => {
  it('clears the editor and stops it reopening, without deleting it', async () => {
    const repo = new MemoryDossierRepository()
    const now = SEEDED_AT
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, now)
    )
    await repo.writeMeta({ activeDossierId: 'a' })
    mount(repo)
    await ready()

    await act(async () => {
      await ws().closeDossier()
    })

    expect(activeId()).toBe('none')
    // The saved dossier is untouched — deletion lives on the dossiers page.
    expect(await repo.list()).toHaveLength(1)
    // …and it stays closed, which the old "reset" never managed.
    expect((await repo.readMeta()).activeDossierId).toBeNull()
  })
})

/**
 * The guard is not about session-only dossiers. It is about *this editor holds
 * work that storage does not*, which happens for three unrelated reasons — and
 * two of them used to discard edits through the very same switcher click that
 * the third had a dialog for (ADR-041).
 */
describe('leaving an editor that cannot be saved', () => {
  const seeded = async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, SEEDED_AT)
    )
    await repo.put(
      toRecord('b', payloadOf(allApplicableReady), SCHEMA_VERSION, SEEDED_AT)
    )
    return repo
  }

  /** Open `a`, let another writer move ahead of us, then fail to save. */
  const intoConflict = async (repo: MemoryDossierRepository) => {
    await act(async () => {
      await ws().openDossier('a')
    })
    const behind = await repo.get('a')
    if (!behind) throw new Error('seeded record vanished')
    await repo.put(
      { ...behind, payload: payloadOf(allApplicableReady) },
      behind.revision
    )

    await settle(() => ed().updateApplicant({ firstName: 'OnlyInThisTab' }))
    await act(async () => {
      await ws().flush()
    })
    await waitFor(() =>
      expect(screen.getByTestId('conflict')).toHaveTextContent('remote-change')
    )
  }

  /** Open `a`, then have the store refuse the write. */
  const intoStorageFailure = async (repo: MemoryDossierRepository) => {
    await act(async () => {
      await ws().openDossier('a')
    })
    repo.failNext = new Error('the browser refused to store this')
    await settle(() => ed().updateApplicant({ firstName: 'NeverStored' }))
    await act(async () => {
      await ws().flush()
    })
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('error')
    )
  }

  it('blocks a switch away from a conflicted dossier and says why', async () => {
    const repo = await seeded()
    mount(repo)
    await ready()
    await intoConflict(repo)

    await act(async () => {
      await ws().openDossier('b')
    })

    expect(screen.getByTestId('pending')).toHaveTextContent('open')
    expect(screen.getByTestId('reason')).toHaveTextContent('conflict')
    // Nothing moved: the editor still holds the version only this tab has.
    expect(activeId()).toBe('a')
    expect(ed().state.applicant?.firstName).toBe('OnlyInThisTab')
  })

  it('blocks closing, which used to bypass the guard entirely', async () => {
    const repo = await seeded()
    mount(repo)
    await ready()
    await intoConflict(repo)

    await act(async () => {
      await ws().closeDossier()
    })

    expect(screen.getByTestId('pending')).toHaveTextContent('close')
    expect(activeId()).toBe('a')
    expect(ed().state.applicant?.firstName).toBe('OnlyInThisTab')
  })

  it('blocks a new dossier and an import too', async () => {
    const repo = await seeded()
    mount(repo)
    await ready()
    await intoConflict(repo)

    await act(async () => {
      await ws().createDossier('GR')
    })
    expect(screen.getByTestId('pending')).toHaveTextContent('create')

    await settle(() => ws().cancelLeave())
    await act(async () => {
      await ws().adoptImported(payloadOf(allApplicableReady))
    })
    expect(screen.getByTestId('pending')).toHaveTextContent('import')
    expect(ed().state.applicant?.firstName).toBe('OnlyInThisTab')
  })

  it('forks the conflicted version to a new dossier, then completes the switch', async () => {
    const repo = await seeded()
    mount(repo)
    await ready()
    await intoConflict(repo)

    await act(async () => {
      await ws().openDossier('b')
    })
    await act(async () => {
      await ws().saveAndLeave()
    })

    // Three dossiers: the two seeded ones, plus this tab's rescued version.
    await waitFor(async () => expect(await repo.list()).toHaveLength(3))
    const forked = (await repo.list()).find(
      (record) => record.id !== 'a' && record.id !== 'b'
    )
    expect(forked?.payload.applicant?.firstName).toBe('OnlyInThisTab')
    // The other tab's version of `a` is untouched.
    expect((await repo.get('a'))?.payload.applicant?.firstName).toBe(
      allApplicableReady.applicant?.firstName
    )
    // …and the switch the user originally asked for actually happened.
    expect(activeId()).toBe('b')
    expect(screen.getByTestId('pending')).toHaveTextContent('none')
  })

  it('discards the conflicted edits only when the user says so', async () => {
    const repo = await seeded()
    mount(repo)
    await ready()
    await intoConflict(repo)

    await act(async () => {
      await ws().openDossier('b')
    })
    await act(async () => {
      await ws().discardAndLeave()
    })

    expect(activeId()).toBe('b')
    expect(screen.getByTestId('conflict')).toHaveTextContent('none')
    // Nothing was forked, and `a` still holds the other tab's version.
    expect(await repo.list()).toHaveLength(2)
    expect((await repo.get('a'))?.payload.applicant?.firstName).toBe(
      allApplicableReady.applicant?.firstName
    )
  })

  it('blocks a switch when the store refused the write, and offers a file', async () => {
    const repo = await seeded()
    mount(repo)
    await ready()
    await intoStorageFailure(repo)

    await act(async () => {
      await ws().openDossier('b')
    })
    expect(screen.getByTestId('pending')).toHaveTextContent('open')
    expect(screen.getByTestId('reason')).toHaveTextContent('storage-failure')

    // Taking a copy is not a decision: the dialog has to stay up.
    await settle(() => {
      ws().exportPending()
    })
    expect(screen.getByTestId('pending')).toHaveTextContent('open')
    expect(ed().state.applicant?.firstName).toBe('NeverStored')
  })

  it('blocks a switch when the browser has no storage at all', async () => {
    mount()
    await ready()
    await act(async () => {
      await ws().adoptImported(payloadOf(partiallyPrepared))
    })
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unavailable')
    )

    await act(async () => {
      await ws().closeDossier()
    })
    expect(screen.getByTestId('reason')).toHaveTextContent('storage-failure')
    expect(ed().state.applicant).not.toBeNull()
  })

  it('stays out of the way when the dossier really is saved', async () => {
    const repo = await seeded()
    mount(repo)
    await ready()
    await act(async () => {
      await ws().openDossier('a')
    })
    await settle(() => ed().updateApplicant({ firstName: 'SavedFine' }))
    await act(async () => {
      await ws().flush()
    })

    await act(async () => {
      await ws().openDossier('b')
    })
    expect(screen.getByTestId('pending')).toHaveTextContent('none')
    expect(activeId()).toBe('b')

    await act(async () => {
      await ws().closeDossier()
    })
    expect(screen.getByTestId('pending')).toHaveTextContent('none')
    expect(activeId()).toBe('none')
  })
})
