import { useEffect } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
import DocumentsPage from '@/pages/DocumentsPage'
import { importDossier } from '@/features/import-export/services/import.service'
import { documentLabel } from '@/lib/document-label'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import { resolveVisaTemplate } from '@/config/countries'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the documents test')
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
                    coverageEndDate: '2025-04-05',
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
  data: Dossier
  children: React.ReactNode
}) {
  const { loadDossier } = useDossier()
  useEffect(() => {
    loadDossier(data)
  }, [data, loadDossier])
  return <>{children}</>
}

function renderDocuments(seed: Dossier) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={['/documents']}>
              <Seed data={seed}>
                <DocumentsPage />
              </Seed>
            </MemoryRouter>
          </TooltipProvider>
        </DossierProvider>
      </ThemeProvider>
    </LocaleProvider>
  )
}

const labelFor = (code: string) => documentLabel(i18n.t, code)

beforeEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

describe('Documents workspace — shell', () => {
  it.each([...SUPPORTED_LOCALES])(
    'renders the workspace in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderDocuments(SEED)

      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: i18n.t('documents:title'),
        })
      ).toBeInTheDocument()
      // Category groups are h2 headings.
      expect(
        screen.getAllByRole('heading', { level: 2 }).length
      ).toBeGreaterThan(0)
      // The view switch is a radiogroup.
      expect(
        screen.getByRole('radiogroup', { name: i18n.t('documents:view.label') })
      ).toBeInTheDocument()
    }
  )
})

/**
 * The seed plus one withdrawn requirement and one code this build does not
 * recognise, both marked ready — the shape a dossier written by another build
 * arrives in.
 */
const POLLUTED_SEED: Dossier = {
  ...SEED,
  documents: [
    ...SEED.documents,
    {
      id: 'retired-doc',
      code: 'TAX_RETURNS',
      category: 'financial',
      ownerType: 'applicant',
      ownerId: SEED.applicant?.id ?? 'applicant-1',
      required: true,
      status: 'ready',
      verified: false,
    },
    {
      id: 'unknown-doc',
      code: 'NOT_A_REAL_CODE',
      category: 'financial',
      ownerType: 'applicant',
      ownerId: SEED.applicant?.id ?? 'applicant-1',
      required: true,
      status: 'ready',
      verified: false,
    },
  ],
}

/**
 * `PASSPORT_CURRENT` is ready, claimed against revision 1. The pack now asks
 * for revision 2 (Article 12(c), the 10-year issue rule), so the claim is
 * superseded — the one state the panel has something extra to say about.
 */
/** Sum the rendered "{{ready}}/{{total}}" captions across every group. */
const captionTotals = () => {
  const counts = screen
    .getAllByText(/^\s*\d+\s*\/\s*\d+\s+ready\s*$/)
    .map((el) => (el.textContent ?? '').match(/(\d+)\s*\/\s*(\d+)/))
    .filter((m): m is RegExpMatchArray => m !== null)
  return {
    ready: counts.reduce((sum, m) => sum + Number(m[1]), 0),
    total: counts.reduce((sum, m) => sum + Number(m[2]), 0),
  }
}

const SUPERSEDED_SEED: Dossier = {
  ...SEED,
  documents: SEED.documents.map((d) =>
    d.code === 'PASSPORT_CURRENT'
      ? { ...d, status: 'ready' as const, satisfiedRevision: 1 }
      : d
  ),
}

