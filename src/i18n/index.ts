import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import trCommon from './locales/tr/common.json'
import trNavigation from './locales/tr/navigation.json'
import trDashboard from './locales/tr/dashboard.json'
import trApplicant from './locales/tr/applicant.json'
import trTrip from './locales/tr/trip.json'
import trEmployment from './locales/tr/employment.json'
import trFinance from './locales/tr/finance.json'
import trSponsors from './locales/tr/sponsors.json'
import trDocuments from './locales/tr/documents.json'
import trTimeline from './locales/tr/timeline.json'
import trValidation from './locales/tr/validation.json'
import trNotes from './locales/tr/notes.json'
import trSettings from './locales/tr/settings.json'
import trPlayground from './locales/tr/playground.json'
import trVisaDomain from './locales/tr/visa-domain.json'

import enCommon from './locales/en/common.json'
import enNavigation from './locales/en/navigation.json'
import enDashboard from './locales/en/dashboard.json'
import enApplicant from './locales/en/applicant.json'
import enTrip from './locales/en/trip.json'
import enEmployment from './locales/en/employment.json'
import enFinance from './locales/en/finance.json'
import enSponsors from './locales/en/sponsors.json'
import enDocuments from './locales/en/documents.json'
import enTimeline from './locales/en/timeline.json'
import enValidation from './locales/en/validation.json'
import enNotes from './locales/en/notes.json'
import enSettings from './locales/en/settings.json'
import enPlayground from './locales/en/playground.json'
import enVisaDomain from './locales/en/visa-domain.json'

/**
 * Supported locales. Turkish first — see ADR-011.
 */
export const SUPPORTED_LOCALES = ['tr', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Turkish is the application default because the initial audience is in
 * Türkiye. Browser language is deliberately NOT consulted: a Turkish user on
 * an English-configured laptop must still land on Turkish (ADR-011).
 */
export const DEFAULT_LOCALE: Locale = 'tr'

/**
 * The ONLY key the i18n layer is permitted to write to localStorage.
 *
 * ADR-006 forbids localStorage for personal data but carves out non-personal
 * interface preferences; ADR-013 records that a language choice qualifies.
 * Nothing from the dossier may ever be written here.
 */
export const LOCALE_STORAGE_KEY = 'visaflow-locale'

/** BCP 47 tags used for Intl formatting. */
export const INTL_LOCALES: Record<Locale, string> = {
  tr: 'tr-TR',
  en: 'en-GB',
}

export function isSupportedLocale(value: unknown): value is Locale {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  )
}

/**
 * Language resolution order:
 *   1. explicitly stored preference
 *   2. Turkish
 */
export function resolveInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isSupportedLocale(stored)) return stored
  } catch {
    // Storage can throw in private mode or when cookies are blocked.
  }
  return DEFAULT_LOCALE
}

export const defaultNS = 'common'

export const resources = {
  tr: {
    common: trCommon,
    navigation: trNavigation,
    dashboard: trDashboard,
    applicant: trApplicant,
    trip: trTrip,
    employment: trEmployment,
    finance: trFinance,
    sponsors: trSponsors,
    documents: trDocuments,
    timeline: trTimeline,
    validation: trValidation,
    notes: trNotes,
    settings: trSettings,
    playground: trPlayground,
    'visa-domain': trVisaDomain,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    dashboard: enDashboard,
    applicant: enApplicant,
    trip: enTrip,
    employment: enEmployment,
    finance: enFinance,
    sponsors: enSponsors,
    documents: enDocuments,
    timeline: enTimeline,
    validation: enValidation,
    notes: enNotes,
    settings: enSettings,
    playground: enPlayground,
    'visa-domain': enVisaDomain,
  },
} as const

/**
 * Both locales are bundled statically. With only two languages this keeps the
 * app fully offline, adds no network request, and avoids a flash of
 * untranslated text on first paint.
 */
void i18next.use(initReactI18next).init({
  resources,
  lng: resolveInitialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  defaultNS,
  ns: Object.keys(resources.tr),
  interpolation: {
    // React already escapes rendered values.
    escapeValue: false,
  },
  returnNull: false,
})

export default i18next
