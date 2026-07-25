import { useMemo } from 'react'
import { useLocale } from '@/app/providers/LocaleProvider'
import { INTL_LOCALES, type Locale } from '@/i18n'

/**
 * Country selection, one place.
 *
 * Dossier data persists ISO 3166-1 alpha-2 codes ONLY (see `CountryCodeSchema`);
 * display names are resolved at the UI boundary via the browser's built-in
 * `Intl.DisplayNames` — so nothing locale-formatted is ever stored and no
 * hand-maintained list of ~250 country names bloats the translation files.
 *
 * Components must not call `Intl.DisplayNames` directly — use `useCountryName`,
 * `getCountryName`, `getCountryOptions`, or `searchCountries` so locale mapping,
 * caching, and the unknown-code / no-Intl fallbacks live in exactly one place.
 */

/** Bundled, stable ISO 3166-1 alpha-2 list — the selectable set. Codes only. */
// prettier-ignore
export const COUNTRY_CODES: readonly string[] = [
  'AD','AE','AF','AG','AL','AM','AO','AR','AT','AU','AZ','BA','BB','BD','BE',
  'BF','BG','BH','BI','BJ','BN','BO','BR','BS','BT','BW','BY','BZ','CA','CD',
  'CF','CG','CH','CI','CL','CM','CN','CO','CR','CU','CV','CY','CZ','DE','DJ',
  'DK','DM','DO','DZ','EC','EE','EG','ER','ES','ET','FI','FJ','FM','FR','GA',
  'GB','GD','GE','GH','GM','GN','GQ','GR','GT','GW','GY','HN','HR','HT','HU',
  'ID','IE','IL','IN','IQ','IR','IS','IT','JM','JO','JP','KE','KG','KH','KI',
  'KM','KN','KP','KR','KW','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU',
  'LV','LY','MA','MC','MD','ME','MG','MH','MK','ML','MM','MN','MR','MT','MU',
  'MV','MW','MX','MY','MZ','NA','NE','NG','NI','NL','NO','NP','NR','NZ','OM',
  'PA','PE','PG','PH','PK','PL','PT','PW','PY','QA','RO','RS','RU','RW','SA',
  'SB','SC','SD','SE','SG','SI','SK','SL','SM','SN','SO','SR','SS','ST','SV',
  'SY','SZ','TD','TG','TH','TJ','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','US','UY','UZ','VA','VC','VE','VN','VU','WS','XK','YE','ZA','ZM',
  'ZW',
]

const displayNamesCache = new Map<Locale, Intl.DisplayNames | null>()

function getDisplayNames(locale: Locale): Intl.DisplayNames | null {
  if (displayNamesCache.has(locale))
    return displayNamesCache.get(locale) ?? null
  let instance: Intl.DisplayNames | null = null
  try {
    if (typeof Intl !== 'undefined' && 'DisplayNames' in Intl) {
      instance = new Intl.DisplayNames([INTL_LOCALES[locale]], {
        type: 'region',
      })
    }
  } catch {
    instance = null
  }
  displayNamesCache.set(locale, instance)
  return instance
}

/**
 * Localized country name for an ISO code. Falls back to the raw (upper-cased)
 * code for unknown/legacy codes or when `Intl.DisplayNames` is unavailable.
 */
export function getCountryName(code: string, locale: Locale): string {
  const upper = code.toUpperCase()
  const names = getDisplayNames(locale)
  if (!names) return upper
  try {
    return names.of(upper) ?? upper
  } catch {
    return upper
  }
}

export interface CountryOption {
  code: string
  name: string
}

const optionsCache = new Map<Locale, CountryOption[]>()

/** The full option list, localized and sorted by name for the active locale. */
export function getCountryOptions(locale: Locale): CountryOption[] {
  const cached = optionsCache.get(locale)
  if (cached) return cached
  const options = COUNTRY_CODES.map((code) => ({
    code,
    name: getCountryName(code, locale),
  })).sort((a, b) => a.name.localeCompare(b.name, INTL_LOCALES[locale]))
  optionsCache.set(locale, options)
  return options
}

/**
 * Fold a string for search: Turkish-aware, case- and diacritic-insensitive, so
 * "turkiye" matches "Türkiye" and "yunan" matches "Yunanistan".
 */
export function normalizeForSearch(value: string): string {
  return value
    .replace(/[ıİ]/g, 'i') // ı İ
    .replace(/[şŞ]/g, 's') // ş Ş
    .replace(/[ğĞ]/g, 'g') // ğ Ğ
    .replace(/[çÇ]/g, 'c') // ç Ç
    .replace(/[öÖ]/g, 'o') // ö Ö
    .replace(/[üÜ]/g, 'u') // ü Ü
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/** Filter country options by localized name or ISO code. Empty query → all. */
export function searchCountries(
  query: string,
  locale: Locale
): CountryOption[] {
  const options = getCountryOptions(locale)
  const q = normalizeForSearch(query)
  if (!q) return options
  const upper = query.trim().toUpperCase()

  const matches = options.filter(
    (option) =>
      normalizeForSearch(option.name).includes(q) ||
      option.code.toLowerCase().includes(q)
  )

  // Rank an exact ISO-code hit first, then code/name prefix, then the rest —
  // so typing "GR" surfaces Greece ahead of Grenada.
  const score = (option: CountryOption): number => {
    if (option.code === upper) return 0
    if (option.code.toLowerCase().startsWith(q)) return 1
    if (normalizeForSearch(option.name).startsWith(q)) return 2
    return 3
  }
  return matches.sort(
    (a, b) =>
      score(a) - score(b) || a.name.localeCompare(b.name, INTL_LOCALES[locale])
  )
}

/** Component hook: the localized name for a single code in the active locale. */
export function useCountryName(code: string | undefined | null): string {
  const { locale } = useLocale()
  return useMemo(
    () => (code ? getCountryName(code, locale) : ''),
    [code, locale]
  )
}
