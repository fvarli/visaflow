import { useTranslation } from 'react-i18next'
import { Check, Info } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { documentLabel } from '@/lib/document-label'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { TemplateSyncPlan } from '@/features/documents/template-sync'
import { documentFromRequirement } from '@/features/documents/template-sync'

interface TemplateSyncDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: TemplateSyncPlan
  ownerId: string
}

/**
 * Preview + confirm for a template sync. Additive only: it lists requirements
 * to add and requirements no longer applicable (surfaced, never auto-deleted),
 * and applies additions on confirm while preserving all existing documents.
 */
export function TemplateSyncDialog({
  open,
  onOpenChange,
  plan,
  ownerId,
}: TemplateSyncDialogProps) {
  const { t } = useTranslation(['documents', 'visa-domain'])
  const td = dynamicT(t)
  const { addDocument } = useDossier()

  const { toAdd, noLongerApplicable } = plan
  const nothing = toAdd.length === 0 && noLongerApplicable.length === 0

  const apply = () => {
    for (const req of toAdd) addDocument(documentFromRequirement(req, ownerId))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('documents:sync.title')}</DialogTitle>
          <DialogDescription>
            {t('documents:sync.description')}
          </DialogDescription>
        </DialogHeader>

        {nothing ? (
          <Alert>
            <Check />
            <AlertDescription>{t('documents:sync.nothing')}</AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-5">
            {toAdd.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-caption text-foreground font-medium">
                  {t('documents:sync.additions', { count: toAdd.length })}
                </h3>
                <ul className="flex flex-col gap-1">
                  {toAdd.map((req) => (
                    <li
                      key={req.code}
                      className="text-body text-foreground flex items-center gap-2"
                    >
                      <Check
                        className="text-success size-4 shrink-0"
                        aria-hidden
                      />
                      {documentLabel(t, req.code)}
                      <span className="text-caption text-muted-foreground">
                        · {td(`visa-domain:documentCategory.${req.category}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {noLongerApplicable.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-caption text-foreground font-medium">
                  {t('documents:sync.noLongerApplicable', {
                    count: noLongerApplicable.length,
                  })}
                </h3>
                <ul className="flex flex-col gap-1">
                  {noLongerApplicable.map((doc) => (
                    <li
                      key={doc.id}
                      className="text-body text-muted-foreground flex items-center gap-2"
                    >
                      <Info className="size-4 shrink-0" aria-hidden />
                      {documentLabel(t, doc.code, doc.name)}
                    </li>
                  ))}
                </ul>
                <p className="text-caption text-muted-foreground">
                  {t('documents:sync.noLongerHint')}
                </p>
              </section>
            )}
          </div>
        )}

        <DialogFooter>
          {toAdd.length > 0 && (
            <Button onClick={apply}>
              {t('documents:sync.apply', { count: toAdd.length })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
