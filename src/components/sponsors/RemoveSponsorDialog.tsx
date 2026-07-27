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

interface RemoveSponsorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sponsorName: string
  onConfirm: () => void
}

/**
 * A safe, explicit confirmation for removing a sponsor. It names the sponsor and
 * spells out the consequences — the record is removed, linked documents are NOT
 * deleted, and finance/consistency status may change. Radix focuses Cancel by
 * default (so Enter can't accidentally remove), Escape cancels, and focus
 * returns to the triggering control on close.
 */
export function RemoveSponsorDialog({
  open,
  onOpenChange,
  sponsorName,
  onConfirm,
}: RemoveSponsorDialogProps) {
  const { t } = useTranslation('sponsors')

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('remove.title', { name: sponsorName })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t('remove.body')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('remove.cancel')}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {t('remove.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
