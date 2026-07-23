import * as React from 'react'
import { cn } from '@/lib/utils'
import type { StatusTone } from '@/components/ui/status-badge'

/**
 * A quiet vertical timeline.
 *
 * Typography and spacing carry the hierarchy; a hairline connector links the
 * markers. No map, no heavy decoration. Presentational only — callers pass
 * already-formatted title and meta text.
 */
function Timeline({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="timeline"
      className={cn('flex flex-col', className)}
      {...props}
    />
  )
}

// Literal class maps — Tailwind only generates classes it can see as whole
// strings, so these must not be built by string manipulation.
const ICON_TONE: Record<StatusTone, string> = {
  neutral: 'text-muted-foreground',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  accent: 'text-primary',
}

const DOT_TONE: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground/60',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  accent: 'bg-primary',
}

interface TimelineItemProps extends Omit<React.ComponentProps<'li'>, 'title'> {
  title: React.ReactNode
  /** Secondary line — a date or relative countdown. */
  meta?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  tone?: StatusTone
  /** Past items read muted; today is emphasized. */
  status?: 'past' | 'today' | 'upcoming'
}

function TimelineItem({
  title,
  meta,
  icon: Icon,
  tone = 'neutral',
  status = 'upcoming',
  className,
  ...props
}: TimelineItemProps) {
  return (
    <li
      data-slot="timeline-item"
      data-status={status}
      className={cn(
        'flex gap-3 pb-5 last:pb-0 [&:last-child_[data-line]]:hidden',
        className
      )}
      {...props}
    >
      <div className="relative flex flex-col items-center pt-0.5">
        <span
          aria-hidden
          className={cn(
            'bg-card flex size-5 shrink-0 items-center justify-center rounded-full border',
            status === 'today' && 'border-primary'
          )}
        >
          {Icon ? (
            <Icon className={cn('size-3', ICON_TONE[tone])} />
          ) : (
            <span className={cn('size-2 rounded-full', DOT_TONE[tone])} />
          )}
        </span>
        <span data-line aria-hidden className="bg-border mt-1 w-px flex-1" />
      </div>
      <div className={cn('min-w-0 pb-0.5', status === 'past' && 'opacity-60')}>
        <p className="text-body text-foreground font-medium">{title}</p>
        {meta && (
          <p data-numeric className="text-caption text-muted-foreground mt-0.5">
            {meta}
          </p>
        )}
      </div>
    </li>
  )
}

export { Timeline, TimelineItem }
