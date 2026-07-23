import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, SEVERITY_TONE } from '@/components/ui/status-badge'
import { useFindingText } from '@/lib/finding-text'
import type { ValidationResult, ValidationSeverity } from '@/domain/rules/types'

interface ValidationSummaryProps {
  validation: ValidationResult
}

const SEVERITY_ICON: Record<ValidationSeverity, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const MAX_SHOWN = 3

/**
 * Leads with the first actionable findings (already sorted error-first) rather
 * than a bare count, so the most important problems are visible immediately.
 */
export function ValidationSummary({ validation }: ValidationSummaryProps) {
  const { t } = useTranslation(['dashboard', 'validation', 'common'])
  const findingText = useFindingText()

  const { findings, errorCount, warningCount, infoCount } = validation
  const shown = findings.slice(0, MAX_SHOWN)
  const remaining = findings.length - shown.length

  return (
    <Card className="animate-fade-in-up h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{t('dashboard:validationSummary.title')}</span>
          {findings.length > 0 && (
            <span className="flex items-center gap-1.5">
              {errorCount > 0 && (
                <StatusBadge tone="danger">{errorCount}</StatusBadge>
              )}
              {warningCount > 0 && (
                <StatusBadge tone="warning">{warningCount}</StatusBadge>
              )}
              {infoCount > 0 && (
                <StatusBadge tone="info">{infoCount}</StatusBadge>
              )}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {findings.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-2.5 py-1">
            <CheckCircle2 className="text-success size-5 shrink-0" />
            <p className="text-body">
              {t('dashboard:validationSummary.allClear')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2.5">
              {shown.map((finding) => {
                const Icon = SEVERITY_ICON[finding.severity]
                const tone = SEVERITY_TONE[finding.severity]
                return (
                  <li key={finding.id} className="flex items-start gap-2.5">
                    <Icon
                      aria-hidden
                      className={
                        tone === 'danger'
                          ? 'text-danger mt-0.5 size-4 shrink-0'
                          : tone === 'warning'
                            ? 'text-warning mt-0.5 size-4 shrink-0'
                            : 'text-info mt-0.5 size-4 shrink-0'
                      }
                    />
                    <span className="text-body text-foreground min-w-0">
                      {findingText(finding).title}
                    </span>
                  </li>
                )
              })}
            </ul>
            <Link
              to="/consistency-checks"
              className="text-primary inline-flex items-center gap-1 self-start rounded-sm text-sm hover:underline"
            >
              {remaining > 0
                ? t('dashboard:validationSummary.viewMore', {
                    count: remaining,
                  })
                : t('dashboard:validationSummary.viewAll')}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
