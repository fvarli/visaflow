import { describe, it, expect } from 'vitest'
import {
  areaForRuleId,
  categoryForRuleId,
  healthFromSeverities,
} from '@/features/validation/finding-presentation'
import { findingAction } from '@/features/validation/finding-actions'
import { buildValidationModel } from '@/features/validation/validation-model'
import type {
  ValidationFinding,
  ValidationSeverity,
} from '@/domain/rules/types'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'

const finding = (
  ruleId: string,
  severity: ValidationSeverity = 'warning',
  relatedFields: string[] = []
): ValidationFinding => ({
  id: ruleId,
  ruleId,
  severity,
  messageKey: 'findings.x',
  relatedFields,
})

describe('finding presentation — category mapping', () => {
  it('groups by the stable ruleId prefix', () => {
    expect(categoryForRuleId('passport.validAfterTrip')).toBe('applicant')
    expect(categoryForRuleId('document.requiredNotStarted')).toBe('documents')
    expect(categoryForRuleId('employment.leaveCoversTrip')).toBe('employment')
    expect(categoryForRuleId('sponsor.hasDocuments')).toBe('sponsors')
    // insurance, accommodation and the itinerary all belong to the trip.
    expect(categoryForRuleId('insurance.coversTrip')).toBe('trip')
    expect(categoryForRuleId('accommodation.coversTrip')).toBe('trip')
    expect(categoryForRuleId('trip.datesValid')).toBe('trip')
  })
})

describe('finding presentation — area mapping', () => {
  it('maps each rule to its finer dossier area', () => {
    expect(areaForRuleId('passport.validAfterTrip')).toBe('passport')
    expect(areaForRuleId('accommodation.coversTrip')).toBe('accommodation')
    expect(areaForRuleId('insurance.coversTrip')).toBe('insurance')
    expect(areaForRuleId('employment.leaveCoversTrip')).toBe('employment')
    expect(areaForRuleId('sponsor.hasDocuments')).toBe('sponsors')
    expect(areaForRuleId('document.requiredNotStarted')).toBe('documents')
    // The appointment is its own area, distinct from the dates/route.
    expect(areaForRuleId('trip.appointmentBeforeTrip')).toBe('appointment')
    expect(areaForRuleId('trip.routeNightsMatchTotal')).toBe('trip')
  })
})

describe('finding presentation — health from severities', () => {
  it('reports the worst severity present, else clear', () => {
    expect(healthFromSeverities(['warning', 'error'])).toBe('attention')
    expect(healthFromSeverities(['info', 'warning'])).toBe('review')
    expect(healthFromSeverities(['info'])).toBe('notes')
    expect(healthFromSeverities([])).toBe('clear')
  })
})

describe('finding actions — deep links (no dead ends)', () => {
  it('deep-links trip findings to the exact wizard step', () => {
    expect(findingAction(finding('trip.datesValid'))?.route).toBe(
      '/trip?step=dates'
    )
    expect(findingAction(finding('trip.appointmentBeforeTrip'))?.route).toBe(
      '/trip?step=dates'
    )
    expect(findingAction(finding('trip.routeNightsMatchTotal'))?.route).toBe(
      '/trip?step=route'
    )
    expect(findingAction(finding('accommodation.coversTrip'))?.route).toBe(
      '/trip?step=accommodation'
    )
    expect(findingAction(finding('insurance.coversTrip'))?.route).toBe(
      '/trip?step=insurance'
    )
  })

  it('deep-links passport findings to the applicant passport step', () => {
    expect(findingAction(finding('passport.validAfterTrip'))?.route).toBe(
      '/applicant?step=passport'
    )
  })

  it('links document, employment and sponsor findings to their pages', () => {
    expect(findingAction(finding('document.requiredNotStarted'))?.route).toBe(
      '/documents'
    )
    expect(findingAction(finding('employment.leaveCoversTrip'))?.route).toBe(
      '/employment?step=leave'
    )
    // Per-sponsor rules land on the Sponsors page (where the record is edited).
    expect(findingAction(finding('sponsor.hasDocuments'))?.route).toBe(
      '/sponsors'
    )
    expect(findingAction(finding('sponsor.relationshipProof'))?.route).toBe(
      '/sponsors'
    )
  })

  it('links the funding-strategy finding to the Finance sponsors step', () => {
    expect(
      findingAction(finding('sponsor.requiredForSponsoredFunding'))?.route
    ).toBe('/finance?step=sponsors')
  })

  it('deep-links a per-sponsor finding to that sponsor in the workspace', () => {
    expect(
      findingAction(
        finding('sponsor.hasDocuments', 'warning', ['sponsors.s1.documentIds'])
      )?.route
    ).toBe('/sponsors?sponsor=s1')
    expect(
      findingAction(
        finding('sponsor.relationshipProof', 'info', [
          'sponsors.s7.proofOfRelationship',
        ])
      )?.route
    ).toBe('/sponsors?sponsor=s7')
  })

  it('falls back to the first related field for an unknown rule', () => {
    expect(
      findingAction(finding('mystery.rule', 'warning', ['applicant.foo']))
        ?.route
    ).toBe('/applicant')
    // A financing-related field routes to the Finance source step.
    expect(
      findingAction(finding('mystery.rule', 'warning', ['financing.source']))
        ?.route
    ).toBe('/finance?step=source')
    expect(findingAction(finding('mystery.rule', 'warning', []))).toBeNull()
  })
})

