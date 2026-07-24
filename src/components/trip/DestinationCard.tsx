import * as React from 'react'
import { MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'

interface DestinationCardProps {
  city: string
  countryLabel?: string
  /** Preformatted "Apr 1 – Apr 5". */
  dateRangeLabel?: string
  /** Preformatted "4 nights" (locale plural handled by the caller). */
  nightsLabel: string
  /** nights / longest-stay nights, 0–1, for the duration bar. */
  ratio: number
  isMain?: boolean
  mainLabel?: string
  /** e.g. "Hotel booked" / "No stay yet". */
  accommodationLabel?: string
  accommodationTone?: StatusTone
  /** Reorder / edit / remove controls, injected by RouteBuilder. */
  actions?: React.ReactNode
  className?: string
}

/**
 * One itinerary entry — reads like a travel card, not a table row. Shows the
 * city, dates, a calm nights bar (scaled to the longest stay so relative
 * duration is legible at a glance) and an accommodation-status hint. The main
 * destination is quietly badged.
 */
function DestinationCard({
  city,
  countryLabel,
  dateRangeLabel,
  nightsLabel,
  ratio,
  isMain = false,
  mainLabel,
  accommodationLabel,
  accommodationTone = 'neutral',
  actions,
  className,
}: DestinationCardProps) {
  return (
    <Card
      className={cn(
        'py-0',
        isMain && 'border-primary/40 bg-primary/[0.02]',
        className
      )}
    >
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MapPin
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
              <p className="text-body text-foreground truncate font-medium">
                {city}
                {countryLabel ? (
                  <span className="text-muted-foreground font-normal">
                    {' · '}
                    {countryLabel}
                  </span>
                ) : null}
              </p>
              {isMain && mainLabel && (
                <StatusBadge tone="accent">{mainLabel}</StatusBadge>
              )}
            </div>
            {dateRangeLabel && (
              <p className="text-caption text-muted-foreground mt-1 pl-6">
                {dateRangeLabel}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-1">{actions}</div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-6">
          <Progress
            value={Math.round(ratio * 100)}
            className="h-1.5 max-w-[10rem] flex-1"
          />
          <span className="text-caption text-muted-foreground shrink-0">
            {nightsLabel}
          </span>
        </div>

        {accommodationLabel && (
          <div className="pl-6">
            <StatusBadge tone={accommodationTone} dot>
              {accommodationLabel}
            </StatusBadge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { DestinationCard }
