import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FilePlus2, FileText, RefreshCw } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { resolveVisaTemplate } from '@/config/countries'
import { PageHeader } from '@/components/ui/page-header'
import { PageBody, Section } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge, DOCUMENT_STATUS_TONE } from '@/components/ui/status-badge'
import type { StatusTone } from '@/components/ui/status-badge'
import { NoDossierState } from '@/components/NoDossierState'
import { documentLabel } from '@/lib/document-label'
import { dynamicT } from '@/lib/i18n-dynamic'
import { useFormatters } from '@/lib/format'
import { DocumentCategorySchema } from '@/domain/types/common'
import type { DocumentCategory } from '@/domain/types/common'
import type { Document } from '@/domain/schemas/document.schema'
import type { ValidationFinding } from '@/domain/rules/types'
import {
  useDocumentsModel,
  groupByCategory,
} from '@/features/documents/documents-model'
import {
  useDocumentFilters,
  filterDocuments,
  matchQuickFilter,
} from '@/features/documents/document-filters'
import {
  applicableRequirements,
  documentFromRequirement,
  isCustomCode,
  planTemplateSync,
} from '@/features/documents/template-sync'
import { DocumentsHero } from '@/components/documents/DocumentsHero'
import {
  DocumentFilters,
  type DocumentView,
} from '@/components/documents/DocumentFilters'
import { DocumentGroup } from '@/components/documents/DocumentGroup'
import { DocumentCard } from '@/components/documents/DocumentCard'
import { DocumentRow } from '@/components/documents/DocumentRow'
import { DocumentDetailPanel } from '@/components/documents/DocumentDetailPanel'
import { AddDocumentDialog } from '@/components/documents/AddDocumentDialog'
import { TemplateSyncDialog } from '@/components/documents/TemplateSyncDialog'

function findingTone(findings: ValidationFinding[]): StatusTone {
  if (findings.some((f) => f.severity === 'error')) return 'danger'
  if (findings.some((f) => f.severity === 'warning')) return 'warning'
  return 'info'
}

/**
 * The Documents workspace: an overview hero that answers "what's still
 * missing?", reusable filters + a view switch (cards / list / table), grouped
 * document cards, and a side panel that opens a document without leaving the
 * page. All derivations live in the pure documents model; validation findings
 * are surfaced (never re-encoded).
 */
