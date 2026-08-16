import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n, {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  resources,
} from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { DossierProvider, useDossier } from '@/app/providers/DossierProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

import WelcomePage from '@/pages/WelcomePage'
import DashboardPage from '@/pages/DashboardPage'
import ApplicantPage from '@/pages/ApplicantPage'
import TripPage from '@/pages/TripPage'
import EmploymentPage from '@/pages/EmploymentPage'
import FinancePage from '@/pages/FinancePage'
import SponsorsPage from '@/pages/SponsorsPage'
import DocumentsPage from '@/pages/DocumentsPage'
import ConsistencyChecksPage from '@/pages/ConsistencyChecksPage'
import TimelinePage from '@/pages/TimelinePage'
import ReviewPage from '@/pages/ReviewPage'
import SettingsPage from '@/pages/SettingsPage'
import NotesPage from '@/pages/NotesPage'

/**
 * A release-candidate smoke pass over every shipped route.
 *
 * jsdom has no layout, so this cannot check pixels — it checks the things that
 * *are* verifiable and that broke in practice: the heading contract, and that
 * no raw translation key reaches the screen. `NotesPage` had no render test at
 * all before this file, and was the one page that never adopted `PageHeader`.
 */

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the smoke test')
}
const SEED: Dossier = imported.data

const ROUTES: [string, () => React.JSX.Element, string][] = [
  ['/welcome', WelcomePage, '/welcome'],
  ['/dashboard', DashboardPage, '/dashboard'],
  ['/applicant', ApplicantPage, '/applicant'],
  ['/trip', TripPage, '/trip'],
  ['/employment', EmploymentPage, '/employment'],
  ['/finance', FinancePage, '/finance'],
  ['/sponsors', SponsorsPage, '/sponsors'],
  ['/documents', DocumentsPage, '/documents'],
  ['/consistency-checks', ConsistencyChecksPage, '/consistency-checks'],
  ['/timeline', TimelinePage, '/timeline'],
  ['/review', ReviewPage, '/review'],
  ['/review?mode=departure', ReviewPage, '/review?mode=departure'],
  ['/settings', SettingsPage, '/settings'],
  ['/notes', NotesPage, '/notes'],
]

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

function renderRoute(Page: () => React.JSX.Element, entry: string) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[entry]}>
              <Seed data={SEED}>
                <Page />
              </Seed>
            </MemoryRouter>
          </TooltipProvider>
        </DossierProvider>
      </ThemeProvider>
    </LocaleProvider>
  )
}

/** Matches a raw i18n key that escaped to the screen, e.g. `review:hero.foo`. */
const RAW_KEY = new RegExp(
  `\\b(${Object.keys(resources.en).join('|')}):[a-zA-Z][\\w.]*`
)

beforeEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

describe.each(SUPPORTED_LOCALES)('route smoke pass — "%s"', (locale) => {
  it.each(ROUTES)('%s renders exactly one h1', async (_name, Page, entry) => {
    await i18n.changeLanguage(locale)
    renderRoute(Page, entry)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it.each(ROUTES)('%s skips no heading level', async (_name, Page, entry) => {
    await i18n.changeLanguage(locale)
    renderRoute(Page, entry)
    const levels = screen
      .getAllByRole('heading')
      .map((h) => Number(h.tagName.slice(1)))
    expect(levels[0]).toBe(1)
    for (let i = 1; i < levels.length; i += 1) {
      const previous = levels[i - 1] ?? 1
      const current = levels[i] ?? 1
      expect(current).toBeLessThanOrEqual(previous + 1)
    }
  })

  it.each(ROUTES)(
    '%s leaks no raw translation key',
    async (_name, Page, entry) => {
      await i18n.changeLanguage(locale)
      renderRoute(Page, entry)
      const text = document.body.textContent ?? ''
      const match = RAW_KEY.exec(text)
      expect(match?.[0] ?? null).toBeNull()
    }
  )
})
