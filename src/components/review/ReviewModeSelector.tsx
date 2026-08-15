import { useTranslation } from 'react-i18next'
import { ClipboardCheck, DoorOpen } from 'lucide-react'
import { SegmentedControl } from '@/components/ui/segmented-control'

/** The two views of the same Final Review model. */
export type ReviewMode = 'full' | 'departure'

interface ReviewModeSelectorProps {
  value: ReviewMode
  onValueChange: (value: ReviewMode) => void
}

/**
 * Switches between the detailed review and the compact departure check.
 *
 * Both views read the *same* `FinalReviewModel` — this is presentation state
 * only, so there is no second derivation and nothing to persist.
 */
export function ReviewModeSelector({
  value,
  onValueChange,
}: ReviewModeSelectorProps) {
  const { t } = useTranslation('review')

  return (
    <SegmentedControl<ReviewMode>
      ariaLabel={t('modes.label')}
      value={value}
      onValueChange={onValueChange}
      options={[
        { value: 'full', label: t('modes.full'), icon: ClipboardCheck },
        { value: 'departure', label: t('modes.departure'), icon: DoorOpen },
      ]}
    />
  )
}
