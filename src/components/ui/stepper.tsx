import * as React from 'react'
import { Check } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export type StepStatus = 'complete' | 'current' | 'upcoming'

export interface StepperStep {
  id: string
  title: string
  status: StepStatus
}

interface StepperProps {
  steps: StepperStep[]
  /** Index of the active step (drives focus/progress and "Step X of N"). */
  current: number
  /** Navigate to a step. Only complete or current steps are selectable. */
  onSelect?: (index: number) => void
  /** Accessible name for the navigation landmark. */
  ariaLabel: string
  /** Localized "Step 2 of 5" label shown on the compact (mobile) bar. */
  progressLabel?: React.ReactNode
  className?: string
}

/**
 * Progress rail for a guided, multi-step flow.
 *
 * Presentational + navigational only — it renders whatever step statuses it is
 * given and reports selections back; it never decides completeness itself. On
 * large screens it is a vertical rail with numbered markers and connectors; on
 * smaller screens it collapses to a compact "Step X of N" bar with the current
 * title and a proportional progress track, so a phone never has to show five
 * stacked rows above the form.
 */
function Stepper({
  steps,
  current,
  onSelect,
  ariaLabel,
  progressLabel,
  className,
}: StepperProps) {
  const total = steps.length
  const value = total > 0 ? Math.round(((current + 1) / total) * 100) : 0
  const currentStep = steps[current]

  return (
    <nav aria-label={ariaLabel} className={className}>
      {/* Compact bar — phones and tablets */}
      <div className="flex flex-col gap-2 lg:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-eyebrow text-muted-foreground uppercase">
            {progressLabel}
          </p>
          <p className="text-caption text-muted-foreground">{value}%</p>
        </div>
        {currentStep && (
          <p className="text-heading text-foreground">{currentStep.title}</p>
        )}
        <Progress value={value} />
      </div>

      {/* Vertical rail — desktop */}
      <ol className="hidden lg:flex lg:flex-col">
        {steps.map((step, index) => {
          const selectable =
            !!onSelect &&
            (step.status === 'complete' || step.status === 'current')
          const isLast = index === steps.length - 1

          return (
            <li key={step.id} className="relative flex gap-3">
              {/* Connector between markers */}
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-7 left-[0.6875rem] h-[calc(100%-1.25rem)] w-px',
                    step.status === 'complete' ? 'bg-primary/40' : 'bg-border'
                  )}
                />
              )}

              <button
                type="button"
                onClick={selectable ? () => onSelect?.(index) : undefined}
                disabled={!selectable}
                aria-current={step.status === 'current' ? 'step' : undefined}
                className={cn(
                  'group flex flex-1 items-center gap-3 rounded-md py-2 pr-2 text-left transition-colors',
                  selectable && 'hover:bg-accent',
                  !selectable && 'cursor-default'
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border text-caption font-medium transition-colors',
                    step.status === 'complete' &&
                      'border-primary bg-primary text-primary-foreground',
                    step.status === 'current' && 'border-primary text-primary',
                    step.status === 'upcoming' &&
                      'border-border text-muted-foreground'
                  )}
                >
                  {step.status === 'complete' ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    'text-body min-w-0 truncate',
                    step.status === 'upcoming'
                      ? 'text-muted-foreground'
                      : 'text-foreground',
                    step.status === 'current' && 'font-medium'
                  )}
                >
                  {step.title}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { Stepper }
