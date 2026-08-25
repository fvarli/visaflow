import { useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDossier } from '@/app/providers/DossierProvider'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { useFinalReviewModel } from '@/features/review/review-model'
import {
  GENERATED_SHEET_ORDER,
  type GeneratedSheetId,
  type PrintableState,
} from '@/features/review/review-print'
import type { SubmissionChecklist } from '@/features/review/review-checklist'
import type { ApplicationSummary } from '@/features/review/review-summary'
import type { RouteStop } from '@/domain/schemas/trip.schema'
import { getCountryName } from '@/lib/countries'
import { documentLabel } from '@/lib/document-label'
import { useLocale } from '@/app/providers/LocaleProvider'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'

/**
 * The printable appointment package.
 *
 * Deliberately a route **outside** `AppLayout` rather than a third `?mode=` on
 * Final Review. The requirement is that no navigation, sidebar or app chrome
 * reaches the paper; hiding chrome with `@media print` leaves that one CSS
 * mistake away from being printed, whereas never rendering it cannot fail. The
 * providers wrap the router, so the open dossier is still right here.
 *
 * *What* it prints is decided by `buildPrintPackage`, not by this file: the
 * same four sheets, in `GENERATED_SHEET_ORDER`, with the same availability
 * semantics. A sheet the model calls `unavailable` prints one honest line
 * instead of a page of blanks; a `partial` sheet says so and leaves the gaps
 * empty rather than guessing. Content comes from the review models that already
 * exist (`summary`, `checklist`) — there is no second document model, and no
 * dossier field exists solely for printing (ADR-032, ADR-042).
 *
 * The applicant's own documents are never rendered. VisaFlow has never held a
 * file; the checklist sheet lists *what to bring*, not what it has.
 */
export default function ReviewPrintPage() {
  const { t } = useTranslation(['review', 'visa-domain', 'common'])
  const format = useFormatters()
  const model = useFinalReviewModel()
  const { state } = useDossier()
  const { activeTitle } = useWorkspace()

  const dossierName = activeTitle ?? model.summary.applicantName ?? ''

  /**
   * The tab title is the filename Chrome offers in Save as PDF, so it is worth
   * being deliberate about — a folder of files all called "VisaFlow.pdf" helps
   * nobody. Set here rather than by `useDocumentTitle`, which lives in the
   * layout this page deliberately sits outside of, and restored on unmount so
   * navigating back does not leave the tab lying.
   */
  useEffect(() => {
    const previous = document.title
    document.title = t('review:print.surface.documentTitle', {
      dossier: dossierName || t('review:print.surface.heading'),
    })
    return () => {
      document.title = previous
    }
  }, [t, dossierName])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  if (!model.hasData) {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-10">
        <p className="text-body text-muted-foreground">
          {t('review:print.surface.empty')}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/review">
            <ArrowLeft />
            {t('review:print.surface.back')}
          </Link>
        </Button>
      </div>
    )
  }

  const { summary, checklist, print } = model
  const route = state.application?.trip?.route ?? []
  const states = new Map(print.generatedSheets.map((s) => [s.id, s.state]))
  const preparedOn = format.date(new Date())

  return (
    <div className="print-surface bg-background min-h-screen">
      {/* Screen-only, and outside every `.print-sheet` — so nothing here can
          reach the paper even if a print rule were to go missing. */}
      <div className="border-border bg-card sticky top-0 z-10 border-b print:hidden">
        <div className="mx-auto flex max-w-[880px] flex-wrap items-center gap-3 px-6 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/review">
              <ArrowLeft />
              {t('review:print.surface.back')}
            </Link>
          </Button>
          <div className="flex-1" />
          <Button size="sm" onClick={handlePrint}>
            <Printer />
            {t('review:print.surface.print')}
          </Button>
        </div>
        <div className="mx-auto max-w-[880px] px-6 pb-4">
          <h1 className="text-title text-foreground font-semibold text-pretty">
            {t('review:print.surface.heading')}
          </h1>
          <p className="text-caption text-muted-foreground mt-1 text-pretty">
            {t('review:print.surface.lead')}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[880px] px-6 py-8 print:max-w-none print:px-0 print:py-0">
        {GENERATED_SHEET_ORDER.map((id, index) => (
          <PrintSheet
            key={id}
            id={id}
            index={index + 1}
            total={GENERATED_SHEET_ORDER.length}
            dossierName={dossierName}
            preparedOn={preparedOn}
            state={states.get(id) ?? 'unavailable'}
            summary={summary}
            checklist={checklist}
            route={route}
          />
        ))}
      </div>
    </div>
  )
}

