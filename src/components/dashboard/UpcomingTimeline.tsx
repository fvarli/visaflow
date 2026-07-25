import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Timeline, TimelineItem } from '@/components/ui/timeline'
import { EmptyState } from '@/components/ui/empty-state'
import { useFormatters } from '@/lib/format'
import {
  TIMELINE_TYPE_ICON,
  TIMELINE_TYPE_TONE,
  useTimelineTitle,
} from '@/components/dashboard/timeline-labels'
import type { TimelineItemModel } from '@/features/dashboard/dashboard-model'

interface UpcomingTimelineProps {
  items: TimelineItemModel[]
}

/** The next dates on the path to applying, rendered as a quiet timeline. */
export function UpcomingTimeline({ items }: UpcomingTimelineProps) {
  const { t } = useTranslation(['dashboard', 'common', 'visa-domain'])
  const format = useFormatters()
  const timelineTitle = useTimelineTitle()

  return (
    <Card className="animate-fade-in-up h-full">
      <CardHeader>
        <CardTitle>{t('dashboard:timeline.title')}</CardTitle>
        <CardDescription>{t('dashboard:timeline.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            variant="inline"
            icon={Calendar}
            title={t('dashboard:timeline.empty')}
          />
        ) : (
          <Timeline>
            {items.map((item) => (
              <TimelineItem
                key={item.id}
                icon={TIMELINE_TYPE_ICON[item.type]}
                tone={TIMELINE_TYPE_TONE[item.type]}
                status={item.status}
                title={timelineTitle(item)}
                meta={`${format.dateShort(item.date)} · ${format.relativeDays(item.date)}`}
              />
            ))}
          </Timeline>
        )}
      </CardContent>
    </Card>
  )
}
