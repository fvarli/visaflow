import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

interface NoDossierStateProps {
  /** The workspace name, woven into the default description ("…to work on X"). */
  section?: string
  /** Override the default title. */
  title?: ReactNode
  /** Override the default description (takes precedence over `section`). */
  description?: ReactNode
  /** Override the default icon. */
  icon?: ComponentType<{ className?: string }>
  /** Optional contextual line shown beneath the actions. */
  hint?: ReactNode
}

/**
 * The one canonical empty-workspace state, shared by every page that needs a
 * dossier. An empty workspace is an invitation, not an error (so it is neutral,
 * never a destructive-red alert) and never a dead end: it always routes into the
 * first-run journey. Primary starts the guided setup, secondary jumps straight
 * to create/import, and a quiet tertiary link explains the privacy model. The
 * API is intentionally injectable so a future workspace reuses it unchanged.
 */
export function NoDossierState({
  section,
  title,
  description,
  icon = FolderOpen,
  hint,
}: NoDossierStateProps) {
  const { t } = useTranslation('common')

  const resolvedDescription =
    description ??
    (section
      ? t('noDossier.descriptionFor', { section })
      : t('noDossier.description'))

  return (
    <EmptyState
      icon={icon}
      title={title ?? t('noDossier.title')}
      description={resolvedDescription}
      action={
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild size="sm">
              <Link to="/welcome">{t('noDossier.startAction')}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/welcome?step=create">
                {t('noDossier.importAction')}
              </Link>
            </Button>
          </div>
          <Link
            to="/settings?section=privacy"
            className="text-muted-foreground hover:text-foreground rounded-sm text-sm"
          >
            {t('noDossier.learnAction')}
          </Link>
          {hint && (
            <p className="text-caption text-muted-foreground text-center">
              {hint}
            </p>
          )}
        </div>
      }
    />
  )
}
