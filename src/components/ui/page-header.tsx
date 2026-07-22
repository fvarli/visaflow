import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps extends Omit<
  React.ComponentProps<'header'>,
  'title'
> {
  /** Eyebrow label above the title. Use sparingly — for context, not decoration. */
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  /** Right-aligned actions. Collapses below the title on small screens. */
  actions?: React.ReactNode
}

/**
 * The single page-title treatment for the whole app.
 *
 * Replaces the `text-2xl font-bold` block that was hand-rolled in all 11
 * pages. Weight is 600 rather than 700 with negative tracking — bold at 24px
 * reads blunt, semibold reads considered.
 */
function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        'flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        className
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <p className="text-eyebrow text-muted-foreground uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-title text-foreground text-balance">{title}</h1>
        {description && (
          <p className="text-body text-muted-foreground max-w-2xl text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}

export { PageHeader }
