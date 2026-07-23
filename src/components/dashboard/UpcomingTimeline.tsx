import { useTranslation } from 'react-i18next'
import {
  Calendar,
  FileClock,
  Flag,
  Plane,
  PlaneLanding,
  type LucideIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Timeline, TimelineItem } from '@/components/ui/timeline'
import type { StatusTone } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import { documentLabel } from '@/lib/document-label'
import type {
  TimelineItemModel,
  TimelineItemType,
} from '@/features/dashboard/dashboard-model'

interface UpcomingTimelineProps {
  items: TimelineItemModel[]
}

const TYPE_ICON: Record<TimelineItemType, LucideIcon> = {
  appointment: Calendar,
  milestone: Flag,
  trip_entry: Plane,
  trip_exit: PlaneLanding,
  document_expiry: FileClock,
}

const TYPE_TONE: Record<TimelineItemType, StatusTone> = {
  appointment: 'accent',
  milestone: 'neutral',
  trip_entry: 'info',
  trip_exit: 'info',
  document_expiry: 'warning',
}

/** The next dates on the path to applying, rendered as a quiet timeline. */
export function UpcomingTimeline({ items }: UpcomingTimelineProps) {
  const { t } = useTranslation(['dashboard', 'common', 'visa-domain'])
  const td = dynamicT(t)
  const format = useFormatters()

  function titleFor(item: TimelineItemModel): string {
    switch (item.type) {
      case 'milestone':
        return item.nameKey
          ? td(item.nameKey)
          : t('dashboard:timeline.eventType.milestone')
      case 'document_expiry':
        return t('dashboard:timeline.eventType.document_expiry', {
          document: documentLabel(t, item.documentCode ?? ''),
        })
      default:
        return td(`dashboard:timeline.eventType.${item.type}`)
    }
  }

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
                icon={TYPE_ICON[item.type]}
                tone={TYPE_TONE[item.type]}
                status={item.status}
                title={titleFor(item)}
                meta={`${format.dateShort(item.date)} · ${format.relativeDays(item.date)}`}
              />
            ))}
          </Timeline>
        )}
      </CardContent>
    </Card>
  )
}