interface SheetProps {
  id: GeneratedSheetId
  index: number
  total: number
  dossierName: string
  preparedOn: string
  state: PrintableState
  summary: ApplicationSummary
  checklist: SubmissionChecklist
  route: RouteStop[]
}

/** One physical page: a running head, the content, and a footer. */
function PrintSheet({
  id,
  index,
  total,
  dossierName,
  preparedOn,
  state,
  summary,
  checklist,
  route,
}: SheetProps) {
  const { t } = useTranslation(['review', 'visa-domain'])
  const td = dynamicT(t)

  return (
    <section className="print-sheet" aria-labelledby={`sheet-${id}`}>
      <header className="print-sheet-head">
        <h2 id={`sheet-${id}`} className="print-sheet-title">
          {td(`review:print.generated.${id}`)}
        </h2>
        <p className="print-sheet-meta">
          {dossierName ? `${dossierName} · ` : ''}
          {t('review:print.surface.sheetOf', { index, total })}
        </p>
      </header>

      <div className="print-sheet-body">
        {state === 'unavailable' ? (
          <>
            <p className="print-empty">
              {t('review:print.surface.unavailable')}
            </p>
            <p className="print-empty-hint">
              {td(`review:print.generated.${id}Hint`)}
            </p>
          </>
        ) : (
          <>
            {state === 'partial' && (
              <p className="print-note">{t('review:print.surface.partial')}</p>
            )}
            {id === 'coverSheet' && <CoverSheet summary={summary} />}
            {id === 'submissionChecklist' && (
              <ChecklistSheet checklist={checklist} />
            )}
            {id === 'appointmentSummary' && (
              <AppointmentSheet summary={summary} />
            )}
            {id === 'itinerarySummary' && (
              <ItinerarySheet summary={summary} route={route} />
            )}
          </>
        )}
      </div>

      <footer className="print-sheet-foot">
        <p>{t('review:print.surface.preparedOn', { date: preparedOn })}</p>
        <p>{t('review:print.surface.disclaimer')}</p>
      </footer>
    </section>
  )
}

