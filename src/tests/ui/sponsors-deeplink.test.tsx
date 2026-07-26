import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n, { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { DossierProvider, useDossier } from '@/app/providers/DossierProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import SponsorsPage from '@/pages/SponsorsPage'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the sponsors test')
}

const SPONSOR: Sponsor = {
  id: 'sp-1',
  relationship: 'parent',
  firstName: 'Deniz',
  lastName: 'Kaya',
  currency: 'EUR',
  monthlyIncome: 5000,
  investments: [],
  ownedAssets: [],
  coveredExpenses: [],
  sponsorshipLetter: false,
  proofOfRelationship: false,
  documentIds: [],
}

const SEED: Dossier = { ...imported.data, sponsors: [SPONSOR] }

function Seed({ children }: { children: React.ReactNode }) {
  const { loadDossier } = useDossier()
  useEffect(() => {
    loadDossier(SEED)
  }, [loadDossier])
  return <>{children}</>
}

function renderSponsors(entry: string) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[entry]}>
              <Seed>
                <SponsorsPage />
              </Seed>
            </MemoryRouter>
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

describe('Sponsors deep-link (additive ?sponsor=)', () => {
  it('opens the editor pre-filled from ?sponsor=<id>', async () => {
    renderSponsors('/sponsors?sponsor=sp-1')
    // The edit dialog opens with the sponsor's name pre-filled.
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByDisplayValue('Deniz')).toBeInTheDocument()
  })

  it('does not crash on an unknown ?sponsor= and shows the page', async () => {
    renderSponsors('/sponsors?sponsor=does-not-exist')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: i18n.t('sponsors:title'),
      })
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('behaves exactly as before with no params', async () => {
    renderSponsors('/sponsors')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: i18n.t('sponsors:title'),
      })
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
