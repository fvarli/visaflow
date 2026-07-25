import { describe, it, expect } from 'vitest'
import {
  deriveTripGuidance,
  tripGuidanceForStage,
} from '@/features/trip/trip-guidance'
import type { Trip } from '@/domain/schemas/trip.schema'

/** deriveTripGuidance only reads route/accommodation/transport arrays. */
function trip(partial: Partial<Trip>): Trip {
  return {
    entryDate: '2026-09-26',
    exitDate: '2026-10-03',
    firstEntryCountry: 'GR',
    mainDestinationCountry: 'GR',
    route: [],
    transportReservations: [],
    accommodationReservations: [],
    budgetCurrency: 'EUR',
    ...partial,
  }
}

const ids = (t: Trip) => deriveTripGuidance(t).map((h) => h.id)

describe('deriveTripGuidance', () => {
  it('nudges to build the route first when it is empty', () => {
    const hints = ids(trip({}))
    expect(hints).toContain('addOvernightLocations')
    expect(hints).not.toContain('mainDestinationMeaning')
  })

  it('explains the main destination once the route has stops', () => {
    const hints = ids(
      trip({
        route: [
          {
            city: 'Athens',
            country: 'GR',
            arrivalDate: '2026-09-26',
            departureDate: '2026-10-03',
            nights: 7,
          },
        ],
      })
    )
    expect(hints).toContain('mainDestinationMeaning')
    expect(hints).not.toContain('addOvernightLocations')
  })

  it('offers "reservations later" only while those lists are empty', () => {
    expect(ids(trip({}))).toContain('accommodationReservationsLater')
    expect(ids(trip({}))).toContain('transportReservationsLater')
    const withAcc = ids(
      trip({
        accommodationReservations: [
          {
            type: 'hotel',
            name: 'Demo',
            city: 'Athens',
            checkInDate: '2026-09-26',
            checkOutDate: '2026-10-03',
            status: 'pending',
          },
        ],
      })
    )
    expect(withAcc).not.toContain('accommodationReservationsLater')
  })

  it('is all info/neutral — never a warning or error', () => {
    for (const hint of deriveTripGuidance(trip({}))) {
      expect(['info', 'neutral']).toContain(hint.tone)
    }
  })

  it('filters hints by stage', () => {
    const hints = deriveTripGuidance(trip({}))
    expect(
      tripGuidanceForStage(hints, 'accommodation').map((h) => h.id)
    ).toEqual(['accommodationReservationsLater'])
  })
})
