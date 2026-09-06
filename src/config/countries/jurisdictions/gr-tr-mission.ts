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
 * It declares no requirements. A mission that genuinely asks for something the
 * harmonised list does not contain would declare it here and own it — Article
 * 14(3) leaves missions free to ask for more, so that is a real possibility
 * rather than a hypothetical. Greece currently asks for nothing of the kind.
 */
export const grTrMissionLayer: RequirementLayer = {
  id: 'gr-tr-mission',
  kind: 'jurisdiction',
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
