import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react'
import { useTranslation } from 'react-i18next'
import i18n, {
  DEFAULT_LOCALE,
  INTL_LOCALES,
  LOCALE_STORAGE_KEY,
  isSupportedLocale,
  type Locale,
} from '@/i18n'

interface LocaleContextValue {
  /** Active UI language. Never anything but 'tr' or 'en'. */
  locale: Locale
  /** BCP 47 tag for Intl formatting, e.g. 'tr-TR'. */
  intlLocale: string
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { i18n: instance } = useTranslation('common')

  const locale: Locale = isSupportedLocale(instance.resolvedLanguage)
    ? instance.resolvedLanguage
    : DEFAULT_LOCALE

  // Keep the document in sync so assistive technology announces the right
  // language and the browser picks correct hyphenation rules.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    void i18n.changeLanguage(next)
    try {
      /**
       * Language preference only. Non-personal, so persisting it is
       * permitted — see ADR-006 and ADR-013. Dossier data must never be
       * written to storage.
       */
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      // Preference simply will not persist; the app still works.
    }
  }, [])

  const value = useMemo(
    () => ({ locale, intlLocale: INTL_LOCALES[locale], setLocale }),
    [locale, setLocale]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}
