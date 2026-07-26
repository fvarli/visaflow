import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n, { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { DossierProvider, useDossier } from '@/app/providers/DossierProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import DocumentsPage from '@/pages/DocumentsPage'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the deep-link test')
}
const SEED: Dossier = imported.data
const employmentDoc = SEED.documents.find((d) => d.category === 'employment')!

function Seed({ children }: { children: React.ReactNode }) {
  const { loadDossier } = useDossier()
  useEffect(() => {
    loadDossier(SEED)
  }, [loadDossier])
  return <>{children}</>
}

function renderDocs(entry: string) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[entry]}>
              <Seed>
                <DocumentsPage />
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

describe('Documents deep-link (additive query params)', () => {
  it('initializes the category filter from ?category=', async () => {
    renderDocs('/documents?category=employment')

    // Only the employment group is shown; other categories are filtered out.
    expect(
      await screen.findByRole('heading', {
        name: new RegExp(
          i18n.t('visa-domain:documentCategory.employment'),
          'i'
        ),
      })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: new RegExp(i18n.t('visa-domain:documentCategory.passport'), 'i'),
      })
    ).toBeNull()
  })

  it('opens the detail panel from ?doc=<id>', async () => {
    renderDocs(`/documents?doc=${employmentDoc.id}`)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('does not crash on an unknown ?doc= and shows the workspace', async () => {
    renderDocs('/documents?doc=does-not-exist')
    // The page renders (its h1 is present) and no panel opens.
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: i18n.t('documents:title'),
      })
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('behaves exactly as before with no params', async () => {
    renderDocs('/documents')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: i18n.t('documents:title'),
      })
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
    // A non-employment category is still present (no filter applied).
    expect(
      screen.getAllByRole('heading', {
        name: new RegExp(i18n.t('visa-domain:documentCategory.passport'), 'i'),
      }).length
    ).toBeGreaterThan(0)
  })
})
