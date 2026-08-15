import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, CheckCircle2, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { documentLabel } from '@/lib/document-label'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import { SegmentedControl } from '@/components/ui/segmented-control'
import {
  attentionCount,
  filterChecklist,
  type ChecklistFilter,
  type ChecklistRow,
  type SubmissionChecklist as SubmissionChecklistModel,
  type SubmissionGroup,
} from '@/features/review/review-checklist'
import { CHECKLIST_STATE_ICON, CHECKLIST_STATE_TONE } from './state-meta'

interface SubmissionChecklistProps {
  checklist: SubmissionChecklistModel
}

/**
 * The core of the Final Review: everything the applicant hands over, grouped
 * the way it goes into the folder.
 *
 * Statuses are the Documents workspace's own — this renders them, it does not
 * own them. Every actionable row deep-links to the exact document (or its
 * category) so nothing here is a dead end.
 */
export function SubmissionChecklist({ checklist }: SubmissionChecklistProps) {
  const { t } = useTranslation('review')
  // View state only — never a URL param, never persisted.
  const [filter, setFilter] = useState<ChecklistFilter>('all')

  if (checklist.groups.length === 0) {
    // Deliberately not an `EmptyState` — that renders its own `h2`, which would
    // sit under the section's own `h2` and muddle the heading outline.
    return (
      <div className="bg-card flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
        <div className="text-muted-foreground flex items-center gap-2.5">
          <FileText aria-hidden className="size-5 shrink-0" />
          <p className="text-body text-foreground">{t('checklist.empty')}</p>
        </div>
        <p className="text-caption text-muted-foreground text-pretty">
          {t('checklist.emptyHint')}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to="/documents">{t('checklist.openDocuments')}</Link>
        </Button>
      </div>
    )
  }

  const outstanding = attentionCount(checklist.counts)
  const view = filterChecklist(checklist, filter)

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl<ChecklistFilter>
        size="sm"
        ariaLabel={t('checklist.filter.label')}
        value={filter}
        onValueChange={setFilter}
        options={[
          {
            value: 'all',
            label: t('checklist.filter.all', { count: checklist.counts.total }),
          },
          {
            value: 'attention',
            label: t('checklist.filter.attention', { count: outstanding }),
          },
        ]}
      />

      {view.groups.length === 0 ? (
        // Not an `EmptyState`: that renders its own `h2`, which would sit under
        // the section's `h2` and muddle the heading outline.
        <div className="bg-card flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <p className="text-body text-foreground flex items-center gap-2.5">
            <CheckCircle2
              aria-hidden
              className="text-success size-5 shrink-0"
            />
            {t('checklist.attentionEmpty.title')}
          </p>
          <p className="text-caption text-muted-foreground text-pretty">
            {t('checklist.attentionEmpty.body')}
          </p>
          <Button size="sm" variant="outline" onClick={() => setFilter('all')}>
            {t('checklist.attentionEmpty.showAll')}
          </Button>
        </div>
      ) : (
        view.groups.map((group) => (
          <ChecklistGroup key={group.id} group={group} />
        ))
      )}
    </div>
  )
}

export function ChecklistGroup({ group }: { group: SubmissionGroup }) {
  const { t } = useTranslation('review')
  const td = dynamicT(t)

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <h3 className="text-body text-foreground font-semibold">
          {td(`checklist.groups.${group.id}`)}
        </h3>
        <StatusBadge
          tone={
            group.counts.actionable > 0 &&
            group.counts.ready === group.counts.actionable
              ? 'success'
              : 'neutral'
          }
        >
          {t('checklist.groupSummary', {
            ready: group.counts.ready,
            total: group.counts.actionable,
          })}
        </StatusBadge>
      </CardHeader>
      <CardContent>
        <ul className="divide-border divide-y">
          {group.rows.map((row) => (
            <ChecklistItem key={`${row.group}-${row.code}`} row={row} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function ChecklistItem({ row }: { row: ChecklistRow }) {
  const { t } = useTranslation(['review', 'visa-domain'])
  const td = dynamicT(t)
  const format = useFormatters()
  const Icon = CHECKLIST_STATE_ICON[row.state]

  const label = documentLabel(t, row.code, row.legacyName)

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <Icon
          aria-hidden
          className="text-muted-foreground mt-0.5 size-4 shrink-0"
        />
        <div className="min-w-0 space-y-0.5">
          <Link
            to={row.to}
            className="text-body text-foreground hover:text-primary inline-flex items-center gap-1 rounded-sm underline-offset-4 hover:underline"
          >
            {label}
            <ArrowUpRight
              aria-hidden
              className="text-muted-foreground size-3.5 shrink-0"
            />
          </Link>
          <p className="text-caption text-muted-foreground">
            {row.status === 'not_instantiated'
              ? t('review:checklist.notCreated')
              : td(`visa-domain:documentStatus.${row.status}`)}
            {row.expiresBeforeAppointment && (
              <span className="text-warning-foreground">
                {' · '}
                {t('review:checklist.expiresBeforeAppointment')}
              </span>
            )}
            {!row.expiresBeforeAppointment && row.validUntil && (
              <>
                {' · '}
                {t('review:checklist.validUntil', {
                  date: format.dateShort(row.validUntil),
                })}
              </>
            )}
          </p>
        </div>
      </div>
      <StatusBadge tone={CHECKLIST_STATE_TONE[row.state]}>
        {td(`review:checklist.state.${row.state}`)}
      </StatusBadge>
    </li>
  )
}
