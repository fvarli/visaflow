import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import type { DocumentReadiness } from '@/features/readiness/readiness-types'

interface DocumentsSummaryProps {
  readiness: DocumentReadiness
}

/**
 * The required-document breakdown as a purpose-driven section: a segmented
 * readiness bar plus the named states, so the user sees not just "how many" but
 * exactly what shape the dossier is in — and can step straight into the
 * Documents workspace to act.
 *
 * The bar is drawn over `applicable`, and the five applicable classes partition
 * it exactly (ADR-033), so the track is always fully accounted for. It used to
 * be drawn over `requiredTotal` with only four of the six statuses represented,
 * which left an unexplained grey remainder for every `received` or
 * `not_applicable` document.
 */
export function DocumentsSummary({ readiness }: DocumentsSummaryProps) {
  const { t } = useTranslation(['dashboard', 'common'])

  const {
    applicable,
    ready,
    obtained,
    inProgress,
    needsUpdate,
    notStarted,
    notApplicable,
    optional,
  } = readiness
  const pct = (n: number) => (applicable > 0 ? (n / applicable) * 100 : 0)

  return (
    <Card className="animate-fade-in-up h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{t('dashboard:documentsSummary.title')}</span>
          {applicable > 0 && (
            <span className="text-caption text-muted-foreground font-normal">
              {t('common:readiness.ofApplicable', {
                ready,
                total: applicable,
              })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {readiness.requiredTotal === 0 && optional === 0 ? (
          <EmptyState
            variant="inline"
            icon={FileText}
            title={t('dashboard:documentsSummary.empty')}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {applicable > 0 ? (
              // Segments sum to exactly 100% of the track.
              <div
                className="bg-muted flex h-2 w-full overflow-hidden rounded-full"
                aria-hidden
              >
                <Segment className="bg-success" width={pct(ready)} />
                <Segment className="bg-primary/70" width={pct(obtained)} />
                <Segment className="bg-info" width={pct(inProgress)} />
                <Segment className="bg-warning" width={pct(needsUpdate)} />
                <Segment
                  className="bg-muted-foreground/30"
                  width={pct(notStarted)}
                />
              </div>
            ) : (
              <p className="text-caption text-muted-foreground">
                {t('common:readiness.nothingToTrack')}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <BucketChip
                tone="success"
                count={ready}
                label={t('common:readiness.class.ready')}
              />
              <BucketChip
                tone="accent"
                count={obtained}
                label={t('common:readiness.class.obtained')}
              />
              <BucketChip
                tone="info"
                count={inProgress}
                label={t('common:readiness.class.inProgress')}
              />
              <BucketChip
                tone="warning"
                count={needsUpdate}
                label={t('common:readiness.class.needsUpdate')}
              />
              <BucketChip
                tone="neutral"
                count={notStarted}
                label={t('common:readiness.class.notStarted')}
              />
              {notApplicable > 0 && (
                <BucketChip
                  tone="neutral"
                  count={notApplicable}
                  label={t('common:readiness.class.notApplicable')}
                />
              )}
              {optional > 0 && (
                <BucketChip
                  tone="neutral"
                  count={optional}
                  label={t('common:readiness.class.optional')}
                />
              )}
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
