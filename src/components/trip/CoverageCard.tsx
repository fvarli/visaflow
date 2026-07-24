import * as React from 'react'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'

interface CoverageCardProps {
  provider: string
  /** Preformatted "Apr 1 – Apr 10". */
  periodLabel?: string
  /** Preformatted "€50,000". */
  amountLabel?: string
  amountCaption?: string
  /**
   * Whether the coverage spans the whole trip. Derived from validation
   * findings by the caller — organizational, never a legal judgment.
   * `null` when unknown / not assessable.
   */
  spansTrip?: boolean | null
  spansFullLabel?: string
  spansGapLabel?: string
  statusLabel?: string
  statusTone?: StatusTone
  actions?: React.ReactNode
  className?: string
}

/**
 * Insurance as a travel safeguard card. Beyond the provider and coverage
 * window it shows, plainly, whether the policy covers the full trip — the one
 * thing a traveller most wants to confirm — without implying any legal or
 * approval outcome.
 */
function CoverageCard({
  provider,
  periodLabel,
  amountLabel,
  amountCaption,
  spansTrip = null,
  spansFullLabel,
  spansGapLabel,
  statusLabel,
  statusTone = 'neutral',
  actions,
  className,
}: CoverageCardProps) {
  const covers = spansTrip === true
  const SpanIcon = covers ? ShieldCheck : ShieldAlert

  return (
    <Card className={cn('py-0', className)}>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full"
            >
              <ShieldCheck className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-body text-foreground font-medium">
                {provider}
              </p>
              {periodLabel && (
                <p className="text-caption text-muted-foreground">
                  {periodLabel}
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

        {amountLabel && (
          <div className="pl-10">
            <span className="text-body text-foreground font-medium">
              {amountLabel}
            </span>
            {amountCaption && (
              <span className="text-caption text-muted-foreground">
                {' '}
                {amountCaption}
              </span>
            )}
          </div>
        )}

        {spansTrip !== null && (spansFullLabel || spansGapLabel) && (
          <div
            className={cn(
              'flex items-center gap-2 pl-10 text-caption',
              covers ? 'text-success-foreground' : 'text-warning-foreground'
            )}
          >
            <SpanIcon className="size-4 shrink-0" aria-hidden />
            <span>{covers ? spansFullLabel : spansGapLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { CoverageCard }
