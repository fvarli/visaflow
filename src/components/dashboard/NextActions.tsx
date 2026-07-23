import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { dynamicT } from '@/lib/i18n-dynamic'
import { ACTION_ICON, actionLabel } from '@/components/dashboard/action-meta'
import type { ActionDescriptor } from '@/features/dashboard/dashboard-model'

interface NextActionsProps {
  actions: ActionDescriptor[]
}

/**
 * The prioritized "what to do next" list, derived from the dossier's current
 * state (errors, missing/needs-update documents, structural gaps). Nothing here
 * is hardcoded — an empty list means the dossier is complete.
 */
export function NextActions({ actions }: NextActionsProps) {
  const { t } = useTranslation(['dashboard', 'common'])
  const td = dynamicT(t)

  return (
    <Card className="animate-fade-in-up h-full">
      <CardHeader>
        <CardTitle>{t('dashboard:nextActions.title')}</CardTitle>
        <CardDescription>
          {t('dashboard:nextActions.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-2.5 py-2">
            <CheckCircle2 className="text-success size-5 shrink-0" />
            <p className="text-body">{t('dashboard:nextActions.empty')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {actions.map((action) => {
              const Icon = ACTION_ICON[action.id]
              return (
                <li key={action.id}>
                  <Link
                    to={action.to}
                    className="group hover:border-border-strong hover:bg-accent focus-visible:bg-accent -mx-2 flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px"
                  >
                    <StatusBadge
                      tone={action.tone}
                      className="size-6 justify-center p-0"
                    >
                      <Icon className="size-3.5" />
                    </StatusBadge>
                    <span className="text-body text-foreground min-w-0 flex-1">
                      {actionLabel(td, action)}
                    </span>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
