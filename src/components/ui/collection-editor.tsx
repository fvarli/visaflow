import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface CollectionEditorLabels {
  /** Text on the "add" buttons (empty-state action and "add another"). */
  add: string
  /** Dialog title when adding a new record. */
  addTitle: string
  /** Dialog title when editing an existing record. */
  editTitle: string
  save: string
  cancel: string
  /** aria-label for each card's edit button. */
  edit: string
  /** aria-label for each card's remove button. */
  remove: string
}

interface CollectionEditorProps<T> {
  items: T[]
  onChange: (next: T[]) => void
  /** Factory for a blank record when the user clicks "add". */
  createEmpty: () => T
  /** Card body for a saved record. */
  renderSummary: (item: T, index: number) => React.ReactNode
  /** Dialog form fields for the working draft. */
  renderForm: (args: {
    draft: T
    setDraft: (next: T) => void
  }) => React.ReactNode
  /** Return false to keep the dialog's save button disabled. */
  validate?: (draft: T) => boolean
  labels: CollectionEditorLabels
  emptyIcon?: React.ComponentType<{ className?: string }>
  emptyTitle: string
  emptyDescription?: string
  /** Stable list key; defaults to the array index (records have no id). */
  itemKey?: (item: T, index: number) => React.Key
  className?: string
}

/**
 * Add → card list → dialog edit → remove, for a list of records.
 *
 * Controlled and generic: it holds only the transient add/edit draft and
 * commits whole arrays back through `onChange`, so the same component drives
 * Previous Visas, Travel History, or any other repeated sub-record without a
 * dedicated reducer action. An empty list shows an inviting empty state rather
 * than a bare "+ Add".
 */
function CollectionEditor<T>({
  items,
  onChange,
  createEmpty,
  renderSummary,
  renderForm,
  validate,
  labels,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  itemKey,
  className,
}: CollectionEditorProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [draft, setDraft] = React.useState<T | null>(null)

  const startAdd = () => {
    setDraft(createEmpty())
    setEditingIndex(null)
    setOpen(true)
  }

  const startEdit = (index: number) => {
    const item = items[index]
    if (item === undefined) return
    setDraft(item)
    setEditingIndex(index)
    setOpen(true)
  }

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const save = () => {
    if (draft === null) return
    if (editingIndex === null) {
      onChange([...items, draft])
    } else {
      onChange(items.map((item, i) => (i === editingIndex ? draft : item)))
    }
    setOpen(false)
    setDraft(null)
    setEditingIndex(null)
  }

  const canSave = draft !== null && (validate ? validate(draft) : true)

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {items.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={
            <Button size="sm" onClick={startAdd}>
              <Plus />
              {labels.add}
            </Button>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {items.map((item, index) => (
              <li key={itemKey ? itemKey(item, index) : index}>
                <Card className="py-0">
                  <CardContent className="flex items-start justify-between gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      {renderSummary(item, index)}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={labels.edit}
                        onClick={() => startEdit(index)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={labels.remove}
                        onClick={() => remove(index)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          <div>
            <Button variant="outline" size="sm" onClick={startAdd}>
              <Plus />
              {labels.add}
            </Button>
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIndex === null ? labels.addTitle : labels.editTitle}
            </DialogTitle>
          </DialogHeader>
          {draft !== null && (
            <div className="flex flex-col gap-4">
              {renderForm({ draft, setDraft })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {labels.cancel}
            </Button>
            <Button onClick={save} disabled={!canSave}>
              {labels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { CollectionEditor }
