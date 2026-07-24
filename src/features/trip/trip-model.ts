import { useMemo } from 'react'
import { differenceInCalendarDays, differenceInDays, parseISO } from 'date-fns'
import { useDossier } from '@/app/providers/DossierProvider'
import { runValidation } from '@/domain/rules/runner'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { Insurance, RouteStop } from '@/domain/schemas/trip.schema'
import type { ValidationFinding } from '@/domain/rules/types'

/**
 * Pure presentation adapter for the Trip planner.
 *
 * No React, no i18n, no formatting — it reads the dossier and produces a
 * display model the trip wizard renders. Crucially it does NOT re-encode any
 * business logic: the "smart consistency" insights come straight from
 * `runValidation`, filtered to the trip-relevant rules, and coverage
 * indicators are derived from those findings rather than recomputed. It never
 * predicts an outcome — insights are organizational only.
 */

export interface TripModelInput {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
}

export interface RouteStopView extends RouteStop {
  /** nights / longest-stay nights, for the duration bar (0–1). */
  ratio: number
  /** country matches the declared main destination. */
  isMain: boolean
}

export interface TripOverview {
  hasTrip: boolean
  destinationCountry: string | null
  mainDestinationCountry: string | null
  entryDate: string | null
  exitDate: string | null
  totalNights: number | null
  appointmentDate: string | null
  appointmentDaysUntil: number | null
}

export interface TripInsights {
  findings: ValidationFinding[]
  errorCount: number
  warningCount: number
  total: number
  hasInsurance: boolean
  /** null when there is no insurance to assess. */
  insuranceSpansTrip: boolean | null
}

export interface TripModel {
  overview: TripOverview
  route: RouteStopView[]
  totalRouteNights: number
  accommodationCount: number
  transportCount: number
  insurance: Insurance | null
  insights: TripInsights
}

/** Findings that belong to the trip, by ruleId. */
const TRIP_RULE_PREFIXES = ['trip.', 'insurance.', 'accommodation.']
const TRIP_EXTRA_RULE_IDS = ['passport.validAfterTrip']

function isTripFinding(finding: ValidationFinding): boolean {
  return (
    TRIP_RULE_PREFIXES.some((p) => finding.ruleId.startsWith(p)) ||
    TRIP_EXTRA_RULE_IDS.includes(finding.ruleId)
  )
}

/** Finding ids that mean the insurance does not span the whole trip. */
const INSURANCE_GAP_IDS = [
  'insurance-starts-late',
  'insurance-ends-early',
  'insurance-dates-missing',
]

function daysUntil(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null
  return differenceInCalendarDays(parseISO(iso), now)
}

export function buildTripModel(input: TripModelInput, now: Date): TripModel {
  const { applicant, application, documents, sponsors } = input
  const trip = application?.trip ?? null

  const entryDate = trip?.entryDate ?? null
  const exitDate = trip?.exitDate ?? null
  const totalNights =
    entryDate && exitDate
      ? Math.max(0, differenceInDays(parseISO(exitDate), parseISO(entryDate)))
      : null

  const mainDestinationCountry = trip?.mainDestinationCountry ?? null
  const stops = trip?.route ?? []
  const maxNights = stops.reduce((max, s) => Math.max(max, s.nights), 0)
  const route: RouteStopView[] = stops.map((stop) => ({
    ...stop,
    ratio: maxNights > 0 ? stop.nights / maxNights : 0,
    isMain:
      mainDestinationCountry !== null &&
      stop.country === mainDestinationCountry,
  }))
  const totalRouteNights = stops.reduce((sum, s) => sum + s.nights, 0)

  // Insights come from the validation engine, never re-derived here.
  let findings: ValidationFinding[] = []
  if (applicant && application) {
    const dossier: Dossier = {
      schemaVersion: '1.0.0',
      exportedAt: now.toISOString(),
      applicant,
      application,
      documents,
      sponsors,
    }
    findings = runValidation(dossier).findings.filter(isTripFinding)
  }

  const insurance = trip?.insurance ?? null
  const hasInsurance = Boolean(insurance)
  const insuranceSpansTrip = hasInsurance
    ? !findings.some((f) => INSURANCE_GAP_IDS.includes(f.id))
    : null

  return {
    overview: {
      hasTrip: Boolean(trip),
      destinationCountry:
        application?.destinationCountry ?? mainDestinationCountry,
      mainDestinationCountry,
      entryDate,
      exitDate,
      totalNights,
      appointmentDate: application?.appointment?.date ?? null,
      appointmentDaysUntil: daysUntil(application?.appointment?.date, now),
    },
    route,
    totalRouteNights,
    accommodationCount: trip?.accommodationReservations.length ?? 0,
    transportCount: trip?.transportReservations.length ?? 0,
    insurance,
    insights: {
      findings,
      errorCount: findings.filter((f) => f.severity === 'error').length,
      warningCount: findings.filter((f) => f.severity === 'warning').length,
      total: findings.length,
      hasInsurance,
      insuranceSpansTrip,
    },
  }
}

/** Component-facing hook; recomputes when the dossier changes. */
export function useTripModel(): TripModel {
  const { state } = useDossier()
  return useMemo(
    () =>
      buildTripModel(
        {
          applicant: state.applicant,
          application: state.application,
          documents: state.documents,
          sponsors: state.sponsors,
        },
        new Date()
      ),
    [state]
  )
}
