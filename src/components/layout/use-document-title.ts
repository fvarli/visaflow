import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { getNavItemByPath } from '@/config/navigation'
import { dynamicT } from '@/lib/i18n-dynamic'

/**
 * Keep the browser tab honest about where you are and which dossier you are in.
 *
 * Every tab used to read "VisaFlow". That is a small thing with one dossier and
 * a real problem with several: the app explicitly supports a dossier per tab,
 * and identical titles make those tabs indistinguishable in the tab strip, in
 * history and in bookmarks.
 *
 * Deliberately reuses the workspace's own `activeTitle` rather than deriving a
 * name here, so a rename shows up in the tab strip for the same reason it shows
 * up everywhere else (ADR-040).
 */
export function useDocumentTitle(): void {
  const { pathname } = useLocation()
  const { t } = useTranslation(['navigation', 'common'])
  const { activeTitle } = useWorkspace()

  useEffect(() => {
    const suffix = t('common:app.titleSuffix')
    const item = getNavItemByPath(pathname)
    const routeLabel = item ? dynamicT(t)(item.labelKey) : null

    // The dashboard *is* the dossier's home, so its name alone is the title;
    // repeating "Dashboard · Greece · September" says nothing extra.
    const isDashboard = item?.to === '/dashboard'
    const carriesDossier = item !== undefined && item.scope !== 'workspace'

    const lead = isDashboard
      ? (activeTitle ?? routeLabel)
      : [routeLabel, carriesDossier ? activeTitle : null]
          .filter(Boolean)
          .join(' · ')

    document.title = lead ? `${lead} — ${suffix}` : suffix
  }, [pathname, activeTitle, t])
}
