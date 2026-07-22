import * as React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Filter / search bar shell.
 *
 * Sits directly above the content it filters with no card chrome of its own —
 * a bordered card wrapping a row of filters (the previous Documents layout)
 * reads as a second, competing panel rather than as a control strip.
 */
function Toolbar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="toolbar"
      role="search"
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center',
        className
      )}
      {...props}
    />
  )
}

function ToolbarSpacer({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex-1', className)} {...props} />
}

interface SearchInputProps extends React.ComponentProps<typeof Input> {
  containerClassName?: string
}

function SearchInput({
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  return (
    <div
      className={cn('relative min-w-0 flex-1 sm:max-w-xs', containerClassName)}
    >
      <Search
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <Input type="search" className={cn('pl-9', className)} {...props} />
    </div>
  )
}

export { Toolbar, ToolbarSpacer, SearchInput }
