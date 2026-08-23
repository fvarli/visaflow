import { useTranslation } from 'react-i18next'
import { Copy, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'

/**
 * What another tab did to the dossier you are looking at.
 *
 * Deliberately calm and deliberately stuck: it is `role="status"`, so a screen
 * reader hears it at the next pause instead of being interrupted, and it never
 * moves focus — you may well be mid-sentence in a field. It also has no timer,
 * because it is not a notification: autosave is paused until one of the two
 * buttons is pressed, so dismissing it on a timer would hide the fact that
 * nothing is being saved.
 *
 * Both exits keep both versions. "Open the saved version" is the only path that
 * discards this tab's edits, and only because the user chose it. There is no
 * "sync failed" here — nothing was ever syncing, and nothing left the device.
 */
export function ConflictBanner() {
  const { t } = useTranslation('workspace')
  const { conflict, reloadLatest, saveAsNew } = useWorkspace()
  if (!conflict) return null

  const deleted = conflict.kind === 'remote-delete'

  return (
    <Alert
      variant="warning"
      role="status"
      // `aria-live` is implicit in `status`, but the banner appears while focus
      // is elsewhere entirely, so announce the whole thing rather than the diff.
      aria-atomic="true"
      className="mb-6"
    >
      <AlertTitle>
        {deleted ? t('conflict.deletedTitle') : t('conflict.changedTitle')}
      </AlertTitle>
      <AlertDescription className="gap-3">
        <p>{deleted ? t('conflict.deletedBody') : t('conflict.changedBody')}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Reloading is meaningless once the record is gone. */}
          {!deleted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void reloadLatest()}
            >
              <RefreshCw />
              {t('conflict.reload')}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => void saveAsNew()}>
            <Copy />
            {t('conflict.saveAsNew')}
          </Button>
        </div>
        <p className="text-caption">{t('conflict.exportHint')}</p>
      </AlertDescription>
    </Alert>
  )
}
