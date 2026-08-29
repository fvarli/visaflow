import * as React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Info,
  Trash2,
} from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
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
import { StatusBadge } from '@/components/ui/status-badge'
import { SourceNote } from '@/components/ui/source-note'
import { getSourcesForRefs } from '@/config/countries'
import { documentLabel } from '@/lib/document-label'
import { useFindingText } from '@/lib/finding-text'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  DOCUMENT_STATUS_TONE,
  SEVERITY_TONE,
} from '@/components/ui/status-badge'
import type { Document } from '@/domain/schemas/document.schema'
import type { DocumentStatus } from '@/domain/types/common'
import type { VisaTypeTemplate } from '@/config/types'
import type { ValidationFinding } from '@/domain/rules/types'
import { classifyDoc, findingLink } from '@/features/documents/documents-model'
import { isCustomCode } from '@/features/documents/template-sync'

const STATUSES: DocumentStatus[] = [
  'not_started',
  'requested',
  'received',
  'needs_update',
  'ready',
  'not_applicable',
]

const SEVERITY_ICON: Record<
  ValidationFinding['severity'],
  React.ComponentType<{ className?: string }>
> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

interface DocumentDetailPanelProps {
  document: Document | null
  findings: ValidationFinding[]
  template: VisaTypeTemplate | undefined
  countryCode: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The document workspace as a side panel — opened without navigation. Three
 * progressively-disclosed layers: read-only requirement context from the
 * country template, the editable applicant document state, and related
 * consistency findings (with "Go to <section>" deep-links). Editing autosaves
 * via `updateDocument`; nothing here re-encodes validation.
 */
export function DocumentDetailPanel({
  document,
  findings,
  template,
  countryCode,
  open,
  onOpenChange,
}: DocumentDetailPanelProps) {
  const { t } = useTranslation(['documents', 'visa-domain', 'common'])
  const td = dynamicT(t)
  const { updateDocument, removeDocument } = useDossier()
  const findingText = useFindingText()
  const [confirmingRemove, setConfirmingRemove] = React.useState(false)

  // Reset the remove-confirmation when the panel closes — in the close handler
  // (an event), not an effect.
  const handleOpenChange = (next: boolean) => {
    if (!next) setConfirmingRemove(false)
    onOpenChange(next)
  }

  const patch = (updates: Partial<Document>) => {
    if (document) updateDocument(document.id, updates)
  }

  const requirement = document
    ? template?.documentRequirements.find((r) => r.code === document.code)
    : undefined
  const kind = document ? classifyDoc(document, template) : 'custom'
  const isCustom = document ? isCustomCode(document.code) : false
  const sources = getSourcesForRefs(countryCode, requirement?.sourceRefs)

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-md"
      >
        {document && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>
                {documentLabel(t, document.code, document.name)}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <span>{t(`documents:panel.kind.${kind}`)}</span>
                <StatusBadge tone={DOCUMENT_STATUS_TONE[document.status]} dot>
                  {td(`visa-domain:documentStatus.${document.status}`)}
                </StatusBadge>
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 p-4">
              {/* Layer 1 — requirement context (read-only) */}
              <Accordion type="single" collapsible>
                <AccordionItem value="context" className="border-b-0">
                  <AccordionTrigger className="py-2">
                    {t('documents:panel.requirementContext')}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    {!requirement ? (
                      <p className="text-body text-muted-foreground text-pretty">
                        {/*
                         * A withdrawn requirement is not something the
                         * applicant added, and saying so about a record the app
                         * itself seeded is simply false (ADR-050).
                         */}
                        {kind === 'retired'
                          ? t('documents:panel.retiredNote')
                          : t('documents:panel.customNote')}
                      </p>
                    ) : (
                      <>
                        {requirement.descriptionKey && (
                          <p className="text-body text-foreground text-pretty">
                            {td(requirement.descriptionKey)}
                          </p>
                        )}
                        {requirement.notesKey && (
                          <div className="space-y-1">
                            <p className="text-caption text-muted-foreground font-medium">
                              {t('documents:panel.why')}
                            </p>
                            <p className="text-caption text-muted-foreground text-pretty">
                              {td(requirement.notesKey)}
                            </p>
                          </div>
                        )}
                        <SourceNote
                          sources={sources}
                          reviewStatus={template?.reviewStatus}
                          lastReviewedAt={template?.lastReviewedAt}
                        />
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Layer 2 — your document (editable) */}
              <section className="space-y-4">
                <h3 className="text-heading text-foreground">
                  {t('documents:panel.yourDocument')}
                </h3>

                <Field
                  label={t('documents:panel.status')}
                  htmlFor="panel-status"
                >
                  <Select
                    value={document.status}
                    onValueChange={(v) =>
                      patch({ status: v as DocumentStatus })
                    }
                  >
                    <SelectTrigger id="panel-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {td(`visa-domain:documentStatus.${status}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('documents:panel.issued')}>
                    <Input
                      type="date"
                      value={document.issuedAt ?? ''}
                      onChange={(e) =>
                        patch({ issuedAt: e.target.value || undefined })
                      }
                    />
                  </Field>
                  <Field label={t('documents:panel.valid')}>
                    <Input
                      type="date"
                      value={document.validUntil ?? ''}
                      onChange={(e) =>
                        patch({ validUntil: e.target.value || undefined })
                      }
                    />
                  </Field>
                  <Field label={t('documents:panel.received')}>
                    <Input
                      type="date"
                      value={document.receivedAt ?? ''}
                      onChange={(e) =>
                        patch({ receivedAt: e.target.value || undefined })
                      }
                    />
                  </Field>
                </div>

                <Field
                  label={t('documents:panel.fileReference')}
                  description={t('documents:panel.fileReferenceHint')}
                >
                  <Input
                    value={document.fileReference ?? ''}
                    placeholder={t('documents:panel.fileReferencePlaceholder')}
                    onChange={(e) =>
                      patch({ fileReference: e.target.value || undefined })
                    }
                  />
                </Field>

                <Field label={t('documents:panel.notes')}>
                  <Textarea
                    rows={3}
                    value={document.notes ?? ''}
                    placeholder={t('documents:panel.notesPlaceholder')}
                    onChange={(e) =>
                      patch({ notes: e.target.value || undefined })
                    }
                  />
                </Field>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="panel-verified"
                    checked={document.verified}
                    onCheckedChange={(v) => patch({ verified: v === true })}
                  />
                  <Label htmlFor="panel-verified" className="text-body">
                    {t('documents:panel.verified')}
                  </Label>
                </div>
              </section>

              {/* Layer 3 — related findings */}
              <section className="space-y-3">
                <h3 className="text-heading text-foreground">
                  {t('documents:panel.relatedFindings')}
                </h3>
                {findings.length === 0 ? (
                  <p className="text-body text-muted-foreground">
                    {t('documents:panel.noFindings')}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {findings.map((finding, index) => {
                      const text = findingText(finding)
                      const Icon = SEVERITY_ICON[finding.severity]
                      const link = findingLink(finding)
                      const section =
                        link?.route === '/applicant'
                          ? t('documents:panel.section.applicant')
                          : t('documents:panel.section.trip')
                      return (
                        <li
                          key={`${finding.id}-${index}`}
                          className="rounded-lg border p-3"
                        >
                          <div className="flex gap-2">
                            <StatusBadge tone={SEVERITY_TONE[finding.severity]}>
                              <Icon className="size-3" aria-hidden />
                            </StatusBadge>
                            <div className="min-w-0 space-y-1">
                              <p className="text-body text-foreground font-medium">
                                {text.title}
                              </p>
                              <p className="text-caption text-muted-foreground">
                                {text.description}
                              </p>
                              {link && (
                                <Button
                                  asChild
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0"
                                >
                                  <Link
                                    to={link.route}
                                    onClick={() => handleOpenChange(false)}
                                  >
                                    {t('documents:panel.goTo', { section })}
                                    <ArrowRight />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              {/* Remove / mark not applicable */}
              <section className="border-t pt-4">
                {confirmingRemove ? (
                  <div className="space-y-2">
                    <p className="text-caption text-muted-foreground">
                      {isCustom
                        ? t('documents:panel.removeCustomConfirm')
                        : t('documents:panel.removeTemplateWarning')}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          removeDocument(document.id)
                          handleOpenChange(false)
                        }}
                      >
                        {t('documents:panel.remove')}
                      </Button>
                      {!isCustom && document.status !== 'not_applicable' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            patch({ status: 'not_applicable' })
                            setConfirmingRemove(false)
                          }}
                        >
                          {t('documents:panel.markNotApplicable')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingRemove(false)}
                      >
                        {t('common:actions.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger-foreground"
                    onClick={() => setConfirmingRemove(true)}
                  >
                    <Trash2 />
                    {t('documents:panel.remove')}
                  </Button>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
