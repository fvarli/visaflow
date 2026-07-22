import { useLocation } from 'react-router-dom'
import { Menu, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { StatusBadge } from '@/components/ui/status-badge'
import { useDossier } from '@/app/providers/DossierProvider'
import { getNavItemByPath } from '@/config/navigation'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onMenuClick?: () => void
  onSave?: () => void
  /** Drives the hairline: no border at rest, a border once content scrolls under. */
  scrolled?: boolean
}

export function Header({ onMenuClick, onSave, scrolled = false }: HeaderProps) {
  const { state, hasData } = useDossier()
  const { pathname } = useLocation()
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
        <span className="sr-only">Open navigation</span>
      </Button>

      {/* Page context. Doubles as a breadcrumb once more levels exist. */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-body text-foreground truncate font-medium">
          {current?.label ?? 'VisaFlow'}
        </span>
        {hasData && state.application?.destinationCountry && (
          <>
            <span aria-hidden className="text-muted-foreground/50">
              /
            </span>
            <span className="text-body text-muted-foreground hidden truncate sm:inline">
              {state.application.destinationCountry}
              {state.application.visaType &&
                ` · ${state.application.visaType.replace(/_/g, ' ')}`}
            </span>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {hasData && (
          <StatusBadge
            tone={state.isDirty ? 'warning' : 'success'}
            dot
            size="md"
            className="hidden sm:inline-flex"
          >
            {state.isDirty
              ? 'Unsaved'
              : state.lastSaved
                ? `Saved ${formatRelativeTime(state.lastSaved)}`
                : 'No changes'}
          </StatusBadge>
        )}

        {hasData && onSave && (
          <Button
            variant={state.isDirty ? 'default' : 'outline'}
            size="sm"
            onClick={onSave}
            disabled={!state.isDirty}
          >
            <Download />
            Export
          </Button>
        )}

        <ThemeToggle />
      </div>
    </header>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}
