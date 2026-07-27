import { useTranslation } from 'react-i18next'
import { Sun, Moon, Monitor } from 'lucide-react'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useTheme, type Theme } from '@/app/providers/ThemeProvider'
import { SettingRow } from './SettingRow'

/**
 * Appearance — theme as a visible segmented control (Light / Dark / System)
 * rather than a hidden dropdown, with fully localized labels.
 */
export function AppearanceSection() {
  const { t } = useTranslation('settings')
  const { theme, setTheme } = useTheme()

  return (
    <SettingRow
      label={t('appearance.themeLabel')}
      description={t('appearance.themeHint')}
      control={
        <SegmentedControl<Theme>
          ariaLabel={t('appearance.themeLabel')}
          value={theme}
          onValueChange={setTheme}
          options={[
            { value: 'light', label: t('appearance.theme.light'), icon: Sun },
            { value: 'dark', label: t('appearance.theme.dark'), icon: Moon },
            {
              value: 'system',
              label: t('appearance.theme.system'),
              icon: Monitor,
            },
          ]}
        />
      }
    />
  )
}
