import {
  LayoutDashboard,
  User,
  Plane,
  Briefcase,
  Wallet,
  Users,
  FileText,
  Calendar,
  ShieldCheck,
  StickyNote,
  Settings,
  Palette,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  /**
   * Reserved for live counts (open findings, missing documents). Rendered as
   * a quiet chip on the right of the row when present.
   */
  badgeKey?: 'openFindings' | 'missingDocuments'
}

export interface NavGroup {
  /** Omit for the top group so the primary destination needs no header. */
  label?: string
  items: NavItem[]
}

/**
 * Single source of navigation truth.
 *
 * Sidebar and MobileNav each used to declare their own copy of this array and
 * had already drifted apart — Settings was grouped separately in one and
 * inline in the other. Grouping also gives an 11-item flat list a scannable
 * shape: what you fill in, what you collect, what you check.
 */
export const navGroups: NavGroup[] = [
  {
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Application',
    items: [
      { to: '/applicant', label: 'Applicant', icon: User },
      { to: '/trip', label: 'Trip', icon: Plane },
      { to: '/employment', label: 'Employment', icon: Briefcase },
      { to: '/finance', label: 'Finance', icon: Wallet },
      { to: '/sponsors', label: 'Sponsors', icon: Users },
    ],
  },
  {
    label: 'Dossier',
    items: [
      {
        to: '/documents',
        label: 'Documents',
        icon: FileText,
        badgeKey: 'missingDocuments',
      },
      { to: '/timeline', label: 'Timeline', icon: Calendar },
    ],
  },
  {
    label: 'Review',
    items: [
      {
        to: '/consistency-checks',
        label: 'Consistency Checks',
        icon: ShieldCheck,
        badgeKey: 'openFindings',
      },
      { to: '/notes', label: 'Notes', icon: StickyNote },
    ],
  },
]

/**
 * Rendered in the sidebar footer, away from the task-oriented destinations.
 *
 * The design system playground is appended in development only. The route
 * itself is always registered, so the URL still works in a preview build —
 * it just is not advertised in the production sidebar.
 */
export const secondaryNavItems: NavItem[] = [
  { to: '/settings', label: 'Settings', icon: Settings },
  ...(import.meta.env.DEV
    ? [{ to: '/playground', label: 'Playground', icon: Palette }]
    : []),
]

const allItems = [
  ...navGroups.flatMap((group) => group.items),
  ...secondaryNavItems,
]

/** Used by the header to label the current page without duplicating strings. */
export function getNavItemByPath(pathname: string): NavItem | undefined {
  return allItems.find((item) => pathname.startsWith(item.to))
}
