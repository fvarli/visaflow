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
import { StatusBadge } from '@/components/ui/status-badge'
import { useFindingText } from '@/lib/finding-text'
import { dashboardFindingLink } from '@/features/dashboard/dashboard-model'
import type { ValidationResult, ValidationSeverity } from '@/domain/rules/types'

interface ConsistencyHealthProps {
  validation: ValidationResult
}

const SEVERITY_ICON: Record<ValidationSeverity, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const SEVERITY_ICON_CLASS: Record<ValidationSeverity, string> = {
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
}

const MAX_SHOWN = 3

/**
 * The dossier's consistency health: a calm error/warning/info summary that leads
 * with the most important findings (already sorted error-first) and links each
 * one straight to the page that fixes it — never a dead end.
 */
export function ConsistencyHealth({ validation }: ConsistencyHealthProps) {
  const { t } = useTranslation(['dashboard', 'validation', 'common'])
  const findingText = useFindingText()

  const { findings, errorCount, warningCount, infoCount } = validation
  const shown = findings.slice(0, MAX_SHOWN)
  const remaining = findings.length - shown.length

  return (
    <Card className="animate-fade-in-up h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{t('dashboard:consistencyHealth.title')}</span>
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
              {t('dashboard:consistencyHealth.allClear')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-3">
              {shown.map((finding) => {
                const Icon = SEVERITY_ICON[finding.severity]
                const link = dashboardFindingLink(finding)
                return (
                  <li key={finding.id} className="flex items-start gap-2.5">
                    <Icon
                      aria-hidden
                      className={`mt-0.5 size-4 shrink-0 ${SEVERITY_ICON_CLASS[finding.severity]}`}
                    />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-body text-foreground">
                        {findingText(finding).title}
                      </span>
                      {link && (
                        <Link
                          to={link.route}
                          className="text-primary inline-flex w-fit items-center gap-1 rounded-sm text-sm hover:underline"
                        >
                          {t('dashboard:consistencyHealth.goToFix')}
                          <ArrowRight className="size-3.5" />
                        </Link>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            <Link
              to="/consistency-checks"
              className="text-primary inline-flex items-center gap-1 self-start rounded-sm text-sm hover:underline"
            >
              {remaining > 0
                ? t('dashboard:consistencyHealth.viewMore', {
                    count: remaining,
                  })
                : t('dashboard:consistencyHealth.viewAll')}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
