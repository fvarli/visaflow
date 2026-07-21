import { Menu, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDossier } from '@/app/providers/DossierProvider'

interface HeaderProps {
  onMenuClick?: () => void
  onSave?: () => void
}

export function Header({ onMenuClick, onSave }: HeaderProps) {
  const { state, hasData } = useDossier()

  return (
    <header className="flex h-14 items-center justify-between border-b bg-[var(--background)] px-4">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Application info */}
        {hasData && state.application && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {state.application.destinationCountry || 'No destination'}
            </span>
            <Badge variant="secondary" className="text-xs">
              {state.application.visaType.replace(/_/g, ' ')}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Save status */}
        {hasData && (
          <div className="flex items-center gap-2 text-sm">
            {state.isDirty ? (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground">Unsaved changes</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">
                  {state.lastSaved
                    ? `Saved ${formatRelativeTime(state.lastSaved)}`
                    : 'No changes'}
                </span>
              </>
            )}
          </div>
        )}

        {/* Save button */}
        {hasData && onSave && (
          <Button
            variant={state.isDirty ? 'default' : 'outline'}
            size="sm"
            onClick={onSave}
            disabled={!state.isDirty}
          >
            <Save className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
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
