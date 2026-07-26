import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { Tenure } from '@/features/employment/employment-tenure'

interface EmploymentTenureProps {
  tenure: Tenure
  className?: string
}

/**
 * Renders derived current-employer tenure (e.g. "1 year 3 months at current
 * employer") with locale-aware pluralisation. Tenure is derived, never stored
 * (ADR-026). A future start date shows a calm data-quality note instead of a
 * negative duration; a missing date renders nothing.
 */
export function EmploymentTenure({ tenure, className }: EmploymentTenureProps) {
  const { t } = useTranslation('employment')

  if (tenure.isMissing) return null

  if (tenure.isFuture) {
    return (
      <p className={cn('text-caption text-muted-foreground', className)}>
        {t('tenure.future')}
      </p>
    )
  }

  const parts: string[] = []
  if (tenure.years > 0) parts.push(t('tenure.years', { count: tenure.years }))
  if (tenure.months > 0)
    parts.push(t('tenure.months', { count: tenure.months }))
  const duration =
    parts.length > 0 ? parts.join(' ') : t('tenure.lessThanMonth')

  return (
    <p role="status" className={cn('text-body text-foreground', className)}>
      {t('tenure.atCurrentEmployer', { duration })}
    </p>
  )
}
