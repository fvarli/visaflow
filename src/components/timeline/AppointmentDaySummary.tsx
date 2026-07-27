import { useTranslation } from 'react-i18next'
import { CheckCircle2, Circle } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { AppointmentDaySummaryModel } from '@/features/timeline/timeline-model'

interface AppointmentDaySummaryProps {
  summary: AppointmentDaySummaryModel
}

/**
 * A **read-only** appointment-day readiness summary derived from dossier state —
 * identity/passport, application form, appointment confirmation, and required
 * documents. It stores no checkbox state (tasks are never persisted). Any notes
 * shown are the genuinely-configured template notes for this visa type — never
 * hardcoded local-office instructions.
 */
export function AppointmentDaySummary({ summary }: AppointmentDaySummaryProps) {
  const { t } = useTranslation(['timeline', 'visa-domain'])
  const td = dynamicT(t)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-muted-foreground">
        {t('appointmentDay.readySummary', {
          ready: summary.readyCount,
          total: summary.total,
        })}
      </p>

      <ul className="divide-border divide-y">
        {summary.items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
          >
            <span className="text-body text-foreground inline-flex items-center gap-2.5">
              {item.ready ? (
                <CheckCircle2 aria-hidden className="text-success size-4" />
              ) : (
                <Circle aria-hidden className="text-muted-foreground size-4" />
              )}
              {td(`timeline:appointmentDay.items.${item.id}`)}
            </span>
            <StatusBadge tone={item.ready ? 'success' : 'neutral'}>
              {t(
                item.ready ? 'appointmentDay.ready' : 'appointmentDay.notReady'
              )}
            </StatusBadge>
          </li>
        ))}
      </ul>

      {summary.noteKeys.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-eyebrow text-muted-foreground uppercase">
            {t('appointmentDay.notesTitle')}
          </h3>
          {summary.noteKeys.map((key) => (
            <GuidanceNote key={key} tone="neutral">
              {td(key)}
            </GuidanceNote>
          ))}
        </div>
      )}
    </div>
  )
}
