import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Token-driven status chip.
 *
 * Replaces every hand-written `bg-green-100 text-green-800` style pair in the
 * app (the `statusColors` map in DocumentsPage, the severity badges in
 * ConsistencyChecksPage, and ~27 loose palette classes). Those literals had
 * no dark-mode counterpart and would have inverted into unreadable mud.
 *
 * `info` is intentionally a low-chroma slate rather than a saturated blue, so
 * it can never be mistaken for the cobalt accent, which means "interactive".
 */
const statusBadgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap [&>svg]:size-3',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground border-transparent',
        info: 'bg-info-muted text-info-foreground border-info-border',
        success:
          'bg-success-muted text-success-foreground border-success-border',
        warning:
          'bg-warning-muted text-warning-foreground border-warning-border',
        danger: 'bg-danger-muted text-danger-foreground border-danger-border',
        accent:
          'bg-brand-subtle text-brand-subtle-foreground border-transparent',
      },
      size: {
        sm: 'text-eyebrow px-2 py-0.5',
        md: 'text-caption px-2.5 py-1',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'sm' },
  }
)

const dotVariants = cva('size-1.5 shrink-0 rounded-full', {
  variants: {
    tone: {
      neutral: 'bg-muted-foreground/60',
      info: 'bg-info',
      success: 'bg-success',
      warning: 'bg-warning',
      danger: 'bg-danger',
      accent: 'bg-primary',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export type StatusTone = NonNullable<
  VariantProps<typeof statusBadgeVariants>['tone']
>

interface StatusBadgeProps
  extends
    React.ComponentProps<'span'>,
    VariantProps<typeof statusBadgeVariants> {
  /** Show a leading tone dot. Reads faster than color alone in dense tables. */
  dot?: boolean
}

function StatusBadge({
  className,
  tone = 'neutral',
  size,
  dot = false,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      data-tone={tone}
      className={cn(statusBadgeVariants({ tone, size }), className)}
      {...props}
    >
      {dot && <span aria-hidden className={cn(dotVariants({ tone }))} />}
      {children}
    </span>
  )
}

/**
 * Presentation mappings from domain values to tones. Kept here so the
 * vocabulary lives in exactly one place; the domain layer stays unaware of
 * color entirely.
 */
export const DOCUMENT_STATUS_TONE: Record<string, StatusTone> = {
  not_started: 'neutral',
  requested: 'info',
  received: 'warning',
  needs_update: 'danger',
  ready: 'success',
  not_applicable: 'neutral',
}

export const SEVERITY_TONE: Record<string, StatusTone> = {
  error: 'danger',
  warning: 'warning',
  info: 'info',
}

/** `needs_update` -> `Needs update` */
export function humanizeStatus(value: string): string {
  const spaced = value.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export { StatusBadge, statusBadgeVariants }
