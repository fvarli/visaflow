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
import FinancePage from '@/pages/FinancePage'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the finance test')
}
/** Self-funded, employed, with a bank name — the example dossier. */
const SEED: Dossier = imported.data

const withFinancing = (
  source: 'self' | 'sponsor' | 'employer' | 'mixed'
): Dossier => ({
  ...SEED,
  application: SEED.application
    ? {
        ...SEED.application,
        financing: { ...SEED.application.financing, source, currency: 'EUR' },
      }
    : SEED.application,
})

/** Sponsor-funded — personal-bank fields don't apply. */
const SPONSOR_SEED = withFinancing('sponsor')

/** No document instances → every applicable finance requirement is missing. */
const MISSING_DOCS_SEED: Dossier = { ...SEED, documents: [] }

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

function renderPage(seed: Dossier | null, entry = '/finance') {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[entry]}>
              <Seed data={seed}>
                <FinancePage />
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

describe('Finance — no dossier', () => {
  it('shows the no-dossier invitation', () => {
    renderPage(null)
    expect(
      screen.getByText(i18n.t('common:noDossier.title'))
    ).toBeInTheDocument()
  })
})

describe('Finance — guided wizard', () => {
  it.each([...SUPPORTED_LOCALES])(
    'renders one h1 and no Save button in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPage(SEED)

      const h1 = await screen.findByRole('heading', {
        level: 1,
        name: i18n.t('finance:wizard.title'),
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

  it('opens directly on the sponsors step via ?step=sponsors', async () => {
    await i18n.changeLanguage('en')
    renderPage(SEED, '/finance?step=sponsors')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: i18n.t('finance:steps.sponsors.title'),
      })
    ).toBeInTheDocument()
    // Self-funded → sponsors don't apply → calm not-applicable state.
    expect(
      screen.getByText(i18n.t('finance:notApplicable.sponsors.title'))
    ).toBeInTheDocument()
  })

  it('shows a calm not-applicable personal state for sponsor funding', async () => {
    await i18n.changeLanguage('en')
    renderPage(SPONSOR_SEED, '/finance?step=personal')

    expect(
      await screen.findByText(i18n.t('finance:notApplicable.personal.title'))
    ).toBeInTheDocument()
    // No bank-name field is rendered when personal finances don't apply.
    expect(screen.queryByText(i18n.t('finance:personal.bankName'))).toBeNull()
  })
})

describe('Finance — evidence-to-gather copy', () => {
  it('copies grouped localized names with accessible, privacy-safe feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    await i18n.changeLanguage('en')
    renderPage(MISSING_DOCS_SEED, '/finance?step=documents')

    const copyButton = await screen.findByRole('button', {
      name: i18n.t('finance:documents.gather.copy'),
    })
    fireEvent.click(copyButton)

    expect(writeText).toHaveBeenCalledTimes(1)
    const copied = writeText.mock.calls[0]![0] as string
    // Grouped plain-text list with the heading, and no dossier values leaked.
    expect(copied.startsWith(i18n.t('finance:documents.gather.heading'))).toBe(
      true
    )
    expect(copied).toContain(i18n.t('finance:documents.gather.groups.personal'))
    expect(copied).not.toContain('PKO Bank Polski')
    expect(copied).not.toContain('15000')

    expect(
      await screen.findByText(i18n.t('finance:documents.gather.copied'))
    ).toBeInTheDocument()
  })
})

/** Proves the shallow-merge autosave keeps data when the source changes. */
function SwitchProbe() {
  const { state, loadDossier, updateFinancing } = useDossier()
  useEffect(() => {
    loadDossier(SEED)
  }, [loadDossier])
  return (
    <div>
      <button onClick={() => updateFinancing({ source: 'sponsor' })}>
        switch
      </button>
      <span data-testid="bank">
        {state.application?.financing?.bankName ?? ''}
      </span>
      <span data-testid="source">
        {state.application?.financing?.source ?? ''}
      </span>
    </div>
  )
}

describe('Finance — non-destructive source switching', () => {
  it('keeps entered data when the funding source changes', async () => {
    render(
      <DossierProvider>
        <SwitchProbe />
      </DossierProvider>
    )

    expect(await screen.findByTestId('bank')).toHaveTextContent(
      'PKO Bank Polski'
    )
    fireEvent.click(screen.getByRole('button', { name: 'switch' }))

    expect(screen.getByTestId('source')).toHaveTextContent('sponsor')
    // The bank name entered under the previous source is preserved.
    expect(screen.getByTestId('bank')).toHaveTextContent('PKO Bank Polski')
  })
})
