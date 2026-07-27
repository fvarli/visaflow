import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { LOCALE_LABELS } from '@/components/ui/language-select'
import { useLocale } from '@/app/providers/LocaleProvider'
import { SUPPORTED_LOCALES, type Locale } from '@/i18n'
import { SettingRow } from './SettingRow'

/**
 * Language — the interface locale as a segmented control (Türkçe / English),
 * each shown in its own language. Turkish is the default; stored values and
 * exported JSON never change with language.
 */
export function LanguageSection() {
  const { t } = useTranslation('settings')
  const { locale, setLocale } = useLocale()

  return (
    <SettingRow
      label={t('language.label')}
      description={t('language.hint')}
      control={
        <SegmentedControl<Locale>
          ariaLabel={t('language.label')}
          value={locale}
          onValueChange={setLocale}
          options={SUPPORTED_LOCALES.map((l) => ({
            value: l,
            label: LOCALE_LABELS[l],
          }))}
        />
      }
    />
  )
}
