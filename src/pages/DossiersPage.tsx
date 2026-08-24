import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  Download,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { PageBody } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
 * Inline title editing for one card.
 *
 * Mounted only while editing, so the draft resets naturally each time and no
 * abandoned text can leak into the next rename. Enter commits, Escape abandons,
 * and **blur does not commit**: clicking away from a half-typed name should
 * never quietly rename someone's dossier.
 */
function TitleEditor({
  summary,
  onDone,
}: {
  summary: SavedDossierSummary
  /** `null` cancels; a string commits it (empty restores the derived name). */
  onDone: (title: string | null) => void
}) {
  const { t } = useTranslation('workspace')
  const [draft, setDraft] = useState(summary.named ? summary.title : '')

  // A ref callback rather than `autoFocus`: this runs exactly once, on mount,
  // and selecting the text means typing replaces the old name immediately.
  const focusAndSelect = useCallback((node: HTMLInputElement | null) => {
    node?.focus()
    node?.select()
  }, [])

  const inputId = `rename-${summary.id}`

  return (
    <form
      className="flex w-full flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        onDone(draft)
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {t('rename.label')}
      </label>
      <Input
        id={inputId}
        ref={focusAndSelect}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onDone(null)
          }
        }}
        placeholder={t('rename.placeholder')}
        aria-describedby={`${inputId}-hint`}
        className="h-8 w-full min-w-40 flex-1 sm:w-auto"
      />
      <div className="flex items-center gap-1">
        <Button type="submit" size="sm" variant="outline">
          <Check />
          {t('rename.save')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onDone(null)}
        >
          <X />
          {t('rename.cancel')}
        </Button>
      </div>
      <p
        id={`${inputId}-hint`}
        className="text-caption text-muted-foreground w-full"
      >
        {t('rename.clearHint')} {t('rename.hint')}
      </p>
    </form>
  )
}

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
  const {
    summaries,
    activeId,
    openDossier,
    deleteDossier,
    renameDossier,
    exportDossier,
    exportRawRecord,
    sessionOnly,
  } = useWorkspace()

  const [pendingDelete, setPendingDelete] =
    useState<SavedDossierSummary | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)

  // Leaving edit mode replaces the input with a freshly mounted pencil, so the
  // button is looked up after that render rather than captured beforehand.
  const renameButtons = useRef(new Map<string, HTMLButtonElement | null>())
  const returnFocusTo = useRef<string | null>(null)
  useEffect(() => {
    if (renamingId !== null || !returnFocusTo.current) return
    renameButtons.current.get(returnFocusTo.current)?.focus()
    returnFocusTo.current = null
  }, [renamingId])

  const finishRename = useCallback(
    (id: string, title: string | null) => {
      returnFocusTo.current = id
      setRenamingId(null)
      if (title !== null) void renameDossier(id, title)
    },
    [renameDossier]
  )

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
          // With a session-only dossier open this page used to say "no saved
          // dossiers yet — start one and it will be saved here automatically",
          // which denied the dossier the user was editing.
          description={
            sessionOnly
              ? t('workspace:empty.sessionOnly')
              : t('workspace:empty.description')
          }
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
                {renamingId === summary.id ? (
                  <TitleEditor
                    summary={summary}
                    onDone={(title) => finishRename(summary.id, title)}
                  />
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1">
                      <h2 className="text-body text-foreground font-semibold">
                        {summary.title}
                      </h2>
                      {/* An unreadable record cannot be rewritten safely, so it
                          cannot be renamed either — better than a button that
                          silently does nothing. */}
                      {!summary.unreadable && (
                        <Button
                          ref={(node) => {
                            renameButtons.current.set(summary.id, node)
                          }}
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('workspace:rename.actionAria', {
                            name: summary.title,
                          })}
                          onClick={() => setRenamingId(summary.id)}
                        >
                          <Pencil />
                        </Button>
                      )}
                    </div>
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
                )}

                {summary.unreadable ? (
                  <GuidanceNote tone="neutral">
                    {t('workspace:card.unreadableHint')}{' '}
                    {t('workspace:backup.recoveryHint')}
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
                    {/* Backup freshness, derived from the record itself — this
                        line used to read "Never exported" forever, because
                        nothing ever wrote the timestamp behind it. */}
                    {summary.backup === 'never'
                      ? t('workspace:backup.never')
                      : summary.backup === 'fresh'
                        ? t('workspace:backup.freshAt', {
                            date: format.dateShort(
                              summary.lastExportedAt ?? ''
                            ),
                          })
                        : t('workspace:backup.staleAt', {
                            date: format.dateShort(
                              summary.lastExportedAt ?? ''
                            ),
                          })}
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
                  {/* Backing up dossier B must not require opening it and
                      abandoning dossier A, so this reads B's own record. */}
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={
                      summary.unreadable
                        ? t('workspace:backup.recoveryAria', {
                            name: summary.title,
                          })
                        : t('workspace:backup.actionAria', {
                            name: summary.title,
                          })
                    }
                    onClick={() =>
                      void (summary.unreadable
                        ? exportRawRecord(summary.id)
                        : exportDossier(summary.id))
                    }
                  >
                    <Download />
                    {summary.unreadable
                      ? t('workspace:backup.recovery')
                      : t('workspace:backup.action')}
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
              {pendingDelete?.unreadable
                ? t('workspace:remove.unreadableTitle')
                : t('workspace:remove.title', {
                    name: pendingDelete?.title ?? '',
                  })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {/* A record this build cannot read cannot be inspected first, and
                  its name is a placeholder — say so instead of asking "Delete
                  Untitled?" and hoping the user knows what they are losing. */}
              {pendingDelete?.unreadable
                ? t('workspace:remove.unreadableBody')
                : t('workspace:remove.body')}
              {pendingDelete?.id === activeId &&
                ` ${t('workspace:remove.activeNote')}`}
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
