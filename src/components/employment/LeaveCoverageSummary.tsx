import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { CoverageSummary } from '@/components/trip/CoverageSummary'
import { useFindingText } from '@/lib/finding-text'
import { useFormatters } from '@/lib/format'
import type { LeaveView } from '@/features/employment/employment-model'

interface LeaveCoverageSummaryProps {
  leave: LeaveView
  /** An in-wizard "edit leave dates" affordance (used from the review step). */
  onEditLeave?: () => void
}

type Tone = 'success' | 'warning' | 'danger' | 'neutral'

const SEVERITY_TONE: Record<string, Tone> = {
  error: 'danger',
  warning: 'warning',
  info: 'neutral',
}

/**
 * Approved-leave coverage against the canonical Trip dates. Coverage prose comes
 * straight from the `employment.leaveCoversTrip` findings (never re-derived); the
 * trip and leave dates are shown side-by-side so a mismatch is easy to see, with
 * calm jump actions. Renders nothing when leave doesn't apply to the status.
 */
export function LeaveCoverageSummary({
  leave,
  onEditLeave,
}: LeaveCoverageSummaryProps) {
  const { t } = useTranslation(['employment', 'common'])
  const findingText = useFindingText()
  const f = useFormatters()

  if (!leave.applicable) return null

  const dash = '—'
  const range = (start: string | null, end: string | null) =>
    `${start ? f.dateShort(start) : dash} – ${end ? f.dateShort(end) : dash}`

  let tone: Tone
  let title: string
  let description: string | undefined

  if (!leave.tripEntry || !leave.tripExit) {
    tone = 'neutral'
    title = t('employment:leave.noTrip')
    description = t('employment:leave.noTripHint')
  } else if (leave.findings.length > 0) {
    const finding = leave.findings[0]!
    const text = findingText(finding)
    tone = SEVERITY_TONE[finding.severity] ?? 'warning'
    title = text.title
    description = text.description
  } else {
    tone = 'success'
    title = t('employment:leave.coverageFull')
  }

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-3">
        <div className="bg-muted/40 flex flex-col gap-0.5 rounded-lg border p-3">
          <dt className="text-eyebrow text-muted-foreground uppercase">
            {t('employment:leave.tripDates')}
          </dt>
          <dd className="text-body text-foreground">
            {range(leave.tripEntry, leave.tripExit)}
          </dd>
        </div>
        <div className="bg-muted/40 flex flex-col gap-0.5 rounded-lg border p-3">
          <dt className="text-eyebrow text-muted-foreground uppercase">
            {t('employment:leave.leaveDates')}
          </dt>
          <dd className="text-body text-foreground">
            {range(leave.start, leave.end)}
          </dd>
        </div>
      </dl>

      <CoverageSummary
        tone={tone}
        title={title}
        description={description}
        action={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {onEditLeave && (
              <button
                type="button"
                onClick={onEditLeave}
                className="text-primary inline-flex items-center gap-1 rounded-sm text-sm font-medium hover:underline"
              >
                {t('employment:leave.editDates')}
                <ArrowRight className="size-3.5" />
              </button>
            )}
            <Link
              to="/trip?step=dates"
              className="text-primary inline-flex items-center gap-1 rounded-sm text-sm font-medium hover:underline"
            >
              {t('employment:leave.openTrip')}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        }
      />
    </div>
  )
}
