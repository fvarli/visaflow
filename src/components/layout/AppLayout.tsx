import { useState, useCallback, useRef, useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Footer } from './Footer'
import { MobileNav } from './MobileNav'
import { SkipLink } from './SkipLink'
import { useDossier } from '@/app/providers/DossierProvider'
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const [scrolled, setScrolled] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { state, loadDossier, markSaved } = useDossier()

  const handleExport = useCallback(() => {
    downloadDossier(
      state.applicant,
      state.application,
      state.documents,
      state.sponsors
    )
    markSaved()
  }, [state, markSaved])

  const handleImportClick = useCallback(() => {
    setImportErrors([])
    setImportWarnings([])
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

        if (result.warnings && result.warnings.length > 0) {
          setImportWarnings(result.warnings)
        }

        if (result.success && result.data) {
          loadDossier({
            applicant: result.data.applicant,
            application: result.data.application,
            documents: result.data.documents ?? [],
            sponsors: result.data.sponsors ?? [],
          })

          if (!result.errors || result.errors.length === 0) {
            setImportDialogOpen(false)
          }
        }
      } catch (error) {
        setImportErrors([
          error instanceof Error ? error.message : 'Failed to read file',
        ])
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [loadDossier]
  )

  const handleLoadExample = useCallback(async () => {
    try {
      // Load example data from bundled JSON
      const exampleData = await import('@/data/examples/example-dossier.json')
      const result = importPartial(JSON.stringify(exampleData.default))

      if (result.success && result.data) {
        loadDossier({
          applicant: result.data.applicant,
          application: result.data.application,
          documents: result.data.documents ?? [],
          sponsors: result.data.sponsors ?? [],
        })
        setImportDialogOpen(false)
      }
    } catch {
      setImportErrors(['Failed to load example data'])
    }
  }, [loadDossier])

  // Cheap derived count for the Documents nav row.
  const navCounts = useMemo(
    () => ({
      missingDocuments: state.documents.filter(
        (doc) =>
          doc.required &&
          (doc.status === 'not_started' || doc.status === 'requested')
      ).length,
    }),
    [state.documents]
  )

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
            <Outlet />
          </div>
          <Footer />
        </div>
      </main>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import data</DialogTitle>
            <DialogDescription>
              Load a dossier from a JSON file you exported earlier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="info">
              <ShieldCheck />
              <AlertDescription>
                Imported data stays in browser memory only. Export again to save
                any changes you make.
              </AlertDescription>
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
                Choose JSON file
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="text-eyebrow relative flex justify-center uppercase">
                <span className="bg-popover text-muted-foreground px-2">
                  Or
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={handleLoadExample}
            >
              <FileJson />
              Load example data
            </Button>

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
