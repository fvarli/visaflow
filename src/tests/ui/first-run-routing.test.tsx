import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import i18n, { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { DossierProvider, useDossier } from '@/app/providers/DossierProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FirstRunRedirect } from '@/app/router/routes'
import { NoDossierState } from '@/components/NoDossierState'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the routing test')
}
const SEED: Dossier = imported.data

/** Loads any dossier before the router evaluates the index redirect. */
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

function renderRoot(data: Dossier | null) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <SeedGate data={data}>
              <MemoryRouter initialEntries={['/']}>
                <Routes>
                  <Route index element={<FirstRunRedirect />} />
                  <Route path="welcome" element={<div>WELCOME_STUB</div>} />
                  <Route path="dashboard" element={<div>DASHBOARD_STUB</div>} />
                </Routes>
              </MemoryRouter>
            </SeedGate>
          </TooltipProvider>
        </DossierProvider>
      </ThemeProvider>
    </LocaleProvider>
  )
}

beforeEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

describe('First-run routing — index redirect', () => {
  it('sends a brand-new visitor with no dossier to /welcome', async () => {
    renderRoot(null)
    expect(await screen.findByText('WELCOME_STUB')).toBeInTheDocument()
  })

  it('sends a returning visitor with a dossier to /dashboard', async () => {
    renderRoot(SEED)
    expect(await screen.findByText('DASHBOARD_STUB')).toBeInTheDocument()
  })
})

describe('First-run routing — shared empty state', () => {
  it('routes the empty workspace into the first-run journey', () => {
    render(
      <MemoryRouter>
        <NoDossierState section="Belgeler" />
      </MemoryRouter>
    )
    const start = screen.getByRole('link', {
      name: i18n.t('common:noDossier.startAction'),
    })
    expect(start).toHaveAttribute('href', '/welcome')

    const importLink = screen.getByRole('link', {
      name: i18n.t('common:noDossier.importAction'),
    })
    expect(importLink).toHaveAttribute('href', '/welcome?step=create')
  })
})
