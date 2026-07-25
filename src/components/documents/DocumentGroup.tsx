import * as React from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DocumentGroupProps {
  title: string
  countLabel: string
  toggleLabel: string
  addLabel?: string
  onAdd?: () => void
  defaultOpen?: boolean
  children: React.ReactNode
}

/**
 * A collapsible category section. The heading is a disclosure button
 * (`aria-expanded` + `aria-controls`) so keyboard and screen-reader users can
 * fold long categories; the per-group "Add document" sits outside the toggle
 * to keep controls un-nested.
 */
export function DocumentGroup({
  title,
  countLabel,
  toggleLabel,
  addLabel,
  onAdd,
  defaultOpen = true,
  children,
}: DocumentGroupProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const contentId = React.useId()

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={contentId}
            aria-label={toggleLabel}
            className="flex items-center gap-2 text-left"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                'text-muted-foreground size-4 shrink-0 transition-transform',
                open && 'rotate-90'
              )}
            />
            <span className="text-heading text-foreground">{title}</span>
            <span className="text-caption text-muted-foreground font-normal">
              {countLabel}
            </span>
          </button>
        </h2>
        {onAdd && addLabel && (
          <Button variant="ghost" size="sm" onClick={onAdd}>
            <Plus />
            {addLabel}
          </Button>
        )}
      </div>
      <div id={contentId} hidden={!open}>
        {open && children}
      </div>
    </section>
  )
}
