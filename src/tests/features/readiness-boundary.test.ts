import { describe, it, expect } from 'vitest'
import { buildDossierSnapshot } from '@/features/dashboard/dashboard-model'
import { deriveReadinessState } from '@/features/readiness/readiness-model'
import { deriveTasks } from '@/features/timeline/timeline-tasks'
import { buildSubmissionChecklist } from '@/features/review/review-checklist'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { resolveVisaTemplate } from '@/config/countries'
import {
  allApplicableReady,
  withNonCurrentRecords,
  type DossierFixture,
} from '@/tests/fixtures/dossiers'

/**
 * The canonical/collection boundary (ADR-051).
 *
 * A surface that reports *how prepared this dossier is* must answer from the
 * template as it stands today. A surface that reports *what records exist* may
 * count everything. The failure this file pins is a surface in the first group
 * computing its number the second group's way — which is what five of them
 * were doing, each printing a count the canonical percentage a few pixels away
 * already disagreed with.
 *
 * `withNonCurrentRecords` is `allApplicableReady` plus one withdrawn, one
 * unrecognised, one applicant-added and one no-longer-applicable record. Every
 * canonical surface must read the two dossiers identically; the leaks are
 * exactly the places where it did not.
 */

const NOW = new Date('2099-01-15T00:00:00.000Z')

const templateOf = (fixture: DossierFixture) =>
  resolveVisaTemplate(
    fixture.application?.destinationCountry,
    fixture.application?.visaType
  )

const readinessOf = (fixture: DossierFixture) => {
  const template = templateOf(fixture)
  return buildDocumentReadiness({
    documents: fixture.documents,
    requiredRequirementCodes: requiredRequirementCodes(
      template,
      fixture.application
    ),
    template,
    application: fixture.application,
  })
}

/** The four records that separate the two fixtures. */
const NON_CURRENT_CODES = [
  'TAX_RETURNS',
  'NOT_A_REAL_CODE',
  'CUSTOM-notarised-letter',
  'SOCIAL_SECURITY',
]

it('the fixtures differ only by records that are not current work', () => {
  const extra = withNonCurrentRecords.documents.filter(
    (d) => !allApplicableReady.documents.some((base) => base.id === d.id)
  )
  expect(extra.map((d) => d.code)).toEqual(NON_CURRENT_CODES)
  // Each carries `required: true` in storage — the flag that made them leak.
  expect(extra.every((d) => d.required)).toBe(true)
})

describe('LEAK 2 — the Dashboard snapshot sentence', () => {
  /**
   * Rendered as "{{count}} documents ready", two grid cells from the canonical
   * ring. `buildDossierSnapshot` called `buildDocumentReadiness({ documents })`
   * with no template, so the sentence counted three records the ring excluded.
   */
  const readyCount = (fixture: DossierFixture) =>
    buildDossierSnapshot({
      applicant: fixture.applicant,
      application: fixture.application,
      documents: fixture.documents,
      sponsors: fixture.sponsors,
    }).find((item) => item.key === 'documentsReady')?.count

  it('counts what the ring beside it counts', () => {
    expect(readyCount(withNonCurrentRecords)).toBe(
      readinessOf(withNonCurrentRecords).ready
    )
  })

  it('is not inflated by records that are not current work', () => {
    expect(readyCount(withNonCurrentRecords)).toBe(
      readyCount(allApplicableReady)
    )
  })
})

