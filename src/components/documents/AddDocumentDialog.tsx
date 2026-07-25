import * as React from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useDossier } from '@/app/providers/DossierProvider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/ui/segmented-control'
import { EmptyState } from '@/components/ui/empty-state'
import { documentLabel } from '@/lib/document-label'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { DocumentCategory } from '@/domain/types/common'
import type { DocumentRequirement } from '@/config/types'
import {
  createCustomDocument,
  documentFromRequirement,
} from '@/features/documents/template-sync'

const CATEGORIES: DocumentCategory[] = [
  'supporting',
  'identity',
  'passport',
  'employment',
  'financial',
  'sponsor',
  'travel',
  'accommodation',
  'insurance',
  'application_form',
  'civil_registry',
  'previous_travel',
]

type Mode = 'custom' | 'template'

interface AddDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableRequirements: DocumentRequirement[]
  ownerId: string
  defaultCategory?: DocumentCategory
}

/** Add a custom supporting document, or re-add a template requirement. */
export function AddDocumentDialog({
  open,
  onOpenChange,
  availableRequirements,
  ownerId,
  defaultCategory = 'supporting',
}: AddDocumentDialogProps) {
  const { t } = useTranslation(['documents', 'visa-domain'])
  const td = dynamicT(t)
  const { addDocument } = useDossier()
  const [mode, setMode] = React.useState<Mode>('custom')
  const [title, setTitle] = React.useState('')
  const [category, setCategory] =
    React.useState<DocumentCategory>(defaultCategory)

  // State resets via a fresh mount each time the dialog opens (the parent
  // changes its `key`), so no reset effect is needed.

  const modeOptions: SegmentedOption<Mode>[] = [
    { value: 'custom', label: t('documents:add.tabCustom') },
    { value: 'template', label: t('documents:add.tabTemplate') },
  ]

  const addCustom = () => {
    addDocument(createCustomDocument(title.trim(), category, ownerId))
    onOpenChange(false)
  }

  const addRequirement = (req: DocumentRequirement) => {
    addDocument(documentFromRequirement(req, ownerId))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('documents:add.title')}</DialogTitle>
          <DialogDescription>
            {t('documents:add.description')}
          </DialogDescription>
        </DialogHeader>

        <SegmentedControl
          options={modeOptions}
          value={mode}
          onValueChange={setMode}
          ariaLabel={t('documents:add.title')}
          className="w-full"
        />

        {mode === 'custom' ? (
          <div className="flex flex-col gap-4">
            <Field label={t('documents:add.customTitle')} required>
              <Input
                value={title}
                placeholder={t('documents:add.customTitlePlaceholder')}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label={t('documents:add.category')} htmlFor="add-category">
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as DocumentCategory)}
              >
                <SelectTrigger id="add-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {td(`visa-domain:documentCategory.${cat}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex justify-end">
              <Button onClick={addCustom} disabled={title.trim().length === 0}>
                <Plus />
                {t('documents:add.add')}
              </Button>
            </div>
          </div>
        ) : availableRequirements.length === 0 ? (
          <EmptyState
            variant="inline"
            title={t('documents:add.noneAvailable')}
          />
        ) : (
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {availableRequirements.map((req) => (
              <li
                key={req.code}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-body text-foreground truncate">
                    {documentLabel(t, req.code)}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {td(`visa-domain:documentCategory.${req.category}`)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addRequirement(req)}
                >
                  <Plus />
                  {t('documents:add.add')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
