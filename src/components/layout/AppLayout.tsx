import { useState, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  SCHEMA_VERSION,
  isSupportedSchemaVersion,
} from '@/domain/schemas/dossier.schema'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Footer } from './Footer'
import { MobileNav } from './MobileNav'
import { SkipLink } from './SkipLink'
import { useDocumentTitle } from './use-document-title'
import { WorkspaceNotice } from './WorkspaceNotice'
import { SessionLeaveDialog } from './SessionLeaveDialog'
import { useDossier } from '@/app/providers/DossierProvider'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { resolveVisaTemplate } from '@/config/countries'
import { downloadDossier } from '@/features/import-export/services/export.service'
import {
  importPartial,
  readFileAsText,
} from '@/features/import-export/services/import.service'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Upload, FileJson, ShieldCheck } from 'lucide-react'

export function AppLayout() {
  const { t } = useTranslation('common')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  /**
   * One translated sentence about what actually happened, above the technical
   * detail. The list below is Zod's — untranslated paths and messages, useful to
   * someone repairing a file by hand and useless to everyone else. Before this,
   * that list *was* the only report, so a Turkish user restoring a backup with
   * one bad document got English field paths and no count (ADR-041).
   */
  const [importSummary, setImportSummary] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { state } = useDossier()
  const { adoptImported, noteExported } = useWorkspace()
  useDocumentTitle()

  const handleExport = useCallback(() => {
    downloadDossier(
      state.applicant,
      state.application,
      state.documents,
      state.sponsors
    )
    // Record the export against the saved record, so "backed up" survives a
    // reload instead of living in a reducer field that a refresh forgets.
    void noteExported()
  }, [state, noteExported])

  const handleImportClick = useCallback(() => {
    setImportErrors([])
    setImportWarnings([])
    setImportSummary(null)
    setImportDialogOpen(true)
  }, [])

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const content = await readFileAsText(file)
        const result = importPartial(content)

        if (result.errors && result.errors.length > 0) {
          setImportErrors(result.errors.map((e) => `${e.path}: ${e.message}`))
        }

        // Translated from the versions themselves rather than from the English
        // sentence the service composes — that string is a diagnostic, not copy.
        //
        // Keyed on *readable*, not on *identical*: this build reads 1.0.0 and
        // 1.1.0 alike, so telling someone their older export is a version
        // mismatch would be false alarm (ADR-043).
        const found = result.data?.schemaVersion
        if (found && !isSupportedSchemaVersion(found)) {
          setImportWarnings([
            t('import.versionNote', { found, expected: SCHEMA_VERSION }),
          ])
        }

        if (result.success && result.data) {
          // Additive: a file becomes a new saved dossier, never a replacement
          // for whatever happens to be open (ADR-036).
          const imported = await adoptImported(
            {
              applicant: result.data.applicant ?? null,
              application: result.data.application ?? null,
              documents: result.data.documents ?? [],
              sponsors: result.data.sponsors ?? [],
            },
            false,
            // Reported by the workspace above the page, because a successful
            // import remounts everything below it (ADR-041).
            result.omitted ?? 0
          )

          if (imported) setImportDialogOpen(false)
          else setImportSummary(t('import.blocked'))
        }
      } catch (error) {
        setImportErrors([
          error instanceof Error
            ? error.message
            : t('importDialog.failedToRead'),
        ])
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [adoptImported, t]
  )

  const handleLoadExample = useCallback(async () => {
    try {
      // Load example data from bundled JSON
      const exampleData = await import('@/data/examples/example-dossier.json')
      const result = importPartial(JSON.stringify(exampleData.default))

      if (result.success && result.data) {
        // Additive: a file becomes a new saved dossier, never a replacement for
        // whatever happens to be open (ADR-036).
        const imported = await adoptImported(
          {
            applicant: result.data.applicant ?? null,
            application: result.data.application ?? null,
            documents: result.data.documents ?? [],
            sponsors: result.data.sponsors ?? [],
          },
          false,
          result.omitted ?? 0
        )
        if (imported) setImportDialogOpen(false)
        else setImportSummary(t('import.blocked'))
      }
    } catch {
      setImportErrors([t('importDialog.failedExample')])
    }
  }, [adoptImported, t])

  // The Documents nav badge shows the canonical outstanding count — the same
  // number the rings and the "remaining" phrasing use. It must pass the
  // country pack's required requirements: without them the badge counted only
  // instantiated records and showed 3 while every page body showed 4 (ADR-034).
  const navCounts = useMemo(() => {
    const template = resolveVisaTemplate(
      state.application?.destinationCountry,
      state.application?.visaType
    )
    return {
      outstandingDocuments: buildDocumentReadiness({
        documents: state.documents,
        requiredRequirementCodes: requiredRequirementCodes(
          template,
          state.application
        ),
      }).outstanding,
    }
  }, [state.documents, state.application])

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setScrolled(event.currentTarget.scrollTop > 4)
  }, [])

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <SkipLink />

      <div className="hidden lg:block">
        <Sidebar
          onImportClick={handleImportClick}
          onExportClick={handleExport}
          counts={navCounts}
        />
      </div>

      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        onImportClick={handleImportClick}
        onExportClick={handleExport}
        counts={navCounts}
      />

      {/* One scroll owner. The previous layout nested a ScrollArea inside an
          already-overflow-y-auto <main>, which produced two competing scroll
          containers and a sticky header that could not work. */}
      <main
        id="main"
        // Programmatically focusable, never a tab stop. Without this the skip
        // link moved the viewport but not focus, and any overlay naming `#main`
        // as its focus fallback silently did nothing — `.focus()` on a element
        // that cannot hold focus leaves it on <body> (ADR-035).
        tabIndex={-1}
        onScroll={handleScroll}
        className="scrollbar-subtle flex flex-1 flex-col overflow-y-auto"
      >
        <Header
          onMenuClick={() => setMobileNavOpen(true)}
          onSave={handleExport}
          scrolled={scrolled}
        />

        <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-10 px-5 py-8 md:px-8 md:py-10">
          <div className="flex-1">
            {/* Above the page, not inside it: these are about the whole open
                dossier, so they must be visible from wherever you were. */}
            <WorkspaceNotice onExport={handleExport} />
            {/* Remount the page when the whole dossier is swapped — switching
                dossiers, or reloading one after a cross-tab conflict. Forms
                read their initial values at mount, so without this the fields
                on screen would still be the previous dossier's. */}
            <Outlet key={state.generation} />
          </div>
          <Footer />
        </div>
      </main>

      <SessionLeaveDialog />

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('importDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('importDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="info">
              <ShieldCheck />
              <AlertDescription>{t('privacy.memoryOnly')}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload />
                {t('importDialog.chooseFile')}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="text-eyebrow relative flex justify-center uppercase">
                <span className="bg-popover text-muted-foreground px-2">
                  {t('importDialog.or')}
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={handleLoadExample}
            >
              <FileJson />
              {t('importDialog.loadExample')}
            </Button>

            {importSummary && (
              <Alert variant="warning" role="status" aria-atomic="true">
                <AlertCircle />
                <AlertDescription>{importSummary}</AlertDescription>
              </Alert>
            )}

            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>
                  <ul className="list-inside list-disc space-y-1">
                    {importErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {importWarnings.length > 0 && (
              <Alert variant="warning">
                <AlertCircle />
                <AlertDescription>
                  <ul className="list-inside list-disc space-y-1">
                    {importWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
