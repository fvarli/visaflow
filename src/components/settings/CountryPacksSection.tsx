import { useTranslation } from 'react-i18next'
import { Package } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { CountryCombobox } from '@/components/ui/country-combobox'
import { StatusBadge } from '@/components/ui/status-badge'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { ReviewStatusBadge, SourceNote } from '@/components/ui/source-note'
import { dynamicT } from '@/lib/i18n-dynamic'
import { useSettingsModel } from '@/features/settings/settings-model'
import { SettingRow } from './SettingRow'

/**
 * Country packs — a scale-ready, read-only view of the visa-requirement packs
 * available in VisaFlow, each with its honest review status and sources (via the
 * shared `ReviewStatusBadge`/`SourceNote`, never implying official endorsement).
 * The active destination stays editable here (reusing `updateApplication`), and
 * the active pack is clearly marked.
 */
export function CountryPacksSection() {
  const { t } = useTranslation(['settings', 'visa-domain'])
  const td = dynamicT(t)
  const { updateApplication } = useDossier()
  const model = useSettingsModel()

  return (
    <div className="flex flex-col gap-6">
      {model.localData.hasData ? (
        <SettingRow
          label={t('settings:countryPacks.activeLabel')}
          description={t('settings:countryPacks.activeHint')}
          control={
            <div className="w-full sm:w-72">
              <CountryCombobox
                value={model.active.countryCode ?? ''}
                ariaLabel={t('settings:countryPacks.activeLabel')}
                onValueChange={(code) =>
                  updateApplication({ destinationCountry: code })
                }
              />
            </div>
          }
        />
      ) : (
        <GuidanceNote tone="neutral">
          {t('settings:countryPacks.noDossier')}
        </GuidanceNote>
      )}

      {model.packs.length === 0 ? (
        <p className="text-body text-muted-foreground">
          {t('settings:countryPacks.empty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {model.packs.map((pack) => {
            const primary = pack.templates[0]
            return (
              <li
                key={pack.countryCode}
                className="bg-card flex flex-col gap-3 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-body text-foreground inline-flex items-center gap-2 font-medium">
                    <Package
                      aria-hidden
                      className="text-muted-foreground size-4"
                    />
                    {td(pack.nameKey)}
                  </span>
                  {pack.isActive && (
                    <StatusBadge tone="success" dot>
                      {t('settings:countryPacks.activeBadge')}
                    </StatusBadge>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-eyebrow text-muted-foreground uppercase">
                    {t('settings:countryPacks.supportedTypes')}
                  </span>
                  <ul className="flex flex-col gap-1.5">
                    {pack.templates.map((tpl) => (
                      <li
                        key={tpl.id}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <span className="text-body text-foreground">
                          {td(tpl.nameKey)}
                        </span>
                        <ReviewStatusBadge status={tpl.reviewStatus} />
                      </li>
                    ))}
                  </ul>
                </div>

                {primary && (
                  <p
                    className="text-caption text-muted-foreground"
                    data-numeric
                  >
                    {t('settings:countryPacks.version')}:{' '}
                    {primary.templateVersion}
                  </p>
                )}

                {pack.sources.length > 0 && primary && (
                  <SourceNote
                    sources={pack.sources}
                    reviewStatus={primary.reviewStatus}
                    lastReviewedAt={primary.lastReviewedAt}
                    coverage={pack.coverage ?? undefined}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-caption text-muted-foreground text-pretty">
        {t('settings:countryPacks.notEndorsed')}
      </p>
    </div>
  )
}
