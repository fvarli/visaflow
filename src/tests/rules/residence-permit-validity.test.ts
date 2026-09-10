import { describe, it, expect } from 'vitest'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import { residencePermitOutlastsTrip } from '@/domain/rules/document.rules'
import { runValidation } from '@/domain/rules/runner'
import { resolveVisaTemplate } from '@/config/countries'
import { ctxFor } from '@/tests/support/applicability'

/**
 * Annex III I.5(g)'s three-month bar, enforced.
 *
 * H4c1b shipped the criterion as prose and said so; this is the rule that
 * checks it. The interesting cases are almost all the silent ones — a
 * validation engine earns trust by what it declines to say as much as by what
 * it catches, and every silence below is a decision rather than an oversight.
 */

const GREECE = resolveVisaTemplate('GR', 'short_stay_tourism')
if (!GREECE) throw new Error('Greece tourism template is not registered')

const PERMIT = 'FILING_COUNTRY_RESIDENCE_PERMIT'

const applicant = (nationality: string): Applicant =>
  ({ id: 'a1', nationality }) as Applicant

const application = (exitDate = '2026-06-10'): Application =>
  ({
    destinationCountry: 'GR',
    visaType: 'short_stay_tourism',
    employment: { employmentStatus: 'employed' },
    trip: { entryDate: '2026-06-01', exitDate },
  }) as unknown as Application

const permitDoc = (over: Partial<Document> = {}): Document =>
  ({
    id: 'd-permit',
    code: PERMIT,
    category: 'identity',
    ownerType: 'applicant',
    ownerId: 'a1',
    required: true,
    status: 'ready',
    verified: false,
    ...over,
  }) as unknown as Document

const run = (
  documents: Document[],
  nationality = 'PL',
  exitDate = '2026-06-10'
) => {
  const app = application(exitDate)
  const who = applicant(nationality)
  return residencePermitOutlastsTrip({
    dossier: {
      applicant: who,
      application: app,
      documents,
      sponsors: [],
    } as unknown as Dossier,
    template: GREECE,
    applicability: ctxFor(app, who),
  })
}

describe('residencePermitOutlastsTrip — the bar', () => {
  it('accepts a permit valid exactly three months after the trip ends', () => {
    // `isBefore` is strict and `parseISO` gives both dates local midnight, so
    // the boundary is exact rather than off by a fraction of a day. Nothing
    // pinned that for the passport rule this mirrors; it does now, twice.
    expect(run([permitDoc({ validUntil: '2026-09-10' })])).toEqual([])
  })

  it('rejects a permit one day short of it', () => {
    const findings = run([permitDoc({ validUntil: '2026-09-09' })])
    expect(findings).toHaveLength(1)
    expect({
      id: findings[0]?.id,
      severity: findings[0]?.severity,
      ruleId: findings[0]?.ruleId,
    }).toEqual({
      id: 'residence-permit-expires-too-soon-d-permit',
      severity: 'error',
      ruleId: 'document.residencePermitValidity',
    })
  })

  it('accepts a permit valid well beyond it', () => {
    expect(run([permitDoc({ validUntil: '2027-01-01' })])).toEqual([])
  })

  it('moves the threshold when the trip moves', () => {
    // The bar is three months past *this* trip, not a fixed date. A permit that
    // passed for a June return fails for a September one.
    const permit = [permitDoc({ validUntil: '2026-09-10' })]
    expect({
      juneReturn: run(permit, 'PL', '2026-06-10').length,
      septemberReturn: run(permit, 'PL', '2026-09-01').length,
    }).toEqual({ juneReturn: 0, septemberReturn: 1 })
  })
})

