import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { DossierProvider, useDossier } from '@/app/providers/DossierProvider'
import {
  WorkspaceProvider,
  useWorkspace,
} from '@/app/providers/WorkspaceProvider'
import { MemoryDossierRepository } from '@/features/workspace/adapters/memory-adapter'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
import type { DossierPayload } from '@/features/workspace/saved-dossier'
import { toRecord } from '@/features/workspace/workspace-model'
import {
  partiallyPrepared,
  allApplicableReady,
} from '@/tests/fixtures/dossiers'

/**
 * Workspace behaviour against the in-memory adapter.
 *
 * This is the layer where "durable" is actually decided: autosave, switching,
 * deleting the open dossier, import-as-new, and — importantly — that a failed
 * write never claims success. IndexedDB itself is proven in real Chrome; see
 * `docs/manual-qa.md`.
 */

function payloadOf(fixture: typeof partiallyPrepared): DossierPayload {
  return {
    applicant: fixture.applicant,
    application: fixture.application,
    documents: fixture.documents,
    sponsors: fixture.sponsors,
  }
}

/** Surfaces workspace + dossier state so assertions read the real thing. */
function Probe() {
  const workspace = useWorkspace()
  const { state } = useDossier()
  return (
    <div>
      <span data-testid="ready">{String(workspace.ready)}</span>
      <span data-testid="status">{workspace.status}</span>
      <span data-testid="active">{workspace.activeId ?? 'none'}</span>
      <span data-testid="count">{workspace.summaries.length}</span>
      <span data-testid="titles">
        {workspace.summaries.map((s) => s.title).join('|')}
      </span>
      <span data-testid="docs">{state.documents.length}</span>
      <span data-testid="applicant">{state.applicant ? 'yes' : 'no'}</span>
    </div>
  )
}

type Workspace = ReturnType<typeof useWorkspace>

/**
 * A module-scoped handle on the live workspace so a test can drive actions that
 * take arguments (`openDossier(id)`, `deleteDossier(id)`) without rendering a
 * whole management UI. Module scope rather than a prop: props are immutable.
 */
let current: Workspace | null = null

function workspace(): Workspace {
  if (!current) throw new Error('workspace not mounted')
  return current
}