describe('Documents workspace — a superseded completion claim', () => {
  it('explains the change without disputing the document or its status', async () => {
    const user = userEvent.setup()
    await i18n.changeLanguage('en')
    renderDocuments(SUPERSEDED_SEED)

    await user.click(
      screen.getByRole('button', { name: labelFor('PASSPORT_CURRENT') })
    )
    const panel = await screen.findByRole('dialog')

    // A calm note, not an alarm: `role="note"` never interrupts a screen
    // reader, and nothing here may imply the filed document was invalid.
    const note = within(panel).getByRole('note')
    expect(note).toHaveTextContent(i18n.t('documents:panel.superseded.body'))
    expect(within(panel).queryByRole('alert')).not.toBeInTheDocument()

    // The status the applicant set is theirs and is left exactly as it was.
    expect(
      within(panel).getByLabelText(i18n.t('documents:panel.status'))
    ).toHaveTextContent(i18n.t('visa-domain:documentStatus.ready'))
  })

  it('offers a way to re-confirm, which the status control alone cannot', async () => {
    const user = userEvent.setup()
    await i18n.changeLanguage('en')
    renderDocuments(SUPERSEDED_SEED)

    await user.click(
      screen.getByRole('button', { name: labelFor('PASSPORT_CURRENT') })
    )
    const panel = await screen.findByRole('dialog')
    const reconfirm = within(panel).getByRole('button', {
      name: i18n.t('documents:panel.superseded.action'),
    })

    // Re-selecting "ready" in a select that already holds it fires no change,
    // so without this control the claim could never be brought up to date.
    await user.click(reconfirm)
    expect(within(panel).queryByRole('note')).not.toBeInTheDocument()
  })

  it('is excluded from the category caption, like the hero above it', async () => {
    await i18n.changeLanguage('en')
    const { unmount } = renderDocuments(SEED)
    const before = captionTotals()
    unmount()

    // Same documents, same statuses — only the provenance of one claim differs.
    renderDocuments(SUPERSEDED_SEED)
    const after = captionTotals()
    expect(after.total).toBe(before.total)
    expect(after.ready).toBe(before.ready - 1)
  })

  it('says nothing for a claim that predates provenance', async () => {
    // The unstamped case. Absence of a stamp is not evidence about the
    // evidence, so there is nothing to tell the applicant (ADR-051).
    const user = userEvent.setup()
    await i18n.changeLanguage('en')
    renderDocuments(SEED)

    await user.click(
      screen.getByRole('button', { name: labelFor('PASSPORT_CURRENT') })
    )
    const panel = await screen.findByRole('dialog')
    expect(within(panel).queryByRole('note')).not.toBeInTheDocument()
  })
})

describe('Documents workspace — the group caption agrees with the hero', () => {
  /**
   * LEAK 1 (ADR-051). The per-category caption was a raw status filter over
   * every row in the group, so a withdrawn, unrecognised, optional or
   * no-longer-applicable record entered both sides of "{{ready}}/{{total}}" —
   * printed directly beneath a hero reading "{{percent}}% ready" that had
   * already excluded the same records.
   *
   * Asserted through the rendered page rather than a helper, because the
   * caption is built in the page component and only exists there.
   */
  /**
   * The canonical arithmetic restricted to records that exist.
   *
   * `requiredRequirementCodes` is deliberately omitted: the hero's denominator
   * also counts requirements with no record yet, and a per-category caption
   * cannot — it captions rows. That difference is legitimate. What is not
   * legitimate is the caption applying a *different rule* to the rows it does
   * have, which is what this measures.
   */
  const canonical = (dossier: Dossier) => {
    const template = resolveVisaTemplate(
      dossier.application?.destinationCountry,
      dossier.application?.visaType
    )
    return buildDocumentReadiness({
      documents: dossier.documents,
      template,
      application: dossier.application,
    })
  }

  it('counts only current work, matching the canonical figures', async () => {
    await i18n.changeLanguage('en')
    renderDocuments(POLLUTED_SEED)

    const expected = canonical(POLLUTED_SEED)
    const shown = captionTotals()

    // The denominator is applicable required work — never the row count.
    expect(shown.total).toBe(expected.applicable)
    expect(shown.ready).toBe(expected.ready)
    // And it is genuinely smaller than the row count, so the assertion above
    // is not passing by the two populations happening to coincide.
    expect(shown.total).toBeLessThan(POLLUTED_SEED.documents.length)
  })

  it('does not change when non-current records are added', async () => {
    await i18n.changeLanguage('en')
    const { unmount } = renderDocuments(SEED)
    const clean = captionTotals()
    unmount()

    renderDocuments(POLLUTED_SEED)
    expect(captionTotals()).toEqual(clean)
  })

  it('still lists the records themselves', async () => {
    // Excluded from the arithmetic, never hidden: they are the user's records.
    await i18n.changeLanguage('en')
    renderDocuments(POLLUTED_SEED)
    expect(
      screen.getByRole('button', { name: labelFor('TAX_RETURNS') })
    ).toBeInTheDocument()
  })
})

