import { StrictMode, useEffect } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { DossierProvider, useDossier } from '@/app/providers/DossierProvider'
import {
  WorkspaceProvider,
  useWorkspace,
} from '@/app/providers/WorkspaceProvider'
import userEvent from '@testing-library/user-event'
import i18n, { LOCALE_STORAGE_KEY } from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { WorkspaceNotice } from '@/components/layout/WorkspaceNotice'
import { MemoryDossierRepository } from '@/features/workspace/adapters/memory-adapter'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
import type { DossierPayload } from '@/features/workspace/saved-dossier'
import { toRecord } from '@/features/workspace/workspace-model'
import {
  partiallyPrepared,
  allApplicableReady,
} from '@/tests/fixtures/dossiers'

/**
 * Two tabs, one workspace.
 *
 * These are real two-tab tests, not simulations of one: `BroadcastChannel` works
 * in jsdom, so two `WorkspaceProvider`s in the same realm genuinely exchange
 * messages, and both write through one repository exactly as two browser tabs
 * write through one IndexedDB.
 *
 * The load-bearing assertion throughout is that **the newer write survives** —
 * a stale tab must never be able to overwrite it.
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

const tabs = new Map<string, Workspace>()
const dossiers = new Map<string, ReturnType<typeof useDossier>>()

function Probe({ name }: { name: string }) {
  const workspace = useWorkspace()
  const dossier = useDossier()
  useEffect(() => {
    tabs.set(name, workspace)
    dossiers.set(name, dossier)
  })
  return (
    <div>
      <span data-testid={`${name}-status`}>{workspace.status}</span>
      <span data-testid={`${name}-conflict`}>
        {workspace.conflict?.kind ?? 'none'}
      </span>
      <span data-testid={`${name}-active`}>{workspace.activeId ?? 'none'}</span>
      <span data-testid={`${name}-count`}>{workspace.summaries.length}</span>
      <span data-testid={`${name}-title`}>
        {workspace.summaries.find((s) => s.id === workspace.activeId)?.title ??
          ''}
      </span>
      <span data-testid={`${name}-ready`}>{String(workspace.ready)}</span>
    </div>
  )
}

/** One browser tab: its own dossier state, the shared repository. */
function Tab({ name, repo }: { name: string; repo: MemoryDossierRepository }) {
  return (
    <DossierProvider>
      <WorkspaceProvider repository={repo} untitledLabel="Untitled">
        <Probe name={name} />
      </WorkspaceProvider>
    </DossierProvider>
  )
}

/** Exact, not substring: a generated id can contain a short id like `x`. */
const activeIdOf = (name: string) =>
  screen.getByTestId(`${name}-active`).textContent

const tab = (name: string) => {
  const value = tabs.get(name)
  if (!value) throw new Error(`tab ${name} not mounted`)
  return value
}

const editor = (name: string) => {
  const value = dossiers.get(name)
  if (!value) throw new Error(`tab ${name} not mounted`)
  return value
}

/** The stored record, or a clear failure — never a silently optional one. */
async function stored(repo: MemoryDossierRepository, id: string) {
  const record = await repo.get(id)
  if (!record) throw new Error(`no stored record ${id}`)
  return record
}

/**
 * Run a synchronous interaction and let the provider's effects settle before
 * asserting. `act` alone would flush React; the microtask turn also lets the
 * repository promises and channel delivery land.
 */
async function settle(interaction: () => void) {
  await act(async () => {
    interaction()
    await Promise.resolve()
  })
}

const NOW = '2026-08-23T10:00:00.000Z'

async function seededRepo() {
  const repo = new MemoryDossierRepository()
  await repo.put(
    toRecord('x', payloadOf(partiallyPrepared), SCHEMA_VERSION, NOW)
  )
  await repo.writeMeta({ activeDossierId: 'x' })
  return repo
}

async function openBothTabs(repo: MemoryDossierRepository) {
  render(
    <>
      <Tab name="A" repo={repo} />
      <Tab name="B" repo={repo} />
    </>
  )
  await waitFor(() => {
    expect(screen.getByTestId('A-ready')).toHaveTextContent('true')
    expect(screen.getByTestId('B-ready')).toHaveTextContent('true')
  })
}

beforeEach(() => {
  tabs.clear()
  dossiers.clear()
})

