import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * Variant and size names are unchanged from the original API — only the
 * visual treatment moved, so no caller needed editing.
 *
 * Focus rings are deliberately NOT painted here. The app has one global
 * `:focus-visible` rule in index.css so every focusable element in VisaFlow
 * looks identical when focused; components re-implementing their own ring is
 * how focus styling drifts.
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md font-medium tracking-[-0.006em] outline-none',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150',
    'disabled:pointer-events-none disabled:opacity-45',
    // A 1px press. Enough to feel mechanical, too small to read as animation.
    'active:translate-y-px',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:brightness-110',
        outline:
          'bg-card text-foreground border border-input shadow-xs hover:bg-accent hover:border-border-strong',
        secondary:
          'bg-secondary text-secondary-foreground border border-transparent hover:bg-accent',
        ghost: 'text-foreground hover:bg-accent',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'text-body h-9 px-3.5 has-[>svg]:px-3',
        xs: "text-caption h-6 gap-1 rounded-sm px-2 has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'text-body h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'text-body h-10 px-5 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
