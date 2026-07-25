import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, History } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { SnapshotItem } from '@/features/dashboard/dashboard-model'

interface DossierSnapshotProps {
  items: SnapshotItem[]
}

/**
 * A live, present-tense view of what the dossier holds right now — not an
 * activity feed. Every line is derived from current state (no history, no
 * timestamps); the item shape is event-stream-ready, so this can become a real
 * activity timeline once persistence exists, without reworking the layout.
 */
export function DossierSnapshot({ items }: DossierSnapshotProps) {
  const { t } = useTranslation(['dashboard', 'common'])
  const td = dynamicT(t)

  return (
    <Card className="animate-fade-in-up h-full">
      <CardHeader>
        <CardTitle>{t('dashboard:snapshot.title')}</CardTitle>
        <CardDescription>{t('dashboard:snapshot.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            variant="inline"
            icon={History}
            title={t('dashboard:snapshot.empty')}
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.map((item) => {
              const label = td(
                `dashboard:snapshot.item.${item.key}`,
                item.count !== undefined ? { count: item.count } : undefined
              )
              const content = (
                <>
                  <StatusBadge
                    tone={item.tone}
                    dot
                    className="border-transparent bg-transparent p-0"
                  >
                    <span className="text-body text-foreground">{label}</span>
                  </StatusBadge>
                  {item.to && (
                    <ArrowUpRight className="text-muted-foreground size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </>
              )
              return (
                <li key={item.id}>
                  {item.to ? (
                    <Link
                      to={item.to}
                      className="group focus-visible:bg-accent -mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:underline"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-2 px-0 py-1">
                      {content}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
