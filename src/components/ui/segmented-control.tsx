import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onValueChange: (value: T) => void
  /** Accessible name for the group (it is a radiogroup). */
  ariaLabel: string
  size?: 'sm' | 'default'
  className?: string
}

/**
 * A compact option switcher — used for the Documents view switch (Cards /
 * List / Table) and reusable anywhere a small set of mutually-exclusive views
 * or modes is chosen.
 *
 * Implemented as an ARIA radiogroup with roving tabindex: Tab moves into the
 * active segment, arrow keys move between segments (and select), Home/End jump
 * to the ends. The selected segment lifts on the card surface rather than
 * relying on color alone.
 */
function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  ariaLabel,
  size = 'default',
  className,
}: SegmentedControlProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const currentIndex = options.findIndex((o) => o.value === value)

  const move = (index: number) => {
    const n = options.length
    if (n === 0) return
    const next = ((index % n) + n) % n
    const opt = options[next]
    if (!opt) return
    onValueChange(opt.value)
    refs.current[next]?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        move(currentIndex + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        move(currentIndex - 1)
        break
      case 'Home':
        event.preventDefault()
        move(0)
        break
      case 'End':
        event.preventDefault()
        move(options.length - 1)
        break
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        // Segments are `whitespace-nowrap` and never shrink, so a three-option
        // control with translated labels can exceed the mobile content width.
        // Measured at 390px TR, exactly one control in the app overflows: the
        // Timeline's three modes need 511px against 350px available. Scrolling
        // the overflow (the previous treatment) hid the third mode completely
        // and read as a clipped layout, not as a scroller — there is no fade,
        // and touch scrollbars are invisible at rest.
        //
        // Wrapping shows every option instead, and costs one extra row only
        // when the track genuinely cannot fit: the Review, Documents and
        // Settings controls all measure under 350px and are unchanged.
        // `overflow-x-auto` stays as the last-resort guard for a single segment
        // wider than the whole track.
        'bg-muted scrollbar-subtle inline-flex max-w-full flex-wrap items-center gap-0.5 overflow-x-auto rounded-lg p-0.5',
        className
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            className={cn(
              // `shrink-0` so segments keep their natural width and the track
              // scrolls, rather than the labels being squeezed unreadably.
              'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'text-caption h-7 px-2.5' : 'text-body h-8 px-3',
              selected
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {Icon && <Icon className="size-4" />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
