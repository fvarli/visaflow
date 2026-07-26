import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ReadinessRing } from '@/components/ui/readiness-ring'
import { StatusBadge } from '@/components/ui/status-badge'
import { useFindingText } from '@/lib/finding-text'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { ValidationHeroModel } from '@/features/validation/validation-model'

interface ValidationHeroProps {
  hero: ValidationHeroModel
}

/**
 * The Review Hero: answers "how ready is my dossier, and what should I look at
 * next?" at a glance. Readiness is the single dominant indicator (an
 * organizational ring, never a prediction — ADR-016); the counts and the next
 * recommendation are calm and factual.
 */
export function ValidationHero({ hero }: ValidationHeroProps) {
  const { t } = useTranslation(['validation', 'common'])
  const td = dynamicT(t)
  const findingText = useFindingText()

  const {
    completionPercent,
    checksPassed,
    checksTotal,
    attentionCount,
    noteCount,
    verdict,
    nextRecommendation,
  } = hero

  return (
    <Card className="animate-fade-in-up overflow-hidden">
      <CardContent className="flex flex-col gap-6 py-2 sm:flex-row sm:items-center sm:gap-8">
        <ReadinessRing
          value={completionPercent}
          size={132}
          label={t('validation:center.hero.readinessLabel')}
          caption={td(`validation:center.hero.verdict.${verdict}`)}
          className="mx-auto shrink-0 sm:mx-0"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="space-y-1.5">
            <p className="text-heading text-foreground text-balance font-semibold">
              {td(`validation:center.hero.headline.${verdict}`)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="success" dot>
                {t('validation:center.hero.checksPassed', {
                  count: checksPassed,
                  total: checksTotal,
                })}
              </StatusBadge>
              {attentionCount > 0 && (
                <StatusBadge tone="warning" dot>
                  {t('validation:center.hero.needAttention', {
                    count: attentionCount,
                  })}
                </StatusBadge>
              )}
              {noteCount > 0 && (
                <StatusBadge tone="info" dot>
                  {t('validation:center.hero.notes', { count: noteCount })}
                </StatusBadge>
              )}
            </div>
          </div>

          {nextRecommendation ? (
            <div className="bg-muted/50 flex flex-col gap-1 rounded-lg border p-3.5">
              <span className="text-eyebrow text-muted-foreground uppercase">
                {t('validation:center.hero.nextRecommendation')}
              </span>
              <span className="text-body text-foreground">
                {findingText(nextRecommendation.finding).title}
              </span>
              {nextRecommendation.action && (
                <Link
                  to={nextRecommendation.action.route}
                  className="text-primary mt-0.5 inline-flex w-fit items-center gap-1 rounded-sm text-sm font-medium hover:underline"
                >
                  {t('validation:center.actions.goThere')}
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground flex items-center gap-2.5">
              <CheckCircle2 className="text-success size-5 shrink-0" />
              <p className="text-body">
                {t('validation:center.hero.allClearBody')}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
