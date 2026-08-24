import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FilePlus2, FileUp, FlaskConical } from 'lucide-react'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { SegmentedControl } from '@/components/ui/segmented-control'
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
  const { t } = useTranslation(['onboarding', 'visa-domain', 'common'])
  const { t: tw } = useTranslation('workspace')
  const td = dynamicT(t)
  const { createDossier, adoptImported, status } = useWorkspace()
  const [sessionOnly, setSessionOnly] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const countryLabel = td(`visa-domain:countries.${country}`, {
    defaultValue: country,
  })

  const handleCreate = async () => {
    await createDossier(country, sessionOnly)
    onCreated()
  }

  const load = async (result: ReturnType<typeof importPartial>) => {
    if (!result.success || !result.data) {
      setError(t('create.importError'))
      return
    }
    // Additive by design: an import always becomes a new saved dossier and
    // never overwrites one that already exists (see ADR-036).
    const imported = await adoptImported(
      {
        applicant: result.data.applicant ?? null,
        application: result.data.application ?? null,
        documents: result.data.documents ?? [],
        sponsors: result.data.sponsors ?? [],
      },
      sessionOnly,
      // What the file lost is reported by the workspace, not here: importing
      // swaps the dossier, which remounts this step (ADR-041).
      result.omitted ?? 0
    )
    // Blocked by the leave guard: advancing to "Ready" would announce a dossier
    // that does not exist yet.
    if (!imported) {
      setError(t('common:import.blocked'))
      return
    }
    onCreated()
  }

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    await load(importPartial(await readFileAsText(file)))
  }

  const handleExample = async () => {
    setError(null)
    const mod = await import('@/data/examples/example-dossier.json')
    await load(importPartial(JSON.stringify(mod.default)))
  }

  return (
    <div className="space-y-6">
      {error && <GuidanceNote tone="info">{error}</GuidanceNote>}

      {/* Where this dossier lives. Saving is the default because losing work on
          refresh was the single biggest complaint about v1.0; session-only
          exists because a shared or library computer is a real situation and a
          saved passport number outliving the session is a privacy regression. */}
      {status !== 'unavailable' && (
        <div className="flex flex-col gap-1.5">
          <p className="text-eyebrow text-muted-foreground uppercase">
            {tw('mode.legend')}
          </p>
          <SegmentedControl<'save' | 'session'>
            ariaLabel={tw('mode.legend')}
            value={sessionOnly ? 'session' : 'save'}
            onValueChange={(next) => setSessionOnly(next === 'session')}
            options={[
              { value: 'save', label: tw('mode.save') },
              { value: 'session', label: tw('mode.session') },
            ]}
          />
          <p className="text-caption text-muted-foreground text-pretty">
            {sessionOnly ? tw('mode.sessionHint') : tw('mode.saveHint')}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <h3 className="text-body text-foreground font-medium">
          {t('create.createTitle')}
        </h3>
        <p className="text-caption text-muted-foreground text-pretty">
          {t('create.createBody', { country: countryLabel })}
        </p>
        <Button className="mt-1 self-start" onClick={() => void handleCreate()}>
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
