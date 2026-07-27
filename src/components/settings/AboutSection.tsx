import { useTranslation } from 'react-i18next'
import { DataList, DataListItem } from '@/components/ui/data-list'
import { useSettingsModel } from '@/features/settings/settings-model'

/**
 * About — the honest facts: name, version (single-sourced from package.json via
 * the model), dossier schema version, the vision one-liner, and the license.
 */
export function AboutSection() {
  const { t } = useTranslation('settings')
  const { about } = useSettingsModel()

  return (
    <div className="flex flex-col gap-5">
      <DataList>
        <DataListItem label={t('about.version')} value={about.version} mono />
        <DataListItem
          label={t('about.schemaVersion')}
          value={about.schemaVersion}
          mono
        />
      </DataList>
      <p className="text-body text-muted-foreground text-pretty">
        {t('about.vision')}
      </p>
      <p className="text-body text-muted-foreground">{t('about.summary')}</p>
      <p className="text-caption text-muted-foreground">{t('about.license')}</p>
    </div>
  )
}
