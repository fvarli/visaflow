import * as React from 'react'
import { AlertTriangle } from 'lucide-react'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'

export interface DocumentRowProps {
  label: string
  metaLabel: string
  statusLabel: string
  statusTone: StatusTone
  findingCount?: number
  openLabel: string
  onOpen: () => void
  selected?: boolean
}

/** Compact single-line document row for the list view. Memoized. */
function DocumentRowImpl({
  label,
  metaLabel,
  statusLabel,
  statusTone,
  findingCount = 0,
  openLabel,
  onOpen,
  selected = false,
}: DocumentRowProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={openLabel}
      className={cn(
        'hover:bg-accent flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
        selected ? 'border-primary bg-accent/50' : 'border-border'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-body text-foreground truncate font-medium">
          {label}
        </p>
        <p className="text-caption text-muted-foreground truncate">
          {metaLabel}
        </p>
      </div>
      {findingCount > 0 && (
        <AlertTriangle
          className="text-warning-foreground size-4 shrink-0"
          aria-hidden
        />
      )}
      <StatusBadge tone={statusTone} dot>
        {statusLabel}
      </StatusBadge>
    </button>
  )
}

export const DocumentRow = React.memo(DocumentRowImpl)
