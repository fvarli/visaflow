import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * `success`, `warning` and `info` are new. Their absence is exactly why pages
 * hand-wrote `className="border-green-200 bg-green-50"` on a default Alert —
 * a literal that has no dark-mode counterpart.
 *
 * Tints are very low chroma: an alert should read as a change in paper stock,
 * not as a colored box.
 */
const alertVariants = cva(
  [
    'text-body relative grid w-full items-start rounded-lg border px-4 py-3.5',
    'grid-cols-[0_1fr] gap-y-1',
    'has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3',
    '[&>svg]:size-4 [&>svg]:translate-y-0.5',
  ],
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground [&>svg]:text-muted-foreground',
        destructive:
          'bg-danger-muted border-danger-border text-danger-foreground [&>svg]:text-danger',
        success:
          'bg-success-muted border-success-border text-success-foreground [&>svg]:text-success',
        warning:
          'bg-warning-muted border-warning-border text-warning-foreground [&>svg]:text-warning',
        info: 'bg-info-muted border-info-border text-info-foreground [&>svg]:text-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'col-start-2 min-h-4 font-medium tracking-[-0.011em]',
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-body col-start-2 grid justify-items-start gap-1 opacity-90 [&_p]:leading-relaxed',
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
