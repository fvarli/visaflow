import {
  Folders,
  LayoutDashboard,
  User,
  Plane,
  Briefcase,
  Wallet,
  Users,
  FileText,
  Calendar,
  ShieldCheck,
  ClipboardCheck,
  StickyNote,
  Settings,
  Palette,
} from 'lucide-react'

export interface NavItem {
  to: string
  /**
   * `workspace` items are about the collection of dossiers; everything else is
   * about the dossier that is open. Used to decide whether a surface should
   * carry the active dossier's name (ADR-040).
   */
  scope?: 'workspace'
  /** Translation key. The route path is the stable identifier, not the label. */
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  /**
   * Reserved for live counts (open findings, missing documents). Rendered as
   * a quiet chip on the right of the row when present.
   */
  badgeKey?: 'openFindings' | 'outstandingDocuments'
}

export interface NavGroup {
  /** Omit for the top group so the primary destination needs no header. */
  labelKey?: string
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
    items: [
      // Workspace level first, then the dossier you are inside — the two are
      // different scopes and the order is what makes that legible. Deliberately
      // NOT inside the "Dossier" group below: that group means the contents of
      // one dossier, and using the same word for both levels is the confusion
      // this is here to remove (ADR-040).
      {
        to: '/dossiers',
        labelKey: 'navigation:items.dossiers',
        icon: Folders,
        scope: 'workspace',
      },
      {
        to: '/dashboard',
        labelKey: 'navigation:items.dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    labelKey: 'navigation:groups.application',
    items: [
      { to: '/applicant', labelKey: 'navigation:items.applicant', icon: User },
      { to: '/trip', labelKey: 'navigation:items.trip', icon: Plane },
      {
        to: '/employment',
        labelKey: 'navigation:items.employment',
        icon: Briefcase,
      },
      { to: '/finance', labelKey: 'navigation:items.finance', icon: Wallet },
      { to: '/sponsors', labelKey: 'navigation:items.sponsors', icon: Users },
    ],
  },
  {
    labelKey: 'navigation:groups.dossier',
    items: [
      {
        to: '/documents',
        labelKey: 'navigation:items.documents',
        icon: FileText,
        badgeKey: 'outstandingDocuments',
      },
      {
        to: '/timeline',
        labelKey: 'navigation:items.timeline',
        icon: Calendar,
      },
    ],
  },
  {
    labelKey: 'navigation:groups.review',
    items: [
      {
        to: '/consistency-checks',
        labelKey: 'navigation:items.consistencyChecks',
        icon: ShieldCheck,
        badgeKey: 'openFindings',
      },
      {
        to: '/review',
        labelKey: 'navigation:items.finalReview',
        icon: ClipboardCheck,
      },
      { to: '/notes', labelKey: 'navigation:items.notes', icon: StickyNote },
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
  { to: '/settings', labelKey: 'navigation:items.settings', icon: Settings },
  ...(import.meta.env.DEV
    ? [
        {
          to: '/playground',
          labelKey: 'navigation:items.playground',
          icon: Palette,
        },
      ]
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
