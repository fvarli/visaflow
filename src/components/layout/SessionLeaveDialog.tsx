import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'

/**
 * The last thing standing between work that is not in storage and oblivion.
 *
 * One dialog, three reasons. The editor can be unsafe to leave because the
 * dossier is session-only, because autosave stopped at a conflict, or because
 * the browser refused to store it — and originally only the first of those
 * asked anything at all, so the other two discarded edits through the very same
 * switcher click. The provider refuses the change and records *why*; this asks
 * the user which of the real outcomes they meant (ADR-041).
 *
 * The middle action is the interesting one, because the way out differs: promote
 * in place, fork to a new dossier, or take a file. The first two must commit
 * *before* the change happens — continuing after a failed save would discard
 * exactly the work we just failed to save. Exporting resolves nothing on
 * purpose: it makes discarding safe, it does not make it chosen.
 */
export function SessionLeaveDialog() {
  const { t } = useTranslation('workspace')
  const {
    pendingLeave,
    cancelLeave,
    saveAndLeave,
    discardAndLeave,
    exportPending,
  } = useWorkspace()

  // The control that started this is often inside a dropdown that has since
  // closed, so name a destination rather than letting focus fall to <body>
  // (ADR-035).
  const focusFallback = useCallback(() => document.getElementById('main'), [])

  const reason = pendingLeave?.reason ?? 'session-only'

  return (
    <AlertDialog
      open={pendingLeave !== null}
      onOpenChange={(open) => {
        // Escape, the overlay, and Cancel all mean the same thing: keep it.
        if (!open) cancelLeave()
      }}
    >
      <AlertDialogContent restoreFocusFallback={focusFallback}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(`leave.${reason}.title`)}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(`leave.${reason}.body`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Radix focuses Cancel on open, which is what we want: the safe
              choice, never the destructive one. */}
          <AlertDialogCancel>{t('leave.stay')}</AlertDialogCancel>
          {/* Discard sits before the rescue in the DOM on purpose. The footer is
              `flex-col-reverse` on narrow screens, so this order puts the
              recommended action at the top of the stack and the destructive one
              below it — rather than handing a phone user a big red button in
              the first place their thumb lands. */}
          <AlertDialogAction
            variant="destructive"
            onClick={() => void discardAndLeave()}
          >
            {t(`leave.${reason}.discard`)}
          </AlertDialogAction>
          {reason === 'storage-failure' ? (
            <AlertDialogAction
              variant="outline"
              onClick={(event) => {
                // Nothing is resolved by taking a copy, so stay open.
                event.preventDefault()
                exportPending()
              }}
            >
              {t('leave.storage-failure.rescue')}
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              variant="outline"
              onClick={(event) => {
                // Keep the dialog up until the write actually commits.
                event.preventDefault()
                void saveAndLeave()
              }}
            >
              {t(`leave.${reason}.rescue`)}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
