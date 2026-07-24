import * as React from 'react'
import { ArrowRight, Plane } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'

interface TravelSegmentCardProps {
  /** Localized transport type, e.g. "Flight". */
  typeLabel: string
  /** Transport-type icon; defaults to a plane. */
  icon?: React.ComponentType<{ className?: string }>
  carrier?: string
  fromLabel: string
  toLabel: string
  /** Preformatted "Apr 1 · 09:00". */
  departLabel?: string
  arriveLabel?: string
  statusLabel?: string
  statusTone?: StatusTone
  actions?: React.ReactNode
  className?: string
}

/**
 * A single transport leg as a boarding-pass-style card rather than a CRUD row:
 * type + carrier, a clear from → to, and departure/arrival times.
 */
function TravelSegmentCard({
  typeLabel,
  icon: Icon = Plane,
  carrier,
  fromLabel,
  toLabel,
  departLabel,
  arriveLabel,
  statusLabel,
  statusTone = 'neutral',
  actions,
  className,
}: TravelSegmentCardProps) {
  return (
    <Card className={cn('py-0', className)}>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full"
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-body text-foreground font-medium">
                {typeLabel}
              </p>
              {carrier && (
                <p className="text-caption text-muted-foreground truncate">
                  {carrier}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {statusLabel && (
              <StatusBadge tone={statusTone} dot>
                {statusLabel}
              </StatusBadge>
            )}
            {actions}
          </div>
        </div>

        <div className="flex items-center gap-2 pl-10">
          <span className="text-body text-foreground min-w-0 truncate">
            {fromLabel}
          </span>
          <ArrowRight
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden
          />
          <span className="text-body text-foreground min-w-0 truncate">
            {toLabel}
          </span>
        </div>

        {(departLabel || arriveLabel) && (
          <div className="text-caption text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 pl-10">
            {departLabel && <span>{departLabel}</span>}
            {arriveLabel && <span>{arriveLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { TravelSegmentCard }
