import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Plus } from 'lucide-react'
import { useFormatters } from '@/lib/format'
import { documentLabel } from '@/lib/document-label'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  groupKeyDatesByDay,
  type KeyDateDayGroup,
  type KeyDateEvent,
} from '@/features/timeline/timeline-dates'
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
 * Anchors the dossier has not answered yet appear as themselves, below the
 * chronology, reading "not recorded yet" with a link to where they are entered.
 * They carry no date and are never sorted among the real ones — an empty line in
 * a timeline should look like a question, not like a fact that happens to be
 * blank (ADR-043).
 *
 * Dated events are grouped **by day**, because a trip that begins on 1 April
 * also starts the leave, the first stop, the outbound flight, the first stay and
 * the insurance: six rows each repeating the same date read like a checklist
 * rather than a day. Today gets its own group — the status was always computed
 * and always thrown away, so the most actionable date on the page looked exactly
 * like one three months out (ADR-045).
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
  const days = groupKeyDatesByDay(events)
  const today = days.filter((d) => d.status === 'today')
  const upcoming = days.filter((d) => d.status === 'upcoming')
  const past = days.filter((d) => d.status === 'past')
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

  /**
   * What the row adds *beyond* the day heading above it.
   *
   * A single-date event adds nothing — repeating the date the heading just gave
   * is the noise this grouping removes. A range still has to say where it ends,
   * and an unrecorded anchor still has to say it is unrecorded.
   */
  const when = (event: KeyDateEvent): string | null => {
    if (!event.date) return t('keyDates.notRecorded')
    if (!event.endDate) return null
    return t('keyDates.until', { end: f.dateShort(event.endDate) })
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
          {when(event) && (
            <span
              className={`text-caption text-muted-foreground${absent ? ' italic' : ''}`}
              data-numeric={absent ? undefined : true}
            >
              {when(event)}
            </span>
          )}
        </span>
        <Link
          to={eventLink(event)}
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

  /** One day: its date once, then everything that happens on it. */
  const dayGroup = (group: KeyDateDayGroup, dim: boolean) => (
    <li key={group.date} className="flex flex-col gap-0.5">
      <p
        className={`text-caption font-medium ${dim ? 'text-muted-foreground' : 'text-foreground'}`}
        data-numeric
      >
        {f.date(group.date)}
      </p>
      <ul className="divide-border divide-y">
        {group.events.map((event) => row(event, dim))}
      </ul>
    </li>
  )

  const section = (
    key: string,
    heading: string,
    groups: KeyDateDayGroup[],
    dim: boolean
  ) =>
    groups.length > 0 && (
      <section key={key} className="flex flex-col gap-1">
        <h3 className="text-eyebrow text-muted-foreground uppercase">
          {heading}
        </h3>
        <ul className="flex flex-col gap-3">
          {groups.map((group) => dayGroup(group, dim))}
        </ul>
      </section>
    )

  return (
    <div className="flex flex-col gap-6">
      {section('today', t('keyDates.todayGroup'), today, false)}
      {section('upcoming', t('keyDates.upcomingGroup'), upcoming, false)}
      {section('past', t('keyDates.pastGroup'), past, true)}
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
