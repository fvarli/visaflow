import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'bg-card text-body field-sizing-content min-h-20 w-full rounded-md border border-input px-3 py-2 shadow-xs',
        'transition-[color,background-color,border-color] outline-none',
        'hover:border-border-strong',
        'selection:bg-brand-subtle selection:text-brand-subtle-foreground',
        'disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-60',
        'aria-invalid:border-danger',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
