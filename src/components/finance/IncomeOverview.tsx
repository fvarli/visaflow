import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Briefcase } from 'lucide-react'
import { DataList, DataListItem } from '@/components/ui/data-list'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { IncomeView } from '@/features/finance/finance-model'

interface IncomeOverviewProps {
  income: IncomeView
}

/**
 * A read-only overview of employment income, read straight from the Employment
 * section (never copied or re-entered here). It links back to Employment for any
 * change, so income has a single home. Purely factual — no "strength" or
 * sufficiency judgement.
 */
export function IncomeOverview({ income }: IncomeOverviewProps) {
  const { t } = useTranslation(['finance', 'visa-domain'])
  const td = dynamicT(t)
  const f = useFormatters()

  return (
    <div className="bg-muted/40 flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2.5">
        <Briefcase aria-hidden className="text-muted-foreground size-4" />
        <h3 className="text-body text-foreground font-medium">
          {t('finance:income.title')}
        </h3>
      </div>

      {income.hasEmployment ? (
        <>
          <DataList>
            <DataListItem
              label={t('finance:income.status')}
              value={
                income.status
                  ? td(`visa-domain:employmentStatus.${income.status}`)
                  : undefined
              }
            />
            <DataListItem
              label={t('finance:income.monthlyNetIncome')}
              value={
                income.monthlyNetIncome != null
                  ? f.currency(income.monthlyNetIncome, income.currency)
                  : undefined
              }
            />
          </DataList>
          <Link
            to="/employment?step=income"
            className="text-primary inline-flex items-center gap-1 self-start rounded-sm text-sm font-medium hover:underline"
          >
            {t('finance:income.open')}
            <ArrowRight className="size-3.5" />
          </Link>
        </>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <p className="text-body text-muted-foreground text-pretty">
            {t('finance:income.none')}
          </p>
          <Link
            to="/employment?step=income"
            className="text-primary inline-flex items-center gap-1 rounded-sm text-sm font-medium hover:underline"
          >
            {t('finance:income.open')}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}
