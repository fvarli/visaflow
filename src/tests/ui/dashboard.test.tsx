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
import DashboardPage from '@/pages/DashboardPage'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

/**
 * Substitute for browser visual verification (the Chrome extension is not
 * available here): the dashboard is mounted in each locale, with and without a
 * seeded dossier, and asserted structurally.
 */

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the dashboard test')
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
                    coverageEndDate: '2020-01-01',
                  }
                : undefined,
            }
          : undefined,
      }
    : SEED.application,
}

const greetingFor = () =>
  i18n.t('dashboard:greeting.hello', {
    name: SEED.applicant?.firstName ?? '',
  })

/** Seeds the provider on mount — no fixture-loading test helper existed before. */
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

function renderDashboard(seed: Dossier | null) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={['/dashboard']}>
              <Seed data={seed}>
                <DashboardPage />
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

describe('Dashboard — empty state', () => {
  it.each([...SUPPORTED_LOCALES])(
    'invites the user to get started in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderDashboard(null)

      expect(
        screen.getByRole('heading', {
          level: 2,
          name: i18n.t('dashboard:getStarted.title'),
        })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', {
          name: new RegExp(i18n.t('dashboard:getStarted.startGreece'), 'i'),
        })
      ).toBeInTheDocument()
    }
  )
})

describe('Dashboard — seeded command center', () => {
  it.each([...SUPPORTED_LOCALES])(
    'renders the greeting, readiness and purpose-driven sections in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderDashboard(SEED)

      // The greeting (with the applicant's given name) is the single h1.
      const h1 = await screen.findByRole('heading', {
        level: 1,
        name: greetingFor(),
      })
      expect(h1).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

      // Readiness is the single dominant indicator: the ring exposes the
      // percentage via its label. The example has 7 of 10 required ready → 70%.
      const ring = screen.getByRole('img')
      expect(ring.getAttribute('aria-label')).toContain('70')

      // The single next action offers exactly one CTA.
      expect(
        screen.getByRole('link', { name: i18n.t('dashboard:nextAction.cta') })
      ).toBeInTheDocument()

      // The documents section labels the five buckets.
      expect(
        screen.getByText(i18n.t('dashboard:documentsSummary.ready'))
      ).toBeInTheDocument()
      expect(
        screen.getByText(i18n.t('dashboard:documentsSummary.requested'))
      ).toBeInTheDocument()
      expect(
        screen.getByText(i18n.t('dashboard:documentsSummary.optional'))
      ).toBeInTheDocument()

      // The live dossier snapshot renders present-tense facts.
      expect(
        screen.getByText(i18n.t('dashboard:snapshot.item.applicantOnFile'))
      ).toBeInTheDocument()
    }
  )

  it('surfaces a consistency finding with a deep-link to its fix', async () => {
    renderDashboard(GAP_SEED)

    await screen.findByRole('heading', { level: 1, name: greetingFor() })

    // Consistency health links a finding to the page that resolves it.
    const links = await screen.findAllByRole('link', {
      name: new RegExp(i18n.t('dashboard:consistencyHealth.goToFix')),
    })
    expect(links.length).toBeGreaterThan(0)
  })

  it('translates the header actions rather than hardcoding English', async () => {
    await i18n.changeLanguage('tr')
    renderDashboard(SEED)

    await screen.findByRole('heading', { level: 1, name: greetingFor() })

    // The old build hardcoded the English "Check Issues" / "Documents".
    expect(
      screen.getByRole('link', { name: i18n.t('dashboard:header.checkIssues') })
    ).toBeInTheDocument()
    expect(screen.queryByText('Check Issues')).not.toBeInTheDocument()
  })
})
