import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * In-page grouping rhythm.
 *
 * Pages previously opened with a bare `space-y-6` and separated groups with
 * ad-hoc `<Separator />`. Section gives every page the same vertical cadence
 * without each one re-deciding it.
 */
function PageBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="page-body"
      className={cn('flex flex-col gap-8', className)}
      {...props}
    />
  )
}

function Section({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      data-slot="section"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    />
  )
}

interface SectionHeaderProps extends Omit<
  React.ComponentProps<'div'>,
  'title'
> {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}

function SectionHeader({
  title,
  description,
  actions,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
      {...props}
    >
      <div className="space-y-1">
        <h2 className="text-heading text-foreground">{title}</h2>
        {description && (
          <p className="text-body text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  )
}

export { PageBody, Section, SectionHeader }
