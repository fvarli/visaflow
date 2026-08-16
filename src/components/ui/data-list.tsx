import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/**
 * Read-only label -> value pairs, as a real <dl>.
 *
 * Passport numbers, document codes and reference strings render in the mono
 * face with tabular figures so characters that matter (0/O, 1/l) stay
 * distinguishable — a genuine concern when someone is transcribing a passport
 * number onto an embassy form.
 */
function DataList({ className, ...props }: React.ComponentProps<'dl'>) {
  return (
    <dl
      data-slot="data-list"
      className={cn('divide-border grid divide-y', className)}
      {...props}
    />
  )
}

interface DataListItemProps extends React.ComponentProps<'div'> {
  label: React.ReactNode
  value: React.ReactNode
  /** Render the value in the mono face — for codes, numbers, references. */
  mono?: boolean
  /**
   * Shown when `value` is empty. Defaults to the shared
   * `common:states.notProvided` string — this used to be a hardcoded English
   * literal that rendered untranslated on the Turkish Dashboard (ADR-034).
   */
  emptyLabel?: React.ReactNode
}

function DataListItem({
  label,
  value,
  mono = false,
  emptyLabel,
  className,
  ...props
}: DataListItemProps) {
  const { t } = useTranslation('common')
  const isEmpty =
    value === null || value === undefined || value === '' || value === false

  return (
    <div
      data-slot="data-list-item"
      className={cn(
        'grid gap-1 py-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-6',
        className
      )}
      {...props}
    >
      <dt className="text-body text-muted-foreground">{label}</dt>
      <dd
        data-numeric
        className={cn(
          'text-body min-w-0 break-words',
          mono && 'font-mono text-[0.8125rem] tracking-tight',
          isEmpty ? 'text-muted-foreground italic' : 'text-foreground'
        )}
      >
        {isEmpty ? (emptyLabel ?? t('states.notProvided')) : value}
      </dd>
    </div>
  )
}

export { DataList, DataListItem }
