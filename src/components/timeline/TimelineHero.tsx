import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { TimelineModel } from '@/features/timeline/timeline-model'

interface TimelineHeroProps {
  model: TimelineModel
}

/**
 * The Timeline hero: how much preparation time remains, the overall preparation
 * phase, and the single recommended next step. The next step, its wording, and
 * its route are the Dashboard's `deriveNextActions[0]` verbatim (reused, not
 * re-derived), so Timeline and Dashboard never disagree on "do this first". A
 * calm, factual realism note reports how many tasks are past their suggested
 * date — never a prediction, never an official deadline.
 */
export function TimelineHero({ model }: TimelineHeroProps) {
  const { t } = useTranslation(['timeline', 'dashboard'])
  const td = dynamicT(t)
  const f = useFormatters()

  const days = model.appointmentDaysUntil
  const action = model.primaryAction

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-eyebrow text-muted-foreground uppercase">
              {t('timeline:hero.appointmentEyebrow')}
            </span>
            {model.appointmentDate ? (
              <>
                <span className="text-heading text-foreground inline-flex items-center gap-2">
                  <CalendarClock aria-hidden className="text-primary size-5" />
                  {f.date(model.appointmentDate)}
                </span>
                <span className="text-body text-muted-foreground">
                  {f.relativeDays(model.appointmentDate)}
                  {days != null && days > 0 && (
                    <>
                      {' · '}
                      {t('timeline:hero.prepTimeRemaining', { count: days })}
                    </>
                  )}
                  {days != null && days < 0 && (
                    <>
                      {' '}
                      {' · '}
                      {t('timeline:hero.prepTimePast')}
                    </>
                  )}
                </span>
              </>
            ) : (
              <>
                <span className="text-heading text-foreground">
                  {t('timeline:hero.noAppointment')}
                </span>
                <span className="text-body text-muted-foreground text-pretty">
                  {t('timeline:hero.noAppointmentHint')}
                </span>
              </>
            )}
          </div>

          <StatusBadge tone="info" dot>
            {td(`dashboard:hero.verdict.${model.phase}`, {
              count: model.missingDocuments,
            })}
          </StatusBadge>
        </div>

        {model.applicableTaskCount > 0 && (
          <p className="text-caption text-muted-foreground">
            {model.overdue > 0
              ? t('timeline:hero.realismBehind', { count: model.overdue })
              : t('timeline:hero.realismOnTrack')}
          </p>
        )}

        {action ? (
          <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-4">
            <span className="text-eyebrow text-muted-foreground uppercase">
              {t('timeline:hero.primaryTitle')}
            </span>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-body text-foreground font-medium">
                {td(`dashboard:nextActions.${action.id}`, {
                  count: action.count ?? 0,
                })}
              </span>
              <Button asChild size="sm">
                <Link to={action.to}>
                  {t('dashboard:nextAction.cta')}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            <p className="text-caption text-muted-foreground text-pretty">
              {td(`dashboard:nextAction.reason.${action.id}`)}
            </p>
          </div>
        ) : (
          <div className="bg-muted/40 flex flex-col gap-1 rounded-lg border p-4">
            <span className="text-body text-foreground font-medium">
              {t('dashboard:nextAction.allDoneTitle')}
            </span>
            <p className="text-caption text-muted-foreground">
              {t('dashboard:nextAction.allDoneDescription')}
            </p>
          </div>
        )}

        {!model.appointmentDate && (
          <Link
            to="/trip"
            className="text-primary inline-flex items-center gap-1 self-start rounded-sm text-sm font-medium hover:underline"
          >
            {t('timeline:hero.setAppointment')}
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
