import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
import TripPage from '@/pages/TripPage'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the trip test')
}
const SEED: Dossier = imported.data

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

function renderTrip(seed: Dossier, entry = '/trip') {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[entry]}>
              <Seed data={seed}>
                <TripPage />
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

describe('Trip planner — shell', () => {
  it.each([...SUPPORTED_LOCALES])(
    'renders the guided planner in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderTrip(SEED)

      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: i18n.t('trip:wizard.title'),
        })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: i18n.t('trip:steps.dates.title'),
        })
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          i18n.t('trip:nav.stepProgress', { current: 1, total: 6 })
        )
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText(i18n.t('trip:dates.entryDate'), { exact: false })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', {
          name: i18n.t('common:actions.saveChanges'),
        })
      ).toBeNull()
    }
  )
})

describe('Trip planner — interaction', () => {
  it('advances to the route step and shows the itinerary', async () => {
    const user = userEvent.setup()
    renderTrip(SEED)

    await user.click(
      screen.getByRole('button', { name: i18n.t('trip:nav.continue') })
    )
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('trip:steps.route.title'),
      })
    ).toBeInTheDocument()
    // Example route visits Athens; reorder controls are present.
    expect(screen.getByText('Athens')).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: i18n.t('trip:route.moveDown') })
        .length
    ).toBeGreaterThan(0)
  })

  it('shows a premium empty state when a collection is empty', async () => {
    const user = userEvent.setup()
    const seed: Dossier = {
      ...SEED,
      application: SEED.application
        ? {
            ...SEED.application,
            trip: SEED.application.trip
              ? { ...SEED.application.trip, accommodationReservations: [] }
              : undefined,
          }
        : SEED.application,
    }
    renderTrip(seed)

    // dates → route → accommodation
    await user.click(
      screen.getByRole('button', { name: i18n.t('trip:nav.continue') })
    )
    await user.click(
      await screen.findByRole('button', { name: i18n.t('trip:nav.continue') })
    )
    expect(
      await screen.findByText(i18n.t('trip:accommodation.empty.title'))
    ).toBeInTheDocument()
  })
})

describe('Trip planner — review & deep-links', () => {
  /** Insurance ends before the trip → a real trip-consistency finding. */
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

  it('opens directly on a step via ?step= without breaking the URL', async () => {
    renderTrip(SEED, '/trip?step=review')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('trip:steps.review.title'),
      })
    ).toBeInTheDocument()
    // Captured essentials show a status badge.
    expect(
      screen.getAllByText(i18n.t('trip:review.status.captured')).length
    ).toBeGreaterThan(0)
  })

  it('surfaces a consistency finding in review with a jump-to-fix action', async () => {
    const user = userEvent.setup()
    renderTrip(GAP_SEED, '/trip?step=review')

    await screen.findByRole('heading', {
      level: 2,
      name: i18n.t('trip:steps.review.title'),
    })

    // The insurance section is flagged for review.
    expect(
      screen.getAllByText(i18n.t('trip:review.status.attention')).length
    ).toBeGreaterThan(0)

    // The finding surfaced with a jump-to-fix action…
    expect(
      screen.getAllByRole('button', {
        name: i18n.t('trip:review.insights.goToFix'),
      }).length
    ).toBeGreaterThan(0)

    // …and the insurance section's edit jumps straight to that step (no dead end).
    await user.click(
      screen.getByRole('button', {
        name: `${i18n.t('trip:review.edit')} — ${i18n.t('trip:review.headings.insurance')}`,
      })
    )
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('trip:steps.insurance.title'),
      })
    ).toBeInTheDocument()
  })
})