/** A labelled fact list. A `null` value prints "not recorded", never a guess. */
function Facts({ rows }: { rows: [string, string | null][] }) {
  const { t } = useTranslation('review')
  return (
    <dl className="print-facts">
      {rows.map(([label, value]) => (
        <div key={label} className="print-fact">
          <dt>{label}</dt>
          <dd className={value ? undefined : 'print-fact-missing'}>
            {value ?? t('summary.notRecorded')}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Country names come from `Intl.DisplayNames`, not from the country-pack
 * namespace — that namespace holds only the destinations VisaFlow ships a pack
 * for, so an applicant's *nationality* falls straight through it. The first
 * printout said "PL" where it meant "Poland" (see `src/lib/countries.ts`).
 */
function useCountryName() {
  const { locale } = useLocale()
  return (code: string | null | undefined): string | null =>
    code ? getCountryName(code, locale) : null
}

function CoverSheet({ summary }: { summary: ApplicationSummary }) {
  const { t } = useTranslation(['review', 'visa-domain'])
  const td = dynamicT(t)
  const format = useFormatters()
  const country = useCountryName()

  const dates =
    summary.entryDate && summary.exitDate
      ? t('review:summary.dateRange', {
          start: format.date(summary.entryDate),
          end: format.date(summary.exitDate),
        })
      : null

  return (
    <Facts
      rows={[
        [t('review:summary.applicant'), summary.applicantName],
        [t('review:summary.passport'), summary.passportNumber],
        [t('review:summary.nationality'), country(summary.nationality)],
        [
          t('review:summary.destination'),
          country(summary.destinationCountry.value),
        ],
        [
          t('review:summary.visaType'),
          summary.visaType.value
            ? td(`visa-domain:visaTypes.${summary.visaType.value}`)
            : null,
        ],
        [t('review:summary.travelDates'), dates],
        [
          t('review:summary.duration'),
          summary.nights !== null
            ? t('review:summary.nights', { count: summary.nights })
            : null,
        ],
        [
          t('review:summary.funding'),
          summary.funding.value
            ? td(`visa-domain:financingSource.${summary.funding.value}`)
            : null,
        ],
        [
          t('review:summary.employment'),
          summary.employmentStatus.value
            ? td(
                `visa-domain:employmentStatus.${summary.employmentStatus.value}`
              )
            : null,
        ],
        // Only when recorded. Unlike every other row this one is omitted rather
        // than printed as "not recorded" — an empty refusals line on a sheet
        // handed across a counter reads as an accusation, and having none is
        // both the default and nobody's business (ADR-043).
        ...(summary.refusals.length > 0
          ? ([
              [
                t('review:summary.refusals'),
                summary.refusals
                  .map((refusal) =>
                    [
                      country(refusal.country),
                      refusal.refusedOn ? format.date(refusal.refusedOn) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  )
                  .join(' / '),
              ],
            ] as [string, string | null][])
          : []),
      ]}
    />
  )
}

function AppointmentSheet({ summary }: { summary: ApplicationSummary }) {
  const { t } = useTranslation('review')
  const format = useFormatters()
  const { appointment } = summary

  return (
    <Facts
      rows={[
        [
          t('summary.appointment'),
          appointment.date
            ? [format.date(appointment.date), appointment.time]
                .filter(Boolean)
                .join(' · ')
            : null,
        ],
        [t('summary.appointmentLocation'), appointment.location],
        [t('summary.confirmation'), appointment.confirmationNumber],
      ]}
    />
  )
}

function ItinerarySheet({
  summary,
  route,
}: {
  summary: ApplicationSummary
  route: RouteStop[]
}) {
  const { t } = useTranslation('review')
  const format = useFormatters()
  const country = useCountryName()

  return (
    <>
      <Facts
        rows={[
          [
            t('summary.travelDates'),
            summary.entryDate && summary.exitDate
              ? t('summary.dateRange', {
                  start: format.date(summary.entryDate),
                  end: format.date(summary.exitDate),
                })
              : null,
          ],
          [
            t('summary.duration'),
            summary.nights !== null
              ? t('summary.nights', { count: summary.nights })
              : null,
          ],
        ]}
      />
      {route.length > 0 && (
        <ol className="print-route">
          {route.map((stop, index) => (
            <li key={`${stop.city}-${stop.arrivalDate}-${index}`}>
              <span className="print-route-place">
                {t('print.surface.routeStop', {
                  city: stop.city,
                  country: country(stop.country) ?? stop.country,
                })}
              </span>
              <span className="print-route-dates">
                {format.dateShort(stop.arrivalDate)} –{' '}
                {format.dateShort(stop.departureDate)}
              </span>
              <span className="print-route-nights">
                {t('print.surface.routeNights', { count: stop.nights })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

/**
 * The one sheet with a tick box, because it is the only one the applicant
 * *uses* rather than reads. States come from the checklist model unchanged —
 * no second definition of "ready" is invented for paper (ADR-034).
 */
function ChecklistSheet({ checklist }: { checklist: SubmissionChecklist }) {
  const { t } = useTranslation(['review', 'visa-domain'])
  const td = dynamicT(t)

  return (
    <>
      <p className="print-note">{t('review:print.surface.checklistNote')}</p>
      {checklist.groups.map((group) => (
        <div key={group.id} className="print-group">
          <h3 className="print-group-title">
            {td(`review:checklist.groups.${group.id}`)}
          </h3>
          <ul className="print-checklist">
            {group.rows.map((row) => (
              <li key={`${group.id}-${row.code}`}>
                <span aria-hidden className="print-tickbox" />
                <span className="print-checklist-label">
                  {documentLabel(t, row.code, row.legacyName)}
                </span>
                <span className="print-checklist-state">
                  {td(`review:checklist.state.${row.state}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}
