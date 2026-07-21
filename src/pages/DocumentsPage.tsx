import { useState, useMemo, useEffect } from 'react'
import { useDossier } from '@/app/providers/DossierProvider'
import { getCountryConfig } from '@/config/countries'
import { isRequirementApplicable } from '@/config/types'
import type { Document } from '@/domain/schemas/document.schema'
import { createDocumentId } from '@/domain/types/common'
import { Card, CardContent } from '@/components/ui/card'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, FileText, Search, Filter } from 'lucide-react'

const statusColors: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-800',
  requested: 'bg-blue-100 text-blue-800',
  received: 'bg-yellow-100 text-yellow-800',
  needs_update: 'bg-red-100 text-red-800',
  ready: 'bg-green-100 text-green-800',
  not_applicable: 'bg-gray-100 text-gray-600',
}

export default function DocumentsPage() {
  const { state, setDocuments, updateDocument, hasData } = useDossier()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [requiredOnly, setRequiredOnly] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)

  // Initialize documents from country config if empty
  useEffect(() => {
    if (
      hasData &&
      state.documents.length === 0 &&
      state.application?.destinationCountry
    ) {
      const config = getCountryConfig(state.application.destinationCountry)
      if (config) {
        const context = {
          employment: state.application.employment,
          financing: state.application.financing,
        }

        const docs: Document[] = config.documentRequirements
          .filter((req) => isRequirementApplicable(req, context))
          .map((req) => ({
            id: createDocumentId(),
            code: req.code,
            name: req.name,
            category: req.category,
            ownerType: req.ownerType,
            ownerId: state.applicant?.id ?? '',
            required: req.required,
            status: 'not_started',
            verified: false,
          }))

        setDocuments(docs)
      }
    }
  }, [
    hasData,
    state.documents.length,
    state.application,
    state.applicant,
    setDocuments,
  ])

  const filteredDocs = useMemo(() => {
    return state.documents.filter((doc) => {
      if (
        searchTerm &&
        !doc.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false
      }
      if (categoryFilter !== 'all' && doc.category !== categoryFilter) {
        return false
      }
      if (statusFilter !== 'all' && doc.status !== statusFilter) {
        return false
      }
      if (requiredOnly && !doc.required) {
        return false
      }
      return true
    })
  }, [state.documents, searchTerm, categoryFilter, statusFilter, requiredOnly])

  const categories = useMemo(() => {
    const cats = new Set(state.documents.map((d) => d.category))
    return Array.from(cats).sort()
  }, [state.documents])

  const handleStatusChange = (docId: string, status: Document['status']) => {
    updateDocument(docId, { status })
  }

  const handleSaveEdit = () => {
    if (editingDoc) {
      updateDocument(editingDoc.id, editingDoc)
      setEditingDoc(null)
    }
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Track your visa application documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {filteredDocs.filter((d) => d.status === 'ready').length} /{' '}
            {filteredDocs.filter((d) => d.required).length} Ready
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="needs_update">Needs Update</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="not_applicable">N/A</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Checkbox
                id="required-only"
                checked={requiredOnly}
                onCheckedChange={(checked) => setRequiredOnly(checked === true)}
              />
              <Label htmlFor="required-only" className="text-sm">
                Required only
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Required</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No documents found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">
                        {doc.category.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={doc.status}
                        onValueChange={(value) =>
                          handleStatusChange(
                            doc.id,
                            value as Document['status']
                          )
                        }
                      >
                        <SelectTrigger className="w-32">
                          <Badge
                            variant="secondary"
                            className={statusColors[doc.status]}
                          >
                            {doc.status.replace(/_/g, ' ')}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">
                            Not Started
                          </SelectItem>
                          <SelectItem value="requested">Requested</SelectItem>
                          <SelectItem value="received">Received</SelectItem>
                          <SelectItem value="needs_update">
                            Needs Update
                          </SelectItem>
                          <SelectItem value="ready">Ready</SelectItem>
                          <SelectItem value="not_applicable">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {doc.required ? (
                        <Badge variant="destructive">Required</Badge>
                      ) : (
                        <Badge variant="outline">Optional</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingDoc(doc)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingDoc}
        onOpenChange={(open) => !open && setEditingDoc(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>{editingDoc?.name}</DialogDescription>
          </DialogHeader>

          {editingDoc && (
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Issued Date</Label>
                  <Input
                    type="date"
                    value={editingDoc.issuedAt ?? ''}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, issuedAt: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={editingDoc.validUntil ?? ''}
                    onChange={(e) =>
                      setEditingDoc({
                        ...editingDoc,
                        validUntil: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>File Reference</Label>
                <Input
                  value={editingDoc.fileReference ?? ''}
                  onChange={(e) =>
                    setEditingDoc({
                      ...editingDoc,
                      fileReference: e.target.value,
                    })
                  }
                  placeholder="Local file path or reference"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editingDoc.notes ?? ''}
                  onChange={(e) =>
                    setEditingDoc({ ...editingDoc, notes: e.target.value })
                  }
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="verified"
                  checked={editingDoc.verified}
                  onCheckedChange={(checked) =>
                    setEditingDoc({ ...editingDoc, verified: checked === true })
                  }
                />
                <Label htmlFor="verified">Verified / Reviewed</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingDoc(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
