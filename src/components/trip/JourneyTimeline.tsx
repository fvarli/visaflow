import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Connected vertical rail for an itinerary. Presentational only: the caller
 * renders each stop (usually a DestinationCard) as a `JourneyStop` child. Built
 * as an ordered list so the travel sequence is conveyed to assistive tech, and
 * kept independent of how stops are reordered so a drag-and-drop layer can be
 * added later without touching it.
 */
function JourneyTimeline({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="journey-timeline"
      className={cn('flex flex-col', className)}
      {...props}
    />
  )
}

interface JourneyStopProps extends React.ComponentProps<'li'> {
  /** Last stop hides the trailing connector. */
  isLast?: boolean
  /** Emphasize the node (e.g. the main destination). */
  highlight?: boolean
}

function JourneyStop({
  isLast = false,
  highlight = false,
  className,
  children,
  ...props
}: JourneyStopProps) {
  return (
    <li
      data-slot="journey-stop"
      className={cn('relative flex gap-4 pb-4 last:pb-0', className)}
      {...props}
    >
      {/* Rail: node + connector to the next stop */}
      <div
        aria-hidden
        className="relative flex w-4 shrink-0 justify-center pt-2.5"
      >
        <span
          className={cn(
            'z-10 size-3 rounded-full border-2 bg-card',
            highlight ? 'border-primary' : 'border-border-strong'
          )}
        />
        {!isLast && (
          <span className="bg-border absolute top-2.5 bottom-[-1rem] left-1/2 w-px -translate-x-1/2" />
        )}
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </li>
  )
}

export { JourneyTimeline, JourneyStop }
