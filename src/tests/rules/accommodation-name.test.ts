import { describe, it, expect } from 'vitest'
import { ctxFor } from '@/tests/support/applicability'
import { runValidation, getValidationSummary } from '@/domain/rules/runner'
import { buildValidationModel } from '@/features/validation/validation-model'
import { buildDashboardModel } from '@/features/dashboard/dashboard-model'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type { AccommodationReservation } from '@/domain/schemas/trip.schema'

import { resolveVisaTemplate } from '@/config/countries'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { applyDocumentUpdate } from '@/features/documents/document-semantics'

/** The pack production resolves for these fixtures. */
const GREECE = resolveVisaTemplate('GR', 'short_stay_tourism')

/**
 * A booking in someone else's name is not a defect, and VisaFlow must not treat
 * it as one.
 *
 * `reservationNamesMatch` used to raise a warning whenever the guest name did
 * not contain part of the applicant's name. No authority states that criterion:
 * Visa Code Annex II A.3(a) accepts "an invitation from the host if staying
 * with one" and "any other appropriate document indicating the accommodation
 * envisaged", so a host's, a spouse's or a company's booking is a route the
 * Code names rather than a deviation from it.
 *
 * Softening the finding's wording was not enough, because severity — not copy —
 * is what the product reads. This file pins the whole of that conclusion: the
 * two dossiers below differ *only* in `guestName`, and every normative signal
 * VisaFlow derives must be identical across them. If someone reintroduces the
 * rule at any severity, at least one of these assertions fails.
 */

const HOST_BOOKING: AccommodationReservation = {
  type: 'friend_family',
  name: 'Kalimera Apartments',
  city: 'Athens',
  checkInDate: '2026-11-02',
  checkOutDate: '2026-11-06',
  reservationNumber: 'BK-4471',
  // Nothing of "Ayşe Demir" appears here — this is exactly the shape the
  // removed rule flagged.
  guestName: 'Georgios Papadopoulos',
  status: 'confirmed',
}

const OWN_BOOKING: AccommodationReservation = {
  ...HOST_BOOKING,
  guestName: 'Ayşe Demir',
}

const GREECE_APPLICATION = {
  applicationId: 'app1',
  applicantId: 'a1',
  destinationCountry: 'GR',
  visaType: 'short_stay_tourism',
} as unknown as Parameters<typeof requiredRequirementCodes>[1]

/** Every required requirement of the resolved pack, marked ready. */
function allRequiredReady() {
  return requiredRequirementCodes(GREECE, GREECE_APPLICATION).map((code, i) =>
    applyDocumentUpdate(
      {
        id: `ready-${i}`,
        code,
        name: code,
        category: 'supporting',
        ownerType: 'applicant',
        ownerId: 'a1',
        required: true,
        status: 'not_started',
      } as unknown as Dossier['documents'][number],
      { status: 'ready' },
      GREECE
    )
  )
}

function dossierWith(reservation: AccommodationReservation): Dossier {
  return {
    schemaVersion: '1.0.0',
    exportedAt: '2026-09-08T00:00:00.000Z',
    applicant: {
      id: 'a1',
      firstName: 'Ayşe',
      lastName: 'Demir',
      dateOfBirth: '1990-04-11',
      nationality: 'TR',
      passport: {
        number: 'U1234567',
        issueDate: '2022-01-01',
        expiryDate: '2032-01-01',
        issuingCountry: 'TR',
        passportType: 'ordinary',
      },
      previousPassports: [],
      previousVisas: [],
      previousRefusals: [],
      travelHistory: [],
    },
    application: {
      applicationId: 'app1',
      applicantId: 'a1',
      destinationCountry: 'GR',
      visaType: 'short_stay_tourism',
      status: 'draft',
      createdAt: '2026-09-08T00:00:00.000Z',
      sponsorIds: [],
      documentIds: [],
      notes: [],
      trip: {
        entryDate: '2026-11-02',
        exitDate: '2026-11-06',
        firstEntryCountry: 'GR',
        mainDestinationCountry: 'GR',
        route: [],
        transportReservations: [],
        accommodationReservations: [reservation],
        budgetCurrency: 'EUR',
      },
    },
    /**
     * Seeded ready, so the dossier is genuinely clean.
     *
     * Left empty, every required document of the Greek pack is unstarted, and
     * the warning-toned action that produces would mask the thing this file
     * exists to detect: a warning caused by the guest name.
     */
    documents: allRequiredReady(),
    sponsors: [],
  }
}

const mismatched = dossierWith(HOST_BOOKING)
const matched = dossierWith(OWN_BOOKING)

/** The dashboard reads a slice of state, not a `Dossier`. */
function dashboardOf(dossier: Dossier) {
  return buildDashboardModel(
    {
      applicant: dossier.applicant,
      application: dossier.application,
      documents: dossier.documents,
      sponsors: dossier.sponsors,
    },
    new Date('2026-09-08T00:00:00.000Z')
  ).active
}

describe('a guest name that is not the applicant changes nothing normative', () => {
  const a = runValidation({
    dossier: mismatched,
    template: GREECE,
    applicability: ctxFor(mismatched.application, mismatched.applicant),
  })
  const b = runValidation({
    dossier: matched,
    template: GREECE,
    applicability: ctxFor(matched.application, matched.applicant),
  })

  it('raises no finding of its own', () => {
    // The rule is gone, so the mismatch produces nothing. Stated as a set
    // comparison rather than a count so an unrelated future rule cannot make
    // this pass by accident.
    expect(a.findings.map((f) => f.ruleId).sort()).toEqual(
      b.findings.map((f) => f.ruleId).sort()
    )
    expect(
      a.findings.some((f) => f.ruleId === 'accommodation.guestNameMatches')
    ).toBe(false)
  })

  it('does not change validation pass/fail', () => {
    expect({
      errors: a.errorCount,
      warnings: a.warningCount,
      info: a.infoCount,
      summary: getValidationSummary({
        dossier: mismatched,
        template: GREECE,
        applicability: ctxFor(mismatched.application, mismatched.applicant),
      }),
    }).toEqual({
      errors: b.errorCount,
      warnings: b.warningCount,
      info: b.infoCount,
      summary: getValidationSummary({
        dossier: matched,
        template: GREECE,
        applicability: ctxFor(matched.application, matched.applicant),
      }),
    })
  })

  it('does not change the attention count, review status or tone', () => {
    const ma = buildValidationModel(mismatched)
    const mb = buildValidationModel(matched)

    // The attention figure is `errorCount + warningCount`, so a warning here
    // would move it. The area status is the sharper one: `buildReview` keys on
    // a finding *existing*, so a downgrade to `info` would still have flipped
    // `captured` to `needsReview`. Both are pinned.
    expect(ma.hero.attentionCount).toBe(mb.hero.attentionCount)
    expect(ma.hero.noteCount).toBe(mb.hero.noteCount)
    expect(ma.review.map((r) => [r.id, r.status, r.tone, r.health])).toEqual(
      mb.review.map((r) => [r.id, r.status, r.tone, r.health])
    )
  })

  it('does not change readiness or the next actions', () => {
    const da = dashboardOf(mismatched)
    const db = dashboardOf(matched)

    expect(da.readiness).toEqual(db.readiness)
    expect(da.documents).toEqual(db.documents)
    expect(da.nextActions).toEqual(db.nextActions)
    // Nothing warning-toned may appear because of the guest name.
    expect(da.nextActions.map((n) => n.id)).not.toContain('reviewWarnings')
  })
})
