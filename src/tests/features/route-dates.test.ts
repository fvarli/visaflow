import { describe, it, expect } from 'vitest'
import {
  computeNights,
  maxStopNights,
  routeCoverage,
  stopNights,
  syncStopNights,
  totalRouteNights,
  tripNights,
} from '@/features/trip/route-dates'
import type { RouteStop } from '@/domain/schemas/trip.schema'

/** The reference scenario: Türkiye → Greece, 26 Sep – 3 Oct (7 nights). */
const ATHENS: RouteStop = {
  city: 'Athens',
  country: 'GR',
  arrivalDate: '2026-09-26',
  departureDate: '2026-10-01',
  nights: 5,
}
const NAFPLIO: RouteStop = {
  city: 'Nafplio',
  country: 'GR',
  arrivalDate: '2026-10-01',
  departureDate: '2026-10-03',
  nights: 2,
}

describe('computeNights', () => {
  it('counts calendar nights between arrival and departure', () => {
    expect(computeNights('2026-09-26', '2026-10-03')).toBe(7)
    expect(computeNights('2026-09-26', '2026-10-01')).toBe(5)
  })

  it('never returns negative or NaN', () => {
    expect(computeNights('2026-10-03', '2026-09-26')).toBe(0)
    expect(computeNights('', '2026-10-03')).toBe(0)
    expect(computeNights('2026-09-26', '2026-09-26')).toBe(0)
  })
})

describe('trip and route nights', () => {
  it('derives total trip nights (and days = nights + 1)', () => {
    const nights = tripNights('2026-09-26', '2026-10-03')
    expect(nights).toBe(7)
    // 7 nights spans 8 calendar days — the summary derives days as nights + 1.
    expect((nights ?? 0) + 1).toBe(8)
  })

  it('returns null trip nights when a boundary is missing', () => {
    expect(tripNights('2026-09-26', null)).toBeNull()
    expect(tripNights(null, '2026-10-03')).toBeNull()
  })

  it('sums and maxes route nights from the dates, not the stored value', () => {
    const stops = [ATHENS, NAFPLIO]
    expect(totalRouteNights(stops)).toBe(7)
    expect(maxStopNights(stops)).toBe(5)
    expect(stopNights(ATHENS)).toBe(5)
  })

  it('re-syncs a stale stored nights value to the dates (legacy safety)', () => {
    const legacy: RouteStop = { ...ATHENS, nights: 99 }
    // Derivation ignores the stored value…
    expect(stopNights(legacy)).toBe(5)
    // …and syncing writes the correct value back.
    expect(syncStopNights(legacy).nights).toBe(5)
  })
})

describe('routeCoverage', () => {
  it('reports a match when route nights equal trip nights', () => {
    const c = routeCoverage([ATHENS, NAFPLIO], '2026-09-26', '2026-10-03')
    expect(c.status).toBe('match')
    expect(c.routeNights).toBe(7)
    expect(c.tripNights).toBe(7)
    expect(c.diff).toBe(0)
  })

  it('reports under when the route is short of the trip', () => {
    const c = routeCoverage([ATHENS], '2026-09-26', '2026-10-03')
    expect(c.status).toBe('under')
    expect(c.diff).toBe(-2)
  })

  it('reports over when the route exceeds the trip', () => {
    const c = routeCoverage([ATHENS, NAFPLIO], '2026-09-26', '2026-10-01')
    expect(c.status).toBe('over')
    expect(c.diff).toBe(2)
  })

  it('reports empty / unknown at the edges', () => {
    expect(routeCoverage([], '2026-09-26', '2026-10-03').status).toBe('empty')
    expect(routeCoverage([ATHENS], null, null).status).toBe('unknown')
  })
})
