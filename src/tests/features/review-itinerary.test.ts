import { describe, it, expect } from 'vitest'
import { buildItinerary, classifyLeg } from '@/features/review/review-itinerary'
import type { Trip } from '@/domain/schemas/trip.schema'

/**
 * The journey read model (ADR-044).
 *
 * It stores nothing and adds no schema. What these guard is that it reads the
 * dossier faithfully — above all that it never invents a date, a night count or
 * a direction that the trip does not actually imply.
 */

const trip = (over: Partial<Trip> = {}): Trip => ({
  entryDate: '2027-04-01',
  exitDate: '2027-04-10',
  firstEntryCountry: 'GR',
  mainDestinationCountry: 'GR',
  route: [],
  transportReservations: [],
  accommodationReservations: [],
  budgetCurrency: 'EUR',
  ...over,
})

const leg = (over: Partial<Trip['transportReservations'][number]> = {}) => ({
  type: 'flight' as const,
  departureDate: '2027-04-01',
  departureCity: 'Warsaw',
  arrivalCity: 'Athens',
  status: 'confirmed' as const,
  ...over,
})

const stay = (
  over: Partial<Trip['accommodationReservations'][number]> = {}
) => ({
  type: 'hotel' as const,
  name: 'Hotel Plaka',
  city: 'Athens',
  checkInDate: '2027-04-01',
  checkOutDate: '2027-04-05',
  status: 'confirmed' as const,
  ...over,
})

describe('classifyLeg', () => {
  it('places a leg by its date, not by its position in the list', () => {
    expect(classifyLeg('2027-03-28', '2027-04-01', '2027-04-10')).toBe(
      'outbound'
    )
    expect(classifyLeg('2027-04-05', '2027-04-01', '2027-04-10')).toBe(
      'internal'
    )
    expect(classifyLeg('2027-04-12', '2027-04-01', '2027-04-10')).toBe('return')
  })

  it('counts the boundary days as the journey out and back', () => {
    // The flight that lands on the day the trip begins *is* the outbound one.
    expect(classifyLeg('2027-04-01', '2027-04-01', '2027-04-10')).toBe(
      'outbound'
    )
    expect(classifyLeg('2027-04-10', '2027-04-01', '2027-04-10')).toBe('return')
  })

  it('refuses to place a leg it cannot place', () => {
    // No guess is better than a confident wrong one.
    expect(classifyLeg(null, '2027-04-01', '2027-04-10')).toBe('unscheduled')
    expect(classifyLeg('2027-04-05', null, '2027-04-10')).toBe('unscheduled')
    expect(classifyLeg('2027-04-05', '2027-04-01', null)).toBe('unscheduled')
  })
})

describe('buildItinerary', () => {
  it('is empty for a dossier with no trip, rather than a shell of nulls', () => {
    const result = buildItinerary(null)
    expect(result.isEmpty).toBe(true)
    expect(result.legs).toEqual([])
    expect(result.stays).toEqual([])
    expect(result.stops).toEqual([])
  })

  it('reads an outbound and a return leg from the same list', () => {
    const result = buildItinerary(
      trip({
        transportReservations: [
          leg({ departureDate: '2027-04-01' }),
          leg({
            departureDate: '2027-04-10',
            departureCity: 'Athens',
            arrivalCity: 'Warsaw',
          }),
        ],
      })
    )
    expect(result.legs.map((l) => l.direction)).toEqual(['outbound', 'return'])
  })

  it('orders the journey rather than the data entry', () => {
    // Entered return-first; read outbound-first.
    const result = buildItinerary(
      trip({
        transportReservations: [
          leg({ departureDate: '2027-04-10' }),
          leg({ departureDate: '2027-04-05' }),
          leg({ departureDate: '2027-04-01' }),
        ],
      })
    )
    expect(result.legs.map((l) => l.direction)).toEqual([
      'outbound',
      'internal',
      'return',
    ])
    expect(result.legs.map((l) => l.departureDate)).toEqual([
      '2027-04-01',
      '2027-04-05',
      '2027-04-10',
    ])
  })

  it('keeps an unplaceable leg, last, instead of dropping or guessing it', () => {
    const result = buildItinerary(
      trip({
        transportReservations: [
          leg({ departureDate: undefined }),
          leg({ departureDate: '2027-04-01' }),
        ],
      })
    )
    expect(result.legs.map((l) => l.direction)).toEqual([
      'outbound',
      'unscheduled',
    ])
    expect(result.legs[1]?.departureDate).toBeNull()
  })

  it('cannot place any leg when the trip has no dates of its own', () => {
    const result = buildItinerary(
      trip({
        entryDate: '',
        exitDate: '',
        transportReservations: [leg(), leg({ departureDate: '2027-04-10' })],
      })
    )
    expect(result.legs.every((l) => l.direction === 'unscheduled')).toBe(true)
  })

  it('reads multiple stays in order, with nights derived from the dates', () => {
    const result = buildItinerary(
      trip({
        accommodationReservations: [
          stay({
            city: 'Santorini',
            checkInDate: '2027-04-05',
            checkOutDate: '2027-04-10',
          }),
          stay({ city: 'Athens' }),
        ],
      })
    )
    expect(result.stays.map((s) => s.city)).toEqual(['Athens', 'Santorini'])
    expect(result.stays.map((s) => s.nights)).toEqual([4, 5])
  })

  it('derives a stay’s nights instead of trusting a stored count', () => {
    const result = buildItinerary(
      trip({
        accommodationReservations: [stay({ checkOutDate: '2027-04-03' })],
      })
    )
    expect(result.stays[0]?.nights).toBe(2)
  })

  it('treats a day trip as nought nights, which is an answer', () => {
    const result = buildItinerary(
      trip({
        route: [
          {
            city: 'Delphi',
            country: 'GR',
            arrivalDate: '2027-04-03',
            departureDate: '2027-04-03',
            nights: 0,
          },
        ],
      })
    )
    expect(result.stops[0]?.nights).toBe(0)
    expect(result.isEmpty).toBe(false)
  })

  it('reports absent details as null and never as an empty string', () => {
    const result = buildItinerary(
      trip({
        entryCity: '',
        tripPurpose: '   ',
        transportReservations: [leg({ carrier: '', reservationNumber: '  ' })],
      })
    )
    expect(result.entryCity).toBeNull()
    expect(result.purpose).toBeNull()
    expect(result.legs[0]?.carrier).toBeNull()
    expect(result.legs[0]?.reservationNumber).toBeNull()
  })

  it('is not empty once anything at all is recorded', () => {
    expect(buildItinerary(trip()).isEmpty).toBe(false)
    expect(buildItinerary(trip({ entryDate: '', exitDate: '' })).isEmpty).toBe(
      true
    )
    expect(
      buildItinerary(
        trip({ entryDate: '', exitDate: '', tripPurpose: 'Tourism' })
      ).isEmpty
    ).toBe(false)
  })
})
