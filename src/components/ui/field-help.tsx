import * as React from 'react'
import { Info } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverTitle,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface FieldHelpProps {
  /**
   * Accessible label for the trigger — it is the only text a screen-reader
   * user hears before opening, so name the field, e.g.
   * "Why do we ask this? — Date of birth".
   */
  label: string
  /** Short heading inside the panel, e.g. "Why do we ask this?". */
  title: React.ReactNode
  /** Educational, generic explanation. Multiple <p> children are fine. */
  children: React.ReactNode
  className?: string
}

/**
 * A small "Why do we ask this?" affordance next to a field label.
 *
 * Opens on click/tap (not hover) so it works on touch and for keyboard users,
 * and Radix keeps the panel inside the viewport on small screens. The copy is
 * meant to be educational and generic — never legal advice — so callers keep
 * it short and add a disclaimer only where the reason could otherwise read as
 * a hard legal rule. Reserve it for fields where the reason is genuinely
 * useful, not every field.
 */
function FieldHelp({ label, title, children, className }: FieldHelpProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'text-muted-foreground hover:text-foreground inline-flex size-4 shrink-0 items-center justify-center rounded-full align-middle transition-colors',
            className
          )}
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="w-72 max-w-[calc(100vw-1.5rem)] space-y-2"
      >
        <PopoverTitle className="text-body text-foreground">
          {title}
        </PopoverTitle>
        <div className="text-caption text-muted-foreground space-y-2 text-pretty">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { FieldHelp }
