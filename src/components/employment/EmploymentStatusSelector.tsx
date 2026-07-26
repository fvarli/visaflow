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
  EmploymentStatusSchema,
  type EmploymentStatus,
} from '@/domain/types/common'

const STATUSES = EmploymentStatusSchema.options

interface EmploymentStatusSelectorProps {
  value: EmploymentStatus | ''
  onValueChange: (value: EmploymentStatus) => void
  id?: string
  ariaLabel?: string
  disabled?: boolean
}

/**
 * Accessible employment-status selector. A Radix `Select` (keyboard-operable,
 * seven options — too many for a segmented row on mobile) whose labels are
 * resolved from the language-independent enum via `visa-domain:employmentStatus.*`.
 */
export function EmploymentStatusSelector({
  value,
  onValueChange,
  id,
  ariaLabel,
  disabled,
}: EmploymentStatusSelectorProps) {
  const { t } = useTranslation(['employment', 'visa-domain'])
  const td = dynamicT(t)

  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => onValueChange(v as EmploymentStatus)}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className="w-full">
        <SelectValue placeholder={t('employment:status.placeholder')} />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {td(`visa-domain:employmentStatus.${status}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
