import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { useFinanceModel } from '@/features/finance/finance-model'
import { guidanceForStep } from '@/features/finance/finance-guidance'
import { dynamicT } from '@/lib/i18n-dynamic'
import { SponsorSummaryCard } from './SponsorSummaryCard'

/**
 * Step 3 — sponsors, summarized in the context of funding this trip. Read-only:
 * every sponsor add/edit lives in the Sponsors workspace, deep-linked here, so
 * there is never a second sponsor store. Non-sponsor funding sources see a calm
 * not-applicable state; sponsor funding with no sponsor yet gets a gentle nudge.
 */
export function SponsorsStep() {
  const { t } = useTranslation('finance')
  const td = dynamicT(t)
  const model = useFinanceModel()
  const hints = guidanceForStep(model.guidance, 'sponsors')

  if (!model.sponsors.applicable) {
    return (
      <EmptyState
        variant="inline"
        icon={Users}
        title={t('notApplicable.sponsors.title')}
        description={t('notApplicable.sponsors.description')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {hints.map((hint) => (
        <GuidanceNote key={hint.id} tone={hint.tone}>
          {td(hint.messageKey)}
        </GuidanceNote>
      ))}

      {model.sponsors.hasNone ? (
        <EmptyState
          variant="inline"
          icon={Users}
          title={t('sponsors.none')}
          description={t('sponsors.noneHint')}
          action={
            <Button asChild size="sm">
              <Link to="/sponsors">{t('sponsors.addSponsor')}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {model.sponsors.list.map((sponsor) => (
              <SponsorSummaryCard key={sponsor.id} sponsor={sponsor} />
            ))}
          </div>
          <Link
            to="/sponsors"
            className="text-primary inline-flex items-center gap-1 self-start rounded-sm text-sm font-medium hover:underline"
          >
            {t('sponsors.openSponsors')}
            <ArrowRight className="size-3.5" />
          </Link>
        </>
      )}
    </div>
  )
}
