import { parseISO } from 'date-fns'
import { useLocale } from '@/app/providers/LocaleProvider'

/**
 * Locale-aware formatting, in one place.
 *
 * Pages must never call Intl directly — formatting decisions belong here so
 * Turkish and English stay consistent and so nothing locale-formatted can
 * accidentally be written back into state. Everything stored in the dossier
 * remains an ISO string or a raw number.
 */

/** Accepts an ISO date string ('2026-08-12') or a Date. Returns null if unusable. */
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = typeof value === 'string' ? parseISO(value) : value
  return Number.isNaN(date.getTime()) ? null : date
}

/** tr: 12 Ağustos 2026 · en: 12 August 2026 */
export function formatDate(
  value: string | Date | null | undefined,
  intlLocale: string
): string {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** tr: 12 Ağu 2026 · en: 12 Aug 2026 — for dense rows and cards. */
export function formatDateShort(
  value: string | Date | null | undefined,
  intlLocale: string
): string {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(
  value: string | Date | null | undefined,
  intlLocale: string
): string {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date)
}

/**
 * The currency always comes from the data (dossier values may be EUR, TRY,
 * USD…). Never hardcode a currency here.
 *
 * tr: 98.000,00 ₺ · en: TRY 98,000.00
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string | null | undefined,
  intlLocale: string,
  options: Intl.NumberFormatOptions = {}
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return ''
  if (!currency || currency === 'OTHER') {
    return formatNumber(amount, intlLocale, options)
  }
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      ...options,
    }).format(amount)
  } catch {
    // Unknown currency code — fall back to a plain number plus the raw code.
    return `${formatNumber(amount, intlLocale, options)} ${currency}`
  }
}

export function formatNumber(
  value: number | null | undefined,
  intlLocale: string,
  options: Intl.NumberFormatOptions = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return new Intl.NumberFormat(intlLocale, options).format(value)
}

/** 0-100 in, "72%" out. */
export function formatPercent(
  value: number | null | undefined,
  intlLocale: string
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return new Intl.NumberFormat(intlLocale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value / 100)
}

/** Convenience hook so components never thread the locale through by hand. */
export function useFormatters() {
  const { intlLocale, locale } = useLocale()

  return {
    locale,
    intlLocale,
    date: (value: string | Date | null | undefined) =>
      formatDate(value, intlLocale),
    dateShort: (value: string | Date | null | undefined) =>
      formatDateShort(value, intlLocale),
    dateTime: (value: string | Date | null | undefined) =>
      formatDateTime(value, intlLocale),
    currency: (
      amount: number | null | undefined,
      currency: string | null | undefined,
      options?: Intl.NumberFormatOptions
    ) => formatCurrency(amount, currency, intlLocale, options),
    number: (
      value: number | null | undefined,
      options?: Intl.NumberFormatOptions
    ) => formatNumber(value, intlLocale, options),
    percent: (value: number | null | undefined) =>
      formatPercent(value, intlLocale),
  }
}
