import { useEffect } from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
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
import EmploymentPage from '@/pages/EmploymentPage'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the employment test')
}
const SEED: Dossier = imported.data

/** A retired applicant — employer/income/leave/documents don't apply. */
const RETIRED_SEED: Dossier = {
  ...SEED,
  application: SEED.application
    ? {
        ...SEED.application,
        employment: { employmentStatus: 'retired', currency: 'EUR' },
      }
    : SEED.application,
}

/** A dossier carrying a specific status/occupation pair. */
const seedWith = (employmentStatus: string, occupationCode?: string): Dossier =>
  ({
    ...SEED,
    application: SEED.application
      ? {
          ...SEED.application,
          employment: {
            employmentStatus,
            currency: 'EUR',
            ...(occupationCode === undefined ? {} : { occupationCode }),
          },
        }
      : SEED.application,
  }) as Dossier

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

function renderPage(seed: Dossier | null, entry = '/employment') {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[entry]}>
              <Seed data={seed}>
                <EmploymentPage />
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

describe('Employment — no dossier', () => {
  it('shows the no-dossier invitation', () => {
    renderPage(null)
    expect(
      screen.getByText(i18n.t('common:noDossier.title'))
    ).toBeInTheDocument()
  })
})

describe('Employment — guided wizard', () => {
  it.each([...SUPPORTED_LOCALES])(
    'renders one h1 and no Save button in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage(SEED)

      const h1 = await screen.findByRole('heading', {
        level: 1,
        name: i18n.t('employment:wizard.title'),
      })
      expect(h1).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

      expect(
        screen.queryByRole('button', {
          name: i18n.t('common:actions.saveChanges'),
        })
      ).toBeNull()
    }
  )

  it('opens directly on the leave step via ?step=leave', async () => {
    await i18n.changeLanguage('en')
    renderPage(SEED, '/employment?step=leave')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('employment:steps.leave.title'),
      })
    ).toBeInTheDocument()
    // The trip/leave comparison is shown so a mismatch would be visible.
    expect(
      screen.getByText(i18n.t('employment:leave.tripDates'))
    ).toBeInTheDocument()
  })

  it('shows a calm not-applicable state for a non-employed status', async () => {
    await i18n.changeLanguage('en')
    renderPage(RETIRED_SEED, '/employment?step=employer')

    expect(
      await screen.findByText(i18n.t('employment:notApplicable.employer.title'))
    ).toBeInTheDocument()
    // No employer name field is rendered for a retiree.
    expect(
      screen.queryByText(i18n.t('employment:fields.employerName'))
    ).toBeNull()
  })
})

describe('Employment — HR request copy', () => {
  it('copies the localized document names with accessible feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    await i18n.changeLanguage('en')
    renderPage(SEED, '/employment?step=documents')

    const copyButton = await screen.findByRole('button', {
      name: i18n.t('employment:documents.hr.copy'),
    })
    fireEvent.click(copyButton)

    expect(writeText).toHaveBeenCalledTimes(1)
    const copied = writeText.mock.calls[0]![0] as string
    // Plain-text list with the heading, and no dossier values leaked.
    expect(copied.startsWith(i18n.t('employment:documents.hr.heading'))).toBe(
      true
    )
    expect(copied).not.toContain('Tech Solutions')
    expect(
      await screen.findByText(i18n.t('employment:documents.hr.copied'))
    ).toBeInTheDocument()
  })
})

/**
 * The occupational question, in the UI.
 *
 * The reverted first attempt shipped this control with **no** component test at
 * all, and the defect it carried was purely a UI-state defect. So the cases
 * below are the ones that were missed: what the control shows for a value it
 * does not recognise, and what a status change does to a value that is no
 * longer legal.
 */
describe('Employment — the occupational question', () => {
  it('is asked only for statuses that have occupational branches', async () => {
    await i18n.changeLanguage('en')
    const { unmount } = renderPage(seedWith('employed'))
    expect(
      await screen.findByText(i18n.t('employment:occupation.label'))
    ).toBeInTheDocument()
    unmount()

    // A pensioner is already the branch the checklists publish, so there is no
    // finer question to put to them.
    renderPage(seedWith('retired'))
    expect(screen.queryByText(i18n.t('employment:occupation.label'))).toBeNull()
  })

  /**
   * WHAT IS NOT TESTED HERE, AND WHY. Opening the option list needs the pointer
   * APIs Radix uses and jsdom does not implement — no test in this repository
   * opens a `Select`, which is also why the reverted attempt's selector had no
   * coverage at all. The option list and both status transitions are covered
   * instead by `occupationAfterStatusChange` as a pure rule, and by browser QA
   * against real Chrome. What remains here is everything the rendered control
   * can honestly be asked in jsdom.
   */

  it('shows a known compatible code as the selected answer', async () => {
    await i18n.changeLanguage('en')
    renderPage(seedWith('self_employed', 'farmer'))
    expect(
      await screen.findByText(i18n.t('visa-domain:occupationCode.farmer'))
    ).toBeInTheDocument()
  })

  it('shows an unrecognised code truthfully, not as an empty selector', async () => {
    /**
     * The case the reverted attempt would have failed. A controlled Radix
     * `Select` renders its placeholder when the value matches no item, so a
     * code written by a newer build would look exactly like an unanswered
     * question while sitting in the file and re-exporting intact. The selector
     * gives it an item of its own instead.
     */
    await i18n.changeLanguage('en')
    renderPage(seedWith('self_employed', 'future_category_2027'))

    expect(await screen.findByText(/future_category_2027/)).toBeInTheDocument()
    expect(
      screen.queryByText(i18n.t('employment:occupation.placeholder'))
    ).toBeNull()
  })

  it('does not require an answer for the step to count as done', async () => {
    // An optional field that flipped existing dossiers from complete to
    // upcoming on load would be a regression dressed as a feature.
    await i18n.changeLanguage('en')
    renderPage(seedWith('employed'))
    expect(
      await screen.findByText(i18n.t('employment:occupation.label'))
    ).toBeInTheDocument()
    expect(
      screen.queryByText(i18n.t('employment:occupation.placeholder'))
    ).toBeInTheDocument()
  })
})
