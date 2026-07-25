import type { ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  type LucideIcon,
} from 'lucide-react'
import type { StatusTone } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'

type CoverageTone = Extract<
  StatusTone,
  'success' | 'warning' | 'danger' | 'neutral'
>

const TONE_ICON: Record<CoverageTone, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
  neutral: CircleDashed,
}

const TONE_ICON_CLASS: Record<CoverageTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-muted-foreground',
}

interface CoverageSummaryProps {
  tone: CoverageTone
  title: string
  description?: ReactNode
  /** A calm, secondary action — e.g. a "go to the editor" link. */
  action?: ReactNode
  className?: string
}

/**
 * A calm coverage status row: is the trip fully covered, is there a gap, an
 * overlap, or nothing yet. Factual and non-alarming (uses tone, an icon, and
 * text — never colour alone). Fed by validation findings and the route-dates
 * coverage helper; it renders state, it does not compute consistency.
 */
export function CoverageSummary({
  tone,
  title,
  description,
  action,
  className,
}: CoverageSummaryProps) {
  const Icon = TONE_ICON[tone]
  return (
    <div
      className={cn(
        'bg-muted/40 flex items-start gap-3 rounded-lg px-4 py-3',
        className
      )}
    >
      <Icon
        aria-hidden
        className={cn('mt-0.5 size-4 shrink-0', TONE_ICON_CLASS[tone])}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-body text-foreground">{title}</p>
        {description && (
          <p className="text-caption text-muted-foreground text-pretty">
            {description}
          </p>
        )}
        {action}
      </div>
    </div>
  )
}
