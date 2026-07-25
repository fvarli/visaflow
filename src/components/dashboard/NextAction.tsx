import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { dynamicT } from '@/lib/i18n-dynamic'
import { ACTION_ICON, actionLabel } from '@/components/dashboard/action-meta'
import type { ActionDescriptor } from '@/features/dashboard/dashboard-model'

interface NextActionProps {
  /** The single highest-priority action, or null when nothing is outstanding. */
  action: ActionDescriptor | null
}

/**
 * The one thing to do next — never a list. It answers all three questions a
 * command-center card must: what to do (the task + CTA), why it matters (the
 * reason), and how much it takes (the effort estimate). An empty state means the
 * dossier is complete.
 */
export function NextAction({ action }: NextActionProps) {
  const { t } = useTranslation(['dashboard', 'common'])
  const td = dynamicT(t)
  const Icon = action ? ACTION_ICON[action.id] : null

  return (
    <Card className="animate-fade-in-up flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-eyebrow text-muted-foreground font-medium uppercase">
          {t('dashboard:nextAction.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {action === null || Icon === null ? (
          <div className="flex flex-1 flex-col justify-center gap-2 py-2">
            <CheckCircle2 className="text-success size-6" />
            <p className="text-heading text-foreground">
              {t('dashboard:nextAction.allDoneTitle')}
            </p>
            <p className="text-body text-muted-foreground text-pretty">
              {t('dashboard:nextAction.allDoneDescription')}
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-start gap-3">
              <StatusBadge
                tone={action.tone}
                className="size-8 justify-center p-0"
              >
                <Icon className="size-4" />
              </StatusBadge>
              <p className="text-heading text-foreground min-w-0 flex-1 text-balance">
                {actionLabel(td, action)}
              </p>
            </div>

            <p className="text-body text-muted-foreground text-pretty">
              {td(`dashboard:nextAction.reason.${action.id}`)}
            </p>

            <div className="flex items-center gap-1.5">
              <Clock aria-hidden className="text-muted-foreground size-3.5" />
              <span className="text-caption text-muted-foreground">
                {td(`dashboard:nextAction.effort.${action.id}`)}
              </span>
            </div>

            <Button asChild className="mt-auto w-full justify-between">
              <Link to={action.to}>
                <span>{t('dashboard:nextAction.cta')}</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
