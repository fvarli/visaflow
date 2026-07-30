import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FilePlus2, FileUp, FlaskConical } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { Button } from '@/components/ui/button'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { Separator } from '@/components/ui/separator'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  importPartial,
  readFileAsText,
} from '@/features/import-export/services'

/**
 * Step three: the one moment the user commits. Create a fresh dossier for the
 * chosen country, restore one from a JSON file, or load the fictional example.
 * Each path explains exactly what it does and reuses the existing import/export
 * services unchanged (no format change); on success the flow advances to Ready.
 * Nothing is uploaded — the file is read locally.
 */
export function OnboardingCreateStep({
  country,
  onCreated,
}: {
  country: string
  onCreated: () => void
}) {
  const { t } = useTranslation(['onboarding', 'visa-domain'])
  const td = dynamicT(t)
  const { initializeEmpty, loadDossier } = useDossier()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const countryLabel = td(`visa-domain:countries.${country}`, {
    defaultValue: country,
  })

  const handleCreate = () => {
    initializeEmpty(country)
    onCreated()
  }

  const load = (result: ReturnType<typeof importPartial>) => {
    if (!result.success || !result.data) {
      setError(t('create.importError'))
      return
    }
    loadDossier({
      applicant: result.data.applicant,
      application: result.data.application,
      documents: result.data.documents ?? [],
      sponsors: result.data.sponsors ?? [],
    })
    onCreated()
  }

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    load(importPartial(await readFileAsText(file)))
  }

  const handleExample = async () => {
    setError(null)
    const mod = await import('@/data/examples/example-dossier.json')
    load(importPartial(JSON.stringify(mod.default)))
  }

  return (
    <div className="space-y-6">
      {error && <GuidanceNote tone="info">{error}</GuidanceNote>}

      <div className="flex flex-col gap-1.5">
        <h3 className="text-body text-foreground font-medium">
          {t('create.createTitle')}
        </h3>
        <p className="text-caption text-muted-foreground text-pretty">
          {t('create.createBody', { country: countryLabel })}
        </p>
        <Button className="mt-1 self-start" onClick={handleCreate}>
          <FilePlus2 />
          {t('create.createAction')}
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-1.5">
        <h3 className="text-body text-foreground font-medium">
          {t('create.importTitle')}
        </h3>
        <p className="text-caption text-muted-foreground text-pretty">
          {t('create.importBody')}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-1 self-start"
          onClick={() => fileRef.current?.click()}
        >
          <FileUp />
          {t('create.importAction')}
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
          {t('create.exampleTitle')}
        </h3>
        <p className="text-caption text-muted-foreground text-pretty">
          {t('create.exampleBody')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 self-start"
          onClick={handleExample}
        >
          <FlaskConical />
          {t('create.exampleAction')}
        </Button>
      </div>
    </div>
  )
}
