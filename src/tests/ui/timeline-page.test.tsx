import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
import TimelinePage from '@/pages/TimelinePage'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the timeline test')
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

function renderPage(seed: Dossier | null = SEED, entry = '/timeline') {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[entry]}>
              <Seed data={seed}>
                <TimelinePage />
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

describe('Timeline — shell', () => {
  it('shows the no-dossier invitation', () => {
    renderPage(null)
    expect(
      screen.getByText(i18n.t('common:noDossier.title'))
    ).toBeInTheDocument()
  })

  it.each([...SUPPORTED_LOCALES])(
    'renders one h1 and the three view modes in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage()
      const h1 = await screen.findByRole('heading', {
        level: 1,
        name: i18n.t('timeline:title'),
      })
      expect(h1).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(
        screen.getByRole('radio', { name: i18n.t('timeline:modes.plan') })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('radio', { name: i18n.t('timeline:modes.freshness') })
      ).toBeInTheDocument()
    }
  )
})

describe('Timeline — modes', () => {
  it('defaults to the preparation plan with an appointment-day summary', async () => {
    renderPage()
    expect(
      await screen.findByText(i18n.t('timeline:appointmentDay.title'))
    ).toBeInTheDocument()
  })

  it('opens the key-dates view from ?mode=dates', async () => {
    renderPage(SEED, '/timeline?mode=dates')
    expect(
      await screen.findByText(i18n.t('timeline:keyDates.description'))
    ).toBeInTheDocument()
  })

  it('switches to the freshness view via the mode selector', async () => {
    renderPage()
    fireEvent.click(
      await screen.findByRole('radio', {
        name: i18n.t('timeline:modes.freshness'),
      })
    )
    expect(
      await screen.findByText(i18n.t('timeline:freshness.description'))
    ).toBeInTheDocument()
  })
})

describe('Timeline — appointment day is an inventory, not a ratio', () => {
  it.each(SUPPORTED_LOCALES)(
    'renders no "X of Y" ratio in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage()

      const heading = await screen.findByRole('heading', {
        name: i18n.t('timeline:appointmentDay.title'),
      })
      const section = heading.closest('section')
      expect(section).not.toBeNull()
      const text = (section as HTMLElement).textContent ?? ''

      // The readiness ratio is the only ratio in the product (ADR-034). This
      // used to read "2 of 4 ready" / "4 öğeden 2 tanesi hazır" — the same
      // numeral the hero uses for outstanding documents, and one word from the
      // canonical readiness caption.
      expect(text).not.toMatch(/\d+\s*(of|\/)\s*\d+/i)
      expect(text).not.toMatch(/\d+\s+öğeden\s+\d+/i)
      expect(text).not.toMatch(/%/)
    }
  )

  it.each(SUPPORTED_LOCALES)(
    'states the item count and what needs attention in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage()
      expect(
        await screen.findByText(
          new RegExp(
            i18n
              .t('timeline:appointmentDay.itemCount', { count: 4 })
              .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          )
        )
      ).toBeInTheDocument()
    }
  )
})
