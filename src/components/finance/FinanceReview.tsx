import { useTranslation } from 'react-i18next'
import { ArrowRight, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { DataList, DataListItem } from '@/components/ui/data-list'
import { useFindingText } from '@/lib/finding-text'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import { FINANCE_STEP_IDS } from '@/features/finance/finance-wizard'
import type {
  FinanceModel,
  FinanceReviewStatus,
} from '@/features/finance/finance-model'

interface FinanceReviewProps {
  model: FinanceModel
  onEdit: (stepIndex: number) => void
}

const STATUS_TONE: Record<FinanceReviewStatus, StatusTone> = {
  captured: 'success',
  incomplete: 'warning',
  needsReview: 'warning',
  notApplicable: 'neutral',
}

/**
 * The finance review — a true summary (never an editing screen). Each section
 * shows a plain-language status and jumps back to its step; a compact facts list
 * and any funding-consistency findings round it out. Status language is
 * organizational (captured / incomplete / needs review / not applicable) — never
 * "approved", "strong", or a probability (ADR-016).
 */
export function FinanceReview({ model, onEdit }: FinanceReviewProps) {
  const { t } = useTranslation(['finance', 'visa-domain', 'common'])
  const td = dynamicT(t)
  const f = useFormatters()
  const findingText = useFindingText()

  const gatherCount = model.documents.gather.reduce(
    (sum, g) => sum + g.rows.length,
    0
  )

  return (
    <div className="flex flex-col gap-6">
      <ul className="divide-border divide-y">
        {model.review.map((section) => {
          const index = FINANCE_STEP_IDS.indexOf(section.id)
          return (
            <li
              key={section.id}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
            >
              <span className="text-body text-foreground">
                {td(`finance:steps.${section.id}.title`)}
              </span>
              <span className="flex items-center gap-2">
                <StatusBadge tone={STATUS_TONE[section.status]} dot>
                  {t(`finance:review.status.${section.status}`)}
                </StatusBadge>
                <Button variant="ghost" size="sm" onClick={() => onEdit(index)}>
                  <Pencil />
                  {t('finance:review.edit')}
                </Button>
              </span>
            </li>
          )
        })}
      </ul>

      <DataList>
        <DataListItem
          label={t('finance:source.label')}
          value={
            model.source
              ? td(`visa-domain:financingSource.${model.source}`)
              : undefined
          }
        />
        {model.personal.applicable && (
          <>
            <DataListItem
              label={t('finance:personal.bankName')}
              value={model.personal.bankName ?? undefined}
            />
            <DataListItem
              label={t('finance:personal.accountBalance')}
              value={
                model.personal.accountBalance != null
                  ? f.currency(
                      model.personal.accountBalance,
                      model.personal.currency
                    )
                  : undefined
              }
            />
          </>
        )}
        {model.income.hasEmployment && (
          <DataListItem
            label={t('finance:income.monthlyNetIncome')}
            value={
              model.income.monthlyNetIncome != null
                ? f.currency(
                    model.income.monthlyNetIncome,
                    model.income.currency
                  )
                : undefined
            }
          />
        )}
        {model.sponsors.applicable && (
          <DataListItem
            label={t('finance:steps.sponsors.title')}
            value={t('finance:sponsors.count', {
              count: model.sponsors.list.length,
            })}
          />
        )}
        {model.documents.hasFinanceDocs && (
          <DataListItem
            label={t('finance:steps.documents.title')}
            value={
              gatherCount > 0
                ? t('finance:review.gatherRemaining', { count: gatherCount })
                : t('finance:documents.gather.empty')
            }
          />
        )}
      </DataList>

      {model.findings.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-body text-foreground font-medium">
            {t('finance:review.attention')}
          </h3>
          <ul className="flex flex-col gap-2">
            {model.findings.map((finding) => (
              <li
                key={finding.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm text-muted-foreground">
                  {findingText(finding).title}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(FINANCE_STEP_IDS.indexOf('sponsors'))}
                >
                  {t('finance:review.goToFix')}
                  <ArrowRight />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
