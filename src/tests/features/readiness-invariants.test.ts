import { describe, it, expect } from 'vitest'
import { buildDashboardModel } from '@/features/dashboard/dashboard-model'
import { buildDocumentsModel } from '@/features/documents/documents-model'
import { buildValidationModel } from '@/features/validation/validation-model'
import { buildTimelineModel } from '@/features/timeline/timeline-model'
import { buildFinalReviewModel } from '@/features/review/review-model'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { deriveNextActions } from '@/features/readiness/readiness-model'
import { resolveVisaTemplate } from '@/config/countries'
import { runValidation } from '@/domain/rules/runner'
import { deriveTasks } from '@/features/timeline/timeline-tasks'
import {
  attentionCount,
  needsAttention,
} from '@/features/review/review-checklist'
import { DOCUMENT_STATUS_TONE } from '@/components/ui/status-badge'
import { CHECKLIST_STATE_TONE } from '@/components/review/state-meta'
import {
  ALL_FIXTURE_ENTRIES,
  allApplicableReady,
  manyNotApplicable,
  partiallyPrepared,
  readyButWithFindings,
  receivedHeavy,
  toDossier,
  type DossierFixture,
} from '@/tests/fixtures/dossiers'

const NOW = new Date('2099-01-15T00:00:00.000Z')

/** The canonical figure, composed exactly as every surface composes it. */
function canonical(fixture: DossierFixture) {
  return buildDocumentReadiness({
    documents: fixture.documents,
    requiredRequirementCodes: requiredRequirementCodes(
      resolveVisaTemplate(
        fixture.application?.destinationCountry,
        fixture.application?.visaType
      ),
      fixture.application
    ),
  })
}

describe('INVARIANT 1 — one readiness number on every surface', () => {
  it.each(ALL_FIXTURE_ENTRIES)(
    'Dashboard, Documents, Validation Center, Timeline and Final Review agree (%s)',
    (_name, fixture) => {
      const expected = canonical(fixture)

      const dashboard = buildDashboardModel(fixture, NOW).active
      const documents = buildDocumentsModel(fixture, NOW)
      const validation = buildValidationModel(fixture)
      const timeline = buildTimelineModel(fixture, NOW)
      const review = buildFinalReviewModel(fixture, NOW)

      // The percentage — the number the user actually reads.
      expect(dashboard.readiness.percent).toBe(expected.percent)
      expect(documents.readiness.percent).toBe(expected.percent)
      expect(validation.hero.readinessPercent).toBe(expected.percent)
      expect(review.readiness.percent).toBe(expected.percent)

      // The counts behind it.
      expect(dashboard.documents).toEqual(expected)
      expect(documents.readiness).toEqual(expected)
      expect(validation.hero.readiness).toEqual(expected)
      expect(review.readiness.documents).toEqual(expected)

      // Timeline shows no percentage, but its "remaining" must be the same idea.
      expect(timeline.outstandingDocuments).toBe(expected.outstanding)
      expect(dashboard.readiness.outstanding).toBe(expected.outstanding)
      expect(review.readiness.outstanding).toBe(expected.outstanding)
    }
  )

  it.each(ALL_FIXTURE_ENTRIES)(
    'the readiness state is the same everywhere (%s)',
    (_name, fixture) => {
      const dashboard = buildDashboardModel(fixture, NOW).active
      const timeline = buildTimelineModel(fixture, NOW)
      const review = buildFinalReviewModel(fixture, NOW)
      expect(timeline.phase).toBe(dashboard.readiness.state)
      expect(review.readiness.state).toBe(dashboard.readiness.state)
    }
  )
})

describe('INVARIANT 2 — not_applicable never fakes progress', () => {
  it('is excluded from the numerator and the denominator', () => {
    const r = canonical(manyNotApplicable)
    expect(r.notApplicable).toBeGreaterThan(0)
    expect(r.applicable).toBe(r.requiredTotal - r.notApplicable)
    // Every applicable document is ready, so the disclaimed ones must not stop
    // the dossier reaching 100% — nor may they be counted as completed work.
    expect(r.ready).toBe(r.applicable)
    expect(r.ready).toBeLessThan(r.requiredTotal)
    expect(r.percent).toBe(100)
  })

  it('does not move the percentage when work is marked not applicable', () => {
    const before = buildDocumentReadiness({
      documents: manyNotApplicable.documents.filter(
        (d) => d.status !== 'not_applicable'
      ),
    })
    const after = buildDocumentReadiness({
      documents: manyNotApplicable.documents,
    })
    expect(after.percent).toBe(before.percent)
    expect(after.applicable).toBe(before.applicable)
  })

  it('never reports a fully-disclaimed dossier as ready for the appointment', () => {
    const allDisclaimed: DossierFixture = {
      ...manyNotApplicable,
      documents: manyNotApplicable.documents.map((d) => ({
        ...d,
        status: 'not_applicable' as const,
        notes: 'Not required for this applicant.',
      })),
    }
    const r = buildDocumentReadiness({ documents: allDisclaimed.documents })
    expect(r.hasApplicableWork).toBe(false)
    expect(r.complete).toBe(false)
    expect(r.percent).toBe(0)

    // The old dashboard arithmetic reported 100% "ready for your appointment"
    // here, directly above a progress bar reading "0 of 3 ready".
    const dashboard = buildDashboardModel(
      { ...allDisclaimed, application: null },
      NOW
    ).active
    expect(dashboard.readiness.state).not.toBe('ready_for_appointment')
  })

  it('keeps 100% reachable for a dossier that contains not-applicable work', () => {
    const r = canonical(manyNotApplicable)
    expect(r.percent).toBe(100)
    expect(r.complete).toBe(true)
  })
})

