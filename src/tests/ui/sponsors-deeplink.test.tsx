import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import i18n, {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { DossierProvider, useDossier } from '@/app/providers/DossierProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import SponsorsPage from '@/pages/SponsorsPage'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the sponsors test')
}

const LETTER: Document = {
  id: 'l1',
  code: 'SPONSOR_LETTER',
  category: 'sponsor',
  ownerType: 'sponsor',
  ownerId: 'sp-1',
  required: true,
  status: 'ready',
  verified: true,
}

const SPONSOR: Sponsor = {
  id: 'sp-1',
  relationship: 'parent',
  firstName: 'Deniz',
  lastName: 'Kaya',
  currency: 'EUR',
  monthlyIncome: 5000,
  investments: [],
  ownedAssets: [],
  coveredExpenses: [],
  sponsorshipLetter: false,
  proofOfRelationship: false,
  documentIds: ['l1'],
}

const SEED: Dossier = {
  ...imported.data,
  documents: [...imported.data.documents, LETTER],
  sponsors: [SPONSOR],
}
const EMPTY_SEED: Dossier = { ...imported.data, sponsors: [] }
const NAMELESS_SEED: Dossier = {
  ...SEED,
  sponsors: [{ ...SPONSOR, firstName: '' }],
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

function Probe() {
  const { state } = useDossier()
  const [params] = useSearchParams()
  return (
    <div>
      <span data-testid="sponsor-count">{state.sponsors.length}</span>
      <span data-testid="doc-l1">
        {state.documents.some((d) => d.id === 'l1') ? 'yes' : 'no'}
      </span>
      <span data-testid="s0-name">{state.sponsors[0]?.firstName ?? ''}</span>
      <span data-testid="param">{params.get('sponsor') ?? ''}</span>
    </div>
  )
}

function renderSponsors(entry = '/sponsors', data: Dossier | null = SEED) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[entry]}>
              <Seed data={data}>
                <SponsorsPage />
                <Probe />
              </Seed>
            </MemoryRouter>
          </TooltipProvider>
        </DossierProvider>
      </ThemeProvider>
    </LocaleProvider>
  )
}

const editorTitle = (name: string) => i18n.t('sponsors:editor.title', { name })

beforeEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

describe('Sponsors workspace — shell', () => {
  it('shows the no-dossier invitation', () => {
    renderSponsors('/sponsors', null)
    expect(
      screen.getByText(i18n.t('common:noDossier.title'))
    ).toBeInTheDocument()
  })

  it.each([...SUPPORTED_LOCALES])(
    'renders one h1 and no Save button in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderSponsors()
      const h1 = await screen.findByRole('heading', {
        level: 1,
        name: i18n.t('sponsors:title'),
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

  it('offers first-sponsor onboarding when empty', async () => {
    renderSponsors('/sponsors', EMPTY_SEED)
    expect(
      await screen.findByRole('button', {
        name: i18n.t('sponsors:empty.action'),
      })
    ).toBeInTheDocument()
  })

  it('renders a workspace card for a seeded sponsor', async () => {
    renderSponsors()
    expect(await screen.findByText('Deniz Kaya')).toBeInTheDocument()
  })
})

describe('Sponsors workspace — editor Sheet', () => {
  it('opens from ?sponsor=<id>', async () => {
    renderSponsors('/sponsors?sponsor=sp-1')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(
      await screen.findByText(editorTitle('Deniz Kaya'))
    ).toBeInTheDocument()
  })

  it('opens from the card edit button', async () => {
    renderSponsors()
    fireEvent.click(
      await screen.findByRole('button', { name: i18n.t('sponsors:card.edit') })
    )
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('does not crash on an unknown ?sponsor= and shows no editor', async () => {
    renderSponsors('/sponsors?sponsor=does-not-exist')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: i18n.t('sponsors:title'),
      })
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('behaves exactly as before with no params', async () => {
    renderSponsors()
    await screen.findByText('Deniz Kaya')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('navigates accordion sections to reveal their fields', async () => {
    renderSponsors('/sponsors?sponsor=sp-1')
    await screen.findByRole('dialog')
    // Basics is collapsed for this sponsor (contact is the first gap); open it.
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(i18n.t('sponsors:editor.sections.basics.title')),
      })
    )
    expect(await screen.findByDisplayValue('Deniz')).toBeInTheDocument()
  })

  it('autosaves an edited field (no Save button)', async () => {
    await i18n.changeLanguage('en')
    renderSponsors('/sponsors?sponsor=sp-1', NAMELESS_SEED)
    await screen.findByRole('dialog')
    // The nameless sponsor opens on Basics; edit the first name.
    const input = await screen.findByLabelText(/first name/i)
    fireEvent.change(input, { target: { value: 'Zephyr' } })
    expect(screen.getByTestId('s0-name')).toHaveTextContent('Zephyr')
  })

  it('closes the editor on Escape', async () => {
    renderSponsors()
    const editButton = await screen.findByRole('button', {
      name: i18n.t('sponsors:card.edit'),
    })
    editButton.focus()
    fireEvent.click(editButton)
    const dialog = await screen.findByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('Sponsors workspace — safe removal', () => {
  it('cancels removal, keeping the sponsor', async () => {
    renderSponsors()
    fireEvent.click(
      await screen.findByRole('button', {
        name: i18n.t('sponsors:card.remove'),
      })
    )
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: i18n.t('sponsors:remove.cancel'),
      })
    )
    expect(screen.getByTestId('sponsor-count')).toHaveTextContent('1')
  })

  it('confirms removal without deleting linked documents or leaving stale params', async () => {
    renderSponsors('/sponsors?sponsor=sp-1')
    fireEvent.click(
      await screen.findByRole('button', {
        name: i18n.t('sponsors:card.remove'),
      })
    )
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: i18n.t('sponsors:remove.confirm'),
      })
    )
    expect(screen.getByTestId('sponsor-count')).toHaveTextContent('0')
    // The linked document is NOT deleted.
    expect(screen.getByTestId('doc-l1')).toHaveTextContent('yes')
    // The ?sponsor= param is cleared.
    expect(screen.getByTestId('param')).toHaveTextContent('')
  })
})