describe('LEAK 3 — the readiness caption on three heroes', () => {
  /**
   * The sharpest of the five: `deriveReadinessState` received the readiness
   * object *and* the raw documents, so a correct percentage could sit directly
   * above a caption derived from the ungated persisted flag. It feeds the
   * Dashboard, Review and Timeline heroes at once.
   */
  const state = (fixture: DossierFixture) =>
    deriveReadinessState(
      readinessOf(fixture),
      fixture.documents,
      0,
      Boolean(fixture.application?.appointment?.date),
      templateOf(fixture),
      fixture.application
    )

  it('reads the same for a dossier that differs only in non-current records', () => {
    expect(state(withNonCurrentRecords)).toBe(state(allApplicableReady))
  })

  it('does not report work remaining above a complete ring', () => {
    const readiness = readinessOf(withNonCurrentRecords)
    expect(readiness.complete).toBe(true)
    expect(readiness.percent).toBe(100)
    expect(state(withNonCurrentRecords)).toBe('ready_for_appointment')
  })

  /**
   * A complete dossier returns before the filter is reached, so completeness
   * alone cannot expose this leak. `everythingInHand` is the case that does:
   * every applicable requirement is `received` — obtained but unconfirmed — so
   * the dossier is genuinely incomplete and the filter runs, while the only
   * record not in hand is one nobody asks for.
   */
  const everythingInHand: DossierFixture = {
    ...withNonCurrentRecords,
    documents: withNonCurrentRecords.documents.map((d) =>
      d.status === 'ready' && d.code !== 'TAX_RETURNS'
        ? { ...d, status: 'received' as const }
        : d.code === 'TAX_RETURNS'
          ? { ...d, status: 'not_started' as const }
          : d
    ),
  }

  it('does not call a withdrawn requirement the work that remains', () => {
    expect(readinessOf(everythingInHand).complete).toBe(false)
    // Everything the dossier still owes is already in the applicant's hands;
    // the only thing not obtained is withdrawn. Reading "documents remaining"
    // here sends someone to collect a document nobody asks for.
    expect(state(everythingInHand)).toBe('preparing')
  })

  it('still reports work remaining when the work is real', () => {
    // The fix must not have been achieved by never saying "remaining".
    const oneOutstanding: DossierFixture = {
      ...everythingInHand,
      documents: everythingInHand.documents.map((d, i) =>
        i === 0 ? { ...d, status: 'not_started' as const } : d
      ),
    }
    expect(state(oneOutstanding)).toBe('documents_remaining')
  })

  it('derives the caption category from the template, not the record', () => {
    // The second half of the same leak: `waiting_reservations` versus
    // `documents_remaining` turns on the category, and a stale persisted
    // category would pick the wrong sentence for a document the pack has since
    // recategorised.
    const staleCategory: DossierFixture = {
      ...everythingInHand,
      documents: everythingInHand.documents.map((d) =>
        d.code === 'ACCOMMODATION'
          ? {
              ...d,
              status: 'not_started' as const,
              category: 'financial' as const,
            }
          : d
      ),
    }
    expect(state(staleCategory)).toBe('waiting_reservations')
  })
})

describe('LEAK 4 — the Timeline "final review" task', () => {
  /**
   * `reviewStatus` filtered on the persisted flag while its own input already
   * carried the template. A withdrawn requirement the applicant never obtained
   * left the chip stuck on `inProgress` with no reachable way to finish it.
   */
  const reviewTask = (fixture: DossierFixture) =>
    deriveTasks(
      {
        application: fixture.application!,
        documents: fixture.documents,
        template: templateOf(fixture),
        findings: [],
      },
      NOW
    ).find((task) => task.milestoneId === 'final-review')

  it('can be completed by a dossier whose only gap is a withdrawn requirement', () => {
    expect(reviewTask(withNonCurrentRecords)?.status).toBe(
      reviewTask(allApplicableReady)?.status
    )
    expect(reviewTask(withNonCurrentRecords)?.status).toBe('ready')
  })
})

describe('LEAK 5 — the Final Review checklist and its printout', () => {
  /**
   * The checklist enumerated every record, so a withdrawn requirement the
   * applicant never obtained appeared as `missing` — telling someone to go and
   * fetch a document nobody asks for, on screen and on paper.
   */
  const rows = (fixture: DossierFixture) =>
    buildSubmissionChecklist(
      fixture.documents,
      fixture.application,
      templateOf(fixture),
      fixture.application?.appointment?.date ?? null
    ).rows

  it('does not ask for a withdrawn requirement that was never obtained', () => {
    const withUnobtainedRetired: DossierFixture = {
      ...withNonCurrentRecords,
      documents: withNonCurrentRecords.documents.map((d) =>
        d.code === 'TAX_RETURNS' ? { ...d, status: 'not_started' as const } : d
      ),
    }
    const row = rows(withUnobtainedRetired).find(
      (r) => r.code === 'TAX_RETURNS'
    )
    expect(row).toBeUndefined()
  })

  it('still carries a withdrawn document the applicant actually holds', () => {
    // The opposite error would be worse: the package is what goes in the
    // folder, and dropping something already filed loses more than it protects.
    const row = rows(withNonCurrentRecords).find(
      (r) => r.code === 'TAX_RETURNS'
    )
    expect(row?.state).toBe('ready')
  })

  it('keeps a record this build cannot account for, whatever its status', () => {
    // An unrecognised code is not a withdrawn one. It may be a real document
    // from a newer build, and hiding it would hide the user's own work.
    const codes = rows(withNonCurrentRecords).map((r) => r.code)
    expect(codes).toContain('NOT_A_REAL_CODE')
    expect(codes).toContain('CUSTOM-notarised-letter')
  })
})
