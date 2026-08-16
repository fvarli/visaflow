import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, User } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { useFindingText } from '@/lib/finding-text'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { SponsorSummaryView } from '@/features/finance/finance-model'

interface SponsorSummaryCardProps {
  sponsor: SponsorSummaryView
}

/**
 * A read-only summary of one sponsor in the context of funding this trip. It
 * answers "is this sponsor on file and how is their evidence?", never "how do I
 * edit them" — all editing lives in the Sponsors workspace, deep-linked here.
 * Derived entirely from current sponsor state; it stores nothing and never
 * labels a sponsor financially strong or weak.
 */
export function SponsorSummaryCard({ sponsor }: SponsorSummaryCardProps) {
  const { t } = useTranslation(['finance', 'visa-domain', 'common'])
  const td = dynamicT(t)
  const f = useFormatters()
  const findingText = useFindingText()

  const covers = sponsor.coveredExpenses.map((e) =>
    td(`visa-domain:expenseType.${e}`)
  )

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <User aria-hidden className="text-muted-foreground size-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-body text-foreground truncate font-medium">
              {sponsor.firstName} {sponsor.lastName}
            </p>
            <p className="text-caption text-muted-foreground">
              {td(`visa-domain:sponsorRelationship.${sponsor.relationship}`)}
            </p>
          </div>
        </div>
        <StatusBadge
          tone={sponsor.documentCount > 0 ? 'success' : 'neutral'}
          dot
        >
          {sponsor.documentCount > 0
            ? t('finance:sponsors.documentsAvailable', {
                count: sponsor.documentCount,
              })
            : t('finance:sponsors.noDocuments')}
        </StatusBadge>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sponsor.monthlyIncome != null && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-eyebrow text-muted-foreground uppercase">
              {t('finance:sponsors.monthlyIncome')}
            </dt>
            <dd className="text-body text-foreground" data-numeric>
              {f.currency(sponsor.monthlyIncome, sponsor.currency)}
            </dd>
          </div>
        )}
        {covers.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-eyebrow text-muted-foreground uppercase">
              {t('finance:sponsors.covers')}
            </dt>
            <dd className="text-body text-foreground">{covers.join(', ')}</dd>
          </div>
        )}
      </dl>

      {!sponsor.hasFinanceInfo && (
        <p className="text-caption text-muted-foreground">
          {t('finance:sponsors.missingFinanceInfo')}
        </p>
      )}

      {sponsor.findings.length > 0 && (
        <ul className="flex flex-col gap-1">
          {sponsor.findings.map((finding) => (
            <li key={finding.id} className="text-caption text-muted-foreground">
              {findingText(finding).title}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3">
        <Link
          to={`/sponsors?sponsor=${sponsor.id}`}
          className="text-primary inline-flex items-center gap-1 rounded-sm text-sm font-medium hover:underline"
        >
          {t('finance:sponsors.openSponsor')}
          <ArrowRight className="size-3.5" />
        </Link>
        <Link
          to="/documents?category=sponsor"
          className="text-primary inline-flex items-center gap-1 rounded-sm text-sm hover:underline"
        >
          {t('finance:sponsors.openInDocuments')}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
