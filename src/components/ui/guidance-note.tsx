import * as React from 'react'
import { Info, Lightbulb, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GuidanceNoteProps {
  /**
   * `info` uses the low-chroma slate accent; `neutral` is fully monochrome.
   * Never `warning`/`error` — guidance is a calm reminder, not an alarm.
   */
  tone?: 'info' | 'neutral'
  /** When provided, renders a dismiss control labelled for assistive tech. */
  dismissLabel?: string
  children: React.ReactNode
  className?: string
}

/**
 * A calm, visually secondary, dismissible informational note.
 *
 * It is deliberately quieter than `Alert`: a soft muted surface, small text,
 * and a `note` role rather than `alert` (it must never interrupt a screen
 * reader). Used for onboarding guidance that helps without demanding action;
 * reusable by any future onboarding surface. Dismissal is local, in-memory
 * only — nothing is persisted.
 */
export function GuidanceNote({
  tone = 'info',
  dismissLabel,
  children,
  className,
}: GuidanceNoteProps) {
  const [dismissed, setDismissed] = React.useState(false)
  if (dismissed) return null

  const Icon = tone === 'info' ? Info : Lightbulb

  return (
    <div
      role="note"
      className={cn(
        'bg-muted/50 flex items-start gap-2.5 rounded-lg px-3 py-2.5',
        className
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          'mt-0.5 size-4 shrink-0',
          tone === 'info' ? 'text-info' : 'text-muted-foreground'
        )}
      />
      <div className="text-caption text-muted-foreground min-w-0 flex-1 text-pretty">
        {children}
      </div>
      {dismissLabel && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={dismissLabel}
          className="text-muted-foreground hover:text-foreground -mr-2 -mt-1.5 rounded-sm p-2"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
