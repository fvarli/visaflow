import { useTranslation } from 'react-i18next'
import { Calendar, FileCheck, Plane, ShieldAlert } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import type { StatusTone } from '@/components/ui/status-badge'
import { useFormatters } from '@/lib/format'
import type {
  CountdownModel,
  DocumentBuckets,
  TripSummaryModel,
} from '@/features/dashboard/dashboard-model'
import type { ValidationResult } from '@/domain/rules/types'

interface MetricsRowProps {
  documents: DocumentBuckets
  appointment: CountdownModel
  trip: (CountdownModel & TripSummaryModel) | null
  validation: ValidationResult
}

/** The at-a-glance metric strip. Each card carries status only via its badge tone. */
export function MetricsRow({
  documents,
  appointment,
  trip,
  validation,
}: MetricsRowProps) {
  const { t } = useTranslation(['dashboard', 'common'])
  const format = useFormatters()

  const openFindings = validation.errorCount + validation.warningCount
  const findingsTone: StatusTone =
    validation.errorCount > 0
      ? 'danger'
      : validation.warningCount > 0
        ? 'warning'
        : 'success'

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={Calendar}
        label={t('dashboard:metrics.appointment')}
        muted={!appointment.date}
        value={
          appointment.date
            ? format.dateShort(appointment.date)
            : t('dashboard:metrics.notScheduled')
        }
        hint={
          appointment.date ? format.relativeDays(appointment.date) : undefined
        }
      />

      <StatCard
        icon={Plane}
        label={t('dashboard:metrics.trip')}
        muted={!trip?.entryDate}
        value={
          trip?.entryDate
            ? format.dateShort(trip.entryDate)
            : t('dashboard:metrics.notPlanned')
        }
        hint={trip?.entryDate ? format.relativeDays(trip.entryDate) : undefined}
      />

      <StatCard
        icon={FileCheck}
        label={t('dashboard:metrics.documentsReady')}
        value={`${documents.ready}/${documents.total}`}
        hint={format.percent(documents.completionPercent)}
        badge={
          documents.total > 0
            ? {
                label: format.percent(documents.completionPercent),
                tone:
                  documents.completionPercent === 100 ? 'success' : 'neutral',
              }
            : undefined
        }
      />

      <StatCard
        icon={ShieldAlert}
        label={t('dashboard:metrics.openFindings')}
        value={openFindings}
        hint={
          openFindings === 0
            ? t('dashboard:metrics.noFindings')
            : t('dashboard:metrics.findingsBreakdown', {
                errors: validation.errorCount,
                warnings: validation.warningCount,
              })
        }
        badge={{
          label:
            openFindings === 0
              ? t('dashboard:metrics.noFindings')
              : String(openFindings),
          tone: findingsTone,
        }}
      />
    </div>
  )
}
