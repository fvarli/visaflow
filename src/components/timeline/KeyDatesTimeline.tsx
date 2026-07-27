import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { useFormatters } from '@/lib/format'
import { documentLabel } from '@/lib/document-label'
import type { KeyDateEvent } from '@/features/timeline/timeline-dates'
import { eventLink } from '@/features/timeline/timeline-links'

interface KeyDatesTimelineProps {
  events: KeyDateEvent[]
}

/**
 * A clean chronological view of the dossier's **fixed dates** — facts, not
 * recommendations. Upcoming dates are prominent; past ones stay calm and
 * compact. Date ranges (leave, stays, insurance) are shown collapsed. Locale-
 * aware formatting; stored values stay ISO.
 */
export function KeyDatesTimeline({ events }: KeyDatesTimelineProps) {
  const { t } = useTranslation(['timeline', 'visa-domain'])
  const f = useFormatters()

  if (events.length === 0) {
    return (
      <p className="text-body text-muted-foreground">{t('keyDates.empty')}</p>
    )
  }

  const upcoming = events.filter((e) => e.status !== 'past')
  const past = events.filter((e) => e.status === 'past')

  const label = (event: KeyDateEvent): string => {
    if (event.type === 'documentExpiry') {
      return t('keyDates.type.documentExpiry', {
        document: documentLabel(t, event.documentCode ?? ''),
      })
    }
    if (event.city) {
      return t(`keyDates.type.${event.type}`, { city: event.city })
    }
    return t(`keyDates.type.${event.type}`)
  }

  const when = (event: KeyDateEvent): string =>
    event.endDate
      ? t('keyDates.range', {
          start: f.dateShort(event.date),
          end: f.dateShort(event.endDate),
        })
      : f.dateShort(event.date)

  const row = (event: KeyDateEvent, dim: boolean) => (
    <li
      key={event.id}
      className={`flex items-center justify-between gap-3 py-2.5 ${dim ? 'opacity-70' : ''}`}
    >
      <span className="flex min-w-0 flex-col">
        <span className="text-body text-foreground">{label(event)}</span>
        <span className="text-caption text-muted-foreground" data-numeric>
          {when(event)}
        </span>
      </span>
      <Link
        to={eventLink(event.type)}
        className="text-primary inline-flex shrink-0 items-center gap-1 rounded-sm text-sm hover:underline"
        aria-label={t('keyDates.open')}
      >
        {t('keyDates.open')}
        <ArrowRight className="size-3.5" />
      </Link>
    </li>
  )

  return (
    <div className="flex flex-col gap-6">
      {upcoming.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-eyebrow text-muted-foreground uppercase">
            {t('keyDates.upcomingGroup')}
          </h3>
          <ul className="divide-border divide-y">
            {upcoming.map((e) => row(e, false))}
          </ul>
        </section>
      )}
      {past.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-eyebrow text-muted-foreground uppercase">
            {t('keyDates.pastGroup')}
          </h3>
          <ul className="divide-border divide-y">
            {past.map((e) => row(e, true))}
          </ul>
        </section>
      )}
    </div>
  )
}