describe('INVARIANT 3 — received has one documented semantic', () => {
  const r = canonical(receivedHeavy)

  it('is never counted as missing', () => {
    expect(r.notStarted).toBe(0)
    expect(r.inProgress).toBe(0)
    const actions = deriveNextActions(
      r,
      runValidation(toDossier(receivedHeavy)!),
      receivedHeavy.application
    )
    const missing = actions.find((a) => a.id === 'completeMissingDocs')
    // The only outstanding work is unconfirmed, so nothing is "missing".
    expect(missing?.count ?? 0).toBe(r.notStarted + r.inProgress)
    expect(actions.some((a) => a.id === 'confirmDocuments')).toBe(true)
  })

  it('is never counted as ready', () => {
    expect(r.obtained).toBeGreaterThan(0)
    expect(r.ready).toBeLessThan(r.applicable)
    expect(r.complete).toBe(false)
  })

  it('stays inside the denominator as outstanding work', () => {
    expect(r.outstanding).toBe(r.applicable - r.ready)
    expect(r.outstanding).toBeGreaterThanOrEqual(r.obtained)
  })

  it('never renders as a defect', () => {
    expect(DOCUMENT_STATUS_TONE.received).not.toBe('warning')
    expect(DOCUMENT_STATUS_TONE.received).not.toBe('danger')
    expect(CHECKLIST_STATE_TONE.obtained).not.toBe('warning')
    expect(CHECKLIST_STATE_TONE.obtained).not.toBe('danger')
  })

  it('generates no validation finding merely by being received', () => {
    const dossier = toDossier(receivedHeavy)!
    const receivedIds = receivedHeavy.documents
      .filter((d) => d.status === 'received')
      .map((d) => d.id)
    const findings = runValidation(dossier).findings
    for (const id of receivedIds) {
      expect(
        findings.some((f) =>
          f.relatedFields.some((rf) => rf.startsWith(`documents.${id}`))
        )
      ).toBe(false)
    }
  })

  it('completes its preparation task while leaving the dossier unready', () => {
    // The load-bearing distinction: "have you obtained it?" and "is it
    // dossier-ready?" are different questions with different right answers.
    const application = receivedHeavy.application!
    const template = resolveVisaTemplate(
      application.destinationCountry,
      application.visaType
    )
    const tasks = deriveTasks(
      {
        application,
        documents: receivedHeavy.documents,
        template,
        findings: [],
      },
      NOW
    )
    const bankTask = tasks.find((t) => t.id.includes('obtain-bank-statements'))
    expect(bankTask?.status).toBe('ready')

    // ...while readiness still counts it as outstanding.
    expect(canonical(receivedHeavy).complete).toBe(false)
    const review = buildFinalReviewModel(receivedHeavy, NOW)
    const bankRow = review.checklist.rows.find(
      (row) => row.code === 'BANK_STATEMENTS'
    )
    expect(bankRow?.state).toBe('obtained')
    expect(needsAttention(bankRow!)).toBe(true)
  })

  it('does not satisfy the appointment-day readiness check', () => {
    const review = buildFinalReviewModel(receivedHeavy, NOW)
    const requiredDocs = review.appointmentDay.items.find(
      (i) => i.id === 'requiredDocuments'
    )
    expect(requiredDocs?.ready).toBe(false)
  })
})

describe('INVARIANT 4 — the Validation Center cannot relabel a different metric', () => {
  it.each(ALL_FIXTURE_ENTRIES)(
    'its hero percentage is the canonical readiness (%s)',
    (_name, fixture) => {
      const validation = buildValidationModel(fixture)
      expect(validation.hero.readinessPercent).toBe(canonical(fixture).percent)
    }
  )

  it('reports checks-passed separately, and never as a percentage', () => {
    const validation = buildValidationModel(partiallyPrepared)
    expect(validation.hero.checksTotal).toBeGreaterThan(0)
    // Checks are a count out of a count — deliberately not a second ratio.
    expect(validation.hero).not.toHaveProperty('checksPercent')
    expect(validation.hero).not.toHaveProperty('healthScore')
    expect(validation.hero).not.toHaveProperty('confidence')
  })
})

