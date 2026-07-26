import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  FinancingSourceSchema,
  type FinancingSource,
} from '@/domain/types/common'

const SOURCES = FinancingSourceSchema.options

interface FundingSourceSelectorProps {
  value: FinancingSource | ''
  onValueChange: (value: FinancingSource) => void
  id?: string
  ariaLabel?: string
  disabled?: boolean
}

/**
 * Accessible funding-source selector. A Radix `Select` (keyboard-operable) whose
 * labels are resolved from the language-independent enum via
 * `visa-domain:financingSource.*`. A Select rather than a segmented row: the four
 * labels are long in both Turkish and English, and this keeps the control calm
 * on narrow screens. All four schema values (self / sponsor / employer / mixed)
 * stay selectable so an imported dossier is never left with an unreachable value.
 */
export function FundingSourceSelector({
  value,
  onValueChange,
  id,
  ariaLabel,
  disabled,
}: FundingSourceSelectorProps) {
  const { t } = useTranslation(['finance', 'visa-domain'])
  const td = dynamicT(t)

  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => onValueChange(v as FinancingSource)}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className="w-full">
        <SelectValue placeholder={t('finance:source.placeholder')} />
      </SelectTrigger>
      <SelectContent>
        {SOURCES.map((source) => (
          <SelectItem key={source} value={source}>
            {td(`visa-domain:financingSource.${source}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
