import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { ReviewArea } from '@/features/validation/validation-model'
import { AREA_ICON } from './area-meta'

interface ReadinessSummaryProps {
  ready: ReviewArea[]
}

/**
 * The reassuring counterpart to the findings: the dossier areas that are on
 * file and currently raise no findings. Reinforces momentum ("these already
 * look good") rather than dwelling only on what is left.
 */
export function ReadinessSummary({ ready }: ReadinessSummaryProps) {
  const { t } = useTranslation('validation')
  const td = dynamicT(t)
  if (ready.length === 0) return null

  return (
    <Card className="animate-fade-in-up">
      <CardHeader>
        <h2 className="text-heading text-foreground flex items-center gap-2">
          <CheckCircle2 className="text-success size-5 shrink-0" />
          {t('center.ready.title')}
        </h2>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-wrap gap-2">
          {ready.map((area) => {
            const Icon = AREA_ICON[area.id]
            return (
              <li
                key={area.id}
                className="bg-success-muted text-success-foreground border-success-border inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
              >
                <Icon aria-hidden className="size-3.5" />
                {td(`center.areas.${area.id}`)}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
