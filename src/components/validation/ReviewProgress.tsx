import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { dynamicT } from '@/lib/i18n-dynamic'
import type {
  ReviewArea,
  ReviewStatus,
} from '@/features/validation/validation-model'
import { AREA_ICON } from './area-meta'

const STATUS_LABEL_KEY: Record<ReviewStatus, string> = {
  captured: 'center.review.status.captured',
  needsReview: 'center.review.status.needsReview',
  incomplete: 'center.review.status.incomplete',
}

interface ReviewProgressProps {
  review: ReviewArea[]
}

/**
 * The bottom-of-page dossier summary: every relevant area with a plain-language
 * status (captured / needs review / incomplete). A calm map of where the
 * dossier stands, section by section — the same review vocabulary the trip and
 * applicant review steps use.
 */
export function ReviewProgress({ review }: ReviewProgressProps) {
  const { t } = useTranslation('validation')
  const td = dynamicT(t)
  if (review.length === 0) return null

  return (
    <Card className="animate-fade-in-up">
      <CardHeader>
        <h2 className="text-heading text-foreground">
          {t('center.review.title')}
        </h2>
      </CardHeader>
      <CardContent>
        <ul className="divide-border divide-y">
          {review.map((area) => {
            const Icon = AREA_ICON[area.id]
            return (
              <li
                key={area.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-body text-foreground flex min-w-0 items-center gap-2.5">
                  <Icon
                    aria-hidden
                    className="text-muted-foreground size-4 shrink-0"
                  />
                  {td(`center.areas.${area.id}`)}
                </span>
                <StatusBadge tone={area.tone} dot>
                  {td(STATUS_LABEL_KEY[area.status])}
                </StatusBadge>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
