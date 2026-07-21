import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  { to: '/settings', label: 'Settings', icon: Settings },
]

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportClick?: () => void
  onExportClick?: () => void
}

export function MobileNav({
  open,
  onOpenChange,
  onImportClick,
  onExportClick,
}: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="text-left">VisaFlow</SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {mainNavItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => onOpenChange(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                        : 'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]'
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

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                onOpenChange(false)
                onImportClick?.()
              }}
            >
              <FileUp className="h-4 w-4" />
              Import Data
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                onOpenChange(false)
                onExportClick?.()
              }}
            >
              <FileDown className="h-4 w-4" />
              Export Dossier
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
