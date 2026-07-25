import { useTranslation } from 'react-i18next'
import { CalendarClock, CalendarRange } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useFormatters } from '@/lib/format'
import { tripNights } from '@/features/trip/route-dates'

interface TripDateSummaryProps {
  entryDate: string | null
  exitDate: string | null
  appointmentDate?: string | null
  className?: string
}

/**
 * The derived shape of the trip's dates: the localized range and the duration
 * as "N nights · M days" (nights = calendar days between entry and exit; days =
 * nights + 1). Duration is always derived, never entered, so there is no
 * off-by-one ambiguity. The duration is announced to assistive tech.
 */
export function TripDateSummary({
  entryDate,
  exitDate,
  appointmentDate,
  className,
}: TripDateSummaryProps) {
  const { t } = useTranslation(['trip', 'common'])
  const f = useFormatters()

  const nights = tripNights(entryDate, exitDate)
  if (!entryDate || !exitDate || nights === null) return null

  const days = nights + 1
  const rangeLabel = `${f.dateShort(entryDate)} – ${f.dateShort(exitDate)}`
  const durationLabel = t('trip:dateSummary.duration', {
    nights: t('trip:nights', { count: nights }),
    days: t('trip:dateSummary.days', { count: days }),
  })

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full"
          >
            <CalendarRange className="size-5" />
          </span>
          <div className="space-y-0.5">
            <p className="text-eyebrow text-muted-foreground uppercase">
              {t('trip:dateSummary.label')}
            </p>
            <p className="text-heading text-foreground" data-numeric>
              {rangeLabel}
            </p>
            <p className="text-body text-muted-foreground" data-numeric>
              {durationLabel}
            </p>
            <span className="sr-only" role="status">
              {durationLabel}
            </span>
          </div>
        </div>

        {appointmentDate && (
          <div className="text-body text-muted-foreground flex items-center gap-2 sm:flex-col sm:items-end sm:text-right">
            <CalendarClock aria-hidden className="size-4 shrink-0 sm:hidden" />
            <span className="text-caption uppercase">
              {t('trip:dateSummary.appointment')}
            </span>
            <span className="text-foreground" data-numeric>
              {f.dateShort(appointmentDate)} · {f.relativeDays(appointmentDate)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
