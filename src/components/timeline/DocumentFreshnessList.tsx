import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { useFormatters } from '@/lib/format'
import { documentLabel } from '@/lib/document-label'
import { dynamicT } from '@/lib/i18n-dynamic'
import type {
  FreshnessClass,
  FreshnessRow,
  FreshnessView,
} from '@/features/timeline/document-freshness'
import { freshnessLink } from '@/features/timeline/timeline-links'

interface DocumentFreshnessListProps {
  freshness: FreshnessView
}

const CLASS_TONE: Record<FreshnessClass, StatusTone> = {
  needsUpdate: 'warning',
  expiresBeforeAppointment: 'warning',
  validThroughAppointment: 'success',
  issuedNoExpiry: 'neutral',
  noDates: 'neutral',
}

/**
 * Document freshness — a **factual** view over recorded dates and status only.
 * It never invents an expiry or a recency rule; a document is flagged only when
 * its own `validUntil`, status, or a validation finding says so. Age is shown
 * only when an issue date exists.
 */
export function DocumentFreshnessList({
  freshness,
}: DocumentFreshnessListProps) {
  const { t } = useTranslation(['timeline', 'visa-domain'])
  const td = dynamicT(t)
  const f = useFormatters()

  if (freshness.rows.length === 0) {
    return (
      <p className="text-body text-muted-foreground">{t('freshness.empty')}</p>
    )
  }

  const classLabel = (row: FreshnessRow): string => {
    // Without an appointment we can't say "through your appointment" — show the
    // recorded validity date factually instead.
    if (
      row.freshness === 'validThroughAppointment' &&
      !freshness.appointmentKnown
    ) {
      return t('freshness.class.validUntil', {
        date: f.dateShort(row.validUntil),
      })
    }
    return t(`freshness.class.${row.freshness}`)
  }

  return (
    <div className="flex flex-col gap-4">
      {!freshness.appointmentKnown && (
        <GuidanceNote tone="info">
          {t('freshness.noAppointmentHint')}
        </GuidanceNote>
      )}

      <ul className="flex flex-col gap-2">
        {freshness.rows.map((row) => (
          <li
            key={row.docId}
            className="bg-card flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body text-foreground truncate">
                {documentLabel(t, row.code, row.name)}
              </span>
              <span className="text-caption text-muted-foreground">
                {td(`visa-domain:documentCategory.${row.category}`)}
                {row.ageDays != null && (
                  <> · {t('freshness.age', { count: row.ageDays })}</>
                )}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <StatusBadge tone={CLASS_TONE[row.freshness]}>
                {classLabel(row)}
              </StatusBadge>
              <Link
                to={freshnessLink(row)}
                className="text-primary inline-flex items-center gap-1 rounded-sm text-sm hover:underline"
                aria-label={t('freshness.open')}
              >
                {t('freshness.open')}
                <ArrowRight className="size-3.5" />
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
