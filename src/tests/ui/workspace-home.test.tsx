import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import i18n, { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { DossierProvider, useDossier } from '@/app/providers/DossierProvider'
import {
  WorkspaceProvider,
  useWorkspace,
} from '@/app/providers/WorkspaceProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FirstRunRedirect } from '@/app/router/routes'
import DashboardPage from '@/pages/DashboardPage'
import { useDocumentTitle } from '@/components/layout/use-document-title'
import { MemoryDossierRepository } from '@/features/workspace/adapters/memory-adapter'
import { toRecord } from '@/features/workspace/workspace-model'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
import type { DossierPayload } from '@/features/workspace/saved-dossier'
import { navGroups, secondaryNavItems } from '@/config/navigation'
import {
  partiallyPrepared,
  allApplicableReady,
} from '@/tests/fixtures/dossiers'

/**
 * Where a returning user lands, and how they get back to their work.
 *
 * The bug behind all of this: the index route decided from `hasData` — whether
 * a dossier was in the editor *right now* — on the very first commit, before
 * IndexedDB had answered. Someone with three saved dossiers was therefore sent
 * into onboarding every single time, and closing a dossier stranded them there
 * (ADR-040).
 */

import type { Dossier } from '@/domain/schemas/dossier.schema'

const SEEDED_AT = '2026-08-01T10:00:00.000Z'

/** A dossier open in the editor with nothing behind it — the session-only shape. */
const SEED: Partial<Dossier> = {
  schemaVersion: SCHEMA_VERSION,
  applicant: partiallyPrepared.applicant ?? undefined,
  application: partiallyPrepared.application ?? undefined,
  documents: partiallyPrepared.documents,
  sponsors: partiallyPrepared.sponsors,
}

function payloadOf(fixture: typeof partiallyPrepared): DossierPayload {
  return {
    applicant: fixture.applicant,
    application: fixture.application,
    documents: fixture.documents,
    sponsors: fixture.sponsors,
  }
}

/**
 * `MemoryDossierRepository.failNext` only fails writes, so a genuine read
 * failure has to be built explicitly — otherwise "storage cannot be read"
 * quietly becomes "the repository was empty".
 */
class UnreadableRepository extends MemoryDossierRepository {
  override readMeta(): Promise<never> {
    return Promise.reject(new Error('storage refused the read'))
  }
  override list(): Promise<never> {
    return Promise.reject(new Error('storage refused the read'))
  }
}

function renderIndex(repo?: MemoryDossierRepository, seed?: Partial<Dossier>) {
  return render(
    <LocaleProvider>
      <DossierProvider>
        <WorkspaceProvider repository={repo} untitledLabel="Untitled">
          <TooltipProvider>
            <Seed data={seed}>
              <MemoryRouter initialEntries={['/']}>
                <Routes>
                  <Route index element={<FirstRunRedirect />} />
                  <Route path="welcome" element={<div>WELCOME</div>} />
                  <Route path="dashboard" element={<div>DASHBOARD</div>} />
                  <Route path="dossiers" element={<div>DOSSIERS</div>} />
                </Routes>
              </MemoryRouter>
            </Seed>
          </TooltipProvider>
        </WorkspaceProvider>
      </DossierProvider>
    </LocaleProvider>
  )
}

/** Puts a dossier in the editor without any storage behind it. */
function Seed({
  data,
  children,
}: {
  data?: Partial<Dossier>
  children: React.ReactNode
}) {
  const { loadDossier } = useDossier()
  useEffect(() => {
    if (data) loadDossier(data)
  }, [data, loadDossier])
  return <>{children}</>
}

const landed = async (where: 'WELCOME' | 'DASHBOARD' | 'DOSSIERS') =>
  await screen.findByText(where)

beforeEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

describe('where a visitor lands', () => {
  it('welcomes someone with nothing saved', async () => {
    const repo = new MemoryDossierRepository()
    renderIndex(repo)
    expect(await landed('WELCOME')).toBeInTheDocument()
  })

  it('opens the dashboard when a dossier was restored', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, SEEDED_AT)
    )
    await repo.writeMeta({ activeDossierId: 'a' })
    renderIndex(repo)
    expect(await landed('DASHBOARD')).toBeInTheDocument()
  })

  it('opens the dashboard whichever of several dossiers was last open', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, SEEDED_AT)
    )
    await repo.put(
      toRecord('b', payloadOf(allApplicableReady), SCHEMA_VERSION, SEEDED_AT)
    )
    await repo.writeMeta({ activeDossierId: 'b' })
    renderIndex(repo)
    expect(await landed('DASHBOARD')).toBeInTheDocument()
  })

  it('shows the dossiers to someone who has saved work but nothing open', async () => {
    // This is what "Close the open dossier" leaves behind: records intact, no
    // last-opened pointer. It used to dump the user into onboarding.
    const repo = new MemoryDossierRepository()
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, SEEDED_AT)
    )
    await repo.put(
      toRecord('b', payloadOf(allApplicableReady), SCHEMA_VERSION, SEEDED_AT)
    )
    await repo.writeMeta({ activeDossierId: null })
    renderIndex(repo)

    expect(await landed('DOSSIERS')).toBeInTheDocument()
    // …and emphatically not into the first-run flow.
    expect(screen.queryByText('WELCOME')).toBeNull()
  })

  it('does not open a dossier just because one exists', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, SEEDED_AT)
    )
    await repo.writeMeta({ activeDossierId: null })
    renderIndex(repo)
    await landed('DOSSIERS')

    // Having saved work is not consent to reopen an arbitrary dossier, and a
    // deliberate close has to survive the reload that follows it.
    expect((await repo.readMeta()).activeDossierId).toBeNull()
  })

  it('shows no flash of onboarding while storage is still answering', async () => {
    const repo = new MemoryDossierRepository()
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, SEEDED_AT)
    )
    await repo.writeMeta({ activeDossierId: 'a' })
    renderIndex(repo)

    // The very first commit must decide nothing at all.
    expect(screen.queryByText('WELCOME')).toBeNull()
    expect(screen.queryByText('DASHBOARD')).toBeNull()
    expect(screen.getByRole('status')).toBeInTheDocument()

    expect(await landed('DASHBOARD')).toBeInTheDocument()
  })

  it('creates nothing when storage cannot be read', async () => {
    const repo = new UnreadableRepository()
    renderIndex(repo)

    // Degrade honestly: an unreadable workspace is not a reason to invent one,
    // and the app must still become usable rather than hanging on the loader.
    expect(await landed('WELCOME')).toBeInTheDocument()
    expect(await new MemoryDossierRepository().list()).toHaveLength(0)
  })

  it('treats an open session-only dossier as somewhere to be', async () => {
    // No repository, so nothing is saved — but work is open in this tab, and
    // that is a dossier the user is inside.
    renderIndex(undefined, SEED)
    expect(await landed('DASHBOARD')).toBeInTheDocument()
  })
})