describe('two tabs on one workspace', () => {
  it('both open the same persisted dossier', async () => {
    await openBothTabs(await seededRepo())
    expect(activeIdOf('A')).toBe('x')
    expect(activeIdOf('B')).toBe('x')
  })

  it('warns a tab that is editing when the dossier moves under it', async () => {
    const repo = await seededRepo()
    await openBothTabs(repo)

    // B is mid-edit — it has something to lose, so it must be told rather than
    // quietly reloaded out from under the user.
    await settle(() => editor('B').updateApplicant({ firstName: 'TypingInB' }))
    await settle(() => editor('A').updateApplicant({ firstName: 'SavedByA' }))
    await act(async () => {
      await tab('A').flush()
    })

    await waitFor(() =>
      expect(screen.getByTestId('B-conflict')).toHaveTextContent(
        'remote-change'
      )
    )
    // B's own pending write must not land afterwards.
    await act(async () => {
      await tab('B').flush()
    })
    expect((await repo.get('x'))?.payload.applicant?.firstName).toBe('SavedByA')
    expect(editor('B').state.applicant?.firstName).toBe('TypingInB')
  })

  it('tells a tab when its open dossier was deleted elsewhere, and does not recreate it', async () => {
    const repo = await seededRepo()
    await openBothTabs(repo)

    await act(async () => {
      await tab('A').deleteDossier('x')
    })

    await waitFor(() =>
      expect(screen.getByTestId('B-conflict')).toHaveTextContent(
        'remote-delete'
      )
    )

    // B keeps typing and saving; the deleted identity must stay deleted.
    await settle(() => editor('B').updateApplicant({ firstName: 'Zombie' }))
    await act(async () => {
      await tab('B').flush()
    })

    expect(await repo.get('x')).toBeNull()
  })

  it('adopts a remote change automatically when the tab has nothing pending', async () => {
    const repo = await seededRepo()
    await openBothTabs(repo)

    await settle(() =>
      editor('A').updateApplicant({ firstName: 'QuietUpdate' })
    )
    await act(async () => {
      await tab('A').flush()
    })

    // B was only viewing — nothing to lose, so it should just catch up.
    await waitFor(() =>
      expect(editor('B').state.applicant?.firstName).toBe('QuietUpdate')
    )
    expect(screen.getByTestId('B-conflict')).toHaveTextContent('none')
  })

  it('shows a rename made in another tab', async () => {
    const repo = await seededRepo()
    await openBothTabs(repo)

    await act(async () => {
      await tab('A').renameDossier('x', 'Greece September 2026')
    })

    await waitFor(() =>
      expect(screen.getByTestId('B-title')).toHaveTextContent(
        'Greece September 2026'
      )
    )
  })

  it('discovers a dossier imported in another tab', async () => {
    const repo = await seededRepo()
    await openBothTabs(repo)
    expect(screen.getByTestId('B-count')).toHaveTextContent('1')

    await act(async () => {
      await tab('A').adoptImported(payloadOf(allApplicableReady))
    })

    await waitFor(() =>
      expect(screen.getByTestId('B-count')).toHaveTextContent('2')
    )
    // B's own open dossier is not disturbed by A's import.
    expect(activeIdOf('B')).toBe('x')
  })

  it('lets two tabs hold different active dossiers', async () => {
    const repo = await seededRepo()
    await repo.put(
      toRecord('y', payloadOf(allApplicableReady), SCHEMA_VERSION, NOW)
    )
    await openBothTabs(repo)

    await act(async () => {
      await tab('A').openDossier('y')
    })

    expect(activeIdOf('A')).toBe('y')
    // B stays where it was — switching is tab-local, never yanked (ADR-037).
    expect(activeIdOf('B')).toBe('x')
  })

  it('keeps a session-only dossier out of storage and out of the other tab', async () => {
    const repo = await seededRepo()
    await openBothTabs(repo)

    await act(async () => {
      await tab('A').adoptImported(payloadOf(allApplicableReady), true)
    })

    await waitFor(() =>
      expect(screen.getByTestId('A-status')).toHaveTextContent('sessionOnly')
    )
    // Never persisted, so never discoverable by the other tab.
    expect(await repo.list()).toHaveLength(1)
    expect(screen.getByTestId('B-count')).toHaveTextContent('1')
  })
})

/**
 * StrictMode mounts, tears down, and mounts again.
 *
 * This is a regression test with a specific bug behind it: the channel used to
 * be built in a `useMemo` and closed by a separate cleanup effect, so the second
 * mount reused a memo whose `BroadcastChannel` had already been closed. Every
 * notification was silently lost — in development only, and only between real
 * tabs, which is precisely where it is hardest to notice.
 */
describe('two tabs under StrictMode', () => {
  it('still notifies the other tab after effects are re-run', async () => {
    const repo = await seededRepo()
    render(
      <StrictMode>
        <Tab name="A" repo={repo} />
        <Tab name="B" repo={repo} />
      </StrictMode>
    )
    await waitFor(() => {
      expect(screen.getByTestId('A-ready')).toHaveTextContent('true')
      expect(screen.getByTestId('B-ready')).toHaveTextContent('true')
    })

    await act(async () => {
      await tab('A').renameDossier('x', 'Named under StrictMode')
    })

    await waitFor(() =>
      expect(screen.getByTestId('B-title')).toHaveTextContent(
        'Named under StrictMode'
      )
    )
  })
})