export default function DocumentsPage() {
  const { state, setDocuments, hasData } = useDossier()
  const { t } = useTranslation(['documents', 'visa-domain', 'common'])
  const td = dynamicT(t)
  const f = useFormatters()

  const model = useDocumentsModel()
  const { filters, update, reset, applyQuickFilter, activeCount } =
    useDocumentFilters()
  const [view, setView] = useState<DocumentView>('cards')
  const [addOpen, setAddOpen] = useState(false)

  // Deep-link support (additive): `?doc=<id>` drives the detail panel so browser
  // Back/Forward opens and closes it; `?category=` seeds the filter once. No
  // params → the workspace behaves exactly as before.
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedDocId = searchParams.get('doc')

  const openDoc = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('doc', id)
      return next
    })
  const closeDoc = () =>
    setSearchParams((prev) => {
      // Remove only `doc`; keep any other active params (e.g. category).
      const next = new URLSearchParams(prev)
      next.delete('doc')
      return next
    })

  const categorySeeded = useRef(false)
  useEffect(() => {
    if (categorySeeded.current) return
    categorySeeded.current = true
    const category = searchParams.get('category')
    if (category && DocumentCategorySchema.safeParse(category).success) {
      update('category', category as DocumentCategory)
    }
  }, [searchParams, update])

  const [addKey, setAddKey] = useState(0)
  const [syncOpen, setSyncOpen] = useState(false)

  // Bump the dialog's key on open so it always mounts with fresh state.
  const openAdd = () => {
    setAddKey((k) => k + 1)
    setAddOpen(true)
  }

  const ownerId = state.applicant?.id ?? ''
  const countryCode = state.application?.destinationCountry
  const template = model.template

  // Seed the checklist from the template the first time (once, on empty).
  useEffect(() => {
    if (
      hasData &&
      state.documents.length === 0 &&
      state.application?.destinationCountry
    ) {
      const seedTemplate = resolveVisaTemplate(
        state.application.destinationCountry,
        state.application.visaType
      )
      if (seedTemplate) {
        const docs = applicableRequirements(
          seedTemplate,
          state.application
        ).map((req) => documentFromRequirement(req, state.applicant?.id ?? ''))
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

  const labelOf = useMemo(
    () => (doc: Document) => documentLabel(t, doc.code, doc.name),
    [t]
  )

  const filtered = useMemo(
    () => filterDocuments(state.documents, filters, labelOf),
    [state.documents, filters, labelOf]
  )
  const groups = useMemo(() => groupByCategory(filtered), [filtered])

  const presentCategories = useMemo(
    () => groupByCategory(state.documents).map((g) => g.category),
    [state.documents]
  )
  const presentOwners = useMemo(
    () => Array.from(new Set(state.documents.map((d) => d.ownerType))),
    [state.documents]
  )

  const availableToAdd = useMemo(
    () => (template ? applicableRequirements(template, state.application) : []),
    [template, state.application]
  )
  const missingRequirements = useMemo(
    () =>
      template
        ? availableToAdd.filter(
            (req) => !state.documents.some((d) => d.code === req.code)
          )
        : [],
    [template, availableToAdd, state.documents]
  )
  const syncPlan = useMemo(
    () =>
      template
        ? planTemplateSync(state.documents, state.application, template)
        : { toAdd: [], noLongerApplicable: [] },
    [template, state.documents, state.application]
  )

  if (!hasData) {
    return (
      <PageBody>
        <NoDossierState section={t('documents:title')} />
      </PageBody>
    )
  }

  const { readiness, filterableReadiness, pendingRequirementCount } = model
  const selectedDoc =
    state.documents.find((d) => d.id === selectedDocId) ?? null

  const buildDates = (doc: Document) => {
    const out: { label: string; value: string }[] = []
    if (doc.issuedAt)
      out.push({
        label: t('documents:card.issued'),
        value: f.dateShort(doc.issuedAt),
      })
    if (doc.validUntil)
      out.push({
        label: t('documents:card.valid'),
        value: f.dateShort(doc.validUntil),
      })
    if (doc.receivedAt)
      out.push({
        label: t('documents:card.received'),
        value: f.dateShort(doc.receivedAt),
      })
    if (doc.requestedAt)
      out.push({
        label: t('documents:card.requested'),
        value: f.dateShort(doc.requestedAt),
      })
    return out
  }

  const cardProps = (doc: Document) => {
    const findings = model.findingsByDoc.get(doc.id) ?? []
    return {
      label: labelOf(doc),
      categoryLabel: td(`visa-domain:documentCategory.${doc.category}`),
      ownerLabel: td(`visa-domain:ownerType.${doc.ownerType}`),
      statusLabel: td(`visa-domain:documentStatus.${doc.status}`),
      statusTone: DOCUMENT_STATUS_TONE[doc.status] ?? 'neutral',
      isCustom: isCustomCode(doc.code),
      customLabel: t('documents:card.kindCustom'),
      dates: buildDates(doc),
      notesPreview: doc.notes,
      missingInfo: doc.status === 'not_started',
      missingInfoLabel: t('documents:card.missingInfo'),
      verified: doc.verified,
      verifiedLabel: t('documents:card.verified'),
      notVerifiedLabel: t('documents:card.notVerified'),
      findingCount: findings.length,
      findingLabel:
        findings.length > 0
          ? t('documents:card.findings', { count: findings.length })
          : undefined,
      findingTone: findingTone(findings),
      openLabel: t('documents:card.open'),
      onOpen: () => openDoc(doc.id),
      selected: selectedDocId === doc.id,
    }
  }

  const groupCount = (docs: Document[]) => {
    const ready = docs.filter((d) => d.status === 'ready').length
    return t('documents:group.count', { ready, total: docs.length })
  }

  const emptyState = (
    <EmptyState
      icon={FileText}
      title={t('documents:empty.title')}
      description={t('documents:empty.description')}
    />
  )

  return (
    <PageBody>
      <PageHeader
        title={t('documents:title')}
        description={t('documents:shortDescription')}
        actions={
          template && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSyncOpen(true)}
              >
                <RefreshCw />
                {t('documents:sync.trigger')}
              </Button>
              <Button size="sm" onClick={openAdd}>
                <FilePlus2 />
                {t('documents:add.trigger')}
              </Button>
            </>
          )
        }
      />

      <DocumentsHero
        readiness={readiness}
        filterableReadiness={filterableReadiness}
        pendingNote={
          pendingRequirementCount > 0
            ? t('documents:hero.pendingRequirements', {
                count: pendingRequirementCount,
              })
            : undefined
        }
        bucketLabels={{
          ready: t('common:readiness.class.ready'),
          obtained: t('common:readiness.class.obtained'),
          requested: t('common:readiness.class.inProgress'),
          needsUpdate: t('common:readiness.class.needsUpdate'),
          missing: t('common:readiness.class.notStarted'),
          notApplicable: t('common:readiness.class.notApplicable'),
          optional: t('common:readiness.class.optional'),
        }}
        completionLabel={t('common:readiness.percent', {
          percent: readiness.percent,
        })}
        summaryLabel={
          readiness.hasApplicableWork
            ? t('common:readiness.ofApplicable', {
                ready: readiness.ready,
                total: readiness.applicable,
              })
            : t('common:readiness.nothingToTrack')
        }
        nextTitle={t('documents:hero.nextTitle')}
        nextDocLabel={
          model.nextDocument
            ? documentLabel(
                t,
                model.nextDocument.code,
                model.nextDocument.legacyName
              )
            : null
        }
        nextActionLabel={
          model.nextDocument
            ? td(`documents:hero.nextAction.${model.nextDocument.action}`)
            : null
        }
        nextEmptyLabel={
          readiness.outstanding > 0
            ? t('documents:hero.nextBlocked')
            : t('documents:hero.nextEmpty')
        }
        openLabel={
          model.nextDocument?.document
            ? t('documents:hero.open')
            : t('documents:hero.addToDossier')
        }
        activeBucket={matchQuickFilter(filters)}
        onBucketClick={applyQuickFilter}
        onOpenNext={
          model.nextDocument
            ? () => {
                const next = model.nextDocument
                if (!next) return
                // A bare requirement has no detail panel to open — the Sync
                // dialog is where it gets added to the dossier.
                if (next.document) openDoc(next.document.id)
                else setSyncOpen(true)
              }
            : undefined
        }
      />

      <DocumentFilters
        filters={filters}
        categories={presentCategories}
        owners={presentOwners}
        onUpdate={update}
        onClear={reset}
        activeCount={activeCount}
        resultsLabel={t('documents:filters.results', {
          count: filtered.length,
        })}
        view={view}
        onViewChange={setView}
      />

      {filtered.length === 0 ? (
        emptyState
      ) : view === 'table' ? (
        <Section>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('documents:table.document')}</TableHead>
                <TableHead>{t('documents:table.category')}</TableHead>
                <TableHead>{t('documents:table.owner')}</TableHead>
                <TableHead>{t('documents:table.status')}</TableHead>
                <TableHead className="text-right">
                  {t('documents:table.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc) => (
                <TableRow
                  key={doc.id}
                  data-state={selectedDocId === doc.id ? 'selected' : undefined}
                >
                  <TableCell className="font-medium">{labelOf(doc)}</TableCell>
                  <TableCell>
                    {td(`visa-domain:documentCategory.${doc.category}`)}
                  </TableCell>
                  <TableCell>
                    {td(`visa-domain:ownerType.${doc.ownerType}`)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={DOCUMENT_STATUS_TONE[doc.status]} dot>
                      {td(`visa-domain:documentStatus.${doc.status}`)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDoc(doc.id)}
                    >
                      {t('documents:card.open')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <DocumentGroup
              key={group.category}
              title={td(`visa-domain:documentCategory.${group.category}`)}
              countLabel={groupCount(group.documents)}
              toggleLabel={t('documents:group.toggle', {
                category: td(`visa-domain:documentCategory.${group.category}`),
              })}
              addLabel={template ? t('documents:group.addDocument') : undefined}
              onAdd={template ? openAdd : undefined}
            >
              {view === 'cards' ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {group.documents.map((doc) => (
                    <DocumentCard key={doc.id} {...cardProps(doc)} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {group.documents.map((doc) => {
                    const findings = model.findingsByDoc.get(doc.id) ?? []
                    return (
                      <DocumentRow
                        key={doc.id}
                        label={labelOf(doc)}
                        metaLabel={`${td(`visa-domain:documentCategory.${doc.category}`)} · ${td(
                          `visa-domain:ownerType.${doc.ownerType}`
                        )}`}
                        statusLabel={td(
                          `visa-domain:documentStatus.${doc.status}`
                        )}
                        statusTone={
                          DOCUMENT_STATUS_TONE[doc.status] ?? 'neutral'
                        }
                        findingCount={findings.length}
                        openLabel={t('documents:card.open')}
                        onOpen={() => openDoc(doc.id)}
                        selected={selectedDocId === doc.id}
                      />
                    )
                  })}
                </div>
              )}
            </DocumentGroup>
          ))}
        </div>
      )}

      <DocumentDetailPanel
        document={selectedDoc}
        findings={
          selectedDoc ? (model.findingsByDoc.get(selectedDoc.id) ?? []) : []
        }
        template={template}
        countryCode={countryCode}
        open={selectedDoc !== null}
        onOpenChange={(open) => {
          if (!open) closeDoc()
        }}
      />

      <AddDocumentDialog
        key={addKey}
        open={addOpen}
        onOpenChange={setAddOpen}
        availableRequirements={missingRequirements}
        ownerId={ownerId}
      />

      <TemplateSyncDialog
        open={syncOpen}
        onOpenChange={setSyncOpen}
        plan={syncPlan}
        ownerId={ownerId}
      />
    </PageBody>
  )
}
