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
import { WorkspaceProvider } from '@/app/providers/WorkspaceProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import ReviewPrintPage from '@/pages/ReviewPrintPage'
import { GENERATED_SHEET_ORDER } from '@/features/review/review-print'
import { dynamicT } from '@/lib/i18n-dynamic'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Dossier } from '@/domain/schemas/dossier.schema'

/**
 * The printable appointment package.
 *
 * These are about the *surface*, not the model — availability is already pinned
 * in `review-print.test.ts` and is deliberately not re-asserted here. What this
 * file guards is the promise the surface makes: it prints what the model says
 * exists, says so plainly when nothing does, and never puts the application's
 * own furniture on paper (ADR-042).
 */

const imported = importDossier(JSON.stringify(exampleJson))
if (!imported.success || !imported.data) {
  throw new Error('example dossier failed to import for the print test')
}
const FULL: Dossier = imported.data

/** The example dossier with the appointment and the route taken away. */
function withoutAppointmentOrRoute(): Dossier {
  const copy = structuredClone(FULL)
  delete copy.application.appointment
  if (copy.application.trip) copy.application.trip.route = []
  return copy
}

/** No trip at all — the itinerary sheet has nothing to say. */
function withoutTrip(): Dossier {
  const copy = structuredClone(FULL)
  delete copy.application.trip
  return copy
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

function renderPrint(seed: Dossier | null = FULL) {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <WorkspaceProvider>
            <TooltipProvider>
              <MemoryRouter initialEntries={['/review/print']}>
                <Seed data={seed}>
                  <ReviewPrintPage />
                </Seed>
              </MemoryRouter>
            </TooltipProvider>
          </WorkspaceProvider>
        </DossierProvider>
      </ThemeProvider>
    </LocaleProvider>
  )
}

/** The keys are the model's ids, so they are data — resolve them dynamically. */
const sheetTitle = (id: string): string =>
  dynamicT(i18n.t.bind(i18n))(`review:print.generated.${id}`)

beforeEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

describe('printable appointment package', () => {
  it.each(SUPPORTED_LOCALES)(
    'prints exactly the four generated sheets, in the model’s order, in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderPrint()

      const titles = screen
        .getAllByRole('heading', { level: 2 })
        .map((h) => h.textContent)

      expect(titles).toEqual(GENERATED_SHEET_ORDER.map((id) => sheetTitle(id)))
    }
  )

  it('carries no application chrome onto the paper', () => {
    const { container } = renderPrint()

    // The surface renders outside `AppLayout`, so this is structural rather
    // than a CSS promise: there is no navigation in the document to hide.
    expect(container.querySelector('nav')).toBeNull()
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(container.querySelector('#main')).toBeNull()
    // Every sheet is a `<section>`; the on-screen toolbar sits outside them all.
    for (const sheet of container.querySelectorAll('.print-sheet')) {
      expect(sheet.querySelector('button')).toBeNull()
      expect(sheet.querySelector('a')).toBeNull()
    }
  })

  it('names the dossier in the tab title, which is the PDF filename', () => {
    renderPrint()
    expect(document.title).toContain(
      i18n.t('review:print.surface.documentTitle', { dossier: '' }).slice(0, 12)
    )
    // The applicant's name identifies the file, rather than "VisaFlow.pdf".
    expect(document.title).toContain('Maria')
  })

  it('states that a sheet has nothing to print rather than printing blanks', () => {
    renderPrint(withoutTrip())

    const itinerary = screen
      .getByRole('heading', { level: 2, name: sheetTitle('itinerarySummary') })
      .closest('section')
    expect(itinerary).not.toBeNull()

    expect(
      within(itinerary as HTMLElement).getByText(
        i18n.t('review:print.surface.unavailable')
      )
    ).toBeInTheDocument()
    // …and it explains what would make the sheet possible.
    expect(
      within(itinerary as HTMLElement).getByText(
        i18n.t('review:print.generated.itinerarySummaryHint')
      )
    ).toBeInTheDocument()
  })

  it('admits a partial sheet instead of quietly filling the gaps', () => {
    // Trip dates but no route: the model calls the itinerary `partial`.
    renderPrint(withoutAppointmentOrRoute())

    const itinerary = screen
      .getByRole('heading', { level: 2, name: sheetTitle('itinerarySummary') })
      .closest('section') as HTMLElement

    expect(
      within(itinerary).getByText(i18n.t('review:print.surface.partial'))
    ).toBeInTheDocument()

    // The appointment is gone entirely, so that sheet prints nothing at all —
    // and above all invents no date.
    const appointment = screen
      .getByRole('heading', {
        level: 2,
        name: sheetTitle('appointmentSummary'),
      })
      .closest('section') as HTMLElement
    expect(
      within(appointment).getByText(i18n.t('review:print.surface.unavailable'))
    ).toBeInTheDocument()
  })

  it('marks an unrecorded fact as unrecorded rather than leaving it blank', () => {
    const noPassport = structuredClone(FULL)
    noPassport.applicant.passport.number = ''
    renderPrint(noPassport)

    const cover = screen
      .getByRole('heading', { level: 2, name: sheetTitle('coverSheet') })
      .closest('section') as HTMLElement
    expect(
      within(cover).getAllByText(i18n.t('review:summary.notRecorded')).length
    ).toBeGreaterThan(0)
  })

  it('lists the checklist with the states the model already decided', () => {
    renderPrint()

    const checklist = screen
      .getByRole('heading', {
        level: 2,
        name: sheetTitle('submissionChecklist'),
      })
      .closest('section') as HTMLElement

    // Groups are the checklist's own, not a second grouping invented for paper.
    expect(
      within(checklist).getByText(i18n.t('review:checklist.groups.identity'))
    ).toBeInTheDocument()
    // A tick box per row: the one thing the applicant writes on.
    const rows = checklist.querySelectorAll('.print-checklist > li')
    expect(rows.length).toBeGreaterThan(0)
    expect(checklist.querySelectorAll('.print-tickbox')).toHaveLength(
      rows.length
    )
  })

  it('says every sheet is preparation material, never an official form', () => {
    renderPrint()
    const disclaimers = screen.getAllByText(
      i18n.t('review:print.surface.disclaimer')
    )
    // One per sheet — a page that gets separated from the others still says it.
    expect(disclaimers).toHaveLength(GENERATED_SHEET_ORDER.length)
  })

  it('has nothing to print when no dossier is open', () => {
    renderPrint(null)
    expect(
      screen.getByText(i18n.t('review:print.surface.empty'))
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
  })
})
