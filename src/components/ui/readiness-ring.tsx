import * as React from 'react'
import { cn } from '@/lib/utils'

interface ReadinessRingProps extends Omit<
  React.ComponentProps<'div'>,
  'children'
> {
  /** 0–100. Drives the arc length. */
  value: number
  /** What the ring measures — becomes the start of the accessible label. */
  label: string
  /** Formatted percentage shown in the centre. Defaults to `NN%`. */
  valueLabel?: string
  /** A short organizational state shown beneath the percentage. */
  caption?: string
  /** Diameter in px. */
  size?: number
  strokeWidth?: number
}

/**
 * An understated circular readiness indicator.
 *
 * One continuous arc — not a segmented, gamified ring — on a neutral track,
 * using the cobalt accent proportionally to actual progress (the same discipline
 * as the linear Progress bar). It shows how assembled a dossier is; it is never
 * a prediction of a visa outcome (ADR-016).
 *
 * The arc animates via a CSS transition, so the global `prefers-reduced-motion`
 * rule disables it for free.
 */
function ReadinessRing({
  value,
  label,
  valueLabel,
  caption,
  size = 168,
  strokeWidth = 10,
  className,
  ...props
}: ReadinessRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const shownValue = valueLabel ?? `${clamped}%`

  const ariaLabel = caption
    ? `${label}: ${shownValue} · ${caption}`
    : `${label}: ${shownValue}`

  return (
    <div
      data-slot="readiness-ring"
      role="img"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center',
        className
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        aria-hidden
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-4 text-center">
        <span
          data-numeric
          className="text-title text-foreground font-semibold tracking-[-0.02em]"
        >
          {shownValue}
        </span>
        {caption && (
          <span className="text-caption text-muted-foreground text-balance">
            {caption}
          </span>
        )}
      </div>
    </div>
  )
}

export { ReadinessRing }
