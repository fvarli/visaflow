import type * as React from 'react'
import {
  ArrowRight,
  Check,
  CirclePlus,
  CircleDashed,
  CircleSlash,
  Clock,
  FileText,
  PackageCheck,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DOCUMENT_STATUS_TONE,
  StatusBadge,
  type StatusTone,
} from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import {
  BUCKET_COUNT,
  BUCKET_STATUS,
  type BucketKey,
} from '@/features/documents/documents-model'
import type { DocumentReadiness } from '@/features/readiness/readiness-types'

interface DocumentsHeroProps {
  readiness: DocumentReadiness
  /** Counts the chips use — must equal the rows each chip reveals. */
  filterableReadiness: DocumentReadiness
  /** Rendered when required requirements exist with no record yet. */
  pendingNote?: React.ReactNode
  bucketLabels: Record<BucketKey, string>
  completionLabel: string
  summaryLabel: string
  nextTitle: string
  nextDocLabel: string | null
  /** What the recommended document actually calls for (obtain/follow up/…). */
  nextActionLabel?: string | null
  nextEmptyLabel: string
  openLabel: string
  activeBucket: BucketKey | null
  onBucketClick: (key: BucketKey) => void
  onOpenNext?: () => void
  className?: string
}

/**
 * Derived from the canonical status→tone map rather than duplicated, so the
 * chips can never drift from the badges elsewhere in the app (ADR-034).
 */
const BUCKET_TONE: Record<BucketKey, StatusTone> = Object.fromEntries(
  (Object.keys(BUCKET_STATUS) as BucketKey[]).map((key) => {
    const status = BUCKET_STATUS[key]
    return [
      key,
      status ? (DOCUMENT_STATUS_TONE[status] ?? 'neutral') : 'neutral',
    ]
  })
) as Record<BucketKey, StatusTone>

/**
 * `requested` and `received` share the `info` tone by design, so each chip
 * carries an icon: status is never communicated by colour alone.
 */
const BUCKET_ICON: Record<BucketKey, LucideIcon> = {
  ready: Check,
  obtained: PackageCheck,
  requested: Clock,
  needsUpdate: RefreshCw,
  missing: CircleDashed,
  notApplicable: CircleSlash,
  optional: CirclePlus,
}

/**
 * Segment colors mirror the bucket tones. The five applicable classes partition
 * `applicable` exactly (ADR-033), so the bar always fills its track — it used to
 * be drawn over `requiredTotal` with `received`/`not_applicable` in no segment,
 * leaving an unexplained grey remainder.
 */
const BAR_SEGMENTS: { key: BucketKey; className: string }[] = [
  { key: 'ready', className: 'bg-success' },
  { key: 'obtained', className: 'bg-primary/70' },
  { key: 'requested', className: 'bg-info' },
  { key: 'needsUpdate', className: 'bg-warning' },
  { key: 'missing', className: 'bg-muted-foreground/30' },
]

/** Chips that are only worth showing when they actually hold something. */
const CONDITIONAL_BUCKETS: BucketKey[] = ['notApplicable', 'optional']

const BUCKET_ORDER: BucketKey[] = [
  'ready',
  'obtained',
  'requested',
  'needsUpdate',
  'missing',
  'notApplicable',
  'optional',
]

/**
 * The overview that answers "what is still missing?" above the fold: a
 * readiness bar + completion, five clickable quick-filter buckets, and the
 * single next document to obtain. Organizational only — never an approval
 * score.
 */
export function DocumentsHero({
  readiness,
  filterableReadiness,
  pendingNote,
  bucketLabels,
  completionLabel,
  summaryLabel,
  nextTitle,
  nextDocLabel,
  nextActionLabel,
  nextEmptyLabel,
  openLabel,
  activeBucket,
  onBucketClick,
  onOpenNext,
  className,
}: DocumentsHeroProps) {
  const total = Math.max(readiness.applicable, 1)
  // The bar visualises canonical readiness; the chips filter the list, so they
  // count only what a filter can actually reveal (ADR-034).
  const barCount = (key: BucketKey) => BUCKET_COUNT[key](readiness)
  const bucketCount = (key: BucketKey) => BUCKET_COUNT[key](filterableReadiness)

  return (
    <Card className={cn('py-0', className)}>
      <CardContent className="flex flex-col gap-5 py-5 lg:flex-row lg:items-stretch lg:gap-8">
        {/* Readiness */}
        <div className="min-w-0 flex-1 space-y-3">
          {/* Stacked below `sm`: side by side, the 310px of card width left at
              390px broke "%64 hazır" across two lines, stranding the word
              beneath the number. */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <p className="text-title text-foreground">{completionLabel}</p>
            <p className="text-caption text-muted-foreground">{summaryLabel}</p>
          </div>
          <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full">
            {BAR_SEGMENTS.map((seg) => {
              const pct = (barCount(seg.key) / total) * 100
              if (pct <= 0) return null
              return (
                <div
                  key={seg.key}
                  className={seg.className}
                  style={{ width: `${pct}%` }}
                />
              )
            })}
          </div>

          {pendingNote && (
            <p className="text-caption text-muted-foreground text-pretty">
              {pendingNote}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {BUCKET_ORDER.map((key) => {
              const active = activeBucket === key
              if (CONDITIONAL_BUCKETS.includes(key) && bucketCount(key) === 0) {
                return null
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onBucketClick(key)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1 transition-colors',
                    active
                      ? 'border-border-strong bg-accent'
                      : 'border-transparent hover:bg-accent'
                  )}
                >
                  <span className="text-body text-foreground font-medium tabular-nums">
                    {bucketCount(key)}
                  </span>
                  <StatusBadge tone={BUCKET_TONE[key]}>
                    {(() => {
                      const Icon = BUCKET_ICON[key]
                      return <Icon aria-hidden />
                    })()}
                    {bucketLabels[key]}
                  </StatusBadge>
                </button>
              )
            })}
          </div>
        </div>

        {/* Next document */}
        <div className="border-border bg-muted/40 flex min-w-0 flex-col justify-center gap-2 rounded-xl border p-4 lg:w-72">
          <p className="text-eyebrow text-muted-foreground uppercase">
            {nextTitle}
          </p>
          {nextDocLabel ? (
            <>
              <div className="flex items-center gap-2">
                <FileText
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden
                />
                <p className="text-body text-foreground truncate font-medium">
                  {nextDocLabel}
                </p>
              </div>
              {nextActionLabel && (
                <p className="text-caption text-muted-foreground">
                  {nextActionLabel}
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-fit"
                onClick={onOpenNext}
              >
                {openLabel}
                <ArrowRight />
              </Button>
            </>
          ) : (
            <p className="text-body text-muted-foreground text-pretty">
              {nextEmptyLabel}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