describe('the workspace is reachable from the navigation', () => {
  const flat = navGroups.flatMap((group) => group.items)

  it('lists the dossiers workspace before the active dossier', () => {
    const dossiers = flat.findIndex((item) => item.to === '/dossiers')
    const dashboard = flat.findIndex((item) => item.to === '/dashboard')
    expect(dossiers).toBeGreaterThanOrEqual(0)
    expect(dossiers).toBeLessThan(dashboard)
  })

  it('marks it as workspace-level, unlike the dossier surfaces', () => {
    const item = flat.find((entry) => entry.to === '/dossiers')
    expect(item?.scope).toBe('workspace')
    expect(
      flat.find((entry) => entry.to === '/dashboard')?.scope
    ).toBeUndefined()
    expect(
      flat.find((entry) => entry.to === '/documents')?.scope
    ).toBeUndefined()
  })

  it('does not file it under the group that means "inside one dossier"', () => {
    // `navigation:groups.dossier` holds Documents and Timeline — the contents
    // of a dossier. Putting the collection there would overload the word.
    const dossierGroup = navGroups.find(
      (group) => group.labelKey === 'navigation:groups.dossier'
    )
    expect(dossierGroup?.items.some((item) => item.to === '/dossiers')).toBe(
      false
    )
  })

  it('is a primary destination, not tucked in beside Settings', () => {
    expect(secondaryNavItems.some((item) => item.to === '/dossiers')).toBe(
      false
    )
  })

  it('is named in both languages', async () => {
    for (const locale of ['en', 'tr'] as const) {
      await i18n.changeLanguage(locale)
      const label = i18n.t('navigation:items.dossiers')
      expect(label).not.toBe('')
      expect(label).not.toContain('navigation:')
    }
  })
})

/**
 * The dashboard is the open dossier's command center, so it has to say which
 * dossier that is. Its heading used to be a greeting — identical for every
 * dossier belonging to the same applicant, and no help at all on a phone, where
 * the header switcher's label is hidden (ADR-040).
 */
