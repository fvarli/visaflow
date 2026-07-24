import { describe, it, expect } from 'vitest'
import {
  TRIP_STEP_IDS,
  deriveStepStatuses,
  isDatesComplete,
  isRouteComplete,
} from '@/features/trip/trip-wizard'
import { buildTripModel } from '@/features/trip/trip-model'
import { importDossier } from '@/features/import-export/services/import.service'
import exampleJson from '@/data/examples/example-dossier.json'
import type { Application } from '@/domain/schemas/application.schema'
import type { Trip } from '@/domain/schemas/trip.schema'

function appWithTrip(trip: Partial<Trip> | undefined): Application {
  return { trip } as unknown as Application
}

const FULL_TRIP: Partial<Trip> = {
  entryDate: '2025-04-01',
  exitDate: '2025-04-10',
  firstEntryCountry: 'GR',
  mainDestinationCountry: 'GR',
  route: [
    {
      city: 'Athens',
      country: 'GR',
      arrivalDate: '2025-04-01',
      departureDate: '2025-04-05',
      nights: 4,
    },
  ],
  accommodationReservations: [
    {
      type: 'hotel',
      name: 'Athens Central',
      city: 'Athens',
      checkInDate: '2025-04-01',
      checkOutDate: '2025-04-05',
      status: 'confirmed',
    },
  ],
  transportReservations: [],
  insurance: {
    provider: 'Allianz',
    coverageStartDate: '2025-04-01',
    coverageEndDate: '2025-04-10',
    currency: 'EUR',
    medicalCoverage: true,
    repatriationCoverage: true,
  },
}

describe('trip wizard model', () => {
  it('exposes the six steps in order', () => {
    expect(TRIP_STEP_IDS).toEqual([
      'dates',
      'route',
      'accommodation',
      'transportation',
      'insurance',
      'review',
    ])
  })

  it('reads required-step completeness', () => {
    expect(isDatesComplete(null)).toBe(false)
    expect(isDatesComplete(appWithTrip(FULL_TRIP))).toBe(true)
    expect(isRouteComplete(appWithTrip({ entryDate: '2025-04-01' }))).toBe(
      false
    )
    expect(isRouteComplete(appWithTrip(FULL_TRIP))).toBe(true)
  })

  it('marks only the active step current when nothing is filled', () => {
    expect(deriveStepStatuses(null, 0)).toEqual([
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
  })

  it('marks satisfied and passed steps complete on the review step', () => {
    const statuses = deriveStepStatuses(appWithTrip(FULL_TRIP), 5)
    expect(statuses).toEqual([
      'complete', // dates — has entry+exit
      'complete', // route — has first + main
      'complete', // accommodation — has an entry
      'complete', // transportation — empty but passed (index < current)
      'complete', // insurance — present
      'current', // review
    ])
  })
})

describe('buildTripModel (over the example dossier)', () => {
  const imported = importDossier(JSON.stringify(exampleJson))
  if (!imported.success || !imported.data) {
    throw new Error('example dossier failed to import for the trip model test')
  }
  const seed = imported.data
  const model = buildTripModel(
    {
      applicant: seed.applicant,
      application: seed.application,
      documents: seed.documents,
      sponsors: seed.sponsors,
    },
    new Date('2025-01-01T00:00:00.000Z')
  )

  it('derives the trip overview', () => {
    expect(model.overview.entryDate).toBe('2025-04-01')
    expect(model.overview.exitDate).toBe('2025-04-10')
    expect(model.overview.totalNights).toBe(9)
    expect(model.overview.destinationCountry).toBeTruthy()
  })

  it('builds route views with nights scaled to the longest stay', () => {
    expect(model.route.length).toBeGreaterThan(0)
    const longest = model.route.find((s) => s.ratio === 1)
    expect(longest).toBeDefined()
    for (const stop of model.route) {
      expect(stop.ratio).toBeGreaterThan(0)
      expect(stop.ratio).toBeLessThanOrEqual(1)
    }
  })

  it('reports coverage and insights as organizational data', () => {
    expect(model.insights.hasInsurance).toBe(true)
    // The example insurance spans the trip exactly, so no gap findings.
    expect(model.insights.insuranceSpansTrip).toBe(true)
    expect(Array.isArray(model.insights.findings)).toBe(true)
  })
})
