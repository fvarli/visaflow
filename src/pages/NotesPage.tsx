import { useState } from 'react'
import { format } from 'date-fns'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Plus, StickyNote, Trash2 } from 'lucide-react'
import { generateId } from '@/domain/types/common'

export default function NotesPage() {
  const { state, updateApplication, hasData } = useDossier()
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
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No application data loaded. Go to Dashboard to start a new
          application.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notes</h1>
          <p className="text-muted-foreground">
            Keep track of important information
          </p>
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
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingNote ? 'Edit Note' : 'Add Note'}
              </DialogTitle>
              <DialogDescription>
                Add a note to your visa application dossier
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Note title"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
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
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="timeline">Timeline</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Write your note..."
                  rows={5}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingNote ? 'Save Changes' : 'Add Note'}
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
            <p className="text-muted-foreground">No notes yet</p>
            <p className="text-sm text-muted-foreground">
              Add notes to track important information
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
                    {note.title ?? 'Untitled Note'}
                  </CardTitle>
                  <CardDescription>
                    {note.category.charAt(0).toUpperCase() +
                      note.category.slice(1)}{' '}
                    - {format(new Date(note.createdAt), 'MMM d, yyyy')}
                    {note.updatedAt && ' (edited)'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(note)}
                  >
                    Edit
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
