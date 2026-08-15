import { useTranslation } from 'react-i18next'
import { CalendarClock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ReadinessRing } from '@/components/ui/readiness-ring'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  TIMELINE_TYPE_ICON,
  useTimelineTitle,
} from '@/components/dashboard/timeline-labels'
import type { TimelineItemModel } from '@/features/dashboard/dashboard-model'
import type { ReadinessState } from '@/features/readiness/readiness-model'

interface ReadinessHeroProps {
  percent: number
  state: ReadinessState
  outstandingCount: number
  /** The nearest upcoming date, shown beneath the verdict. */
  nextMilestone: TimelineItemModel | null
}

/**
 * The command-center anchor and the single dominant progress indicator: how
 * assembled the dossier is, in one large ring, with the nearest milestone
 * beneath it. Readiness is an organizational signal only — never a prediction
 * of a visa outcome (ADR-016). The recommended action lives in its own section.
 */
export function ReadinessHero({
  percent,
  state,
  outstandingCount,
  nextMilestone,
}: ReadinessHeroProps) {
  const { t } = useTranslation(['dashboard', 'common'])
  const td = dynamicT(t)
  const format = useFormatters()
  const timelineTitle = useTimelineTitle()

  const verdict =
    state === 'documents_remaining'
      ? td('dashboard:hero.verdict.documents_remaining', {
          count: outstandingCount,
        })
      : td(`dashboard:hero.verdict.${state}`)

  const MilestoneIcon = nextMilestone
    ? TIMELINE_TYPE_ICON[nextMilestone.type]
    : CalendarClock

  return (
    <Card className="animate-fade-in h-full overflow-hidden">
      <CardContent className="flex h-full flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <ReadinessRing
          value={percent}
          size={188}
          label={t('common:readiness.label')}
          valueLabel={format.percent(percent)}
          caption={verdict}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <p className="text-eyebrow text-muted-foreground uppercase">
              {t('common:readiness.label')}
            </p>
            <p className="text-heading text-foreground text-balance">
              {verdict}
            </p>
            <p className="text-body text-muted-foreground text-pretty">
              {t('common:readiness.hint')}
            </p>
          </div>

          <div className="border-border/60 flex flex-col gap-1.5 border-t pt-4">
            <span className="text-caption text-muted-foreground">
              {t('dashboard:hero.nextMilestoneLabel')}
            </span>
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <MilestoneIcon
                aria-hidden
                className="text-muted-foreground size-4 shrink-0"
              />
              {nextMilestone ? (
                <span className="text-body text-foreground min-w-0">
                  {timelineTitle(nextMilestone)}
                  <span className="text-muted-foreground" data-numeric>
                    {' · '}
                    {format.relativeDays(nextMilestone.date)}
                  </span>
                </span>
              ) : (
                <span className="text-body text-muted-foreground">
                  {t('dashboard:hero.nextMilestoneEmpty')}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
