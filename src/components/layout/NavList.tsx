import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { NavGroup, NavItem } from '@/config/navigation'

export type NavBadgeCounts = Partial<
  Record<NonNullable<NavItem['badgeKey']>, number>
>

interface NavListProps {
  groups: NavGroup[]
  counts?: NavBadgeCounts
  onNavigate?: () => void
}

/**
 * Shared navigation renderer for both the desktop sidebar and the mobile
 * sheet, so the two can never drift apart again.
 *
 * The active row is one of the few sanctioned uses of the accent: a subtle
 * cobalt wash, a 2px cobalt indicator on the leading edge, and a cobalt icon.
 * `aria-current="page"` carries the same meaning non-visually.
 */
export function NavList({ groups, counts, onNavigate }: NavListProps) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group, index) => (
        <div
          key={group.label ?? `group-${index}`}
          className="flex flex-col gap-1"
        >
          {group.label && (
            <h2 className="text-eyebrow text-muted-foreground/80 px-3 pb-1 uppercase">
              {group.label}
            </h2>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavItemLink
                  item={item}
                  counts={counts}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function NavItemLink({
  item,
  counts,
  onNavigate,
}: {
  item: NavItem
  counts?: NavBadgeCounts
  onNavigate?: () => void
}) {
  const count = item.badgeKey ? counts?.[item.badgeKey] : undefined

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      // NavLink emits aria-current="page" on the active route by default.
      className={({ isActive }) =>
        cn(
          'text-body group relative flex items-center gap-2.5 rounded-md py-2 pr-2 pl-3',
          'transition-colors duration-100',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            : 'text-sidebar-foreground hover:bg-accent hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden
              className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full"
            />
          )}
          <item.icon
            className={cn(
              'size-4 shrink-0 transition-colors',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground group-hover:text-foreground'
            )}
          />
          <span className="truncate">{item.label}</span>
          {count !== undefined && count > 0 && (
            <span
              data-numeric
              className="text-eyebrow text-muted-foreground bg-muted ml-auto rounded-full px-1.5 py-0.5 font-medium"
            >
              {count}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
