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
 * The last thing standing between unsaved session-only work and oblivion.
 *
 * Session-only data exists nowhere but this tab, and until now one click in the
 * header switcher discarded it silently — no warning, no dirty check, nothing to
 * undo. The provider refuses the switch and records what was wanted; this asks
 * the user which of the three real outcomes they meant (ADR-039).
 *
 * "Save on this device" is the interesting one: it must persist *before* the
 * switch happens, and if the write fails the switch does not happen at all.
 * Continuing after a failed promotion would discard exactly the work we just
 * failed to save.
 */
export function SessionLeaveDialog() {
  const { t } = useTranslation('workspace')
  const { pendingLeave, cancelLeave, saveAndLeave, discardAndLeave } =
    useWorkspace()

  // The control that started this is often inside a dropdown that has since
  // closed, so name a destination rather than letting focus fall to <body>
  // (ADR-035).
  const focusFallback = useCallback(() => document.getElementById('main'), [])

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
          <AlertDialogTitle>{t('leave.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('leave.body')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Radix focuses Cancel on open, which is what we want: the safe
              choice, never the destructive one. */}
          <AlertDialogCancel>{t('leave.stay')}</AlertDialogCancel>
          {/* Discard sits before Save in the DOM on purpose. The footer is
              `flex-col-reverse` on narrow screens, so this order puts the
              recommended action at the top of the stack and the destructive one
              below it — rather than handing a phone user a big red button in
              the first place their thumb lands. */}
          <AlertDialogAction
            variant="destructive"
            onClick={() => void discardAndLeave()}
          >
            {t('leave.discard')}
          </AlertDialogAction>
          <AlertDialogAction
            variant="outline"
            onClick={(event) => {
              // Keep the dialog up until the write actually commits.
              event.preventDefault()
              void saveAndLeave()
            }}
          >
            {t('leave.save')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
