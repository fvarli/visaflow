import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { KnownOccupationCode } from '@/domain/types/common'
import { isKnownOccupationCode } from '@/domain/types/common'

interface OccupationSelectorProps {
  /** The codes legal under the status already chosen. */
  options: readonly KnownOccupationCode[]
  /** The **raw** persisted code, which may be unknown to this build. */
  value: string | undefined
  onValueChange: (value: KnownOccupationCode) => void
  id?: string
  ariaLabel?: string
  disabled?: boolean
}

/**
 * The occupational-category selector.
 *
 * Two things distinguish it from `EmploymentStatusSelector`, and both are
 * load-bearing rather than stylistic.
 *
 * THE OPTIONS ARE PASSED IN. Every employment status is always available; these
 * are not — a public servant is employed and a farmer is not — so the caller
 * supplies the subset legal for the status already chosen, from the one map in
 * the domain layer. Deriving it here from a second copy of that rule is how the
 * question a user is asked and the answer applicability accepts drift apart.
 *
 * IT TAKES THE **RAW** CODE, AND RENDERS AN UNRECOGNISED ONE AS AN OPTION.
 * Radix shows `SelectValue`'s placeholder whenever the current value matches no
 * `SelectItem`, so a code imported from a newer build would render as an empty
 * control — indistinguishable from an unanswered question, while the value sat
 * in the file and re-exported intact. That is the misreport ADR-053 forbids and
 * a near-miss of the defect that got the first attempt reverted. So an
 * unrecognised value is given an item of its own, labelled as unrecognised, and
 * shows as selected: honest about what the dossier holds, honest that this
 * build cannot act on it, and replaceable by picking a known option.
 */
export function OccupationSelector({
  options,
  value,
  onValueChange,
  id,
  ariaLabel,
  disabled,
}: OccupationSelectorProps) {
  const { t } = useTranslation(['employment', 'visa-domain'])
  const td = dynamicT(t)

  /**
   * Unrecognised, and therefore not in `options` — but still this dossier's
   * answer. Note the test is "not known to this build", not "not offered for
   * this status": a known code that contradicts the status is cleared by the
   * step above, whereas an unknown one is never destroyed on a guess.
   */
  const unrecognised =
    value && !isKnownOccupationCode(value) ? value : undefined

  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => onValueChange(v as KnownOccupationCode)}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className="w-full">
        <SelectValue placeholder={t('employment:occupation.placeholder')} />
      </SelectTrigger>
      <SelectContent>
        {unrecognised && (
          <SelectItem value={unrecognised}>
            {t('employment:occupation.unrecognised', { code: unrecognised })}
          </SelectItem>
        )}
        {options.map((code) => (
          <SelectItem key={code} value={code}>
            {td(`visa-domain:occupationCode.${code}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
