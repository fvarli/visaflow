import { useTranslation } from 'react-i18next'
import { Wallet } from 'lucide-react'
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
import { useEmploymentModel } from '@/features/employment/employment-model'
import { guidanceForStep } from '@/features/employment/employment-guidance'
import { dynamicT } from '@/lib/i18n-dynamic'

const CURRENCIES = CurrencySchema.options

/**
 * Step 3 — documented income and the salary bank. Income is honestly labelled as
 * **net** (the only figure the schema stores); the value persists as a raw
 * number + currency code, formatted for display only. No "financial strength"
 * score, no gross field.
 */
export function IncomeStep() {
  const { state, updateEmployment } = useDossier()
  const { t } = useTranslation('employment')
  const td = dynamicT(t)
  const model = useEmploymentModel()
  const employment = state.application?.employment
  const hints = guidanceForStep(model.guidance, 'income')

  if (!model.isActive) {
    return (
      <EmptyState
        variant="inline"
        icon={Wallet}
        title={t('notApplicable.income.title')}
        description={t('notApplicable.income.description')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label={t('fields.monthlyNetIncome')}
          help={
            <FieldHelp
              label={t('why.trigger', { field: t('fields.monthlyNetIncome') })}
              title={t('why.title')}
            >
              <p>{t('why.income')}</p>
            </FieldHelp>
          }
        >
          <Input
            type="number"
            min={0}
            inputMode="decimal"
            value={employment?.monthlyNetIncome ?? ''}
            placeholder="0"
            onChange={(e) =>
              updateEmployment({
                monthlyNetIncome: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
        </Field>

        <Field label={t('fields.currency')} htmlFor="employment-currency">
          <Select
            value={employment?.currency ?? 'EUR'}
            onValueChange={(v) => updateEmployment({ currency: v as Currency })}
          >
            <SelectTrigger id="employment-currency" className="w-full">
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

        <Field
          label={t('fields.salaryBank')}
          className="sm:col-span-1"
          help={
            <FieldHelp
              label={t('why.trigger', { field: t('fields.salaryBank') })}
              title={t('why.title')}
            >
              <p>{t('why.salaryBank')}</p>
            </FieldHelp>
          }
        >
          <Input
            value={employment?.salaryBank ?? ''}
            placeholder={t('fields.salaryBankPlaceholder')}
            onChange={(e) =>
              updateEmployment({ salaryBank: e.target.value || undefined })
            }
          />
        </Field>
      </div>

      {hints.map((hint) => (
        <GuidanceNote key={hint.id} tone={hint.tone}>
          {td(hint.messageKey)}
        </GuidanceNote>
      ))}
    </div>
  )
}
