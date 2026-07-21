import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  User,
  Plane,
  Briefcase,
  Wallet,
  Users,
  FileText,
  Calendar,
  AlertTriangle,
  StickyNote,
  Settings,
  FileDown,
  FileUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useDossier } from '@/app/providers/DossierProvider'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const mainNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/applicant', label: 'Applicant', icon: User },
  { to: '/trip', label: 'Trip', icon: Plane },
  { to: '/employment', label: 'Employment', icon: Briefcase },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/sponsors', label: 'Sponsors', icon: Users },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/timeline', label: 'Timeline', icon: Calendar },
  {
    to: '/consistency-checks',
    label: 'Consistency Checks',
    icon: AlertTriangle,
  },
  { to: '/notes', label: 'Notes', icon: StickyNote },
]

const settingsNavItems: NavItem[] = [
  { to: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  onImportClick?: () => void
  onExportClick?: () => void
}

export function Sidebar({ onImportClick, onExportClick }: SidebarProps) {
  const { state } = useDossier()

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-semibold">VisaFlow</span>
        {state.isDirty && (
          <span className="ml-2 text-xs text-muted-foreground">(unsaved)</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {mainNavItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                      : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <Separator className="my-4" />

        <ul className="space-y-1">
          {settingsNavItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                      : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Import/Export buttons */}
      <div className="border-t p-4 space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onImportClick}
        >
          <FileUp className="h-4 w-4" />
          Import Data
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onExportClick}
        >
          <FileDown className="h-4 w-4" />
          Export Dossier
        </Button>
      </div>
    </aside>
  )
}