describe('the dashboard names the dossier it is about', () => {
  let workspace: ReturnType<typeof useWorkspace> | null = null

  function Probe() {
    const value = useWorkspace()
    useEffect(() => {
      workspace = value
    })
    return null
  }

  async function renderDashboard() {
    const repo = new MemoryDossierRepository()
    await repo.put(
      toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, SEEDED_AT)
    )
    await repo.put(
      toRecord('b', payloadOf(allApplicableReady), SCHEMA_VERSION, SEEDED_AT)
    )
    await repo.writeMeta({ activeDossierId: 'a' })

    render(
      <LocaleProvider>
        <DossierProvider>
          <WorkspaceProvider repository={repo} untitledLabel="Untitled">
            <TooltipProvider>
              <MemoryRouter initialEntries={['/dashboard']}>
                <Probe />
                <DashboardPage />
              </MemoryRouter>
            </TooltipProvider>
          </WorkspaceProvider>
        </DossierProvider>
      </LocaleProvider>
    )
    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    )
    return repo
  }

  const heading = () =>
    screen.getByRole('heading', { level: 1 }).textContent?.trim()

  const ws = () => {
    if (!workspace) throw new Error('workspace probe not mounted')
    return workspace
  }

  beforeEach(() => {
    workspace = null
  })

  it('uses the dossier title as the page heading, exactly once', async () => {
    await renderDashboard()
    await waitFor(() => expect(heading()).toBe(ws().activeTitle))
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('follows a rename straight away', async () => {
    await renderDashboard()
    await act(async () => {
      await ws().renameDossier('a', 'Greece · September')
    })
    await waitFor(() => expect(heading()).toBe('Greece · September'))
  })

  it('changes when the open dossier changes, with nothing left over', async () => {
    await renderDashboard()
    await act(async () => {
      await ws().renameDossier('a', 'First dossier')
    })
    await act(async () => {
      await ws().renameDossier('b', 'Second dossier')
    })
    await waitFor(() => expect(heading()).toBe('First dossier'))

    await act(async () => {
      await ws().openDossier('b')
    })
    await waitFor(() => expect(heading()).toBe('Second dossier'))
    expect(screen.queryByText('First dossier')).toBeNull()
  })
})

describe('the browser tab says where you are', () => {
  function TitleHarness({
    repo,
    path,
  }: {
    repo: MemoryDossierRepository
    path: string
  }) {
    return (
      <LocaleProvider>
        <DossierProvider>
          <WorkspaceProvider repository={repo} untitledLabel="Untitled">
            <MemoryRouter initialEntries={[path]}>
              <TitleProbe />
            </MemoryRouter>
          </WorkspaceProvider>
        </DossierProvider>
      </LocaleProvider>
    )
  }

  function TitleProbe() {
    useDocumentTitle()
    return null
  }

  async function seeded() {
    const repo = new MemoryDossierRepository()
    const record = toRecord(
      'a',
      payloadOf(partiallyPrepared),
      SCHEMA_VERSION,
      SEEDED_AT
    )
    await repo.put({ ...record, title: 'Greece · September' })
    await repo.writeMeta({ activeDossierId: 'a' })
    return repo
  }

  it('names the dossier on its dashboard', async () => {
    render(<TitleHarness repo={await seeded()} path="/dashboard" />)
    // Two tabs on two dossiers must be tellable apart in the tab strip.
    await waitFor(() =>
      expect(document.title).toBe('Greece · September — VisaFlow')
    )
  })

  it('names the route and the dossier on a dossier-scoped page', async () => {
    render(<TitleHarness repo={await seeded()} path="/documents" />)
    await waitFor(() =>
      expect(document.title).toBe(
        `${i18n.t('navigation:items.documents')} · Greece · September — VisaFlow`
      )
    )
  })

  it('leaves the dossier out of a workspace-level page', async () => {
    render(<TitleHarness repo={await seeded()} path="/dossiers" />)
    // `/dossiers` is about all of them, so naming one would be wrong.
    await waitFor(() =>
      expect(document.title).toBe(
        `${i18n.t('navigation:items.dossiers')} — VisaFlow`
      )
    )
    expect(document.title).not.toContain('Greece · September')
  })

  it('is translated, not hard-coded English', async () => {
    // The default locale is Turkish; a tab title that silently stayed English
    // would be a regression nobody notices until they look at the tab strip.
    await i18n.changeLanguage('tr')
    render(<TitleHarness repo={await seeded()} path="/documents" />)
    await waitFor(() =>
      expect(document.title).toBe('Belgeler · Greece · September — VisaFlow')
    )

    // Wrapped: this re-renders every mounted provider, and an unwrapped
    // language switch is exactly the act warning the CI guard exists to catch.
    await act(async () => {
      await i18n.changeLanguage('en')
    })
    await waitFor(() =>
      expect(document.title).toBe('Documents · Greece · September — VisaFlow')
    )
  })
})