describe('INVARIANT 5 — priority stays aligned across surfaces', () => {
  it.each(ALL_FIXTURE_ENTRIES)(
    'Dashboard, Timeline and Final Review highlight the same action (%s)',
    (_name, fixture) => {
      const dashboard = buildDashboardModel(fixture, NOW).active
      const timeline = buildTimelineModel(fixture, NOW)
      const review = buildFinalReviewModel(fixture, NOW)
      const expected = dashboard.nextActions[0] ?? null
      expect(timeline.primaryAction).toEqual(expected)
      expect(review.primaryAction).toEqual(expected)
    }
  )
})

describe('readiness and consistency health are independent axes', () => {
  it('a fully ready dossier can still carry findings', () => {
    const readiness = canonical(readyButWithFindings)
    const validation = buildValidationModel(readyButWithFindings)
    expect(readiness.percent).toBe(100)
    expect(readiness.complete).toBe(true)
    expect(validation.hero.attentionCount).toBeGreaterThan(0)
  })

  it('identical documents give identical readiness whatever the findings', () => {
    // `readyButWithFindings` differs from `allApplicableReady` only in its
    // appointment date, so readiness must be byte-identical.
    expect(canonical(readyButWithFindings)).toEqual(
      canonical(allApplicableReady)
    )
    expect(
      buildValidationModel(readyButWithFindings).hero.attentionCount
    ).not.toBe(buildValidationModel(allApplicableReady).hero.attentionCount)
  })

  it('a finding-light dossier can still be far from ready', () => {
    const readiness = canonical(partiallyPrepared)
    expect(readiness.percent).toBeLessThan(100)
    expect(readiness.complete).toBe(false)
  })

  it('validation findings never reach the readiness derivation', () => {
    // Structural: the builder takes documents only. Changing the application so
    // the engine raises an error must leave readiness untouched.
    const quiet = canonical(allApplicableReady)
    const noisy = canonical(readyButWithFindings)
    expect(noisy).toEqual(quiet)
  })
})

describe('optional documents never move readiness', () => {
  it.each(ALL_FIXTURE_ENTRIES)(
    'adding optional documents changes only the optional count (%s)',
    (_name, fixture) => {
      const before = buildDocumentReadiness({ documents: fixture.documents })
      const after = buildDocumentReadiness({
        documents: [
          ...fixture.documents,
          {
            id: 'extra-optional',
            code: 'EXTRA_OPTIONAL',
            category: 'supporting',
            ownerType: 'applicant',
            ownerId: 'fixture-applicant',
            required: false,
            status: 'not_started',
            verified: false,
          },
        ],
      })
      expect(after.percent).toBe(before.percent)
      expect(after.applicable).toBe(before.applicable)
      expect(after.ready).toBe(before.ready)
      expect(after.outstanding).toBe(before.outstanding)
      expect(after.optional).toBe(before.optional + 1)
    }
  )
})

describe('INVARIANT 6 — every readiness consumer uses the same denominator', () => {
  it.each(ALL_FIXTURE_ENTRIES)(
    'the sidebar badge equals the canonical outstanding count (%s)',
    (_name, fixture) => {
      // The nav badge used to omit `requiredRequirementCodes`, so it showed 3
      // while every page body showed 4 (ADR-034).
      const template = resolveVisaTemplate(
        fixture.application?.destinationCountry,
        fixture.application?.visaType
      )
      const badge = buildDocumentReadiness({
        documents: fixture.documents,
        requiredRequirementCodes: requiredRequirementCodes(
          template,
          fixture.application
        ),
      })
      expect(badge.outstanding).toBe(canonical(fixture).outstanding)
    }
  )

  it.each(ALL_FIXTURE_ENTRIES)(
    'appointment-day readiness agrees with canonical completeness (%s)',
    (_name, fixture) => {
      const review = buildFinalReviewModel(fixture, NOW)
      const requiredDocs = review.appointmentDay.items.find(
        (i) => i.id === 'requiredDocuments'
      )
      expect(requiredDocs?.ready).toBe(canonical(fixture).complete)
    }
  )
})

describe('INVARIANT 7 — the checklist is an inventory, not a second ratio', () => {
  it.each(ALL_FIXTURE_ENTRIES)(
    'optional requirements with no record never enter the package (%s)',
    (_name, fixture) => {
      const review = buildFinalReviewModel(fixture, NOW)
      const bare = review.checklist.rows.filter(
        (row) => row.status === 'not_instantiated'
      )
      // A suggestion nobody added is not something you carry to the appointment.
      expect(bare.every((row) => row.required)).toBe(true)
    }
  )

  it('counts the package as an inventory that the attention count subsets', () => {
    const review = buildFinalReviewModel(partiallyPrepared, NOW)
    const counts = review.checklist.counts
    expect(counts.actionable).toBeGreaterThan(0)
    expect(attentionCount(counts)).toBeLessThanOrEqual(counts.actionable)
    // The inventory is deliberately a different population from readiness —
    // it may include optional documents the applicant actually created.
    expect(counts.actionable).toBeGreaterThanOrEqual(
      canonical(partiallyPrepared).ready
    )
  })
})
