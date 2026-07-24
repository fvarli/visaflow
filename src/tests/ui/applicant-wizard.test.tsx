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
import ApplicantPage from '@/pages/ApplicantPage'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

/**
 * Substitute for browser verification of the applicant wizard: it is mounted
 * in each locale and driven through its steps, asserting structure, inline
 * validation, the "why do we ask this?" popover and the collection editor.
 */

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the applicant test')
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

function renderApplicant(seed: Dossier) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={['/applicant']}>
              <Seed data={seed}>
                <ApplicantPage />
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

describe('Applicant wizard — shell', () => {
  it.each([...SUPPORTED_LOCALES])(
    'renders the guided shell in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderApplicant(SEED)

      // Exactly one h1, and it is the wizard title.
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: i18n.t('applicant:wizard.title'),
        })
      ).toBeInTheDocument()

      // Step heading + progress label.
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: i18n.t('applicant:steps.personal.title'),
        })
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          i18n.t('applicant:nav.stepProgress', { current: 1, total: 5 })
        )
      ).toBeInTheDocument()

      // A wired field label, and no Save button (autosave replaced it).
      // Anchor the match: the Turkish "Ad" is a substring of "Soyad".
      expect(
        screen.getByLabelText(
          new RegExp(`^${i18n.t('applicant:fields.firstName')}`)
        )
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', {
          name: i18n.t('common:actions.saveChanges'),
        })
      ).toBeNull()
    }
  )
})

describe('Applicant wizard — interaction', () => {
  it('advances to the passport step on continue', async () => {
    const user = userEvent.setup()
    renderApplicant(SEED)

    await user.click(
      screen.getByRole('button', { name: i18n.t('applicant:nav.continue') })
    )
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('applicant:steps.passport.title'),
      })
    ).toBeInTheDocument()
  })

  it('opens the "why do we ask this?" explanation', async () => {
    const user = userEvent.setup()
    renderApplicant(SEED)

    await user.click(
      screen.getByRole('button', {
        name: i18n.t('applicant:why.trigger', {
          field: i18n.t('applicant:fields.dateOfBirth'),
        }),
      })
    )
    expect(
      await screen.findByText(i18n.t('applicant:why.dateOfBirth'))
    ).toBeInTheDocument()
  })

  it('validates inline when a required field is cleared', async () => {
    const user = userEvent.setup()
    renderApplicant(SEED)

    const firstName = screen.getByLabelText(
      new RegExp(`^${i18n.t('applicant:fields.firstName')}`)
    )
    await user.clear(firstName)
    await user.tab()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      i18n.t('applicant:errors.firstNameRequired')
    )
  })

  it('adds a previous visa through the collection editor', async () => {
    const user = userEvent.setup()
    const seed: Dossier = {
      ...SEED,
      applicant: { ...SEED.applicant, previousVisas: [], travelHistory: [] },
    }
    renderApplicant(seed)

    // personal → passport → previous visas
    await user.click(
      screen.getByRole('button', { name: i18n.t('applicant:nav.continue') })
    )
    await user.click(
      await screen.findByRole('button', {
        name: i18n.t('applicant:nav.continue'),
      })
    )

    expect(
      await screen.findByText(i18n.t('applicant:previousVisas.empty.title'))
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: i18n.t('applicant:previousVisas.add'),
      })
    )
    await user.type(
      screen.getByLabelText(i18n.t('applicant:fields.visaCountry'), {
        exact: false,
      }),
      'GR'
    )
    await user.type(
      screen.getByLabelText(i18n.t('applicant:fields.visaType'), {
        exact: false,
      }),
      'C'
    )
    await user.click(
      screen.getByRole('button', { name: i18n.t('applicant:collection.save') })
    )

    expect(await screen.findByText(/GR/)).toBeInTheDocument()
    expect(
      screen.queryByText(i18n.t('applicant:previousVisas.empty.title'))
    ).toBeNull()
  })
})
