import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Plus } from 'lucide-react'
import { useFormatters } from '@/lib/format'
import { documentLabel } from '@/lib/document-label'
import { dynamicT } from '@/lib/i18n-dynamic'
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
 *
 * The third group is the point: anchors the dossier has not answered yet appear
 * as themselves, below the chronology, reading "not recorded yet" with a link to
 * where they are entered. They carry no date and are never sorted among the
 * real ones — an empty line in a timeline should look like a question, not like
 * a fact that happens to be blank (ADR-043).
 */
export function KeyDatesTimeline({ events }: KeyDatesTimelineProps) {
  const { t } = useTranslation(['timeline', 'visa-domain'])
  const f = useFormatters()

  if (events.length === 0) {
    return (
      <p className="text-body text-muted-foreground">{t('keyDates.empty')}</p>
    )
  }

  const td = dynamicT(t)
  const upcoming = events.filter(
    (e) => e.status === 'upcoming' || e.status === 'today'
  )
  const past = events.filter((e) => e.status === 'past')
  const missing = events.filter((e) => e.status === 'missing')

  const label = (event: KeyDateEvent): string => {
    if (event.type === 'documentExpiry') {
      return t('keyDates.type.documentExpiry', {
        document: documentLabel(t, event.documentCode ?? ''),
      })
    }
    // Transport labels name the city, but a reservation may not record one —
    // "Departure from undefined" is worse than "Departure".
    if (event.type === 'transport' || event.type === 'transportArrival') {
      return event.city
        ? td(`keyDates.type.${event.type}`, { city: event.city })
        : td(`keyDates.type.${event.type}NoCity`)
    }
    if (event.city) {
      return td(`keyDates.type.${event.type}`, { city: event.city })
    }
    return td(`keyDates.type.${event.type}`)
  }

  const when = (event: KeyDateEvent): string => {
    if (!event.date) return t('keyDates.notRecorded')
    return event.endDate
      ? t('keyDates.range', {
          start: f.dateShort(event.date),
          end: f.dateShort(event.endDate),
        })
      : f.dateShort(event.date)
  }

  const row = (event: KeyDateEvent, dim: boolean) => {
    const absent = event.status === 'missing'
    return (
      <li
        key={event.id}
        className={`flex items-center justify-between gap-3 py-2.5 ${dim ? 'opacity-70' : ''}`}
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-body text-foreground">{label(event)}</span>
          <span
            className={`text-caption text-muted-foreground${absent ? ' italic' : ''}`}
            data-numeric={absent ? undefined : true}
          >
            {when(event)}
          </span>
        </span>
        <Link
          to={eventLink(event.type)}
          className="text-primary -my-1 inline-flex shrink-0 items-center gap-1 rounded-sm py-1 text-sm hover:underline"
          aria-label={`${absent ? t('keyDates.add') : t('keyDates.open')} — ${label(event)}`}
        >
          {absent ? t('keyDates.add') : t('keyDates.open')}
          {absent ? (
            <Plus className="size-3.5" />
          ) : (
            <ArrowRight className="size-3.5" />
          )}
        </Link>
      </li>
    )
  }

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
      {missing.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-eyebrow text-muted-foreground uppercase">
            {t('keyDates.missingGroup')}
          </h3>
          <p className="text-caption text-muted-foreground text-pretty">
            {t('keyDates.missingGroupHint')}
          </p>
          <ul className="divide-border divide-y">
            {missing.map((e) => row(e, true))}
          </ul>
        </section>
      )}
    </div>
  )
}
