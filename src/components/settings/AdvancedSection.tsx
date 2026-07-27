import { useTranslation } from 'react-i18next'
import { DataList, DataListItem } from '@/components/ui/data-list'
import { useSettingsModel } from '@/features/settings/settings-model'

/**
 * Advanced — developer-oriented details, tucked away in its own section so
 * normal users never trip over jargon: the dossier schema version and the exact
 * (non-personal) local-storage keys VisaFlow writes.
 */
export function AdvancedSection() {
  const { t } = useTranslation('settings')
  const { about, localData } = useSettingsModel()

  return (
    <div className="flex flex-col gap-5">
      <DataList>
        <DataListItem
          label={t('advanced.schemaVersion')}
          value={about.schemaVersion}
          mono
        />
        <DataListItem
          label={t('advanced.storageKeys')}
          value={localData.storageKeys.join(', ')}
          mono
        />
      </DataList>
      <p className="text-caption text-muted-foreground text-pretty">
        {t('advanced.storageNote')}
      </p>
    </div>
  )
}
