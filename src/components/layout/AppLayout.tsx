import { useState, useCallback, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Footer } from './Footer'
import { MobileNav } from './MobileNav'
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
import { AlertCircle, Upload, FileJson } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importWarnings, setImportWarnings] = useState<string[]>([])
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

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          onImportClick={handleImportClick}
          onExportClick={handleExport}
        />
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        onImportClick={handleImportClick}
        onExportClick={handleExport}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setMobileNavOpen(true)}
          onSave={handleExport}
        />

        <main className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full">
            <div className="container max-w-5xl py-6 px-4 md:px-6">
              <Outlet />
            </div>
          </ScrollArea>
        </main>

        <Footer />
      </div>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
            <DialogDescription>
              Import your visa application data from a JSON file. Your data
              remains in browser memory only.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Privacy warning */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Imported data is stored only in browser memory. Export your
                dossier to save changes.
              </AlertDescription>
            </Alert>

            {/* File upload */}
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
                <Upload className="mr-2 h-4 w-4" />
                Choose JSON File
              </Button>
            </div>

            {/* Load example data */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--background)] px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={handleLoadExample}
            >
              <FileJson className="mr-2 h-4 w-4" />
              Load Example Data
            </Button>

            {/* Errors */}
            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {importErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {importWarnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
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
