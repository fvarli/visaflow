import * as React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  icon?: React.ComponentType<{ className?: string }>
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  /**
   * `panel` renders a bordered card — for a page that has nothing to show.
   * `inline` renders bare — for an empty region inside a page that does.
   */
  variant?: 'panel' | 'inline'
}

/**
 * Replaces the "No application data loaded" alert that was duplicated across
 * 9 pages. An empty state is an invitation, not an error, so it is neutral —
 * never a destructive-red alert.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'panel',
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center px-6 py-14 text-center',
        variant === 'panel' &&
          'bg-card rounded-xl border border-dashed shadow-xs',
        className
      )}
      {...props}
    >
      {Icon && (
        <div
          aria-hidden
          className="bg-muted text-muted-foreground mb-4 flex size-10 items-center justify-center rounded-full"
        >
          <Icon className="size-5" />
        </div>
      )}
      <h2 className="text-heading text-foreground">{title}</h2>
      {description && (
        <p className="text-body text-muted-foreground mt-1.5 max-w-sm text-pretty">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex items-center gap-2">{action}</div>}
    </div>
  )
}

export { EmptyState }
