import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  FolderClosed,
  Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Section, SectionHeader } from '@/components/ui/section'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/ui/status-badge'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { FinalReviewModel } from '@/features/review/review-model'
import {
  BUNDLE_STATE_ICON,
  BUNDLE_STATE_TONE,
  PRINTABLE_STATE_TONE,
} from './state-meta'

interface DepartureCheckProps {
  model: FinalReviewModel
}

/**
 * The compact departure check — the view you open on your phone on the way out.
 *
 * Deliberately not a second Final Review: it reads the same `FinalReviewModel`
 * and shows five things in the order you need them at the door — appointment,
 * what goes in the folder, what VisaFlow could print, what is still unresolved,
 * and one action.
 *
 * Designed mobile-first (single column at 390px), because this is the one
 * VisaFlow view likely to be opened on a phone rather than a laptop.
 *
 * It never claims physical possession: VisaFlow holds no files and persists no
 * packed state, so the wording is always "to bring", never "packed" (ADR-033).
 */
export function DepartureCheck({ model }: DepartureCheckProps) {
  const { t } = useTranslation(['review', 'dashboard', 'common'])
  const td = dynamicT(t)
  const format = useFormatters()

  const { appointment } = model.summary
  const unresolved = model.attention.attentionCount
  const unconfirmed = model.readiness.obtained

  return (
    <Section>
      <SectionHeader
        title={t('review:departure.title')}
        description={t('review:departure.description')}
      />

      <Card>
        <CardContent className="flex flex-col gap-5 py-1">
          {/* 1 — Appointment */}
          <div className="space-y-1">
            <h3 className="text-eyebrow text-muted-foreground uppercase">
              {t('review:departure.appointmentTitle')}
            </h3>
            {appointment.date ? (
              <>
                <p className="text-heading text-foreground flex flex-wrap items-baseline gap-x-2">
                  <CalendarClock
                    aria-hidden
                    className="text-muted-foreground size-5 shrink-0 self-center"
                  />
                  <span>{format.dateShort(appointment.date)}</span>
                  {appointment.time && <span>{appointment.time}</span>}
                  <span className="text-body text-muted-foreground font-normal">
                    {format.relativeDays(appointment.date)}
                  </span>
                </p>
                {(appointment.location ?? appointment.confirmationNumber) && (
                  <p className="text-body text-muted-foreground">
                    {[appointment.location, appointment.confirmationNumber]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-body text-muted-foreground">
                {t('review:departure.appointmentNone')}
              </p>
            )}
          </div>

          <Separator />

          {/* 2 — The applicant's own documents */}
          <div className="space-y-2">
            <h3 className="text-body text-foreground flex items-center gap-2 font-semibold">
              <FolderClosed
                aria-hidden
                className="text-muted-foreground size-4 shrink-0"
              />
              {t('review:departure.bundlesTitle')}
            </h3>
            {model.print.physicalBundles.length === 0 ? (
              <p className="text-body text-muted-foreground">
                {t('review:departure.bundlesEmpty')}
              </p>
            ) : (
              <ul className="flex flex-col">
                {model.print.physicalBundles.map((bundle) => {
                  const Icon = BUNDLE_STATE_ICON[bundle.state]
                  return (
                    <li
                      key={bundle.id}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5"
                    >
                      <span className="text-body text-foreground flex min-w-0 items-center gap-2">
                        <Icon
                          aria-hidden
                          className="text-muted-foreground size-4 shrink-0"
                        />
                        {td(`review:print.physical.${bundle.id}`)}
                      </span>
                      <StatusBadge tone={BUNDLE_STATE_TONE[bundle.state]}>
                        {t('review:print.physical.bundleSummary', {
                          ready: bundle.counts.ready,
                          total: bundle.counts.actionable,
                        })}
                      </StatusBadge>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="text-caption text-muted-foreground text-pretty">
              {t('review:departure.bundlesHint')}
            </p>
          </div>

          <Separator />

          {/* 3 — What VisaFlow itself could produce */}
          <div className="space-y-2">
            <h3 className="text-body text-foreground flex items-center gap-2 font-semibold">
              <Printer
                aria-hidden
                className="text-muted-foreground size-4 shrink-0"
              />
              {t('review:departure.sheetsTitle')}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {model.print.generatedSheets.map((sheet) => (
                <li key={sheet.id}>
                  <StatusBadge tone={PRINTABLE_STATE_TONE[sheet.state]} dot>
                    {td(`review:print.generated.${sheet.id}`)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
            <p className="text-caption text-muted-foreground text-pretty">
              {t('review:departure.sheetsHint')}
            </p>
          </div>

          <Separator />

          {/* 4 — What is still open, and 5 — the one action */}
          <div className="space-y-2">
            <h3 className="text-body text-foreground font-semibold">
              {t('review:departure.attentionTitle')}
            </h3>
            {unresolved === 0 && unconfirmed === 0 ? (
              <p className="text-body text-foreground flex items-center gap-2.5">
                <CheckCircle2
                  aria-hidden
                  className="text-success size-5 shrink-0"
                />
                {t('review:departure.attentionNone')}
              </p>
            ) : (
              <ul className="text-body text-muted-foreground space-y-1">
                {unresolved > 0 && (
                  <li>
                    <Link
                      to="/consistency-checks"
                      className="text-foreground hover:text-primary inline-flex items-center gap-1 rounded-sm underline-offset-4 hover:underline"
                    >
                      {t('review:departure.attentionUnresolved', {
                        count: unresolved,
                      })}
                      <ArrowUpRight aria-hidden className="size-3.5" />
                    </Link>
                  </li>
                )}
                {unconfirmed > 0 && (
                  <li>
                    <Link
                      to="/documents"
                      className="text-foreground hover:text-primary inline-flex items-center gap-1 rounded-sm underline-offset-4 hover:underline"
                    >
                      {t('review:departure.attentionUnconfirmed', {
                        count: unconfirmed,
                      })}
                      <ArrowUpRight aria-hidden className="size-3.5" />
                    </Link>
                  </li>
                )}
              </ul>
            )}

            {model.primaryAction && (
              <Button asChild size="sm" className="mt-1 w-full sm:w-auto">
                <Link to={model.primaryAction.to}>
                  {td(`dashboard:nextActions.${model.primaryAction.id}`, {
                    count: model.primaryAction.count ?? 0,
                  })}
                  <ArrowRight />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-caption text-muted-foreground">
        {t('review:departure.footer')}
      </p>
    </Section>
  )
}
