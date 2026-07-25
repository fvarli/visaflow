import { differenceInDays, parseISO } from 'date-fns'
import type { RouteStop } from '@/domain/schemas/trip.schema'

/**
 * Canonical route/date math, in one place.
 *
 * A route stop's date pair (`arrivalDate` → `departureDate`) is the source of
 * truth; `nights` is a DERIVED value we keep persisted (the schema requires it)
 * but always recompute from the dates on write, so the stored number can never
 * drift from the dates. Display derives nights from the dates too, so what the
 * user sees is always truthful. This module holds the math that was previously
 * duplicated between `trip-model.ts` and `RouteBuilder`.
 *
 * Pure — no React, no i18n. Invalid/empty dates yield 0 (never negative), so
 * callers need no guarding.
 */

/** Nights between two ISO dates: max(0, departure − arrival). */
export function computeNights(
  arrivalDate: string | null | undefined,
  departureDate: string | null | undefined
): number {
  if (!arrivalDate || !departureDate) return 0
  const nights = differenceInDays(
    parseISO(departureDate),
    parseISO(arrivalDate)
  )
  return Number.isFinite(nights) && nights > 0 ? nights : 0
}

/** Derived nights for a stop (from its date pair, not its stored `nights`). */
export function stopNights(stop: RouteStop): number {
  return computeNights(stop.arrivalDate, stop.departureDate)
}

/** Re-sync a stop's stored `nights` to its dates. Call on every write. */
export function syncStopNights(stop: RouteStop): RouteStop {
  return { ...stop, nights: stopNights(stop) }
}

/** Total trip nights between entry and exit, or null if either is missing. */
export function tripNights(
  entryDate: string | null | undefined,
  exitDate: string | null | undefined
): number | null {
  if (!entryDate || !exitDate) return null
  return computeNights(entryDate, exitDate)
}

/** Sum of derived nights across the route. */
export function totalRouteNights(stops: RouteStop[]): number {
  return stops.reduce((sum, stop) => sum + stopNights(stop), 0)
}

/** Longest single-stay nights, for the duration-bar ratio. */
export function maxStopNights(stops: RouteStop[]): number {
  return stops.reduce((max, stop) => Math.max(max, stopNights(stop)), 0)
}

export type RouteCoverageStatus =
  'empty' | 'match' | 'under' | 'over' | 'unknown'

export interface RouteCoverage {
  status: RouteCoverageStatus
  routeNights: number
  tripNights: number | null
  /** routeNights − tripNights (0 when they match or trip unknown). */
  diff: number
}

/**
 * Presentational comparison of route nights against the trip length. This is a
 * display aid only — the authoritative consistency finding still comes from the
 * validation engine (`trip.routeNightsMatchTotal`); nothing here changes it.
 */
export function routeCoverage(
  stops: RouteStop[],
  entryDate: string | null | undefined,
  exitDate: string | null | undefined
): RouteCoverage {
  const total = tripNights(entryDate, exitDate)
  const routeNights = totalRouteNights(stops)
  if (stops.length === 0) {
    return { status: 'empty', routeNights, tripNights: total, diff: 0 }
  }
  if (total === null) {
    return { status: 'unknown', routeNights, tripNights: total, diff: 0 }
  }
  const diff = routeNights - total
  const status: RouteCoverageStatus =
    diff === 0 ? 'match' : diff < 0 ? 'under' : 'over'
  return { status, routeNights, tripNights: total, diff }
}
