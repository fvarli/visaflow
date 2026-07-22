import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * 36px control height, matched to the default Button so a field and its
 * adjacent action align on the same baseline grid.
 *
 * Focus is handled globally (index.css). Only the invalid state is painted
 * here, because it must be visible without focus.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'bg-card text-body h-9 w-full min-w-0 rounded-md border border-input px-3 py-1 shadow-xs',
        'transition-[color,background-color,border-color] outline-none',
        'hover:border-border-strong',
        'selection:bg-brand-subtle selection:text-brand-subtle-foreground',
        'file:text-foreground file:text-body file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium',
        'disabled:bg-muted disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
        'aria-invalid:border-danger aria-invalid:hover:border-danger',
        // Date inputs: keep the native picker icon from shouting.
        '[&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100',
        '[&::-webkit-search-cancel-button]:hidden',
        className
      )}
      {...props}
    />
  )
}

export { Input }
