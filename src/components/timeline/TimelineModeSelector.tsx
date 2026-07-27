import { useTranslation } from 'react-i18next'
import { ListChecks, CalendarDays, FileClock } from 'lucide-react'
import { SegmentedControl } from '@/components/ui/segmented-control'

export type TimelineMode = 'plan' | 'dates' | 'freshness'

interface TimelineModeSelectorProps {
  value: TimelineMode
  onValueChange: (value: TimelineMode) => void
}

/**
 * The Timeline view switch — Preparation plan / Key dates / Document freshness.
 * A keyboard-operable segmented control (ARIA radiogroup), usable on mobile.
 */
export function TimelineModeSelector({
  value,
  onValueChange,
}: TimelineModeSelectorProps) {
  const { t } = useTranslation('timeline')

  return (
    <SegmentedControl<TimelineMode>
      ariaLabel={t('modes.label')}
      value={value}
      onValueChange={onValueChange}
      options={[
        { value: 'plan', label: t('modes.plan'), icon: ListChecks },
        { value: 'dates', label: t('modes.dates'), icon: CalendarDays },
        { value: 'freshness', label: t('modes.freshness'), icon: FileClock },
      ]}
    />
  )
}
