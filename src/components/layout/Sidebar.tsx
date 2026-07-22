import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileDown, FileUp } from 'lucide-react'
import { navGroups, secondaryNavItems } from '@/config/navigation'
import { NavList, NavItemLink, type NavBadgeCounts } from './NavList'
import { BrandMark } from './BrandMark'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  onImportClick?: () => void
  onExportClick?: () => void
  counts?: NavBadgeCounts
}

export function Sidebar({
  onImportClick,
  onExportClick,
  counts,
}: SidebarProps) {
  const { t } = useTranslation(['common', 'navigation'])

  return (
    <aside className="bg-sidebar flex h-full w-[260px] shrink-0 flex-col border-r">
      <div className="flex h-14 shrink-0 items-center px-5">
        <Link
          to="/dashboard"
          className="text-foreground rounded-md"
          aria-label={t('a11y.homeLink')}
        >
          <BrandMark />
        </Link>
      </div>

      <nav
        aria-label={t('a11y.mainNavigation')}
        className="scrollbar-subtle flex-1 overflow-y-auto px-3 pt-2 pb-4"
      >
        <NavList groups={navGroups} counts={counts} />
      </nav>

      <div className="flex flex-col gap-3 border-t p-3">
        <ul className="flex flex-col gap-0.5">
          {secondaryNavItems.map((item) => (
            <li key={item.to}>
              <NavItemLink item={item} />
            </li>
          ))}
        </ul>

        {/* Import/export are the app's only persistence, so they stay
            permanently reachable rather than hidden behind a menu. */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onImportClick}
          >
            <FileUp />
            {t('navigation:actions.importData')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onExportClick}
          >
            <FileDown />
            {t('navigation:actions.exportDossier')}
          </Button>
        </div>
      </div>
    </aside>
  )
}
