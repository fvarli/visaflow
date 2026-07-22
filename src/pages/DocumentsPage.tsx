import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDossier } from '@/app/providers/DossierProvider'
import { resolveVisaTemplate } from '@/config/countries'
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
import { FileText, Search, Filter } from 'lucide-react'
import { NoDossierState } from '@/components/NoDossierState'
import { documentLabel } from '@/lib/document-label'
import { dynamicT } from '@/lib/i18n-dynamic'

/** Single source for the status options rendered in both selects. */
const DOCUMENT_STATUSES: Document['status'][] = [
  'not_started',
  'requested',
  'received',
  'needs_update',
  'ready',
  'not_applicable',
]

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
  const { t } = useTranslation(['documents', 'common', 'visa-domain'])
  const td = dynamicT(t)
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
      const template = resolveVisaTemplate(
        state.application.destinationCountry,
        state.application.visaType
      )
      if (template) {
        const context = {
          employment: state.application.employment,
          financing: state.application.financing,
        }

        const docs: Document[] = template.documentRequirements
          .filter((req) => isRequirementApplicable(req, context))
          .map((req) => ({
            id: createDocumentId(),
            // `code` is the identity. No display name is stored: a stored
            // label would make exported JSON depend on the UI language.
            code: req.code,
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
        !documentLabel(t, doc.code, doc.name)
          .toLocaleLowerCase()
          .includes(searchTerm.toLocaleLowerCase())
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
  }, [
    state.documents,
    searchTerm,
    categoryFilter,
    statusFilter,
    requiredOnly,
    t,
  ])

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
    return <NoDossierState section={t('documents:title')} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('documents:title')}</h1>
          <p className="text-muted-foreground">
            {t('documents:shortDescription')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {t('documents:readyCount', {
              ready: filteredDocs.filter((d) => d.status === 'ready').length,
              total: filteredDocs.filter((d) => d.required).length,
            })}
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
                placeholder={t('documents:filters.search')}
                aria-label={t('documents:filters.searchLabel')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger
                className="w-40"
                aria-label={t('documents:filters.categoryLabel')}
              >
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t('documents:filters.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('documents:filters.allCategories')}
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {td(`visa-domain:documentCategory.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-40"
                aria-label={t('documents:filters.statusLabel')}
              >
                <SelectValue placeholder={t('documents:filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('documents:filters.allStatuses')}
                </SelectItem>
                {DOCUMENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {td(`visa-domain:documentStatus.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Checkbox
                id="required-only"
                checked={requiredOnly}
                onCheckedChange={(checked) => setRequiredOnly(checked === true)}
              />
              <Label htmlFor="required-only" className="text-sm">
                {t('documents:filters.requiredOnly')}
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
                <TableHead>{t('documents:table.document')}</TableHead>
                <TableHead>{t('documents:table.category')}</TableHead>
                <TableHead>{t('documents:table.status')}</TableHead>
                <TableHead>{t('documents:table.required')}</TableHead>
                <TableHead className="text-right">
                  {t('documents:table.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      {t('documents:empty.title')}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {documentLabel(t, doc.code, doc.name)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {td(`visa-domain:documentCategory.${doc.category}`)}
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
                        <SelectTrigger
                          className="w-36"
                          aria-label={t('documents:table.statusFor', {
                            document: documentLabel(t, doc.code, doc.name),
                          })}
                        >
                          <Badge
                            variant="secondary"
                            className={statusColors[doc.status]}
                          >
                            {td(`visa-domain:documentStatus.${doc.status}`)}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {td(`visa-domain:documentStatus.${status}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {doc.required ? (
                        <Badge variant="destructive">
                          {t('common:states.required')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {t('common:states.optional')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingDoc(doc)}
                      >
                        {t('common:actions.edit')}
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
            <DialogTitle>{t('documents:edit.title')}</DialogTitle>
            <DialogDescription>
              {editingDoc
                ? documentLabel(t, editingDoc.code, editingDoc.name)
                : ''}
            </DialogDescription>
          </DialogHeader>

          {editingDoc && (
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('documents:edit.issuedDate')}</Label>
                  <Input
                    type="date"
                    value={editingDoc.issuedAt ?? ''}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, issuedAt: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('documents:edit.validUntil')}</Label>
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
                <Label>{t('documents:edit.fileReference')}</Label>
                <Input
                  value={editingDoc.fileReference ?? ''}
                  onChange={(e) =>
                    setEditingDoc({
                      ...editingDoc,
                      fileReference: e.target.value,
                    })
                  }
                  placeholder={t('documents:edit.fileReferencePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('documents:edit.notes')}</Label>
                <Textarea
                  value={editingDoc.notes ?? ''}
                  onChange={(e) =>
                    setEditingDoc({ ...editingDoc, notes: e.target.value })
                  }
                  placeholder={t('documents:edit.notesPlaceholder')}
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
                <Label htmlFor="verified">{t('documents:edit.verified')}</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingDoc(null)}>
                  {t('common:actions.cancel')}
                </Button>
                <Button onClick={handleSaveEdit}>
                  {t('common:actions.saveChanges')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
