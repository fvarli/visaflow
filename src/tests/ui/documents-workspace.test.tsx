import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import i18n, {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { DossierProvider, useDossier } from '@/app/providers/DossierProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import DocumentsPage from '@/pages/DocumentsPage'
import { importDossier } from '@/features/import-export/services/import.service'
import { documentLabel } from '@/lib/document-label'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the documents test')
}
const SEED: Dossier = imported.data

/** A seed where insurance ends before the trip — fires a cross-entity finding. */
const GAP_SEED: Dossier = {
  ...SEED,
  application: SEED.application
    ? {
        ...SEED.application,
        trip: SEED.application.trip
          ? {
              ...SEED.application.trip,
              insurance: SEED.application.trip.insurance
                ? {
                    ...SEED.application.trip.insurance,
                    coverageEndDate: '2025-04-05',
                  }
                : undefined,
            }
          : undefined,
      }
    : SEED.application,
}

function Seed({
  data,
  children,
}: {
  data: Dossier
  children: React.ReactNode
}) {
  const { loadDossier } = useDossier()
  useEffect(() => {
    loadDossier(data)
  }, [data, loadDossier])
  return <>{children}</>
}

function renderDocuments(seed: Dossier) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={['/documents']}>
              <Seed data={seed}>
                <DocumentsPage />
              </Seed>
            </MemoryRouter>
          </TooltipProvider>
        </DossierProvider>
      </ThemeProvider>
    </LocaleProvider>
  )
}

const labelFor = (code: string) => documentLabel(i18n.t, code)

beforeEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

describe('Documents workspace — shell', () => {
  it.each([...SUPPORTED_LOCALES])(
    'renders the workspace in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderDocuments(SEED)

      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: i18n.t('documents:title'),
        })
      ).toBeInTheDocument()
      // Category groups are h2 headings.
      expect(
        screen.getAllByRole('heading', { level: 2 }).length
      ).toBeGreaterThan(0)
      // The view switch is a radiogroup.
      expect(
        screen.getByRole('radiogroup', { name: i18n.t('documents:view.label') })
      ).toBeInTheDocument()
    }
  )
})

describe('Documents workspace — interaction', () => {
  it('filters by search and preserves it across a view switch', async () => {
    const user = userEvent.setup()
    renderDocuments(SEED)

    const passport = labelFor('PASSPORT_CURRENT')
    const employment = labelFor('EMPLOYMENT_LETTER')
    expect(screen.getByRole('button', { name: passport })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: employment })).toBeInTheDocument()

    const search = screen.getByLabelText(
      i18n.t('documents:filters.searchLabel')
    )
    await user.type(search, 'passport')

    expect(screen.getByRole('button', { name: passport })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: employment })
    ).not.toBeInTheDocument()

    // Switch to the list view — the search filter must persist.
    await user.click(
      screen.getByRole('radio', { name: i18n.t('documents:view.list') })
    )
    expect(
      screen.getByRole('button', { name: new RegExp(passport) })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: new RegExp(employment) })
    ).not.toBeInTheDocument()
  })

  it('opens a document in the side panel with a related finding and deep-link', async () => {
    const user = userEvent.setup()
    renderDocuments(GAP_SEED)

    await user.click(
      screen.getByRole('button', { name: labelFor('TRAVEL_INSURANCE') })
    )

    // Opening a document uses a side panel (dialog overlay), not navigation.
    const panel = await screen.findByRole('dialog')
    expect(
      within(panel).getByText(labelFor('TRAVEL_INSURANCE'))
    ).toBeInTheDocument()
    // The cross-entity insurance finding surfaces with a "Go to Trip" link.
    const goTo = i18n.t('documents:panel.goTo', {
      section: i18n.t('documents:panel.section.trip'),
    })
    expect(
      within(panel).getByRole('link', { name: new RegExp(goTo) })
    ).toBeInTheDocument()
  })
})
