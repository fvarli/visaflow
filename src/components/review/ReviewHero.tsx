import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CalendarCheck, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ReadinessRing } from '@/components/ui/readiness-ring'
import { StatusBadge } from '@/components/ui/status-badge'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { FinalReviewModel } from '@/features/review/review-model'

interface ReviewHeroProps {
  model: FinalReviewModel
}

/**
 * The Review Hero: what is this application, when is the appointment, how
 * prepared is the dossier, and is anything waiting.
 *
 * Readiness is the Dashboard's organizational readiness — the same number the
 * Dashboard ring and the Timeline phase show — never a new score and never a
 * statement about the visa itself (ADR-016).
 */
export function ReviewHero({ model }: ReviewHeroProps) {
  const { t } = useTranslation(['review', 'dashboard'])
  const td = dynamicT(t)
  const format = useFormatters()

  const { readiness, appointmentDate, appointmentDaysUntil, primaryAction } =
    model
  const { attentionCount } = model.attention
  const checklistCounts = model.checklist.counts

  return (
    <Card className="animate-fade-in-up overflow-hidden">
      <CardContent className="flex flex-col gap-6 py-2 sm:flex-row sm:items-center sm:gap-8">
        <ReadinessRing
          value={readiness.percent}
          size={132}
          label={t('review:hero.readiness')}
          caption={td(`review:hero.state.${readiness.state}`)}
          className="mx-auto shrink-0 sm:mx-0"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="space-y-1.5">
            <p className="text-heading text-foreground flex flex-wrap items-baseline gap-x-2 font-semibold">
              <CalendarCheck
                aria-hidden
                className="text-muted-foreground size-5 shrink-0 self-center"
              />
              {appointmentDate ? (
                <>
                  <span>{format.dateShort(appointmentDate)}</span>
                  {appointmentDaysUntil !== null && (
                    <span className="text-body text-muted-foreground font-normal">
                      {format.relativeDays(appointmentDate)}
                    </span>
                  )}
                </>
              ) : (
                <span>{t('review:hero.appointmentNone')}</span>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="accent" dot>
                {t('review:hero.checklistReady', {
                  ready: checklistCounts.ready,
                  total: checklistCounts.actionable,
                })}
              </StatusBadge>
              {attentionCount > 0 ? (
                <StatusBadge tone="warning" dot>
                  {t('review:hero.attention', { count: attentionCount })}
                </StatusBadge>
              ) : (
                <StatusBadge tone="success" dot>
                  {t('review:hero.attentionNone')}
                </StatusBadge>
              )}
            </div>
            <p className="text-caption text-muted-foreground">
              {t('review:hero.readinessHint')}
            </p>
          </div>

          {primaryAction ? (
            <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-4">
              <span className="text-eyebrow text-muted-foreground uppercase">
                {t('review:hero.nextStep')}
              </span>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-body text-foreground font-medium">
                  {td(`dashboard:nextActions.${primaryAction.id}`, {
                    count: primaryAction.count ?? 0,
                  })}
                </span>
                <Button asChild size="sm">
                  <Link to={primaryAction.to}>
                    {t('dashboard:nextAction.cta')}
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <p className="text-caption text-muted-foreground text-pretty">
                {td(`dashboard:nextAction.reason.${primaryAction.id}`)}
              </p>
            </div>
          ) : (
            <div className="text-muted-foreground flex items-center gap-2.5">
              <CheckCircle2 className="text-success size-5 shrink-0" />
              <p className="text-body">
                {t('dashboard:nextAction.allDoneDescription')}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
