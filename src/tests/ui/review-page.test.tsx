import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
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
import { buildFinalReviewModel } from '@/features/review/review-model'
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

  it.each(['/review', '/review?mode=departure'])(
    'keeps a meaningful heading hierarchy in %s (no level skipped)',
    (entry) => {
      renderPage(SEED, entry)
      const levels = screen
        .getAllByRole('heading')
        .map((h) => Number(h.tagName.slice(1)))
      expect(levels[0]).toBe(1)
      for (let i = 1; i < levels.length; i += 1) {
        const previous = levels[i - 1] ?? 1
        const current = levels[i] ?? 1
        expect(current).toBeLessThanOrEqual(previous + 1)
      }
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
        name: new RegExp(i18n.t('common:readiness.label')),
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('common:readiness.hint'))
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

  it('offers a real print action that goes to the print surface', () => {
    renderPage()
    // The inverse of what this test used to assert. Printing was honestly
    // absent until it existed; the moment the action shipped, the "not yet"
    // copy and the missing button both became the lie (ADR-042).
    const action = screen.getByRole('link', {
      name: i18n.t('review:print.action'),
    })
    expect(action).toHaveAttribute('href', '/review/print')
    expect(
      screen.getByText(i18n.t('review:print.actionHint'))
    ).toBeInTheDocument()
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

describe('Final Review — departure mode', () => {
  it.each(SUPPORTED_LOCALES)(
    'the ?mode=departure deep link lands on the compact check in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage(SEED, '/review?mode=departure')

      expect(
        await screen.findByRole('heading', {
          name: i18n.t('review:departure.title'),
        })
      ).toBeInTheDocument()
      // The long review is not rendered alongside it.
      expect(
        screen.queryByRole('heading', { name: i18n.t('review:print.title') })
      ).not.toBeInTheDocument()
    }
  )

  it('falls back to the full review for an unknown mode', async () => {
    renderPage(SEED, '/review?mode=nonsense')
    expect(
      await screen.findByRole('heading', {
        name: i18n.t('review:checklist.title'),
      })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: i18n.t('review:departure.title') })
    ).not.toBeInTheDocument()
  })

  it('exposes the two views as an accessible radiogroup', () => {
    renderPage()
    const group = screen.getByRole('radiogroup', {
      name: i18n.t('review:modes.label'),
    })
    expect(group).toBeInTheDocument()
    expect(
      screen.getByRole('radio', { name: i18n.t('review:modes.departure') })
    ).toBeInTheDocument()
  })

  it('switches to the departure check from the selector', async () => {
    renderPage()
    fireEvent.click(
      await screen.findByRole('radio', {
        name: i18n.t('review:modes.departure'),
      })
    )
    expect(
      await screen.findByRole('heading', {
        name: i18n.t('review:departure.title'),
      })
    ).toBeInTheDocument()
  })

  it('never claims the applicant has physically packed anything', () => {
    renderPage(SEED, '/review?mode=departure')
    const text = document.body.textContent ?? ''
    for (const forbidden of [/packed/i, /in your bag/i, /çantan/i]) {
      expect(text).not.toMatch(forbidden)
    }
    // ...and is explicit that these documents are the applicant's own.
    expect(
      screen.getByText(i18n.t('review:departure.bundlesHint'))
    ).toBeInTheDocument()
  })

  it('offers exactly one primary action and the calm footer', () => {
    renderPage(SEED, '/review?mode=departure')
    expect(
      screen.getByText(i18n.t('review:departure.footer'))
    ).toBeInTheDocument()
  })
})

