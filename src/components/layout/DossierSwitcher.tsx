import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronsUpDown, FolderOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { cn } from '@/lib/utils'

/**
 * "Which dossier am I in, and how do I change it?" — and nothing heavier.
 *
 * Deletion, rename and the full list live on `/dossiers`; a dropdown is the
 * wrong place for a destructive action. Selection state comes from the
 * workspace context, so this component owns no source of truth.
 *
 * The label is hidden below `sm`: the header's action cluster once crushed the
 * page title to ~59px at 390px, and the page title is the only indication of
 * where you are once the sidebar is hidden. The trigger stays reachable as an
 * icon, and `/dossiers` carries the same information at full width.
 */
export function DossierSwitcher() {
  const { t } = useTranslation('workspace')
  const navigate = useNavigate()
  const { summaries, activeId, openDossier, sessionOnly } = useWorkspace()

  const active = summaries.find((summary) => summary.id === activeId)
  const openable = summaries.filter((summary) => !summary.unreadable)

  // Nothing to switch between and nothing saved: stay out of the way.
  if (!active && openable.length === 0 && !sessionOnly) return null

  const label = sessionOnly
    ? t('switcher.sessionOnly')
    : (active?.title ?? t('switcher.current'))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="min-w-0 gap-1.5"
          aria-label={`${t('switcher.label')}: ${label}`}
        >
          <FolderOpen aria-hidden className="opacity-70" />
          <span className="text-body hidden max-w-40 truncate sm:inline">
            {label}
          </span>
          <ChevronsUpDown aria-hidden className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        {openable.map((summary) => (
          <DropdownMenuItem
            key={summary.id}
            className="gap-2"
            onSelect={() => void openDossier(summary.id)}
          >
            <span className="min-w-0 flex-1 truncate">{summary.title}</span>
            {summary.id === activeId && (
              <Check aria-hidden className="size-4 shrink-0 opacity-70" />
            )}
          </DropdownMenuItem>
        ))}

        {openable.length > 0 && <DropdownMenuSeparator />}

        <DropdownMenuItem
          className="gap-2"
          onSelect={() => void navigate('/welcome?step=create')}
        >
          <Plus aria-hidden className="size-4 opacity-70" />
          {t('switcher.create')}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2"
          onSelect={() => void navigate('/dossiers')}
        >
          <FolderOpen aria-hidden className={cn('size-4 opacity-70')} />
          {t('switcher.manage')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
