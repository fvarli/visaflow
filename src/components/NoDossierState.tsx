import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { useWorkspaceOptional } from '@/app/providers/WorkspaceProvider'

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
 * never a destructive-red alert) and never a dead end.
 *
 * "Never a dead end" used to mean "always routes into first-run", which stopped
 * being true once dossiers could be saved: someone with five dossiers who
 * closed the one they had open was offered nothing but "start a new
 * application". When saved dossiers exist this says so and offers them
 * (ADR-040). With a genuinely empty workspace the first-run invitation is
 * unchanged.
 */
export function NoDossierState({
  section,
  title,
  description,
  icon = FolderOpen,
  hint,
}: NoDossierStateProps) {
  const { t } = useTranslation('common')
  // Optional on purpose: this renders in the component gallery too, where
  // there is no workspace — and no workspace means no saved dossiers.
  const workspace = useWorkspaceOptional()
  const savedCount = workspace?.summaries.length ?? 0
  const hasSaved = savedCount > 0

  const resolvedDescription =
    description ??
    (hasSaved
      ? t('noDossier.savedDescription', { count: savedCount })
      : section
        ? t('noDossier.descriptionFor', { section })
        : t('noDossier.description'))

  return (
    <>
      {/* The page still needs its heading. Without this the no-dossier branch
          rendered an `h2` and nothing above it, so switching to an empty
          dossier left the document with no `h1` at all. */}
      {section && <PageHeader title={section} />}
      <EmptyState
        icon={icon}
        title={
          title ?? t(hasSaved ? 'noDossier.savedTitle' : 'noDossier.title')
        }
        description={resolvedDescription}
        action={
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {hasSaved ? (
                <>
                  <Button asChild size="sm">
                    <Link to="/dossiers">{t('noDossier.openAction')}</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/welcome?step=create">
                      {t('noDossier.startAction')}
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="sm">
                    <Link to="/welcome">{t('noDossier.startAction')}</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/welcome?step=create">
                      {t('noDossier.importAction')}
                    </Link>
                  </Button>
                </>
              )}
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
    </>
  )
}
