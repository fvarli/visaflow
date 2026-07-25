import * as React from 'react'
import { AlertTriangle, BadgeCheck, CircleDashed } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'

export interface DocumentCardProps {
  label: string
  categoryLabel: string
  ownerLabel: string
  statusLabel: string
  statusTone: StatusTone
  isCustom?: boolean
  customLabel?: string
  /** Preformatted date rows, e.g. { label: "Valid until", value: "10 Apr 2026" }. */
  dates?: { label: string; value: string }[]
  notesPreview?: string
  missingInfo?: boolean
  missingInfoLabel?: string
  verified?: boolean
  verifiedLabel: string
  notVerifiedLabel: string
  findingCount?: number
  findingLabel?: string
  findingTone?: StatusTone
  openLabel: string
  onOpen: () => void
  selected?: boolean
}

/**
 * A document as a small workspace card — status, owner, dates, verification, a
 * notes preview and any related-finding count, readable in a glance. The title
 * is the single focusable control that opens the side panel; the whole card is
 * memoized because a workspace may hold hundreds of them.
 */
function DocumentCardImpl({
  label,
  categoryLabel,
  ownerLabel,
  statusLabel,
  statusTone,
  isCustom = false,
  customLabel,
  dates,
  notesPreview,
  missingInfo = false,
  missingInfoLabel,
  verified = false,
  verifiedLabel,
  notVerifiedLabel,
  findingCount = 0,
  findingLabel,
  findingTone = 'warning',
  openLabel,
  onOpen,
  selected = false,
}: DocumentCardProps) {
  return (
    <Card
      className={cn(
        'gap-0 py-0 transition-shadow hover:shadow-sm',
        selected && 'border-primary'
      )}
    >
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-body font-medium">
              <button
                type="button"
                onClick={onOpen}
                title={openLabel}
                className="text-foreground text-left hover:underline"
              >
                {label}
              </button>
            </h3>
            <p className="text-caption text-muted-foreground mt-0.5">
              {categoryLabel} · {ownerLabel}
              {isCustom && customLabel ? ` · ${customLabel}` : ''}
            </p>
          </div>
          <StatusBadge tone={statusTone} dot>
            {statusLabel}
          </StatusBadge>
        </div>

        {dates && dates.length > 0 && (
          <dl className="flex flex-wrap gap-x-6 gap-y-1">
            {dates.map((d) => (
              <div key={d.label} className="flex items-baseline gap-1.5">
                <dt className="text-caption text-muted-foreground">
                  {d.label}
                </dt>
                <dd className="text-caption text-foreground" data-numeric>
                  {d.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {notesPreview && (
          <p className="text-caption text-muted-foreground line-clamp-2">
            {notesPreview}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            className={cn(
              'text-caption inline-flex items-center gap-1',
              verified ? 'text-success-foreground' : 'text-muted-foreground'
            )}
          >
            {verified ? (
              <BadgeCheck className="size-3.5" aria-hidden />
            ) : (
              <CircleDashed className="size-3.5" aria-hidden />
            )}
            {verified ? verifiedLabel : notVerifiedLabel}
          </span>

          {missingInfo && missingInfoLabel && (
            <span className="text-caption text-muted-foreground inline-flex items-center gap-1">
              <CircleDashed className="size-3.5" aria-hidden />
              {missingInfoLabel}
            </span>
          )}

          {findingCount > 0 && findingLabel && (
            <StatusBadge tone={findingTone} className="ml-auto">
              <AlertTriangle className="size-3" aria-hidden />
              {findingLabel}
            </StatusBadge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export const DocumentCard = React.memo(DocumentCardImpl)