/* -------------------------------------------------------------------------
 * buildValidationModel — organization over the real engine output
 * ---------------------------------------------------------------------- */

const APPLICANT: Applicant = {
  id: 'a1',
  firstName: 'Ada',
  lastName: 'Traveller',
  dateOfBirth: '1990-01-01',
  nationality: 'TR',
  passport: {
    number: 'X1234567',
    issueDate: '2020-01-01',
    expiryDate: '2035-01-01',
    issuingCountry: 'TR',
    passportType: 'ordinary',
  },
  previousPassports: [],
  previousVisas: [],
  previousRefusals: [],
  travelHistory: [],
}

const baseApplication = (trip?: Application['trip']): Application => ({
  applicationId: 'app1',
  applicantId: 'a1',
  destinationCountry: 'GR',
  visaType: 'short_stay_tourism',
  status: 'draft',
  createdAt: new Date().toISOString(),
  sponsorIds: [],
  documentIds: [],
  notes: [],
  ...(trip ? { trip } : {}),
})

describe('buildValidationModel — empty & no-data', () => {
  it('reports no data when applicant or application is missing', () => {
    const model = buildValidationModel({
      applicant: null,
      application: null,
      documents: [],
      sponsors: [],
    })
    expect(model.hasData).toBe(false)
    expect(model.groups).toHaveLength(0)
    expect(model.hero.verdict).toBe('clear')
  })

  it('is all-clear for a consistent dossier with nothing outstanding', () => {
    // No trip → the trip/insurance/accommodation rules have nothing to flag.
    const model = buildValidationModel({
      applicant: APPLICANT,
      application: baseApplication(),
      documents: [],
      sponsors: [],
    })
    expect(model.hasData).toBe(true)
    expect(model.groups).toHaveLength(0)
    expect(model.hero.verdict).toBe('clear')
    expect(model.hero.nextRecommendation).toBeNull()
    // The passport is on file and raises nothing → it "looks good".
    expect(model.ready.map((a) => a.id)).toContain('passport')
    const passport = model.review.find((a) => a.id === 'passport')
    expect(passport?.status).toBe('captured')
  })
})

describe('buildValidationModel — with findings', () => {
  const model = buildValidationModel({
    applicant: {
      ...APPLICANT,
      // Passport expires only days after the trip → validity error.
      passport: { ...APPLICANT.passport, expiryDate: '2027-06-15' },
    },
    application: baseApplication({
      entryDate: '2027-06-01',
      exitDate: '2027-06-10',
      firstEntryCountry: 'GR',
      mainDestinationCountry: 'GR',
      route: [],
      transportReservations: [],
      accommodationReservations: [],
      budgetCurrency: 'EUR',
    }),
    documents: [],
    sponsors: [],
  })

  it('groups findings by domain, errors-first health', () => {
    const ids = model.groups.map((g) => g.id)
    expect(ids).toContain('applicant')
    expect(ids).toContain('trip')
    const applicant = model.groups.find((g) => g.id === 'applicant')
    expect(applicant?.health).toBe('attention')
  })

  it('attaches a deep-link action to each finding', () => {
    const applicant = model.groups.find((g) => g.id === 'applicant')
    const passport = applicant?.findings.find(
      (f) => f.finding.ruleId === 'passport.validAfterTrip'
    )
    expect(passport?.action?.route).toBe('/applicant?step=passport')

    const trip = model.groups.find((g) => g.id === 'trip')
    const insurance = trip?.findings.find((f) =>
      f.finding.ruleId.startsWith('insurance.')
    )
    expect(insurance?.action?.route).toBe('/trip?step=insurance')
  })

  it('summarizes the hero: attention verdict + a next recommendation', () => {
    expect(model.hero.verdict).toBe('attention')
    expect(model.hero.attentionCount).toBeGreaterThanOrEqual(2)
    expect(model.hero.nextRecommendation).not.toBeNull()
    // The highest-priority item is an error and carries a link.
    expect(model.hero.nextRecommendation?.finding.severity).toBe('error')
    expect(model.hero.nextRecommendation?.action).not.toBeNull()
  })

  it('marks the affected areas as needing review', () => {
    const byId = Object.fromEntries(model.review.map((a) => [a.id, a.status]))
    expect(byId.passport).toBe('needsReview')
    expect(byId.insurance).toBe('needsReview')
    expect(byId.accommodation).toBe('needsReview')
    // No appointment was entered → its area is incomplete, not a finding.
    expect(byId.appointment).toBe('incomplete')
  })
})