describe('residencePermitOutlastsTrip — what it declines to say', () => {
  it('says nothing when the expiry is unknown', () => {
    // The house convention, set by `documentsNotExpiredBeforeAppointment`:
    // an absent `validUntil` is never a finding in either direction. Calling it
    // valid and calling it expired are both inventions.
    expect(run([permitDoc({})])).toEqual([])
  })

  it.each(['not_applicable', 'needs_update'] as const)(
    'says nothing about a permit already marked %s',
    (status) => {
      expect(run([permitDoc({ validUntil: '2026-01-01', status })])).toEqual([])
    }
  )

  it('says nothing to a Turkish national, because the requirement does not apply', () => {
    // The rule asks the pack whether the requirement applies rather than
    // repeating its nationality condition, so the two can never disagree.
    expect(run([permitDoc({ validUntil: '2026-01-01' })], 'TR')).toEqual([])
  })

  it('says nothing when the trip has no return date', () => {
    const app = { ...application(), trip: undefined } as unknown as Application
    const who = applicant('PL')
    expect(
      residencePermitOutlastsTrip({
        dossier: {
          applicant: who,
          application: app,
          documents: [permitDoc({ validUntil: '2020-01-01' })],
          sponsors: [],
        } as unknown as Dossier,
        template: GREECE,
        applicability: ctxFor(app, who),
      })
    ).toEqual([])
  })
})

describe('residencePermitOutlastsTrip — it does not double-report', () => {
  it('leaves "you have no permit at all" to the rule that already says it', () => {
    /**
     * Two rules could plausibly claim this case, and only one should. Running
     * the whole engine rather than the rule alone is what proves the silence —
     * calling the rule in isolation could only show that *it* stays quiet, not
     * that the dossier is reported exactly once.
     */
    const app = application()
    const who = applicant('PL')
    const findings = runValidation({
      dossier: {
        applicant: who,
        application: app,
        documents: [],
        sponsors: [],
      } as unknown as Dossier,
      template: GREECE,
      applicability: ctxFor(app, who),
    }).findings

    const missing = findings.filter(
      (f) => f.ruleId === 'document.requiredNotStarted'
    )
    expect({
      reportedMissing: missing
        .flatMap((f) => f.messageParams?.documentCodes?.documents ?? [])
        .includes(PERMIT),
      validityFindings: findings.filter(
        (f) => f.ruleId === 'document.residencePermitValidity'
      ).length,
    }).toEqual({ reportedMissing: true, validityFindings: 0 })
  })
})

describe('the regression this slice exists to fix', () => {
  /**
   * H4c1b shipped a nationality-conditional requirement while the validation
   * rules were still deriving applicability from `dossier.application` — an
   * `Application`, which satisfies `ApplicabilityContext` structurally and
   * carries no nationality. So the permit was outstanding in the readiness ring
   * and invisible to the consistency centre: one dossier, two answers, exactly
   * the divergence the shared context was introduced to end.
   *
   * Nothing caught it because every rules fixture is Turkish, and for a Turkish
   * applicant both readings agree. This test is the one that would have.
   */
  it('names the missing permit to a non-Turkish applicant', () => {
    const app = application()
    const who = applicant('PL')
    const named = runValidation({
      dossier: {
        applicant: who,
        application: app,
        documents: [],
        sponsors: [],
      } as unknown as Dossier,
      template: GREECE,
      applicability: ctxFor(app, who),
    })
      .findings.flatMap((f) => f.messageParams?.documentCodes?.documents ?? [])
      .includes(PERMIT)

    expect(named).toBe(true)
  })

  it('and says nothing about it to a Turkish one', () => {
    // The other half of the same fix: threading the context must not make the
    // requirement appear for a population the authority does not name.
    const app = application()
    const who = applicant('TR')
    const named = runValidation({
      dossier: {
        applicant: who,
        application: app,
        documents: [],
        sponsors: [],
      } as unknown as Dossier,
      template: GREECE,
      applicability: ctxFor(app, who),
    })
      .findings.flatMap((f) => f.messageParams?.documentCodes?.documents ?? [])
      .includes(PERMIT)

    expect(named).toBe(false)
  })
})
