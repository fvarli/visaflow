import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { XCircle } from 'lucide-react'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useSettingsModel } from '@/features/settings/settings-model'

/**
 * Local data — what is loaded, where it lives, and how fresh the user's own
 * copy of it is.
 *
 * Those last two are deliberately separate lines. "Saved on this device" and
 * "backed up" are different promises, and this panel used to blur them: it read
 * an in-memory flag that was cleared by merely *opening* a dossier, so a
 * never-exported dossier could claim both "no changes since your last export"
 * and "last exported today" (ADR-038). Both lines now come from the stored
 * record.
 *
 * The action below closes the open dossier. It does not delete anything —
 * deletion lives on the Dossiers page, and having exactly one place that
 * destroys data is worth more than the convenience of a second one.
 */
export function DataSection() {
  const { t } = useTranslation(['settings', 'common', 'workspace'])
  const { closeDossier } = useWorkspace()
  const focusAfterClose = useCallback(() => document.getElementById('main'), [])
  /**
   * Controlled so the dialog can stay up until the close has actually happened.
   * Letting it close first left focus on a trigger that `reset()` was about to
   * unmount, which drops focus to <body> (ADR-035).
   */
  const [confirmOpen, setConfirmOpen] = useState(false)
  const confirmClose = async (event: React.MouseEvent) => {
    event.preventDefault()
    await closeDossier()
    setConfirmOpen(false)
  }
  const model = useSettingsModel()
  const { localData } = model

  // `null` means there is no saved record to ask — a session-only dossier keeps
  // no export history, and inventing one would be the old bug in a new place.
  const backupLine =
    localData.backup === null
      ? t('workspace:session.body')
      : localData.backup === 'never'
        ? t('workspace:backup.never')
        : localData.backup === 'fresh'
          ? t('workspace:backup.fresh')
          : t('workspace:backup.stale')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-body text-foreground font-medium">
          {t('settings:data.statusTitle')}
        </h3>
        <p className="text-body text-foreground">
          {localData.hasData
            ? t('settings:data.loaded')
            : t('settings:data.empty')}
        </p>
        {localData.hasData && (
          <div className="text-caption text-muted-foreground flex flex-col gap-0.5">
            <span>
              {t('settings:data.documents', { count: localData.documentCount })}
              {' · '}
              {t('settings:data.sponsors', { count: localData.sponsorCount })}
            </span>
            {/* Where it lives … */}
            <span>{t(`workspace:status.${localData.persistence}`)}</span>
            {/* … and how current the copy the user actually owns is. */}
            <span>{backupLine}</span>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <h3 className="text-eyebrow text-muted-foreground uppercase">
          {t('settings:dangerZone')}
        </h3>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="self-start">
              <XCircle />
              {t('settings:reset.action')}
            </Button>
          </AlertDialogTrigger>
          {/* Closing resets the editor, which remounts the page and destroys
              the trigger this dialog would otherwise return focus to. */}
          <AlertDialogContent restoreFocusFallback={focusAfterClose}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('settings:reset.confirmTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('settings:reset.confirmBody')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t('common:actions.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={(event) => void confirmClose(event)}>
                {t('settings:reset.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