/**
 * The same workspace with `BroadcastChannel` unavailable.
 *
 * Nothing here can rely on a notification arriving, so these tests exercise the
 * property the design actually rests on: the revision check in the repository.
 * Messages are a courtesy; compare-and-swap is the guarantee (ADR-037).
 */
describe('two tabs without BroadcastChannel', () => {
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', undefined)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('still refuses a stale write, and keeps the newer one', async () => {
    const repo = await seededRepo()
    await openBothTabs(repo)

    await settle(() => editor('A').updateApplicant({ firstName: 'WrittenByA' }))
    await act(async () => {
      await tab('A').flush()
    })

    // B heard nothing at all, and edits from its stale copy.
    await settle(() => editor('B').updateApplicant({ firstName: 'WrittenByB' }))
    await act(async () => {
      await tab('B').flush()
    })

    await waitFor(() =>
      expect(screen.getByTestId('B-conflict')).toHaveTextContent(
        'remote-change'
      )
    )
    expect((await repo.get('x'))?.payload.applicant?.firstName).toBe(
      'WrittenByA'
    )
  })

  it('makes no further writes while a tab is conflicted', async () => {
    const repo = await seededRepo()
    await openBothTabs(repo)

    await settle(() => editor('A').updateApplicant({ firstName: 'A1' }))
    await act(async () => {
      await tab('A').flush()
    })
    await settle(() => editor('B').updateApplicant({ firstName: 'B1' }))
    await act(async () => {
      await tab('B').flush()
    })
    await waitFor(() =>
      expect(screen.getByTestId('B-conflict')).toHaveTextContent(
        'remote-change'
      )
    )

    const revisionAtConflict = (await stored(repo, 'x')).revision

    // Keep typing in the doomed tab; nothing may reach storage, and there must
    // be no retry loop quietly hammering the repository either.
    await settle(() => editor('B').updateApplicant({ firstName: 'B2' }))
    await act(async () => {
      await tab('B').flush()
    })

    expect((await stored(repo, 'x')).revision).toBe(revisionAtConflict)
    expect((await stored(repo, 'x')).payload.applicant?.firstName).toBe('A1')
  })

  it('resolves a conflict by reloading the latest version', async () => {
    const repo = await seededRepo()
    await openBothTabs(repo)

    await settle(() => editor('A').updateApplicant({ firstName: 'Winner' }))
    await act(async () => {
      await tab('A').flush()
    })
    await settle(() => editor('B').updateApplicant({ firstName: 'Loser' }))
    await act(async () => {
      await tab('B').flush()
    })
    await waitFor(() =>
      expect(screen.getByTestId('B-conflict')).toHaveTextContent(
        'remote-change'
      )
    )

    await act(async () => {
      await tab('B').reloadLatest()
    })

    await waitFor(() =>
      expect(screen.getByTestId('B-conflict')).toHaveTextContent('none')
    )
    expect(editor('B').state.applicant?.firstName).toBe('Winner')

    // And B can save again afterwards — the conflict is fully cleared.
    await settle(() =>
      editor('B').updateApplicant({ firstName: 'BAfterReload' })
    )
    await act(async () => {
      await tab('B').flush()
    })
    await waitFor(async () =>
      expect((await repo.get('x'))?.payload.applicant?.firstName).toBe(
        'BAfterReload'
      )
    )
  })

  it("resolves a conflict by keeping this tab's work under a new id", async () => {
    const repo = await seededRepo()
    await openBothTabs(repo)

    await settle(() => editor('A').updateApplicant({ firstName: 'KeptByA' }))
    await act(async () => {
      await tab('A').flush()
    })
    await settle(() => editor('B').updateApplicant({ firstName: 'KeptByB' }))
    await act(async () => {
      await tab('B').flush()
    })
    await waitFor(() =>
      expect(screen.getByTestId('B-conflict')).toHaveTextContent(
        'remote-change'
      )
    )

    await act(async () => {
      await tab('B').saveAsNew()
    })

    // Two dossiers now, and neither version was lost.
    await waitFor(async () => expect(await repo.list()).toHaveLength(2))
    expect(activeIdOf('B')).not.toBe('x')
    expect((await repo.get('x'))?.payload.applicant?.firstName).toBe('KeptByA')

    const forked = (await repo.list()).find((r) => r.id !== 'x')
    expect(forked?.payload.applicant?.firstName).toBe('KeptByB')
  })

  it('does not recreate a dossier deleted by the other tab', async () => {
    const repo = await seededRepo()
    await openBothTabs(repo)

    await act(async () => {
      await tab('A').deleteDossier('x')
    })
    // B never heard about it, so only the repository can stop the resurrection.
    await settle(() => editor('B').updateApplicant({ firstName: 'Zombie' }))
    await act(async () => {
      await tab('B').flush()
    })

    expect(await repo.get('x')).toBeNull()
    await waitFor(() =>
      expect(screen.getByTestId('B-conflict')).toHaveTextContent(
        'remote-delete'
      )
    )
  })
})

