import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSelect } from '@/components/ui/language-select'
import { StatusBadge } from '@/components/ui/status-badge'
import { useDossier } from '@/app/providers/DossierProvider'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { DossierSwitcher } from '@/components/layout/DossierSwitcher'
import { getNavItemByPath } from '@/config/navigation'
import { cn } from '@/lib/utils'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { PersistenceStatus } from '@/app/providers/WorkspaceProvider'
import type { StatusTone } from '@/components/ui/status-badge'

/**
 * Tones for local-save state. `sessionOnly` and `unavailable` are informational,
 * not failures — the user either chose not to save, or the browser refused —
 * so neither is red. Only a genuine write failure is.
 */
const SAVE_TONE: Record<PersistenceStatus, StatusTone> = {
  idle: 'neutral',
  saving: 'info',
  saved: 'success',
  error: 'danger',
  sessionOnly: 'warning',
  unavailable: 'warning',
}

interface HeaderProps {
  onMenuClick?: () => void
  onSave?: () => void
  /** Drives the hairline: no border at rest, a border once content scrolls under. */
  scrolled?: boolean
}

export function Header({ onMenuClick, onSave, scrolled = false }: HeaderProps) {
  const { hasData } = useDossier()
  const { status, lastPersistedAt, summaries, sessionOnly } = useWorkspace()
  const { pathname } = useLocation()
  const { t } = useTranslation('common')
  const { t: tw } = useTranslation('workspace')
  const current = getNavItemByPath(pathname)

  return (
    <header
      className={cn(
        'bg-background/85 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 px-4 backdrop-blur-md md:px-6',
        'border-b transition-colors duration-200',
        scrolled ? 'border-border' : 'border-transparent'
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu />
        <span className="sr-only">{t('a11y.openNavigation')}</span>
      </Button>

      {/* Page context. Doubles as a breadcrumb once more levels exist. */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-body text-foreground truncate font-medium">
          {current ? dynamicT(t)(current.labelKey) : t('app.name')}
        </span>
        {/* Shown whenever there is something to switch between — not only when a
            dossier happens to be open. Gating on `hasData` meant the switcher
            vanished at exactly the moment someone with saved dossiers needed
            it, and it unmounted its own trigger mid-switch, dropping focus to
            <body> (ADR-040). */}
        {(hasData || sessionOnly || summaries.length > 0) && (
          <>
            <span aria-hidden className="text-muted-foreground/50">
              /
            </span>
            <DossierSwitcher />
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {hasData && (
          <StatusBadge
            tone={SAVE_TONE[status]}
            dot
            size="md"
            // Announced politely: this used to be a bare <span>, so a screen
            // reader was never told the dossier had failed to save.
            role="status"
            aria-live="polite"
            // Still hidden below `sm` — the action cluster has no room, and a
            // bare coloured dot would carry meaning by colour alone. Nothing
            // urgent is lost: every state worth acting on (save failure,
            // storage unavailable, session-only) is rendered at every width by
            // `WorkspaceNotice`, which is where the recovery action lives too.
            className="hidden sm:inline-flex"
          >
            {status === 'saved' && lastPersistedAt
              ? tw('status.savedAt', {
                  date: formatRelativeTime(new Date(lastPersistedAt), t),
                })
              : tw(`status.${status}`)}
          </StatusBadge>
        )}

        {hasData && onSave && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            aria-label={t('actions.export')}
          >
            <Download />
            {/* Below `sm` the action cluster crushed the page title to ~59px —
                "Belgeler" rendered as "Belg…". The title is the only indicator
                of which page you are on once the sidebar is hidden, so the
                icon-plus-`aria-label` form wins the width here. */}
            <span className="hidden sm:inline">{t('actions.export')}</span>
          </Button>
        )}

        <LanguageSelect />
        <ThemeToggle />
      </div>
    </header>
  )
}

function formatRelativeTime(
  date: Date,
  t: ReturnType<typeof useTranslation<'common'>>['t']
): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)

  if (diffSecs < 60) return t('time.justNow')
  if (diffMins < 60) return t('time.minutesAgo', { count: diffMins })
  if (diffHours < 24) return t('time.hoursAgo', { count: diffHours })
  return date.toLocaleDateString()
}
