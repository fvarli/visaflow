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
        // control with translated labels can exceed the mobile content width
        // (the Timeline's modes measure ~447px EN / ~496px TR against 350px).
        // `max-w-full` + a scroll container keeps the overflow inside the
        // control instead of scrolling the whole page. Roving-tabindex keyboard
        // navigation is unaffected; the browser scrolls focused segments into
        // view automatically.
        'bg-muted scrollbar-subtle inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg p-0.5',
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
