import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import type { DocumentBuckets5 } from '@/features/documents/documents-model'

interface DocumentsSummaryProps {
  breakdown: DocumentBuckets5
}

/**
 * The required-document breakdown as a purpose-driven section: a segmented
 * readiness bar plus the five named states, so the user sees not just "how many"
 * but exactly what shape the dossier is in — and can step straight into the
 * Documents workspace to act.
 */
export function DocumentsSummary({ breakdown }: DocumentsSummaryProps) {
  const { t } = useTranslation(['dashboard', 'common'])

  const { requiredTotal, ready, needsUpdate, requested, missing, optional } =
    breakdown
  const pct = (n: number) => (requiredTotal > 0 ? (n / requiredTotal) * 100 : 0)

  return (
    <Card className="animate-fade-in-up h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{t('dashboard:documentsSummary.title')}</span>
          {requiredTotal > 0 && (
            <span className="text-caption text-muted-foreground font-normal">
              {t('dashboard:documentsSummary.description', {
                ready,
                total: requiredTotal,
              })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requiredTotal === 0 && optional === 0 ? (
          <EmptyState
            variant="inline"
            icon={FileText}
            title={t('dashboard:documentsSummary.empty')}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Segmented readiness bar over the required documents. */}
            <div
              className="bg-muted flex h-2 w-full overflow-hidden rounded-full"
              aria-hidden
            >
              <Segment className="bg-success" width={pct(ready)} />
              <Segment className="bg-info" width={pct(requested)} />
              <Segment className="bg-danger" width={pct(needsUpdate)} />
              <Segment
                className="bg-muted-foreground/30"
                width={pct(missing)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <BucketChip
                tone="success"
                count={ready}
                label={t('dashboard:documentsSummary.ready')}
              />
              <BucketChip
                tone="danger"
                count={needsUpdate}
                label={t('dashboard:documentsSummary.needsUpdate')}
              />
              <BucketChip
                tone="info"
                count={requested}
                label={t('dashboard:documentsSummary.requested')}
              />
              <BucketChip
                tone="warning"
                count={missing}
                label={t('dashboard:documentsSummary.missing')}
              />
              <BucketChip
                tone="neutral"
                count={optional}
                label={t('dashboard:documentsSummary.optional')}
              />
            </div>

            <Link
              to="/documents"
              className="text-primary inline-flex items-center gap-1 self-start rounded-sm text-sm hover:underline"
            >
              {t('dashboard:documentsSummary.openWorkspace')}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Segment({ className, width }: { className: string; width: number }) {
  return (
    <div
      className={`h-full transition-[width] duration-500 ease-out ${className}`}
      style={{ width: `${width}%` }}
    />
  )
}

function BucketChip({
  tone,
  count,
  label,
}: {
  tone: StatusTone
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