describe('Documents workspace — interaction', () => {
  it('filters by search and preserves it across a view switch', async () => {
    const user = userEvent.setup()
    renderDocuments(SEED)

    const passport = labelFor('PASSPORT_CURRENT')
    const employment = labelFor('EMPLOYMENT_LETTER')
    expect(screen.getByRole('button', { name: passport })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: employment })).toBeInTheDocument()

    const search = screen.getByLabelText(
      i18n.t('documents:filters.searchLabel')
    )
    await user.type(search, 'passport')

    expect(screen.getByRole('button', { name: passport })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: employment })
    ).not.toBeInTheDocument()

    // Switch to the list view — the search filter must persist.
    await user.click(
      screen.getByRole('radio', { name: i18n.t('documents:view.list') })
    )
    expect(
      screen.getByRole('button', { name: new RegExp(passport) })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: new RegExp(employment) })
    ).not.toBeInTheDocument()
  })

  it('opens a document in the side panel with a related finding and deep-link', async () => {
    const user = userEvent.setup()
    renderDocuments(GAP_SEED)

    await user.click(
      screen.getByRole('button', { name: labelFor('TRAVEL_INSURANCE') })
    )

    // Opening a document uses a side panel (dialog overlay), not navigation.
    const panel = await screen.findByRole('dialog')
    expect(
      within(panel).getByText(labelFor('TRAVEL_INSURANCE'))
    ).toBeInTheDocument()
    // The cross-entity insurance finding surfaces with a "Go to Trip" link.
    const goTo = i18n.t('documents:panel.goTo', {
      section: i18n.t('documents:panel.section.trip'),
    })
    expect(
      within(panel).getByRole('link', { name: new RegExp(goTo) })
    ).toBeInTheDocument()
  })
})

describe('Documents workspace — a superseded claim', () => {
  /**
   * Found by reading a screenshot, not by an assertion: the card, the row and
   * the panel header all rendered the *stored* status, so a claim the readiness
   * figures counted under "needs update" appeared under a satisfied badge —
   * in the panel, directly above the note explaining it no longer counts
   * (ADR-051). The editable status below it is the applicant's own assertion
   * and must still read exactly as they set it.
   */
  const SUPERSEDED_SEED: Dossier = {
    ...SEED,
    documents: SEED.documents.map((d) =>
      d.code === 'PASSPORT_CURRENT'
        ? { ...d, status: 'ready' as const, satisfiedRevision: 1 }
        : d
    ),
  }

  it('shows the card under the status readiness counts it as', async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE)
    renderDocuments(SUPERSEDED_SEED)

    const label = labelFor('PASSPORT_CURRENT')
    const card = (await screen.findByText(label)).closest('div[data-slot]')
    expect(card).not.toBeNull()
    expect(
      within(card as HTMLElement).getByText(
        i18n.t('visa-domain:documentStatus.needs_update')
      )
    ).toBeInTheDocument()
    expect(
      within(card as HTMLElement).queryByText(
        i18n.t('visa-domain:documentStatus.ready')
      )
    ).toBeNull()
  })

  it('keeps the stored status intact in the editor', async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE)
    const user = userEvent.setup()
    renderDocuments(SUPERSEDED_SEED)

    await user.click(await screen.findByText(labelFor('PASSPORT_CURRENT')))

    // The panel explains the standing...
    expect(
      await screen.findByText(i18n.t('documents:panel.superseded.action'))
    ).toBeInTheDocument()
    // ...its header states the standing rather than a satisfied badge sitting
    // directly above the note that says the claim no longer counts...
    const kind = screen.getByText(i18n.t('documents:panel.kind.required'))
    const header = kind.parentElement as HTMLElement
    expect(
      within(header).getByText(
        i18n.t('visa-domain:documentStatus.needs_update')
      )
    ).toBeInTheDocument()
    expect(
      within(header).queryByText(i18n.t('visa-domain:documentStatus.ready'))
    ).toBeNull()

    // ...and the status control still reports what the applicant asserted.
    const status = screen.getByRole('combobox', {
      name: i18n.t('documents:panel.status'),
    })
    expect(status).toHaveTextContent(i18n.t('visa-domain:documentStatus.ready'))
  })
})
