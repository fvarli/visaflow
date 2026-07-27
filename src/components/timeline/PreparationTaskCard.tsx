import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { dynamicT } from '@/lib/i18n-dynamic'
import type {
  PreparationTask,
  TaskStatus,
} from '@/features/timeline/timeline-tasks'
import { taskLink } from '@/features/timeline/timeline-links'
import { DateWindowBadge } from './DateWindowBadge'

interface PreparationTaskCardProps {
  task: PreparationTask
}

const STATUS_TONE: Record<TaskStatus, StatusTone> = {
  notStarted: 'neutral',
  inProgress: 'info',
  ready: 'success',
  needsAttention: 'warning',
  // Overdue is a plan cue, not an alarm — amber, never a red wall.
  overdue: 'warning',
  notApplicable: 'neutral',
}

/**
 * One preparation task — what to do, why now, its recommended target window, its
 * status, and where to complete it. Recommendations use plan language ("Plan to
 * complete"), never an official deadline. Completed/not-applicable tasks render
 * calmly and compactly.
 */
export function PreparationTaskCard({ task }: PreparationTaskCardProps) {
  const { t } = useTranslation(['timeline', 'visa-domain'])
  const td = dynamicT(t)
  const title = td(task.titleKey)

  return (
    <div className="bg-card flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-body text-foreground font-medium">{title}</p>
        <StatusBadge tone={STATUS_TONE[task.status]} dot>
          {t(`timeline:plan.status.${task.status}`)}
        </StatusBadge>
      </div>

      <p className="text-caption text-muted-foreground text-pretty">
        <span className="text-foreground/70 font-medium">
          {t('timeline:plan.whyNow')}:{' '}
        </span>
        {td(task.reasonKey)}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <DateWindowBadge date={task.targetDate} />
        <Link
          to={taskLink(task.domain)}
          className="text-primary inline-flex items-center gap-1 rounded-sm text-sm font-medium hover:underline"
          aria-label={t('timeline:plan.openFor', { task: title })}
        >
          {t('timeline:plan.open')}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