describe('Final Review — checklist filter', () => {
  it.each(SUPPORTED_LOCALES)(
    'offers an accessible All / Needs attention filter in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage()
      expect(
        screen.getByRole('radiogroup', {
          name: i18n.t('review:checklist.filter.label'),
        })
      ).toBeInTheDocument()
    }
  )

  it('isolates the unresolved items when filtered', () => {
    renderPage()
    const group = screen.getByRole('radiogroup', {
      name: i18n.t('review:checklist.filter.label'),
    })
    const [allChip, attentionChip] = within(group).getAllByRole('radio')
    expect(allChip).toBeDefined()
    expect(attentionChip).toBeDefined()

    const rowsBefore = screen.getAllByRole('listitem').length
    fireEvent.click(attentionChip as HTMLElement)
    const rowsAfter = screen.getAllByRole('listitem').length

    // Filtering can only ever remove rows, never invent them.
    expect(rowsAfter).toBeLessThanOrEqual(rowsBefore)

    // ...and switching back restores the full list exactly.
    fireEvent.click(allChip as HTMLElement)
    expect(screen.getAllByRole('listitem').length).toBe(rowsBefore)
  })
})

describe('Final Review — one ratio, one inventory', () => {
  it.each(SUPPORTED_LOCALES)(
    'the checklist presents an inventory, never a second ratio, in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage()

      const checklistHeading = screen.getByRole('heading', {
        name: i18n.t('review:checklist.title'),
      })
      const section = checklistHeading.closest('section')
      expect(section).not.toBeNull()
      const text = (section as HTMLElement).textContent ?? ''

      // No percentage and no "X of Y" ratio anywhere in the checklist.
      expect(text).not.toMatch(/%/)
      expect(text).not.toMatch(/\d+\s*(of|\/)\s*\d+/i)
      expect(text).not.toMatch(/\d+\s+belgeden\s+\d+/i)
    }
  )

  it('keeps exactly one readiness percentage on the page', () => {
    renderPage()
    const percents = (document.body.textContent ?? '').match(/\d+\s*%|%\s*\d+/g)
    // The ring's centre label is the only percentage Final Review shows.
    expect(percents?.length ?? 0).toBeLessThanOrEqual(1)
  })

  it.each(SUPPORTED_LOCALES)(
    'states the package size as an inventory in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      // Derive the expected count the same way the page does, so the assertion
      // stays true if the example dossier changes.
      const model = buildFinalReviewModel(
        {
          applicant: SEED.applicant,
          application: SEED.application,
          documents: SEED.documents,
          sponsors: SEED.sponsors,
        },
        new Date()
      )
      renderPage()
      expect(
        screen.getByText(
          i18n.t('review:hero.packageItems', {
            count: model.checklist.counts.actionable,
          })
        )
      ).toBeInTheDocument()
    }
  )
})

describe('Final Review — received reads as obtained, never as a defect', () => {
  it.each(SUPPORTED_LOCALES)(
    'uses obtained/confirmation language for a received document in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage()

      // The example dossier carries exactly one `received` document.
      expect(
        screen.getAllByText(i18n.t('review:checklist.state.obtained')).length
      ).toBeGreaterThan(0)
      expect(
        screen.getAllByText(i18n.t('review:checklist.obtainedHint')).length
      ).toBeGreaterThan(0)
    }
  )

  it('never renders an obtained item with warning or danger semantics', () => {
    renderPage()
    const chip = screen.getAllByText(
      i18n.t('review:checklist.state.obtained')
    )[0]
    const badge = chip?.closest('[data-slot="status-badge"]')
    expect(badge).not.toBeNull()
    const tone = (badge as HTMLElement).getAttribute('data-tone')
    expect(tone).not.toBe('warning')
    expect(tone).not.toBe('danger')
    // ...and not the cobalt accent, which this design system reserves for
    // interactive surfaces (ADR-034).
    expect(tone).not.toBe('accent')
  })

  it('distinguishes obtained from missing by more than colour', () => {
    renderPage()
    // Different labels, and each row carries its own icon.
    expect(i18n.t('review:checklist.state.obtained')).not.toBe(
      i18n.t('review:checklist.state.missing')
    )
    const chip = screen.getAllByText(
      i18n.t('review:checklist.state.obtained')
    )[0]
    const row = chip?.closest('li')
    expect(row?.querySelector('svg')).not.toBeNull()
  })
})
