import * as React from 'react'
import { cn } from '@/lib/utils'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'

interface StatCardProps extends React.ComponentProps<'div'> {
  label: React.ReactNode
  value: React.ReactNode
  /** Secondary line under the value — a delta, a countdown, a qualifier. */
  hint?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  /** Badge on the right. Tone is the ONLY color a stat card may carry. */
  badge?: { label: React.ReactNode; tone?: StatusTone }
  /** Renders the value muted, for "not set" placeholders. */
  muted?: boolean
}

/**
 * A single metric.
 *
 * Deliberately monochrome: the value is foreground, the label is muted, and
 * the icon is muted. Per the accent discipline, a metric is information, not
 * an action — so nothing here is cobalt. Status is carried by the optional
 * badge, which is the one place tone is allowed in.
 */
function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  badge,
  muted = false,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        'bg-card rounded-xl border p-5 shadow-xs transition-colors',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-caption text-muted-foreground flex items-center gap-2 font-medium">
          {Icon && <Icon className="size-3.5 opacity-70" />}
          {label}
        </div>
        {badge && (
          <StatusBadge tone={badge.tone ?? 'neutral'}>
            {badge.label}
          </StatusBadge>
        )}
      </div>

      <div
        data-numeric
        className={cn(
          'mt-3 text-[1.625rem] leading-8 font-semibold tracking-[-0.02em]',
          muted ? 'text-muted-foreground text-xl' : 'text-foreground'
        )}
      >
        {value}
      </div>

      {hint && (
        <p data-numeric className="text-caption text-muted-foreground mt-1">
          {hint}
        </p>
      )}
    </div>
  )
}

export { StatCard }
