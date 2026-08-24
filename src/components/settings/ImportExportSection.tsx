import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileDown, FileUp, FlaskConical } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { Button } from '@/components/ui/button'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { Separator } from '@/components/ui/separator'
import {
  downloadDossier,
  importPartial,
  readFileAsText,
  type PartialDossierImport,
} from '@/features/import-export/services'

/**
 * Import & export — the dossier's JSON in/out, framed as backup & restore. Each
 * action explains exactly what happens. Reuses the existing services unchanged
 * (no format change); importing/replacing is isolated behind a confirmation when
 * a dossier is already loaded, and errors/warnings are surfaced honestly.
 */
export function ImportExportSection() {
  const { t } = useTranslation(['settings', 'common'])
  const { state, hasData } = useDossier()
  const { adoptImported, noteExported } = useWorkspace()
  const fileRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const doLoad = async (data: PartialDossierImport, warnings: string[]) => {
    // Additive: importing adds a dossier to the workspace rather than replacing
    // the open one, so nothing can be lost by importing (ADR-036).
    await adoptImported({
      applicant: data.applicant ?? null,
      application: data.application ?? null,
      documents: data.documents ?? [],
      sponsors: data.sponsors ?? [],
    })
    setFeedback(
      warnings.length > 0
        ? t('importExport.warningsTitle')
        : t('importExport.importSuccess')
    )
  }

  /**
   * No "replace what is open?" gate any more: an import adds a dossier to the
   * workspace instead of overwriting one, so there is nothing left to destroy
   * and nothing to warn about (ADR-036).
   */
  const apply = (result: ReturnType<typeof importPartial>) => {
    if (!result.success || !result.data) {
      setFeedback(t('importExport.importError'))
      return
    }
    void doLoad(result.data, result.warnings ?? [])
  }

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setFeedback(null)
    apply(importPartial(await readFileAsText(file)))
  }

  const handleExport = () => {
    downloadDossier(
      state.applicant,
      state.application,
      state.documents,
      state.sponsors
    )
    void noteExported()
    setFeedback(null)
  }

  const handleLoadExample = async () => {
    setFeedback(null)
    const mod = await import('@/data/examples/example-dossier.json')
    apply(importPartial(JSON.stringify(mod.default)))
  }

  return (
    <div className="flex flex-col gap-6">
      {feedback && <GuidanceNote tone="neutral">{feedback}</GuidanceNote>}

      <div className="flex flex-col gap-1.5">
        <h3 className="text-body text-foreground font-medium">
          {t('importExport.exportTitle')}
        </h3>
        <p className="text-caption text-muted-foreground text-pretty">
          {t('importExport.exportBody')}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-1 self-start"
          onClick={handleExport}
          disabled={!hasData}
        >
          <FileDown />
          {t('importExport.exportAction')}
        </Button>
        {!hasData && (
          <p className="text-caption text-muted-foreground">
            {t('importExport.nothingToExport')}
          </p>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-1.5">
        <h3 className="text-body text-foreground font-medium">
          {t('importExport.importTitle')}
        </h3>
        <p className="text-caption text-muted-foreground text-pretty">
          {t('importExport.importBody')}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-1 self-start"
          onClick={() => fileRef.current?.click()}
        >
          <FileUp />
          {t('importExport.importAction')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-1.5">
        <h3 className="text-body text-foreground font-medium">
          {t('importExport.exampleTitle')}
        </h3>
        <p className="text-caption text-muted-foreground text-pretty">
          {t('importExport.exampleBody')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 self-start"
          onClick={handleLoadExample}
        >
          <FlaskConical />
          {t('importExport.exampleAction')}
        </Button>
      </div>
    </div>
  )
}
