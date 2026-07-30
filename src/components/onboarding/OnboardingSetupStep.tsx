import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { LOCALE_LABELS } from '@/components/ui/language-select'
import { CountryCombobox } from '@/components/ui/country-combobox'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/app/providers/LocaleProvider'
import { SUPPORTED_LOCALES, type Locale } from '@/i18n'

/**
 * Step two: the interface language (live switching, persisted only as the
 * non-personal locale preference) and the destination country. Both are calm,
 * changeable-later choices; the honest note makes clear which pack actually
 * ships today. Reuses the same primitives as the Settings and wizard surfaces.
 */
export function OnboardingSetupStep({
  country,
  onCountryChange,
  onContinue,
}: {
  country: string
  onCountryChange: (code: string) => void
  onContinue: () => void
}) {
  const { t } = useTranslation('onboarding')
  const { locale, setLocale } = useLocale()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-body text-foreground font-medium">
          {t('setup.languageLabel')}
        </p>
        <p className="text-caption text-muted-foreground">
          {t('setup.languageHint')}
        </p>
        <SegmentedControl<Locale>
          ariaLabel={t('setup.languageLabel')}
          value={locale}
          onValueChange={setLocale}
          options={SUPPORTED_LOCALES.map((l) => ({
            value: l,
            label: LOCALE_LABELS[l],
          }))}
        />
      </div>

      <div className="space-y-2">
        <p className="text-body text-foreground font-medium">
          {t('setup.destinationLabel')}
        </p>
        <p className="text-caption text-muted-foreground">
          {t('setup.destinationHint')}
        </p>
        <CountryCombobox
          value={country}
          onValueChange={onCountryChange}
          ariaLabel={t('setup.destinationLabel')}
          className="sm:max-w-sm"
        />
      </div>

      <GuidanceNote tone="info">{t('setup.availablePack')}</GuidanceNote>

      <Button onClick={onContinue}>
        {t('actions.continue')}
        <ArrowRight />
      </Button>
    </div>
  )
}
