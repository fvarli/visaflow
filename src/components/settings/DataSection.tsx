import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
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
import { useFormatters } from '@/lib/format'
import { useSettingsModel } from '@/features/settings/settings-model'

/**
 * Local data — a factual summary of what is currently loaded on this device
 * (dossier presence, counts, unexported-changes, last export), plus the isolated
 * destructive Reset behind an `AlertDialog`. No persistence is added.
 */
export function DataSection() {
  const { t } = useTranslation(['settings', 'common'])
  const { reset } = useDossier()
  const f = useFormatters()
  const model = useSettingsModel()
  const { localData } = model

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
            <span>
              {localData.isDirty
                ? t('settings:data.unsaved')
                : t('settings:data.saved')}
            </span>
            <span>
              {localData.lastSaved
                ? t('settings:data.lastExport', {
                    date: f.date(localData.lastSaved),
                  })
                : t('settings:data.neverExported')}
            </span>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <h3 className="text-eyebrow text-muted-foreground uppercase">
          {t('settings:dangerZone')}
        </h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="self-start">
              <Trash2 />
              {t('settings:reset.action')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
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
              <AlertDialogAction variant="destructive" onClick={() => reset()}>
                {t('settings:reset.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
