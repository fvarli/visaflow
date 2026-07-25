import { useTranslation } from 'react-i18next'
import {
  Calendar,
  FileClock,
  Flag,
  Plane,
  PlaneLanding,
  type LucideIcon,
} from 'lucide-react'
import type { StatusTone } from '@/components/ui/status-badge'
import { dynamicT } from '@/lib/i18n-dynamic'
import { documentLabel } from '@/lib/document-label'
import type {
  TimelineItemModel,
  TimelineItemType,
} from '@/features/dashboard/dashboard-model'

/** Icon per timeline event type. Shared by the hero milestone and the timeline. */
export const TIMELINE_TYPE_ICON: Record<TimelineItemType, LucideIcon> = {
  appointment: Calendar,
  milestone: Flag,
  trip_entry: Plane,
  trip_exit: PlaneLanding,
  document_expiry: FileClock,
}

/** Tone per timeline event type. */
export const TIMELINE_TYPE_TONE: Record<TimelineItemType, StatusTone> = {
  appointment: 'accent',
  milestone: 'neutral',
  trip_entry: 'info',
  trip_exit: 'info',
  document_expiry: 'warning',
}

/**
 * Resolve a timeline item's human title. Shared by the readiness hero (which
 * shows the single next milestone) and the full upcoming timeline, so the
 * event-label logic lives in exactly one place.
 */
export function useTimelineTitle() {
  const { t } = useTranslation(['dashboard', 'common', 'visa-domain'])
  const td = dynamicT(t)

  return (item: TimelineItemModel): string => {
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
}
