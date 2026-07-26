import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Info, ShieldAlert } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { useFindingText } from '@/lib/finding-text'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { ValidationSeverity } from '@/domain/rules/types'
import {
  SEVERITY_LABEL_KEY,
  SEVERITY_TONE,
} from '@/features/validation/finding-presentation'
import type { ActionableFinding } from '@/features/validation/validation-model'

const SEVERITY_ICON: Record<ValidationSeverity, typeof Info> = {
  error: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
}

const SEVERITY_ICON_CLASS: Record<ValidationSeverity, string> = {
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
}

interface FindingCardProps {
  item: ActionableFinding
}

/**
 * A single review finding, phrased as a specialist would: what happened
 * (title), why it matters (description), how to fix it (suggested action), and
 * a direct link to the place it is fixed — never a dead end. The severity is
 * shown as a calm label, not a raw "Error".
 */
export function FindingCard({ item }: FindingCardProps) {
  const { t } = useTranslation('validation')
  const td = dynamicT(t)
  const findingText = useFindingText()
  const { finding, action } = item
  const text = findingText(finding)
  const Icon = SEVERITY_ICON[finding.severity]

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon
            aria-hidden
            className={`mt-0.5 size-4 shrink-0 ${SEVERITY_ICON_CLASS[finding.severity]}`}
          />
          <h3 className="text-body text-foreground font-medium">
            {text.title}
          </h3>
        </div>
        <StatusBadge tone={SEVERITY_TONE[finding.severity]}>
          {td(SEVERITY_LABEL_KEY[finding.severity])}
        </StatusBadge>
      </div>

      <div className="space-y-2 pl-7">
        <p className="text-sm text-muted-foreground">{text.description}</p>
        {text.suggestedAction && (
          <p className="text-sm">
            <span className="text-foreground font-medium">
              {t('center.finding.howToFix')}{' '}
            </span>
            <span className="text-muted-foreground">
              {text.suggestedAction}
            </span>
          </p>
        )}
        {action && (
          <Link
            to={action.route}
            className="text-primary inline-flex w-fit items-center gap-1 rounded-sm text-sm font-medium hover:underline"
          >
            {t('center.actions.goThere')}
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
    </div>
  )
}
