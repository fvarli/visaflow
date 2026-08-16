import { Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme, type Theme } from '@/app/providers/ThemeProvider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

/**
 * Labels are translation keys, not literals. This menu shipped with hardcoded
 * English ("Light" / "Dark" / "System") in a Turkish-default product; the
 * `theme.*` keys already existed in both locales and were simply never wired
 * up.
 */
const OPTIONS = [
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
  { value: 'system', labelKey: 'theme.system', icon: Monitor },
] as const satisfies readonly {
  value: Theme
  labelKey: string
  icon: typeof Sun
}[]

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { t } = useTranslation('common')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t('theme.change')}>
          {resolvedTheme === 'dark' ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setTheme(option.value)}
            className={cn(
              'gap-2',
              theme === option.value && 'text-foreground font-medium'
            )}
          >
            <option.icon className="size-4 opacity-70" />
            {t(option.labelKey)}
            {theme === option.value && (
              <span
                aria-hidden
                className="ml-auto size-1.5 rounded-full bg-primary"
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
