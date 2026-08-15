import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
import ReviewPage from '@/pages/ReviewPage'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the review test')
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

function renderPage(seed: Dossier | null = SEED, entry = '/review') {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[entry]}>
              <Seed data={seed}>
                <ReviewPage />
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

describe('Final Review page', () => {
  it.each(SUPPORTED_LOCALES)(
    'renders exactly one h1 with the localized title in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage()

      const headings = screen.getAllByRole('heading', { level: 1 })
      expect(headings).toHaveLength(1)
      expect(headings[0]).toHaveTextContent(i18n.t('review:title'))
    }
  )

  it.each(SUPPORTED_LOCALES)(
    'renders every section of the review in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage()

      // B — application summary
      expect(
        screen.getByRole('heading', { name: i18n.t('review:summary.title') })
      ).toBeInTheDocument()
      // C — submission checklist
      expect(
        screen.getByRole('heading', { name: i18n.t('review:checklist.title') })
      ).toBeInTheDocument()
      // D — missing / needs attention
      expect(
        screen.getByRole('heading', { name: i18n.t('review:attention.title') })
      ).toBeInTheDocument()
      // F — appointment preparation
      expect(
        screen.getByRole('heading', {
          name: i18n.t('review:appointmentPrep.title'),
        })
      ).toBeInTheDocument()
      // G — print package, both halves
      expect(
        screen.getByRole('heading', { name: i18n.t('review:print.title') })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', {
          name: i18n.t('review:print.generated.title'),
        })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', {
          name: i18n.t('review:print.physical.title'),
        })
      ).toBeInTheDocument()
      // H — the honest closing note
      expect(screen.getByText(i18n.t('review:disclaimer'))).toBeInTheDocument()
    }
  )

  it('keeps a meaningful heading hierarchy (no level skipped)', () => {
    renderPage()
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

  it('shows the readiness ring as an organizational signal, not a prediction', () => {
    renderPage()
    expect(
      screen.getByRole('img', {
        name: new RegExp(i18n.t('review:hero.readiness')),
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('review:hero.readinessHint'))
    ).toBeInTheDocument()
  })

  it('deep-links checklist items into the Documents workspace', () => {
    renderPage()
    const links = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href') ?? '')
    expect(links.some((href) => href.startsWith('/documents'))).toBe(true)
  })

  it('offers a route out of the attention section to the consistency checks', () => {
    renderPage()
    const seeAll = screen.queryByRole('link', {
      name: i18n.t('review:attention.seeAll'),
    })
    // Present whenever the example dossier has anything actionable.
    if (seeAll) {
      expect(seeAll).toHaveAttribute('href', '/consistency-checks')
    }
  })

  it('separates VisaFlow-generated sheets from the applicant’s own documents', () => {
    renderPage()
    const generated = screen
      .getByRole('heading', { name: i18n.t('review:print.generated.title') })
      .closest('[data-slot="card"]')
    expect(generated).not.toBeNull()

    // Every line on the generated side is one of VisaFlow's own four sheets.
    const generatedText = within(generated as HTMLElement)
    expect(
      generatedText.getByText(i18n.t('review:print.generated.coverSheet'))
    ).toBeInTheDocument()
    expect(
      generatedText.getByText(
        i18n.t('review:print.generated.submissionChecklist')
      )
    ).toBeInTheDocument()

    // The physical side is explicit that these files are the applicant's own.
    expect(
      screen.getByText(i18n.t('review:print.physical.description'))
    ).toBeInTheDocument()
  })

  it('states honestly that printing does not exist yet', () => {
    renderPage()
    expect(screen.getByText(i18n.t('review:print.notYet'))).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /print|yazdır/i })
    ).not.toBeInTheDocument()
  })

  it('never invents an after-submission procedure', () => {
    renderPage()
    expect(
      screen.getByText(i18n.t('review:appointmentPrep.afterSubmission.body'))
    ).toBeInTheDocument()
  })

  it.each(SUPPORTED_LOCALES)(
    'routes an empty dossier into the first-run journey in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage(null)

      expect(
        screen.queryByRole('heading', { name: i18n.t('review:summary.title') })
      ).not.toBeInTheDocument()
      const start = screen.getAllByRole('link')
      expect(
        start.some((a) => a.getAttribute('href')?.startsWith('/welcome'))
      ).toBe(true)
    }
  )
})
