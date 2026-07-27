import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { SettingsSectionId } from '@/features/settings/settings-model'

interface SettingsNavProps {
  sections: readonly SettingsSectionId[]
  current: SettingsSectionId
  onSelect: (id: SettingsSectionId) => void
}

/**
 * The Settings section navigator — a calm vertical rail on desktop, a
 * horizontally-scrollable selector on mobile. Keyboard-operable (native buttons)
 * with `aria-current="page"` on the active section; hierarchy comes from surface
 * contrast, not heavy borders.
 */
export function SettingsNav({ sections, current, onSelect }: SettingsNavProps) {
  const { t } = useTranslation('settings')

  return (
    <nav
      aria-label={t('title')}
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {sections.map((id) => {
        const active = id === current
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'text-body rounded-md px-3 py-2 text-left font-medium whitespace-nowrap transition-colors',
              active
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            )}
          >
            {t(`nav.${id}`)}
          </button>
        )
      })}
    </nav>
  )
}
