import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n, {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from '@/i18n'
import { greeceConfig, greeceTourismTemplate } from '@/config/countries/greece'
import { computeVerificationCoverage } from '@/config/countries/verification-coverage'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { DossierProvider, useDossier } from '@/app/providers/DossierProvider'
import { WorkspaceProvider } from '@/app/providers/WorkspaceProvider'
import { MemoryDossierRepository } from '@/features/workspace/adapters/memory-adapter'
import { TooltipProvider } from '@/components/ui/tooltip'
import SettingsPage from '@/pages/SettingsPage'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the settings test')
}
const SEED: Dossier = imported.data

function Seed({
  data,
  children,
}: {
  data: Dossier | null
  children: React.ReactNode
}) {
  const { loadDossier } = useDossier()
  useEffect(() => {
    if (data) loadDossier(data)
  }, [data, loadDossier])
  return <>{children}</>
}

function Probe() {
  const { state } = useDossier()
  return (
    <span data-testid="has-applicant">{state.applicant ? 'yes' : 'no'}</span>
  )
}

function renderPage(entry = '/settings', data: Dossier | null = SEED) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          {/* A working store, because jsdom has no IndexedDB and the provider
              would otherwise report storage as unavailable — which now makes
              closing a dossier a guarded decision rather than a plain one
              (ADR-041). That guard has its own tests; this file is about the
              settings page. */}
          <WorkspaceProvider repository={new MemoryDossierRepository()}>
            <TooltipProvider>
              <MemoryRouter initialEntries={[entry]}>
                <Seed data={data}>
                  <SettingsPage />
                  <Probe />
                </Seed>
              </MemoryRouter>
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

describe('Settings — shell', () => {
  it.each([...SUPPORTED_LOCALES])(
    'renders one h1 and the section rail in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage()
      const h1 = await screen.findByRole('heading', {
        level: 1,
        name: i18n.t('settings:title'),
      })
      expect(h1).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(
        screen.getByRole('button', { name: i18n.t('settings:nav.appearance') })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: i18n.t('settings:nav.privacy') })
      ).toBeInTheDocument()
    }
  )

  it('works without a dossier', async () => {
    renderPage('/settings', null)
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('settings:appearance.title'),
      })
    ).toBeInTheDocument()
  })
})

describe('Settings — section routing', () => {
  it('opens the requested section from ?section=', async () => {
    renderPage('/settings?section=privacy')
    expect(
      await screen.findByText(i18n.t('settings:privacy.storedTitle'))
    ).toBeInTheDocument()
  })

  it('falls back to appearance for an invalid ?section=', async () => {
    renderPage('/settings?section=zzz')
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('settings:appearance.title'),
      })
    ).toBeInTheDocument()
  })

  it('switches sections via the rail', async () => {
    renderPage()
    fireEvent.click(
      await screen.findByRole('button', {
        name: i18n.t('settings:nav.countryPacks'),
      })
    )
    expect(
      await screen.findByText(i18n.t('settings:countryPacks.notEndorsed'))
    ).toBeInTheDocument()
  })
})

describe('Settings — country packs & data', () => {
  it('lists a pack with its honest review status', async () => {
    // Whatever the pack declares, the page must show that and not a literal
    // this test happens to remember. Greece moved from `unverified` to
    // `partially_verified` the day it gained real evidence (ADR-047).
    renderPage('/settings?section=countryPacks')
    // Deliberately findAll: once the pack carries evidence the status appears
    // both in the supported-types list and on the source note, and asserting
    // uniqueness would be pinning layout rather than behaviour.
    const badges = await screen.findAllByText(
      i18n.t(
        `common:sources.reviewStatus.${greeceTourismTemplate.reviewStatus}`
      )
    )
    expect(badges.length).toBeGreaterThan(0)
  })

  it('states how much of the active pack is actually evidenced', async () => {
    // "Partially verified" on its own reads far stronger than the evidence
    // behind it; the count is what makes the status mean something (ADR-047).
    const coverage = computeVerificationCoverage(
      greeceConfig,
      greeceTourismTemplate
    )
    renderPage('/settings?section=countryPacks')
    expect(
      await screen.findByText(
        i18n.t('common:sources.coverage', {
          verified: coverage.verified,
          total: coverage.total,
        })
      )
    ).toBeInTheDocument()
  })

  it('shows the import/export actions', async () => {
    renderPage('/settings?section=importExport')
    expect(
      await screen.findByRole('button', {
        name: i18n.t('settings:importExport.exportAction'),
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: i18n.t('settings:importExport.exampleAction'),
      })
    ).toBeInTheDocument()
  })

  it('resets the dossier through the isolated confirmation', async () => {
    renderPage('/settings?section=data')
    expect(screen.getByTestId('has-applicant')).toHaveTextContent('yes')
    fireEvent.click(
      await screen.findByRole('button', {
        name: i18n.t('settings:reset.action'),
      })
    )
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: i18n.t('settings:reset.confirm'),
      })
    )
    // Closing is asynchronous on purpose: the dialog stays up until the close
    // has actually committed, so focus is not restored to a trigger that is
    // about to be unmounted (ADR-035).
    await waitFor(() =>
      expect(screen.getByTestId('has-applicant')).toHaveTextContent('no')
    )
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    )
  })
})
