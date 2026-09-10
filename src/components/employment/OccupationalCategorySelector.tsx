import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { OccupationalCategory } from '@/domain/types/common'

interface OccupationalCategorySelectorProps {
  /** The categories that belong under the chosen employment status. */
  options: readonly OccupationalCategory[]
  value: OccupationalCategory | ''
  onValueChange: (value: OccupationalCategory) => void
  id?: string
  ariaLabel?: string
  disabled?: boolean
}

/**
 * Occupational-category selector — the same Radix `Select` as its sibling, with
 * one difference that matters: the options are passed in rather than read off
 * the enum.
 *
 * `EmploymentStatusSelector` offers every value because every value is always
 * available. These are not: a public servant is employed and a farmer is not,
 * so the caller supplies the subset that fits the status already chosen. Doing
 * it here — from `OCCUPATIONAL_CATEGORIES_BY_STATUS`, not from a rule spelled
 * out twice — is what keeps the two vocabularies from disagreeing.
 */
export function OccupationalCategorySelector({
  options,
  value,
  onValueChange,
  id,
  ariaLabel,
  disabled,
}: OccupationalCategorySelectorProps) {
  const { t } = useTranslation(['employment', 'visa-domain'])
  const td = dynamicT(t)

  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => onValueChange(v as OccupationalCategory)}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className="w-full">
        <SelectValue placeholder={t('employment:category.placeholder')} />
      </SelectTrigger>
      <SelectContent>
        {options.map((category) => (
          <SelectItem key={category} value={category}>
            {td(`visa-domain:occupationalCategory.${category}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
