import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CalendarClock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReadinessRing } from '@/components/ui/readiness-ring'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import { ACTION_ICON, actionLabel } from '@/components/dashboard/action-meta'
import type {
  ActionDescriptor,
  CountdownModel,
  ReadinessState,
} from '@/features/dashboard/dashboard-model'

interface ReadinessHeroProps {
  percent: number
  state: ReadinessState
  missingCount: number
  appointment: CountdownModel
  primaryAction?: ActionDescriptor
}

/**
 * The command-center anchor: how ready the dossier is, how close the
 * appointment is, and the single most useful next step. Readiness is an
 * organizational signal only — never a prediction of a visa outcome.
 */
export function ReadinessHero({
  percent,
  state,
  missingCount,
  appointment,
  primaryAction,
}: ReadinessHeroProps) {
  const { t } = useTranslation(['dashboard', 'common'])
  const td = dynamicT(t)
  const format = useFormatters()

  const verdict =
    state === 'documents_remaining'
      ? td('dashboard:hero.verdict.documents_remaining', {
          count: missingCount,
        })
      : td(`dashboard:hero.verdict.${state}`)

  const PrimaryIcon = primaryAction ? ACTION_ICON[primaryAction.id] : null

  return (
    <Card className="animate-fade-in overflow-hidden">
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <ReadinessRing
          value={percent}
          label={t('dashboard:hero.readinessLabel')}
          valueLabel={format.percent(percent)}
          caption={verdict}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <p className="text-eyebrow text-muted-foreground uppercase">
              {t('dashboard:hero.readinessLabel')}
            </p>
            <p className="text-body text-muted-foreground text-pretty">
              {t('dashboard:hero.subtitle')}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <CalendarClock
              aria-hidden
              className="text-muted-foreground size-4 shrink-0"
            />
            <span className="text-body text-foreground" data-numeric>
              {appointment.date
                ? `${format.dateShort(appointment.date)} · ${format.relativeDays(appointment.date)}`
                : t('dashboard:metrics.notScheduled')}
            </span>
          </div>

          {primaryAction ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">
                {t('dashboard:hero.primaryActionLabel')}
              </span>
              <Button asChild className="w-full justify-between sm:w-auto">
                <Link to={primaryAction.to}>
                  <span className="flex items-center gap-2">
                    {PrimaryIcon && <PrimaryIcon className="size-4" />}
                    {actionLabel(td, primaryAction)}
                  </span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-body text-foreground font-medium">
              {t('dashboard:hero.allDone')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
