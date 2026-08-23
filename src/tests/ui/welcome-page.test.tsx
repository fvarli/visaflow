import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import i18n, {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { DossierProvider, useDossier } from '@/app/providers/DossierProvider'
import { WorkspaceProvider } from '@/app/providers/WorkspaceProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import WelcomePage from '@/pages/WelcomePage'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the welcome test')
}
const SEED: Dossier = imported.data

/**
 * Loads the dossier (if any) before mounting the router, so the page evaluates
 * its mount-time "already have a dossier" guard against the intended state.
 */
function SeedGate({
  data,
  children,
}: {
  data: Dossier | null
  children: React.ReactNode
}) {
  const { loadDossier, hasData } = useDossier()
  useEffect(() => {
    if (data) loadDossier(data)
  }, [data, loadDossier])
  if (data && !hasData) return null
  return <>{children}</>
}

function Probe() {
  const { state } = useDossier()
  return (
    <span data-testid="has-applicant">{state.applicant ? 'yes' : 'no'}</span>
  )
}

function renderWelcome(entry = '/welcome', data: Dossier | null = null) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <WorkspaceProvider>
            <TooltipProvider>
              <SeedGate data={data}>
                <MemoryRouter initialEntries={[entry]}>
                  <Routes>
                    <Route
                      path="/welcome"
                      element={
                        <>
                          <WelcomePage />
                          <Probe />
                        </>
                      }
                    />
                    <Route
                      path="/dashboard"
                      element={<div>DASHBOARD_STUB</div>}
                    />
                  </Routes>
                </MemoryRouter>
              </SeedGate>
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

describe('Welcome — shell', () => {
  it.each([...SUPPORTED_LOCALES])(
    'renders one h1 and the step rail in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderWelcome()
      const h1 = await screen.findByRole('heading', {
        level: 1,
        name: i18n.t('onboarding:title'),
      })
      expect(h1).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(
        screen.getByRole('navigation', { name: i18n.t('onboarding:nav.rail') })
      ).toBeInTheDocument()
      // Opens on the welcome step.
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: i18n.t('onboarding:welcome.heading'),
        })
      ).toBeInTheDocument()
    }
  )
})

describe('Welcome — step routing', () => {
  it('opens the requested step from ?step=', async () => {
    renderWelcome('/welcome?step=create')
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('onboarding:create.heading'),
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: i18n.t('onboarding:create.createAction'),
      })
    ).toBeInTheDocument()
  })

  it('falls back to welcome for an invalid ?step=', async () => {
    renderWelcome('/welcome?step=zzz')
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('onboarding:welcome.heading'),
      })
    ).toBeInTheDocument()
  })

  it('advances forward with Get started and back with Back', async () => {
    renderWelcome()
    fireEvent.click(
      await screen.findByRole('button', {
        name: i18n.t('onboarding:welcome.getStarted'),
      })
    )
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('onboarding:setup.heading'),
      })
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('onboarding:actions.back') })
    )
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('onboarding:welcome.heading'),
      })
    ).toBeInTheDocument()
  })
})

describe('Welcome — explore-first escape', () => {
  it('lets the user skip into the app without a dossier', async () => {
    renderWelcome()
    fireEvent.click(
      await screen.findByRole('link', {
        name: i18n.t('onboarding:welcome.exploreFirst'),
      })
    )
    expect(await screen.findByText('DASHBOARD_STUB')).toBeInTheDocument()
  })
})

describe('Welcome — create a dossier', () => {
  it('creates an in-memory dossier and lands on Ready', async () => {
    renderWelcome('/welcome?step=create')
    expect(screen.getByTestId('has-applicant')).toHaveTextContent('no')
    fireEvent.click(
      await screen.findByRole('button', {
        name: i18n.t('onboarding:create.createAction'),
      })
    )
    // Creating now claims a workspace slot before seeding the reducer, so the
    // dossier appears asynchronously rather than within the click.
    await waitFor(() =>
      expect(screen.getByTestId('has-applicant')).toHaveTextContent('yes')
    )
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('onboarding:ready.heading'),
      })
    ).toBeInTheDocument()
  })

  it('offers an import path on the create step', async () => {
    renderWelcome('/welcome?step=create')
    expect(
      await screen.findByRole('button', {
        name: i18n.t('onboarding:create.importAction'),
      })
    ).toBeInTheDocument()
  })

  it('writes no new localStorage keys while setting up', async () => {
    // Still exactly two localStorage keys, both non-personal interface
    // preferences. Dossiers are persisted too as of v1.1 — but in IndexedDB,
    // through the repository port, never here (ADR-036). This test guards that
    // boundary: personal data must never appear in localStorage.
    renderWelcome('/welcome?step=create')
    fireEvent.click(
      await screen.findByRole('button', {
        name: i18n.t('onboarding:create.createAction'),
      })
    )
    await waitFor(() =>
      expect(screen.getByTestId('has-applicant')).toHaveTextContent('yes')
    )
    const allowed = ['visaflow-theme', 'visaflow-locale']
    for (const key of Object.keys(window.localStorage)) {
      expect(allowed).toContain(key)
    }
  })
})

describe('Welcome — returning with a dossier', () => {
  it('offers a calm continue instead of restarting onboarding', async () => {
    renderWelcome('/welcome', SEED)
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('onboarding:existing.heading'),
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: i18n.t('onboarding:existing.continue') })
    ).toBeInTheDocument()
    // The guided rail is not shown once a dossier already exists.
    expect(
      screen.queryByRole('navigation', { name: i18n.t('onboarding:nav.rail') })
    ).not.toBeInTheDocument()
  })
})
