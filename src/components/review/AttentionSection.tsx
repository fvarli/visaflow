import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { FindingCard } from '@/components/validation/FindingCard'
import type { ReviewAttention } from '@/features/review/review-model'

interface AttentionSectionProps {
  attention: ReviewAttention
}

/**
 * What still needs attention before submitting.
 *
 * This shows the validation engine's own findings, rendered with the Validation
 * Center's own `FindingCard` and its own localized prose — no rule is re-encoded
 * and no count is recomputed, so the two pages can never disagree. Informational
 * notes are summarised rather than listed, so they never read as problems.
 */
export function AttentionSection({ attention }: AttentionSectionProps) {
  const { t } = useTranslation('review')

  if (attention.items.length === 0) {
    return (
      <div className="bg-card flex flex-col gap-2 rounded-xl border p-5">
        <div className="text-foreground flex items-center gap-2.5">
          <CheckCircle2 aria-hidden className="text-success size-5 shrink-0" />
          <p className="text-body">{t('attention.none')}</p>
        </div>
        <p className="text-caption text-muted-foreground text-pretty">
          {t('attention.noneHint')}
        </p>
        {attention.noteCount > 0 && (
          <p className="text-caption text-muted-foreground">
            {t('attention.notes', { count: attention.noteCount })} ·{' '}
            {t('attention.notesHint')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {attention.items.map((item) => (
        <FindingCard key={item.finding.id} item={item} />
      ))}

      {attention.noteCount > 0 && (
        <p className="text-caption text-muted-foreground">
          {t('attention.notes', { count: attention.noteCount })} ·{' '}
          {t('attention.notesHint')}
        </p>
      )}

      <Link
        to="/consistency-checks"
        className="text-primary inline-flex w-fit items-center gap-1 rounded-sm text-sm font-medium hover:underline"
      >
        {t('attention.seeAll')}
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </div>
  )
}
