import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { PageBody } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import type { SavedDossierSummary } from '@/features/workspace/saved-dossier'
import { useFormatters } from '@/lib/format'

/**
 * The workspace home: every dossier saved in this browser.
 *
 * Deliberately calm — a list, an open action, a delete behind a confirmation.
 * The header switcher answers "which dossier am I in and how do I change it";
 * this page owns the heavier management so that dropdown never has to.
 */
export default function DossiersPage() {
  const { t } = useTranslation(['workspace', 'common'])
  const format = useFormatters()
  const navigate = useNavigate()
  const { summaries, activeId, openDossier, deleteDossier } = useWorkspace()

  const [pendingDelete, setPendingDelete] =
    useState<SavedDossierSummary | null>(null)

  // Deleting a dossier destroys the row that opened the dialog, so name an
  // explicit destination rather than letting focus fall to <body> (ADR-035).
  const listRef = useRef<HTMLDivElement | null>(null)
  const focusAfterDelete = useCallback(() => listRef.current, [])

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    setPendingDelete(null)
    await deleteDossier(id)
  }

  return (
    <PageBody>
      <PageHeader
        title={t('workspace:title')}
        description={t('workspace:description')}
        actions={
          <Button
            size="sm"
            onClick={() => void navigate('/welcome?step=create')}
          >
            <Plus />
            {t('workspace:switcher.create')}
          </Button>
        }
      />

      {summaries.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t('workspace:empty.title')}
          description={t('workspace:empty.description')}
          action={
            <Button onClick={() => void navigate('/welcome')}>
              <Plus />
              {t('workspace:empty.action')}
            </Button>
          }
        />
      ) : (
        <div
          ref={listRef}
          tabIndex={-1}
          className="grid gap-4 outline-none lg:grid-cols-2"
        >
          {summaries.map((summary) => (
            <Card key={summary.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-body text-foreground font-semibold">
                    {summary.title}
                  </h2>
                  {summary.id === activeId && (
                    <StatusBadge tone="accent">
                      {t('workspace:card.current')}
                    </StatusBadge>
                  )}
                  {summary.unreadable && (
                    <StatusBadge tone="warning">
                      {t('workspace:card.unreadable')}
                    </StatusBadge>
                  )}
                </div>

                {summary.unreadable ? (
                  <GuidanceNote tone="neutral">
                    {t('workspace:card.unreadableHint')}
                  </GuidanceNote>
                ) : (
                  <p className="text-caption text-muted-foreground">
                    {t('workspace:card.documents', {
                      count: summary.documentCount,
                    })}
                    {' · '}
                    {t('workspace:card.updated', {
                      date: format.dateShort(summary.updatedAt),
                    })}
                    {' · '}
                    {summary.lastExportedAt
                      ? t('workspace:card.lastExported', {
                          date: format.dateShort(summary.lastExportedAt),
                        })
                      : t('workspace:card.neverExported')}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={summary.unreadable || summary.id === activeId}
                    aria-label={t('workspace:card.openAria', {
                      name: summary.title,
                    })}
                    onClick={() => void openDossier(summary.id)}
                  >
                    {t('workspace:card.open')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('workspace:card.deleteAria', {
                      name: summary.title,
                    })}
                    onClick={() => setPendingDelete(summary)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent restoreFocusFallback={focusAfterDelete}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('workspace:remove.title', {
                name: pendingDelete?.title ?? '',
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('workspace:remove.body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('workspace:remove.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              {t('workspace:remove.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageBody>
  )
}
