import { useTranslation } from 'react-i18next'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { Separator } from '@/components/ui/separator'

/**
 * Privacy — reinforces that the dossier lives only in memory, that the only two
 * persisted values are non-personal (theme + language), and that nothing is
 * tracked or sent anywhere. Also carries the load-bearing honesty disclaimer
 * (no legal advice, and never a prediction — ADR-016).
 */
export function PrivacySection() {
  const { t } = useTranslation('settings')

  return (
    <div className="flex flex-col gap-6">
      <GuidanceNote tone="info">{t('privacy.inMemory')}</GuidanceNote>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-body text-foreground font-medium">
          {t('privacy.storedTitle')}
        </h3>
        <p className="text-body text-muted-foreground text-pretty">
          {t('privacy.storedBody')}
        </p>
      </div>

      <p className="text-body text-muted-foreground text-pretty">
        {t('privacy.noTracking')}
      </p>

      <Separator />

      <div className="flex flex-col gap-3">
        <h3 className="text-body text-foreground font-medium">
          {t('disclaimer.title')}
        </h3>
        <div className="text-body text-muted-foreground flex flex-col gap-3 text-pretty">
          <p>{t('disclaimer.p1')}</p>
          <p>{t('disclaimer.p2')}</p>
          <p>{t('disclaimer.p3')}</p>
          <p className="text-foreground/80">{t('disclaimer.noPrediction')}</p>
        </div>
      </div>
    </div>
  )
}