/**
 * What the user actually sees when another tab moves the ground under them.
 *
 * The "other tab" here is the repository being written to directly — no
 * notification is sent, so the banner has to come from the failed write itself.
 */
describe('the conflict banner', () => {
  // Set the language here and nowhere else: an `afterEach` that changes it runs
  // before Testing Library's cleanup, re-rendering a tree that is still mounted
  // and producing act warnings that have nothing to do with the code.
  beforeEach(async () => {
    window.localStorage.removeItem(LOCALE_STORAGE_KEY)
    await i18n.changeLanguage('en')
  })

  function renderTab(repo: MemoryDossierRepository) {
    return render(
      <LocaleProvider>
        <DossierProvider>
          <WorkspaceProvider repository={repo} untitledLabel="Untitled">
            <WorkspaceNotice onExport={() => {}} />
            {/* Stands in for whatever field the user was typing in. */}
            <input aria-label="somewhere else" />
            <Probe name="A" />
          </WorkspaceProvider>
        </DossierProvider>
      </LocaleProvider>
    )
  }

  /** Another tab commits a change this one knows nothing about. */
  async function otherTabWrites(repo: MemoryDossierRepository, name: string) {
    const record = await stored(repo, 'x')
    await repo.put(
      {
        ...record,
        payload: {
          ...record.payload,
          applicant: { ...record.payload.applicant, firstName: name },
        } as typeof record.payload,
      },
      record.revision
    )
  }

  /** Edit and save here, which is the moment the stale write is refused. */
  async function provokeConflict() {
    await settle(() => editor('A').updateApplicant({ firstName: 'MyEdit' }))
    await act(async () => {
      await tab('A').flush()
    })
    return await screen.findByRole('status')
  }

  it('explains the situation without stealing focus', async () => {
    const repo = await seededRepo()
    renderTab(repo)
    await waitFor(() =>
      expect(screen.getByTestId('A-ready')).toHaveTextContent('true')
    )

    const field = screen.getByLabelText('somewhere else')
    field.focus()

    await otherTabWrites(repo, 'TheOtherTab')
    const banner = await provokeConflict()

    expect(banner).toHaveTextContent(i18n.t('workspace:conflict.changedTitle'))
    // The user may be mid-word; the banner announces, it does not interrupt.
    expect(field).toHaveFocus()
    // And it never blames a sync that does not exist.
    expect(banner.textContent ?? '').not.toMatch(/sync/i)
  })

  it('takes the saved version when the user asks for it', async () => {
    const repo = await seededRepo()
    const user = userEvent.setup()
    renderTab(repo)
    await waitFor(() =>
      expect(screen.getByTestId('A-ready')).toHaveTextContent('true')
    )

    await otherTabWrites(repo, 'TheOtherTab')
    await provokeConflict()

    await user.click(
      screen.getByRole('button', { name: i18n.t('workspace:conflict.reload') })
    )

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(editor('A').state.applicant?.firstName).toBe('TheOtherTab')
  })

  it('keeps this version as a new dossier when the user asks for that', async () => {
    const repo = await seededRepo()
    const user = userEvent.setup()
    renderTab(repo)
    await waitFor(() =>
      expect(screen.getByTestId('A-ready')).toHaveTextContent('true')
    )

    await otherTabWrites(repo, 'TheOtherTab')
    await provokeConflict()

    await user.click(
      screen.getByRole('button', {
        name: i18n.t('workspace:conflict.saveAsNew'),
      })
    )

    await waitFor(async () => expect(await repo.list()).toHaveLength(2))
    expect(screen.queryByRole('status')).toBeNull()
    // Neither version was lost.
    expect((await stored(repo, 'x')).payload.applicant?.firstName).toBe(
      'TheOtherTab'
    )
    expect(editor('A').state.applicant?.firstName).toBe('MyEdit')
  })

  it('offers no reload once the dossier is gone', async () => {
    const repo = await seededRepo()
    renderTab(repo)
    await waitFor(() =>
      expect(screen.getByTestId('A-ready')).toHaveTextContent('true')
    )

    await repo.delete('x')
    const banner = await provokeConflict()

    expect(banner).toHaveTextContent(i18n.t('workspace:conflict.deletedTitle'))
    // Reloading a deleted record is not an option we should offer.
    expect(
      screen.queryByRole('button', {
        name: i18n.t('workspace:conflict.reload'),
      })
    ).toBeNull()
    expect(
      screen.getByRole('button', {
        name: i18n.t('workspace:conflict.saveAsNew'),
      })
    ).toBeInTheDocument()
  })
})