/** Publishes the workspace, and optionally fires one action once hydrated. */
function Act({ onReady }: { onReady?: (w: Workspace) => void }) {
  const value = useWorkspace()
  useEffect(() => {
    current = value
  })
  useEffect(() => {
    if (value.ready) onReady?.(value)
    // Fire once, when hydration completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.ready])
  return null
}

beforeEach(() => {
  current = null
})

function renderWorkspace(
  repo: MemoryDossierRepository,
  children?: React.ReactNode
) {
  return render(
    <DossierProvider>
      <WorkspaceProvider repository={repo} untitledLabel="Untitled">
        <Probe />
        {children}
      </WorkspaceProvider>
    </DossierProvider>
  )
}

const NOW = '2026-08-23T10:00:00.000Z'

describe('workspace persistence', () => {
  it('starts empty for a first-time user', async () => {
    renderWorkspace(new MemoryDossierRepository())
    await waitFor(() =>
      expect(screen.getByTestId('ready')).toHaveTextContent('true')
    )
    expect(screen.getByTestId('count')).toHaveTextContent('0')
    expect(screen.getByTestId('active')).toHaveTextContent('none')
  })

  it('hydrates the previously active dossier for a returning user', async () => {
    const repo = new MemoryDossierRepository()
    const record = toRecord(
      'saved-1',
      payloadOf(partiallyPrepared),
      SCHEMA_VERSION,
      NOW
    )
    await repo.put(record)
    await repo.writeMeta({ activeDossierId: 'saved-1' })

    renderWorkspace(repo)

    await waitFor(() =>
      expect(screen.getByTestId('ready')).toHaveTextContent('true')
    )
    expect(screen.getByTestId('active')).toHaveTextContent('saved-1')
    expect(screen.getByTestId('docs')).toHaveTextContent(
      String(partiallyPrepared.documents.length)
    )
    expect(screen.getByTestId('status')).toHaveTextContent('saved')
  })

  it('autosaves an imported dossier and lists it', async () => {
    const repo = new MemoryDossierRepository()
    renderWorkspace(
      repo,
      <Act
        onReady={(w) => void w.adoptImported(payloadOf(partiallyPrepared))}
      />
    )

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('saved')
    )
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    expect(await repo.list()).toHaveLength(1)
  })

  it('imports as a NEW dossier rather than replacing the open one', async () => {
    const repo = new MemoryDossierRepository()
    renderWorkspace(
      repo,
      <Act
        onReady={(w) => void w.adoptImported(payloadOf(partiallyPrepared))}
      />
    )
    await waitFor(() =>
      expect(screen.getByTestId('count')).toHaveTextContent('1')
    )
    const first = screen.getByTestId('active').textContent

    await act(async () => {
      await workspace().adoptImported(payloadOf(allApplicableReady))
    })

    await waitFor(() =>
      expect(screen.getByTestId('count')).toHaveTextContent('2')
    )
    // A new local id every time — never reused from the file.
    expect(screen.getByTestId('active')).not.toHaveTextContent(first ?? '')
    expect(await repo.list()).toHaveLength(2)
  })

  it('switches dossiers, replacing state rather than merging it', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, NOW)
    )
    await repo.put(
      toRecord(
        'b',
        { applicant: null, application: null, documents: [], sponsors: [] },
        SCHEMA_VERSION,
        NOW
      )
    )
    await repo.writeMeta({ activeDossierId: 'a' })

    renderWorkspace(repo, <Act />)
    await waitFor(() =>
      expect(screen.getByTestId('applicant')).toHaveTextContent('yes')
    )

    await act(async () => {
      await workspace().openDossier('b')
    })

    expect(screen.getByTestId('active')).toHaveTextContent('b')
    // The crux: dossier B has no applicant, so A's must be gone — a merging
    // load would have left it on screen.
    expect(screen.getByTestId('applicant')).toHaveTextContent('no')
    expect(screen.getByTestId('docs')).toHaveTextContent('0')
  })

  it('opens the most recent survivor when the active dossier is deleted', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(
      toRecord('old', payloadOf(partiallyPrepared), SCHEMA_VERSION, NOW)
    )
    await repo.put(
      toRecord(
        'new',
        payloadOf(allApplicableReady),
        SCHEMA_VERSION,
        '2026-08-24T10:00:00.000Z'
      )
    )
    await repo.writeMeta({ activeDossierId: 'new' })

    renderWorkspace(repo, <Act />)
    await waitFor(() =>
      expect(screen.getByTestId('active')).toHaveTextContent('new')
    )

    await act(async () => {
      await workspace().deleteDossier('new')
    })

    expect(screen.getByTestId('active')).toHaveTextContent('old')
    expect(screen.getByTestId('count')).toHaveTextContent('1')
  })

  it('returns to an empty workspace when the last dossier is deleted', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(
      toRecord('only', payloadOf(partiallyPrepared), SCHEMA_VERSION, NOW)
    )
    await repo.writeMeta({ activeDossierId: 'only' })

    renderWorkspace(repo, <Act />)
    await waitFor(() =>
      expect(screen.getByTestId('active')).toHaveTextContent('only')
    )

    await act(async () => {
      await workspace().deleteDossier('only')
    })

    expect(screen.getByTestId('active')).toHaveTextContent('none')
    expect(screen.getByTestId('applicant')).toHaveTextContent('no')
    expect((await repo.readMeta()).activeDossierId).toBeNull()
  })

  it('never writes a session-only dossier', async () => {
    const repo = new MemoryDossierRepository()
    renderWorkspace(
      repo,
      <Act
        onReady={(w) =>
          void w.adoptImported(payloadOf(partiallyPrepared), true)
        }
      />
    )

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('sessionOnly')
    )
    // Present in the editor, absent from storage — the whole point.
    expect(screen.getByTestId('docs')).toHaveTextContent(
      String(partiallyPrepared.documents.length)
    )
    expect(await repo.list()).toHaveLength(0)
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('reports a failed write as an error and never as "saved"', async () => {
    const repo = new MemoryDossierRepository()
    repo.failNext = new Error('QuotaExceededError')

    renderWorkspace(
      repo,
      <Act
        onReady={(w) => void w.adoptImported(payloadOf(partiallyPrepared))}
      />
    )

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('error')
    )
    // The dossier is still in the editor — a storage failure is not data loss.
    expect(screen.getByTestId('docs')).toHaveTextContent(
      String(partiallyPrepared.documents.length)
    )
  })

  it('degrades to unavailable when there is no storage at all', async () => {
    render(
      <DossierProvider>
        {/* No repository and no IndexedDB in jsdom — the app must still work. */}
        <WorkspaceProvider>
          <Probe />
        </WorkspaceProvider>
      </DossierProvider>
    )
    await waitFor(() =>
      expect(screen.getByTestId('ready')).toHaveTextContent('true')
    )
    expect(screen.getByTestId('status')).toHaveTextContent('unavailable')
  })

  it('lists an unreadable record without opening or deleting it', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(
      toRecord('good', payloadOf(partiallyPrepared), SCHEMA_VERSION, NOW)
    )
    repo.seedRaw('future', {
      ...toRecord('future', payloadOf(partiallyPrepared), SCHEMA_VERSION, NOW),
      storageVersion: 99,
    })

    renderWorkspace(repo)

    await waitFor(() =>
      expect(screen.getByTestId('count')).toHaveTextContent('2')
    )
    expect(await repo.listUnreadable()).toHaveLength(1)
  })
})
