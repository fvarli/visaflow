import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
import ConsistencyChecksPage from '@/pages/ConsistencyChecksPage'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

/**
 * Substitute for browser visual verification (no connected Chrome here): the
 * Validation Center is mounted in each locale, empty and seeded, and asserted
 * structurally — single h1, review hero, grouped findings, a working
 * jump-to-fix deep-link, and the section summary.
 */

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the validation test')
}
const SEED: Dossier = imported.data

/** A seed where insurance ends before the trip — fires a trip/insurance finding. */
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
                    coverageEndDate: '2020-01-01',
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
  data: Dossier | null
  children: React.ReactNode
}) {
  const { loadDossier } = useDossier()
  useEffect(() => {
    if (data) loadDossier(data)
  }, [data, loadDossier])
  return <>{children}</>
}

function renderPage(seed: Dossier | null) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={['/consistency-checks']}>
              <Seed data={seed}>
                <ConsistencyChecksPage />
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

describe('Validation Center — empty state', () => {
  it.each([...SUPPORTED_LOCALES])(
    'shows the no-dossier invitation in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage(null)
      expect(
        screen.getByText(i18n.t('common:noDossier.title'))
      ).toBeInTheDocument()
    }
  )
})

describe('Validation Center — seeded review', () => {
  it.each([...SUPPORTED_LOCALES])(
    'renders one h1, the review hero and the section summary in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage(SEED)

      // The review title is the single h1.
      const h1 = await screen.findByRole('heading', {
        level: 1,
        name: i18n.t('validation:center.title'),
      })
      expect(h1).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

      // The hero exposes readiness through the ring's accessible label.
      expect(screen.getByRole('img')).toBeInTheDocument()

      // The bottom-of-page dossier summary is present.
      expect(
        screen.getByRole('heading', {
          name: i18n.t('validation:center.review.title'),
        })
      ).toBeInTheDocument()
    }
  )

  it('groups a finding and links it straight to the fix (no dead end)', async () => {
    await i18n.changeLanguage('en')
    renderPage(GAP_SEED)

    // The Trip group is present (its category heading carries the calm health
    // label and count, so it is matched loosely).
    const tripHeadings = await screen.findAllByRole('heading', {
      name: new RegExp(i18n.t('validation:center.categories.trip'), 'i'),
    })
    expect(tripHeadings.length).toBeGreaterThan(0)

    // At least one "Take me there" link points at the insurance step — the
    // insurance gap is never a dead end.
    const links = screen.getAllByRole('link', {
      name: i18n.t('validation:center.actions.goThere'),
    })
    expect(
      links.some((a) => a.getAttribute('href') === '/trip?step=insurance')
    ).toBe(true)
  })
})
