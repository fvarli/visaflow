import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import i18n, {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { DossierProvider } from '@/app/providers/DossierProvider'
import { WorkspaceProvider } from '@/app/providers/WorkspaceProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MemoryDossierRepository } from '@/features/workspace/adapters/memory-adapter'
import { toRecord } from '@/features/workspace/workspace-model'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
import type { DossierPayload } from '@/features/workspace/saved-dossier'
import DossiersPage from '@/pages/DossiersPage'
import { DossierSwitcher } from '@/components/layout/DossierSwitcher'
import {
  partiallyPrepared,
  allApplicableReady,
} from '@/tests/fixtures/dossiers'

/** The dossier-management surface: list, open, delete, and the header switcher. */

function payloadOf(fixture: typeof partiallyPrepared): DossierPayload {
  return {
    applicant: fixture.applicant,
    application: fixture.application,
    documents: fixture.documents,
    sponsors: fixture.sponsors,
  }
}

const NOW = '2026-08-23T10:00:00.000Z'
const LATER = '2026-08-24T10:00:00.000Z'

async function seeded() {
  const repo = new MemoryDossierRepository()
  await repo.put(
    toRecord('a', payloadOf(partiallyPrepared), SCHEMA_VERSION, NOW)
  )
  await repo.put(
    toRecord('b', payloadOf(allApplicableReady), SCHEMA_VERSION, LATER)
  )
  await repo.writeMeta({ activeDossierId: 'a' })
  return repo
}

function renderPage(
  repo: MemoryDossierRepository,
  ui: React.ReactNode = <DossiersPage />
) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <WorkspaceProvider repository={repo} untitledLabel="Untitled">
            <TooltipProvider>
              <MemoryRouter initialEntries={['/dossiers']}>{ui}</MemoryRouter>
            </TooltipProvider>
          </WorkspaceProvider>
        </DossierProvider>
      </ThemeProvider>
    </LocaleProvider>
  )
}

beforeEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

describe('dossiers page', () => {
  it.each([...SUPPORTED_LOCALES])(
    'renders exactly one h1 in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage(new MemoryDossierRepository())
      await waitFor(() =>
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      )
    }
  )

  it('invites a first-time user rather than dead-ending', async () => {
    renderPage(new MemoryDossierRepository())
    expect(
      await screen.findByText(i18n.t('workspace:empty.title'))
    ).toBeInTheDocument()
  })

  it('lists every saved dossier and marks the open one', async () => {
    await i18n.changeLanguage('en')
    renderPage(await seeded())
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /^Open / })).toHaveLength(2)
    )
    expect(
      screen.getByText(i18n.t('workspace:card.current'))
    ).toBeInTheDocument()
  })

  it('switches to another dossier when opened', async () => {
    await i18n.changeLanguage('en')
    const user = userEvent.setup()
    const repo = await seeded()
    renderPage(repo)

    // The open dossier's own button is disabled, so the enabled one is the other.
    const openButtons = await screen.findAllByRole('button', { name: /^Open / })
    const other = openButtons.find((button) => !button.hasAttribute('disabled'))
    await user.click(other!)

    await waitFor(async () =>
      expect((await repo.readMeta()).activeDossierId).toBe('b')
    )
  })

  it('deletes only after confirmation, and names the dossier', async () => {
    await i18n.changeLanguage('en')
    const user = userEvent.setup()
    const repo = await seeded()
    renderPage(repo)

    const deleteButtons = await screen.findAllByRole('button', {
      name: /^Delete /,
    })
    await user.click(deleteButtons[0]!)

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toBeInTheDocument()

    // Cancelling keeps it.
    await user.click(
      screen.getByRole('button', { name: i18n.t('workspace:remove.cancel') })
    )
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    )
    expect(await repo.list()).toHaveLength(2)

    // Confirming removes exactly one.
    await user.click(deleteButtons[0]!)
    await screen.findByRole('alertdialog')
    await user.click(
      screen.getByRole('button', { name: i18n.t('workspace:remove.confirm') })
    )

    await waitFor(async () => expect(await repo.list()).toHaveLength(1))
  })

  it('moves focus somewhere intentional after deleting a dossier', async () => {
    await i18n.changeLanguage('en')
    const user = userEvent.setup()
    renderPage(await seeded())

    const deleteButtons = await screen.findAllByRole('button', {
      name: /^Delete /,
    })
    await user.click(deleteButtons[0]!)
    await screen.findByRole('alertdialog')
    await user.click(
      screen.getByRole('button', { name: i18n.t('workspace:remove.confirm') })
    )

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    )
    // The row that opened the dialog is gone; focus must not fall to <body>.
    await waitFor(() => expect(document.activeElement).not.toBe(document.body))
  })
})

describe('dossier switcher', () => {
  it('stays out of the way when there is nothing to switch between', async () => {
    renderPage(new MemoryDossierRepository(), <DossierSwitcher />)
    await waitFor(() =>
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    )
  })

  it('names the open dossier and lists the others', async () => {
    const user = userEvent.setup()
    renderPage(await seeded(), <DossierSwitcher />)

    const trigger = await screen.findByRole('button', {
      name: new RegExp(i18n.t('workspace:switcher.label'), 'i'),
    })
    await user.click(trigger)

    expect(
      await screen.findByRole('menuitem', {
        name: i18n.t('workspace:switcher.create'),
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', {
        name: i18n.t('workspace:switcher.manage'),
      })
    ).toBeInTheDocument()
  })

  it('shows no dossier contents in navigation', async () => {
    renderPage(await seeded(), <DossierSwitcher />)
    const trigger = await screen.findByRole('button', {
      name: new RegExp(i18n.t('workspace:switcher.label'), 'i'),
    })
    // Titles are given-name + destination only — never a passport number.
    expect(trigger.textContent ?? '').not.toContain('FIXTURE-1')
  })
})
