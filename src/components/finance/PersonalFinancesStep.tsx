import { useTranslation } from 'react-i18next'
import { Landmark } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { FieldHelp } from '@/components/ui/field-help'
import { Input } from '@/components/ui/input'
import { GuidanceNote } from '@/components/ui/guidance-note'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencySchema, type Currency } from '@/domain/types/common'
import { useFinanceModel } from '@/features/finance/finance-model'
import { guidanceForStep } from '@/features/finance/finance-guidance'
import { dynamicT } from '@/lib/i18n-dynamic'
import { IncomeOverview } from './IncomeOverview'

const CURRENCIES = CurrencySchema.options

/**
 * Step 2 — personal finances. The bank that holds the funds, the recorded
 * balance (kept for the applicant's own reference — never judged), the statement
 * date, plus a read-only overview of employment income. Values persist raw;
 * amounts are formatted for display only. No sufficiency or "strength" score.
 * Non-personal funding sources see a calm not-applicable state.
 */
export function PersonalFinancesStep() {
  const { state, updateFinancing } = useDossier()
  const { t } = useTranslation('finance')
  const td = dynamicT(t)
  const model = useFinanceModel()
  const financing = state.application?.financing
  const hints = guidanceForStep(model.guidance, 'personal')

  if (!model.personal.applicable) {
    return (
      <div className="flex flex-col gap-6">
        <EmptyState
          variant="inline"
          icon={Landmark}
          title={t('notApplicable.personal.title')}
          description={t('notApplicable.personal.description')}
        />
        {hints.map((hint) => (
          <GuidanceNote key={hint.id} tone={hint.tone}>
            {td(hint.messageKey)}
          </GuidanceNote>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('personal.bankName')}
          help={
            <FieldHelp
              label={t('why.trigger', { field: t('personal.bankName') })}
              title={t('why.title')}
            >
              <p>{t('why.bankName')}</p>
            </FieldHelp>
          }
        >
          <Input
            value={financing?.bankName ?? ''}
            placeholder={t('personal.bankNamePlaceholder')}
            onChange={(e) =>
              updateFinancing({ bankName: e.target.value || undefined })
            }
          />
        </Field>

        <Field
          label={t('personal.statementDate')}
          help={
            <FieldHelp
              label={t('why.trigger', { field: t('personal.statementDate') })}
              title={t('why.title')}
            >
              <p>{t('why.statementDate')}</p>
            </FieldHelp>
          }
        >
          <Input
            type="date"
            value={financing?.statementDate ?? ''}
            onChange={(e) =>
              updateFinancing({ statementDate: e.target.value || undefined })
            }
          />
        </Field>

        <Field
          label={t('personal.accountBalance')}
          description={t('personal.balanceHint')}
          help={
            <FieldHelp
              label={t('why.trigger', { field: t('personal.accountBalance') })}
              title={t('why.title')}
            >
              <p>{t('why.accountBalance')}</p>
            </FieldHelp>
          }
        >
          <Input
            type="number"
            min={0}
            inputMode="decimal"
            value={financing?.accountBalance ?? ''}
            placeholder="0"
            onChange={(e) =>
              updateFinancing({
                accountBalance: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
        </Field>

        <Field label={t('personal.currency')} htmlFor="finance-currency">
          <Select
            value={financing?.currency ?? 'EUR'}
            onValueChange={(v) => updateFinancing({ currency: v as Currency })}
          >
            <SelectTrigger id="finance-currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <IncomeOverview income={model.income} />

      {hints.map((hint) => (
        <GuidanceNote key={hint.id} tone={hint.tone}>
          {td(hint.messageKey)}
        </GuidanceNote>
      ))}
    </div>
  )
}
