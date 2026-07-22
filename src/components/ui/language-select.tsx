import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/app/providers/LocaleProvider'
import { SUPPORTED_LOCALES, type Locale } from '@/i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

/**
 * Language names are always written in their own language and never
 * abbreviated to a flag — a flag denotes a country, not a language, and would
 * leave the control meaningless to a screen reader.
 */
const LOCALE_LABELS: Record<Locale, string> = {
  tr: 'Türkçe',
  en: 'English',
}

export function LanguageSelect({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale()
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-1.5', className)}
          aria-label={`${t('language.change')}: ${LOCALE_LABELS[locale]}`}
        >
          <Languages aria-hidden className="opacity-70" />
          <span className="text-body">{LOCALE_LABELS[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {SUPPORTED_LOCALES.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={() => setLocale(option)}
            className={cn(
              'gap-2',
              locale === option && 'text-foreground font-medium'
            )}
          >
            {LOCALE_LABELS[option]}
            {locale === option && (
              <span
                aria-hidden
                className="bg-primary ml-auto size-1.5 rounded-full"
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { LOCALE_LABELS }
