import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDossier } from '@/app/providers/DossierProvider'
import type { ApplicationNote } from '@/domain/schemas/application.schema'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, StickyNote, Trash2 } from 'lucide-react'
import { NoDossierState } from '@/components/NoDossierState'
import { dynamicT } from '@/lib/i18n-dynamic'
import { useFormatters } from '@/lib/format'
import { generateId } from '@/domain/types/common'

export default function NotesPage() {
  const { state, updateApplication, hasData } = useDossier()
  const { t } = useTranslation(['notes', 'common'])
  const td = dynamicT(t)
  const fmt = useFormatters()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<ApplicationNote | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general' as ApplicationNote['category'],
  })

  const notes = state.application?.notes ?? []

  const resetForm = () => {
    setFormData({ title: '', content: '', category: 'general' })
    setEditingNote(null)
  }

  const handleSubmit = () => {
    if (!formData.content) return

    const now = new Date().toISOString()
    const newNote: ApplicationNote = editingNote
      ? {
          ...editingNote,
          updatedAt: now,
          title: formData.title || undefined,
          content: formData.content,
          category: formData.category,
        }
      : {
          id: generateId(),
          createdAt: now,
          title: formData.title || undefined,
          content: formData.content,
          category: formData.category,
        }

    const updatedNotes = editingNote
      ? notes.map((n) => (n.id === editingNote.id ? newNote : n))
      : [...notes, newNote]

    updateApplication({ notes: updatedNotes })
    setDialogOpen(false)
    resetForm()
  }

  const handleEdit = (note: ApplicationNote) => {
    setEditingNote(note)
    setFormData({
      title: note.title ?? '',
      content: note.content,
      category: note.category,
    })
    setDialogOpen(true)
  }

  const handleDelete = (noteId: string) => {
    const updatedNotes = notes.filter((n) => n.id !== noteId)
    updateApplication({ notes: updatedNotes })
  }

  if (!hasData) {
    return <NoDossierState section={t('notes:title')} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('notes:title')}</h1>
          <p className="text-muted-foreground">{t('notes:shortDescription')}</p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('notes:add')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingNote ? t('notes:edit') : t('notes:add')}
              </DialogTitle>
              <DialogDescription>
                {t('notes:dialogDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('notes:fields.title')}</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t('notes:fields.titlePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('notes:fields.category')}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category: value as ApplicationNote['category'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">
                      {t('notes:categories.general')}
                    </SelectItem>
                    <SelectItem value="document">
                      {t('notes:categories.document')}
                    </SelectItem>
                    <SelectItem value="timeline">
                      {t('notes:categories.timeline')}
                    </SelectItem>
                    <SelectItem value="appointment">
                      {t('notes:categories.appointment')}
                    </SelectItem>
                    <SelectItem value="other">
                      {t('notes:categories.other')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('notes:fields.content')} *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder={t('notes:fields.contentPlaceholder')}
                  rows={5}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('common:actions.cancel')}
                </Button>
                <Button onClick={handleSubmit}>
                  {editingNote
                    ? t('common:actions.saveChanges')
                    : t('notes:add')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('notes:empty.title')}</p>
            <p className="text-sm text-muted-foreground">
              {t('notes:empty.description')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">
                    {note.title ?? t('notes:untitled')}
                  </CardTitle>
                  <CardDescription>
                    {td(`notes:categories.${note.category}`)} ·{' '}
                    <span data-numeric>{fmt.dateShort(note.createdAt)}</span>
                    {note.updatedAt && ` (${t('notes:edited')})`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(note)}
                  >
                    {t('common:actions.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
