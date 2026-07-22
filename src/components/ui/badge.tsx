import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * Existing `variant` values are preserved so no caller broke. For status
 * meaning (ready / needs update / warning / error) prefer `StatusBadge`,
 * which is token-driven and dark-mode safe.
 */
const badgeVariants = cva(
  [
    'text-eyebrow inline-flex w-fit shrink-0 items-center justify-center gap-1.5',
    'overflow-hidden rounded-full border border-transparent px-2 py-0.5',
    'font-medium whitespace-nowrap transition-colors',
    '[&>svg]:pointer-events-none [&>svg]:size-3',
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a&]:hover:brightness-110',
        secondary:
          'bg-secondary text-secondary-foreground [a&]:hover:bg-accent',
        destructive:
          'bg-danger-muted text-danger-foreground border-danger-border [a&]:hover:brightness-105',
        outline:
          'border-border text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        ghost: 'text-muted-foreground [a&]:hover:bg-accent',
        link: 'text-primary underline-offset-4 [a&]:hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
