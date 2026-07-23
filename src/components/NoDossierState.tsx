import { Link } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

/**
 * The "nothing loaded yet" state, shared by every page that needs a dossier.
 *
 * An empty state is an invitation, not an error, so it is neutral rather than
 * a destructive-red alert.
 */
export function NoDossierState({ section }: { section?: string }) {
  const { t } = useTranslation('common')

  return (
    <EmptyState
      icon={FolderOpen}
      title={t('noDossier.title')}
      description={
        section
          ? t('noDossier.descriptionFor', { section })
          : t('noDossier.description')
      }
      action={
        <Button asChild size="sm">
          <Link to="/dashboard">{t('actions.goToDashboard')}</Link>
        </Button>
      }
    />
  )
}
