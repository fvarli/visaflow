import { grTrMissionSources } from '../../sources/gr-tr-mission.sources'
import type { RequirementLayer } from '../../types'

/**
 * The Greek mission's authority over applications lodged in Türkiye.
 *
 * Greece's consulate publishes its own rendering of the harmonised list the
 * Commission adopted for Türkiye, and restates the Visa Code's passport,
 * insurance and application-form criteria in the consulate's own words. Both
 * are real evidence about what an applicant filing for Greece actually faces —
 * and neither is evidence about any other destination, which is why they attach
 * here and reach nothing else.
 *
 * WHY THIS IS A SEPARATE LAYER RATHER THAN PART OF `greeceDestinationLayer`.
 * The destination layer composes *before* `tr-filing`, so putting these
 * refinements there would have an earlier layer refining a later layer's
 * requirement — the reverse of the order ADR-052 states. The composer's
 * two-pass resolution would permit it, which is precisely the problem: the ADR
 * would then be describing something the code does not do. A mission layer
 * placed after `tr-filing` refines in the stated direction and names its
 * authority accurately.
 *
 * IT ALSO OWNS TWO REQUIREMENTS, AND NEITHER IS A FINDING. Both were inherited
 * from before the layer split and neither has a resolvable official source.
 * They are held here as **quarantine**, not endorsement: scoped to the one pack
 * that carries them so a second destination cannot inherit an unverified ask.
 * Nothing about this placement says Greece currently requires either document.
 *
 * They are not retired instead, because the Greek mission page returns HTTP 403
 * to this environment, and an unreachable source is not evidence that the
 * requirement is gone. Retiring on that basis would strip documents from Greek
 * applicants' checklists on the strength of a network failure. Both are listed
 * in the evidence-gap allowlist in `country-pack-provenance.test.ts`, which
 * bounds the set and demands a written reason for each.
 */
export const grTrMissionLayer: RequirementLayer = {
  id: 'gr-tr-mission',
  kind: 'jurisdiction',
  add: [
    /**
     * Moved out of the common layer, where it never belonged.
     *
     * There is no Annex II basis for it, and Visa Code Article 21(2) requires
     * the consulate to consult the VIS for each application — so prior
     * *Schengen* visas are retrieved electronically rather than collected from
     * the applicant. That is also why Germany's own version is scoped to UK,
     * USA and Canada: those are the visas the VIS cannot see.
     *
     * Uncited, and held here rather than retired for the reason above.
     */
    {
      code: 'PREVIOUS_VISAS',
      nameKey: 'visa-domain:requirements.PREVIOUS_VISAS.name',
      descriptionKey: 'visa-domain:requirements.PREVIOUS_VISAS.description',
      category: 'previous_travel',
      ownerType: 'applicant',
      required: false,
      revision: 1,
    },
    /**
     * No current official source at any level: absent from Visa Code Annex II,
     * absent from the Commission's Annex III for Türkiye, and absent from the
     * German mission's own sheet. ADR-048 already declined to re-point it.
     *
     * Retention is a hold pending a reachable Greek source, not a finding that
     * one exists.
     */
    {
      code: 'EMPLOYER_SIGNATURE_CIRCULAR',
      nameKey: 'visa-domain:requirements.EMPLOYER_SIGNATURE_CIRCULAR.name',
      descriptionKey:
        'visa-domain:requirements.EMPLOYER_SIGNATURE_CIRCULAR.description',
      notesKey: 'visa-domain:requirements.EMPLOYER_SIGNATURE_CIRCULAR.notes',
      category: 'employment',
      ownerType: 'employer',
      required: false,
      conditionalOn: {
        field: 'employment.employmentStatus',
        operator: 'equals',
        value: 'employed',
      },
      revision: 1,
    },
  ],
  refine: [
    // The consulate's restatement of the Visa Code criteria. These carry no
    // Commission citation because Annex III does not cover them.
    { code: 'APPLICATION_FORM', addSourceRefs: ['gr-mfa-tr-visa-page'] },
    { code: 'PASSPORT_CURRENT', addSourceRefs: ['gr-mfa-tr-visa-page'] },
    { code: 'TRAVEL_INSURANCE', addSourceRefs: ['gr-mfa-tr-visa-page'] },

    // The mission's rendering of Annex III, appended after the instrument
    // itself so the composed citation reads authority-first.
    { code: 'TRANSPORT_RESERVATION', addSourceRefs: ['gr-tr-harmonised-list'] },
    { code: 'ACCOMMODATION', addSourceRefs: ['gr-tr-harmonised-list'] },
    { code: 'ITINERARY', addSourceRefs: ['gr-tr-harmonised-list'] },
    { code: 'EMPLOYMENT_LETTER', addSourceRefs: ['gr-tr-harmonised-list'] },
    { code: 'APPROVED_LEAVE', addSourceRefs: ['gr-tr-harmonised-list'] },
    { code: 'PAYSLIPS', addSourceRefs: ['gr-tr-harmonised-list'] },
    { code: 'SOCIAL_SECURITY', addSourceRefs: ['gr-tr-harmonised-list'] },
    { code: 'BANK_STATEMENTS', addSourceRefs: ['gr-tr-harmonised-list'] },
    {
      code: 'CIVIL_REGISTRY_EXTRACT',
      addSourceRefs: ['gr-tr-harmonised-list'],
    },
    {
      code: 'EMPLOYER_TRADE_REGISTRY',
      addSourceRefs: ['gr-tr-harmonised-list'],
    },
    { code: 'STUDENT_CERTIFICATE', addSourceRefs: ['gr-tr-harmonised-list'] },
    {
      code: 'COMPANY_ACTIVITY_CERTIFICATE',
      addSourceRefs: ['gr-tr-harmonised-list'],
    },
    { code: 'TAX_PAYMENT_STATEMENT', addSourceRefs: ['gr-tr-harmonised-list'] },
    { code: 'PENSIONER_BOOKLET', addSourceRefs: ['gr-tr-harmonised-list'] },

    // EMPLOYER_TAX_PLATE and EMPLOYER_SIGNATURE_CIRCULAR get nothing. Neither
    // appears in Annex III, and ADR-048 already recorded that vergi levhası
    // appears in no reachable Greek source and that the signature circular is
    // absent entirely. Attaching a citation to either would be inventing
    // evidence to make a requirement look verified.
  ],
  sources: grTrMissionSources,
}
