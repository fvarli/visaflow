import { FileDown, FileUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { navGroups, secondaryNavItems } from '@/config/navigation'
import { NavList, NavItemLink, type NavBadgeCounts } from './NavList'
import { BrandMark } from './BrandMark'

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportClick?: () => void
  onExportClick?: () => void
  counts?: NavBadgeCounts
}

/**
 * The mobile sheet renders the exact same NavList as the desktop sidebar —
 * both used to hold their own copy of the item array and had already drifted.
 */
export function MobileNav({
  open,
  onOpenChange,
  onImportClick,
  onExportClick,
  counts,
}: MobileNavProps) {
  const { t } = useTranslation(['common', 'navigation'])
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="bg-sidebar flex w-[280px] flex-col gap-0 p-0"
      >
        <SheetHeader className="h-14 justify-center border-b px-5 py-0">
          <SheetTitle className="text-left">
            <BrandMark />
          </SheetTitle>
        </SheetHeader>

        <nav
          aria-label={t('a11y.mainNavigation')}
          className="scrollbar-subtle flex-1 overflow-y-auto px-3 pt-4 pb-4"
        >
          <NavList groups={navGroups} counts={counts} onNavigate={close} />

          <ul className="mt-6 flex flex-col gap-0.5 border-t pt-4">
            {secondaryNavItems.map((item) => (
              <li key={item.to}>
                <NavItemLink item={item} onNavigate={close} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex gap-2 border-t p-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              close()
              onImportClick?.()
            }}
          >
            <FileUp />
            {t('navigation:actions.importData')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              close()
              onExportClick?.()
            }}
          >
            <FileDown />
            {t('navigation:actions.exportDossier')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
