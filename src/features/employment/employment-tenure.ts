import { differenceInMonths, isValid, parseISO } from 'date-fns'

/**
 * Current-employer tenure, derived from `employment.startDate`.
 *
 * Pure and never stored — the dossier keeps only the start date; tenure is a
 * live derivation (ADR-026). Total career experience is a different, unmodeled
 * concept (see docs/visa-domain-notes.md) and is deliberately NOT computed here.
 *
 * `now` is injected so the calculation is deterministic in tests. All formatting
 * (locale plurals) happens at the UI boundary; this returns raw counts + flags.
 */
export interface Tenure {
  years: number
  months: number
  /** Whole months between start and now (negative when the start date is future). */
  totalMonths: number
  /** The start date is in the future — surface a calm data-quality note, not tenure. */
  isFuture: boolean
  /** No (or invalid) start date on file. */
  isMissing: boolean
}

const EMPTY: Tenure = {
  years: 0,
  months: 0,
  totalMonths: 0,
  isFuture: false,
  isMissing: true,
}

export function computeTenure(
  startDate: string | null | undefined,
  now: Date = new Date()
): Tenure {
  if (!startDate) return EMPTY
  const start = parseISO(startDate)
  if (!isValid(start)) return EMPTY

  const totalMonths = differenceInMonths(now, start)
  if (totalMonths < 0) {
    return {
      years: 0,
      months: 0,
      totalMonths,
      isFuture: true,
      isMissing: false,
    }
  }
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    totalMonths,
    isFuture: false,
    isMissing: false,
  }
}
