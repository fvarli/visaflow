import { describe, it, expect } from 'vitest'
import { grTrMissionSources } from '@/config/sources/gr-tr-mission.sources'
import { grTrMissionLayer } from '@/config/countries/jurisdictions/gr-tr-mission'
import { compositionFor } from '@/tests/support/production-compositions'
import tr from '@/i18n/locales/tr/visa-domain.json'
import en from '@/i18n/locales/en/visa-domain.json'

/**
 * The visa centre's checklist, as a source record rather than as prose.
 *
 * It had driven two production corrections before it had a record at all —
 * `SPONSOR_BANK_STATEMENTS`' invented date range, and the signature circular's
 * entire corrected population — because it was read first-hand and recorded in
 * ADR-047's evidence passes. Having no `RequirementSource` was a gap in our
 * modelling, not in the evidence, and H4c2d2o closed it.
 *
 * What the record must not do is overstate what it is. The Greek mission
 * *directs* applicants here; it does not publish this. The operator is a
 * contractor, and the checklist is a generator with no stable per-combination
 * address.
 */

const ID = 'gr-tr-visa-centre-checklist'
const source = grTrMissionSources.find((s) => s.id === ID)

describe('visa-centre source — what the record says it is', () => {
  it('exists, in the layer whose applicants it describes', () => {
    expect(source).toBeDefined()
  })

  it('is typed as an authorized visa centre, not an embassy or a government', () => {
    // The vocabulary already had this value and nothing had used it. A
    // contractor's operational checklist is exactly what it is for, and calling
    // it `embassy` or `government` would claim a publisher it does not have.
    expect(source?.sourceType).toBe('authorized_visa_center')
  })

  it('names the operator as the authority, not the ministry', () => {
    // The distinction this record exists to keep: mission-directed is not
    // mission-published. Describing the Hellenic Republic as the author would
    // assert an authority nobody has.
    expect(source?.authority).toContain('Kosmos Vize')
    expect(source?.authority).not.toMatch(/Ministry of Foreign Affairs/)
  })

  it('carries the dates of the passes that actually read it', () => {
    expect(source?.retrievedAt).toBe('2026-09-12')
    expect(source?.lastVerifiedAt).toBe('2026-09-12')
    expect(source?.jurisdiction).toBe('TR')
    expect(source?.language).toBe('tr')
  })

  it('cites the entry point, because there is no per-combination address', () => {
    // ADR-047: the list is produced from a residence province, a consular
    // branch and six applicant axes. The homepage is what the mission names and
    // where the site's own navigation starts.
    expect(source?.url).toBe('https://www.kosmosvize.com.tr/')
  })

  it('says in both languages that it is directed rather than published', () => {
    for (const [loc, bundle] of [
      ['tr', tr],
      ['en', en],
    ] as const) {
      const notes = bundle.sources[ID]?.notes ?? ''
      expect(notes.length, loc).toBeGreaterThan(200)
      expect(notes, loc).toMatch(/mfa\.gr\/turkey/)
    }
    expect(en.sources[ID]?.notes).toMatch(
      /Mission-directed rather than mission-published/
    )
  })
})

describe('visa-centre source — attached only where the contract is supported', () => {
  /**
   * A citation vouches for the condition as well as the document (ADR-048), so
   * this source may reach a row only where the checklist supports the
   * population that row renders — not merely the document.
   *
   * Two rows in the very same company-document block are deliberately excluded.
   * The checklist asks an employee, a company owner and a freelancer for the
   * activity certificate and the trade-register bulletin; both rows render
   * `self_employed` and cite Annex III, which names company owners only. Until
   * that is adjudicated, attaching this source would make it vouch for a
   * condition it does not state.
   */
  const composed = compositionFor('GR').template.documentRequirements
  const carrying = composed
    .filter((r) => (r.sourceRefs ?? []).includes(ID))
    .map((r) => r.code)
    .sort()

  it('reaches exactly the two rows whose evidence was established', () => {
    expect(carrying).toEqual([
      'EMPLOYER_SIGNATURE_CIRCULAR',
      'FARMER_CERTIFICATE',
    ])
  })

  it.each(['COMPANY_ACTIVITY_CERTIFICATE', 'EMPLOYER_TRADE_REGISTRY'])(
    '%s shares the block and is still not cited to it',
    (code) => {
      const req = composed.find((r) => r.code === code)
      expect(req?.sourceRefs ?? []).not.toContain(ID)
    }
  )

  it('the owned row declares it; the shared row receives it by refinement', () => {
    // Applicability may only be declared by the owning layer, and a citation
    // may be appended by a later one. The circular is Greece's own, so it
    // carries the ref directly; the farmer certificate belongs to `tr-filing`,
    // so Greece attaches its corroboration without touching what Germany sees.
    const owned = (grTrMissionLayer.add ?? []).find(
      (r) => r.code === 'EMPLOYER_SIGNATURE_CIRCULAR'
    )
    expect(owned?.sourceRefs).toEqual([ID])

    const refined = (grTrMissionLayer.refine ?? []).find(
      (r) => r.code === 'FARMER_CERTIFICATE'
    )
    expect(refined?.addSourceRefs).toEqual([ID])
  })

  it('and Germany composes neither the source nor the reference', () => {
    const de = compositionFor('DE')
    expect((de.sources ?? []).map((s) => s.id)).not.toContain(ID)
    expect(
      de.template.documentRequirements.flatMap((r) => r.sourceRefs ?? [])
    ).not.toContain(ID)
  })
})
