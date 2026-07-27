import { useTranslation } from 'react-i18next'
import { CalendarClock } from 'lucide-react'
import { useFormatters } from '@/lib/format'
import { cn } from '@/lib/utils'

interface DateWindowBadgeProps {
  /** ISO target date, or null when it can't be computed (no appointment). */
  date: string | null
  className?: string
}

/**
 * A recommended target date + relative countdown ("By 14 Aug · in 6 days"). It
 * states a *plan* target, never an official deadline — the wording is
 * "Plan to complete / By {date}", and it renders a calm fallback when no target
 * date exists yet.
 */
export function DateWindowBadge({ date, className }: DateWindowBadgeProps) {
  const { t } = useTranslation('timeline')
  const f = useFormatters()

  if (!date) {
    return (
      <span
        className={cn(
          'text-caption text-muted-foreground inline-flex items-center gap-1.5',
          className
        )}
      >
        <CalendarClock aria-hidden className="size-3.5" />
        {t('plan.recommended')}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'text-caption text-muted-foreground inline-flex flex-wrap items-center gap-x-1.5',
        className
      )}
    >
      <CalendarClock aria-hidden className="size-3.5 shrink-0" />
      <span className="text-foreground">
        {t('plan.targetBy', { date: f.dateShort(date) })}
      </span>
      <span aria-hidden>·</span>
      <span>{f.relativeDays(date)}</span>
    </span>
  )
}
