import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import type { DocumentBuckets } from '@/features/dashboard/dashboard-model'

interface DocumentsSummaryProps {
  buckets: DocumentBuckets
}

/**
 * Required-document breakdown. A single segmented bar plus per-bucket chips make
 * Ready / Missing / Needs update visually distinct — not just a running total.
 */
export function DocumentsSummary({ buckets }: DocumentsSummaryProps) {
  const { t } = useTranslation(['dashboard', 'common'])

  const { total, ready, missing, needsUpdate } = buckets
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0)

  return (
    <Card className="animate-fade-in-up h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{t('dashboard:documentsSummary.title')}</span>
          {total > 0 && (
            <span className="text-caption text-muted-foreground font-normal">
              {t('dashboard:documentsSummary.description', { ready, total })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState
            variant="inline"
            icon={FileText}
            title={t('dashboard:documentsSummary.empty')}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Segmented readiness bar. */}
            <div
              className="bg-muted flex h-2 w-full overflow-hidden rounded-full"
              aria-hidden
            >
              <div
                className="bg-success h-full transition-[width] duration-500 ease-out"
                style={{ width: `${pct(ready)}%` }}
              />
              <div
                className="bg-danger h-full transition-[width] duration-500 ease-out"
                style={{ width: `${pct(needsUpdate)}%` }}
              />
              <div
                className="bg-muted-foreground/30 h-full transition-[width] duration-500 ease-out"
                style={{ width: `${pct(missing)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <BucketChip
                tone="success"
                count={ready}
                label={t('dashboard:documentsSummary.ready')}
              />
              <BucketChip
                tone="warning"
                count={missing}
                label={t('dashboard:documentsSummary.missing')}
              />
              <BucketChip
                tone="danger"
                count={needsUpdate}
                label={t('dashboard:documentsSummary.needsUpdate')}
              />
            </div>

            <Link
              to="/documents"
              className="text-primary inline-flex items-center gap-1 self-start rounded-sm text-sm hover:underline"
            >
              {t('dashboard:documentsSummary.viewAll')}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BucketChip({
  tone,
  count,
  label,
}: {
  tone: 'success' | 'warning' | 'danger'
  count: number
  label: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span data-numeric className="text-heading text-foreground font-semibold">
        {count}
      </span>
      <StatusBadge tone={tone} dot>
        {label}
      </StatusBadge>
    </div>
  )
}
