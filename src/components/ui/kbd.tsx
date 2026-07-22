import * as React from 'react'
import { cn } from '@/lib/utils'

/** Keyboard hint chip. Sized to sit inline within body text without shifting it. */
function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'bg-muted text-muted-foreground border-border inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5',
        'font-sans text-[0.6875rem] leading-none font-medium',
        className
      )}
      {...props}
    />
  )
}

export { Kbd }
