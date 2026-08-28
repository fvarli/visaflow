import { ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { RequirementSource, ReviewStatus } from '@/config/types'
import type { VerificationCoverage } from '@/config/countries/verification-coverage'
import { useFormatters } from '@/lib/format'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DataList, DataListItem } from '@/components/ui/data-list'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import { dynamicT } from '@/lib/i18n-dynamic'

/**
 * Review status is a content-maintenance signal, not a legal one. The tones
 * stay deliberately muted — nothing here should read as an official
 * endorsement, because VisaFlow is not an embassy or authorized visa centre.
 */
const REVIEW_TONE: Record<ReviewStatus, StatusTone> = {
  verified: 'success',
  partially_verified: 'warning',
  needs_review: 'warning',
  unverified: 'neutral',
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const { t } = useTranslation('common')
  return (
    <StatusBadge tone={REVIEW_TONE[status]} dot>
      {dynamicT(t)(`sources.reviewStatus.${status}`)}
    </StatusBadge>
  )
}

interface SourceNoteProps {
  sources: RequirementSource[]
  reviewStatus?: ReviewStatus
  /** ISO date the template was last reviewed by a maintainer. */
  lastReviewedAt?: string
  /**
   * How much of the template carries its own evidence. Pack-level surfaces
   * pass this; a single requirement's panel does not, because a count across
   * 27 requirements says nothing about the one being read.
   */
  coverage?: VerificationCoverage
  className?: string
}

/**
 * Shows where a requirement came from — or says plainly that nobody has
 * checked it.
 *
 * Deliberately not rendered inline on compact checklist rows; it belongs in a
 * detail view or an expandable section.
 */
export function SourceNote({
  sources,
  reviewStatus = 'unverified',
  lastReviewedAt,
  coverage,
  className,
}: SourceNoteProps) {
  const { t } = useTranslation('common')

  /**
   * Verification is earned by *this* requirement's own evidence.
   *
   * `reviewStatus` is a property of the template; these sources are the
   * requirement's. The check used to be `!sources.length || (!isVerified &&
   * !hasVerifiedSource)`, which let a pack marked `verified` put a green check
   * over a source that carried no verification date at all — the exact thing
   * the comment beneath it promised would not happen. Unreachable while no pack
   * is verified, and precisely the trap laid for the next one (ADR-046).
   *
   * The pack status still supplies the *label* once evidence exists, so a
   * `partially_verified` template can hold both sourced and unsourced
   * requirements and say so on each.
   */
  const hasVerifiedSource = sources.some((s) => s.lastVerifiedAt)

  // "Unverified" is the honest default. A source record with no verification
  // date does not upgrade the status — whatever the template claims.
  if (!sources.length || !hasVerifiedSource) {
    return (
      <div className={cn('space-y-3', className)}>
        <Alert variant="warning">
          <ShieldAlert />
          <AlertDescription>{t('sources.unverifiedNotice')}</AlertDescription>
        </Alert>
        {sources.length > 0 && (
          <SourceList sources={sources} lastReviewedAt={lastReviewedAt} />
        )}
      </div>
    )
  }

  /**
   * The success tone belongs to `verified` alone.
   *
   * A green check beside "Partially verified" reads as a completed state even
   * when most requirements carry no evidence at all — the badge's wording
   * carries the nuance and the icon overrides it. Below `verified` the same
   * icon stays, muted, so the row still reads as source information rather
   * than as an endorsement (ADR-047).
   */
  const isFullyVerified = reviewStatus === 'verified'

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <ShieldCheck
          aria-hidden
          className={cn(
            'size-4',
            isFullyVerified ? 'text-success' : 'text-muted-foreground'
          )}
        />
        <ReviewStatusBadge status={reviewStatus} />
      </div>
      {/*
       * Shown only where it adds something. At `verified` the count is
       * necessarily complete, and at `unverified` a "0 of 27" reads like a
       * progress bar for work nobody promised to do.
       */}
      {coverage && reviewStatus === 'partially_verified' && (
        <p className="text-caption text-muted-foreground" data-numeric>
          {t('sources.coverage', {
            verified: coverage.verified,
            total: coverage.total,
          })}
        </p>
      )}
      <SourceList sources={sources} lastReviewedAt={lastReviewedAt} />
      <p className="text-caption text-muted-foreground">
        {t('sources.notLegalGuarantee')}
      </p>
    </div>
  )
}

function SourceList({
  sources,
  lastReviewedAt,
}: {
  sources: RequirementSource[]
  lastReviewedAt?: string
}) {
  const { t } = useTranslation('common')
  const format = useFormatters()

  return (
    <div className="space-y-4">
      {sources.map((source) => (
        <DataList key={source.id}>
          <DataListItem
            label={t('sources.heading')}
            value={
              source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary inline-flex items-center gap-1 rounded-sm hover:underline"
                >
                  {source.authority}
                  <ExternalLink aria-hidden className="size-3" />
                  <span className="sr-only">{t('sources.viewSource')}</span>
                </a>
              ) : (
                source.authority
              )
            }
          />
          <DataListItem
            label={t('sources.type')}
            value={dynamicT(t)(`sources.sourceType.${source.sourceType}`)}
          />
          <DataListItem
            label={t('sources.lastVerified')}
            value={
              source.lastVerifiedAt ? format.date(source.lastVerifiedAt) : null
            }
          />
          {source.retrievedAt && (
            <DataListItem
              label={t('sources.retrieved')}
              value={format.date(source.retrievedAt)}
            />
          )}
          {source.notesKey && (
            <DataListItem
              label={t('sources.notes')}
              value={dynamicT(t)(source.notesKey)}
            />
          )}
        </DataList>
      ))}
      {lastReviewedAt && (
        <p className="text-caption text-muted-foreground" data-numeric>
          {t('sources.lastVerified')}: {format.date(lastReviewedAt)}
        </p>
      )}
    </div>
  )
}
