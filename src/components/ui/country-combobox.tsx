import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useLocale } from '@/app/providers/LocaleProvider'
import { getCountryName, searchCountries } from '@/lib/countries'
import { cn } from '@/lib/utils'

interface CountryComboboxProps {
  /** ISO 3166-1 alpha-2 code, or '' for no selection. */
  value: string
  onValueChange: (code: string) => void
  /** Accessible name for the control (field context). */
  ariaLabel: string
  id?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * A searchable country selector: search by localized name or ISO code, display
 * the localized name, persist the stable ISO code. Built on Popover + a filtered
 * listbox (no new dependency). Keyboard: open, type to filter, ↑/↓ to move,
 * Enter to select, Esc to close; a clear control resets the selection.
 */
export function CountryCombobox({
  value,
  onValueChange,
  ariaLabel,
  id,
  placeholder,
  disabled,
  className,
}: CountryComboboxProps) {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [activeIndex, setActiveIndex] = React.useState(0)
  const listboxId = React.useId()

  const options = React.useMemo(
    () => searchCountries(query, locale),
    [query, locale]
  )

  const onQueryChange = (next: string) => {
    setQuery(next)
    setActiveIndex(0)
  }

  const selectedName = value ? getCountryName(value, locale) : ''

  const select = (code: string) => {
    onValueChange(code)
    setOpen(false)
    setQuery('')
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = options[activeIndex]
      if (option) select(option.code)
    }
  }

  const activeOptionId =
    options.length > 0
      ? `${listboxId}-${options[activeIndex]?.code}`
      : undefined

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <div className={cn('relative', className)}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'border-input bg-card ring-offset-background flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <span
            className={cn('truncate', !selectedName && 'text-muted-foreground')}
          >
            {selectedName || placeholder || t('countryCombobox.placeholder')}
          </span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0 opacity-70" />
        </PopoverTrigger>
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onValueChange('')}
            aria-label={t('countryCombobox.clear')}
            className="text-muted-foreground hover:text-foreground absolute end-7 top-1/2 -translate-y-1/2 rounded-sm p-2"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[14rem] p-0"
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search
            aria-hidden
            className="text-muted-foreground size-4 shrink-0"
          />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            aria-label={t('countryCombobox.search')}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('countryCombobox.search')}
            className="placeholder:text-muted-foreground h-10 w-full bg-transparent text-sm outline-hidden"
          />
        </div>
        {options.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">
            {t('countryCombobox.empty')}
          </p>
        ) : (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-60 overflow-y-auto p-1"
          >
            {options.map((option, index) => {
              const selected = option.code === value
              const active = index === activeIndex
              return (
                <li key={option.code}>
                  <button
                    id={`${listboxId}-${option.code}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => select(option.code)}
                    onMouseMove={() => setActiveIndex(index)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                      active && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <span className="truncate">{option.name}</span>
                    {selected && (
                      <Check className="text-primary size-4 shrink-0" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
