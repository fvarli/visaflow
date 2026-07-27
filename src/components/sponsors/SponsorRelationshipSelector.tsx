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
  SponsorRelationshipSchema,
  type SponsorRelationship,
} from '@/domain/types/common'

const RELATIONSHIPS = SponsorRelationshipSchema.options

interface SponsorRelationshipSelectorProps {
  value: SponsorRelationship | ''
  onValueChange: (value: SponsorRelationship) => void
  id?: string
  ariaLabel?: string
  disabled?: boolean
}

/**
 * Accessible sponsor-relationship selector. A Radix `Select` exposing **all**
 * thirteen relationship values (the old page offered only eight), with labels
 * resolved from the language-independent enum via
 * `visa-domain:sponsorRelationship.*`.
 */
export function SponsorRelationshipSelector({
  value,
  onValueChange,
  id,
  ariaLabel,
  disabled,
}: SponsorRelationshipSelectorProps) {
  const { t } = useTranslation(['sponsors', 'visa-domain'])
  const td = dynamicT(t)

  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => onValueChange(v as SponsorRelationship)}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className="w-full">
        <SelectValue
          placeholder={t('sponsors:fields.relationshipPlaceholder')}
        />
      </SelectTrigger>
      <SelectContent>
        {RELATIONSHIPS.map((relationship) => (
          <SelectItem key={relationship} value={relationship}>
            {td(`visa-domain:sponsorRelationship.${relationship}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
