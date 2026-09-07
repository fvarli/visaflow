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
 * IT ALSO OWNS ONE REQUIREMENT, AND THAT IS NOT A FINDING. It was inherited
 * from before the layer split and has no resolvable official source. It is held
 * here as **quarantine**, not endorsement: scoped to the one pack that carries
 * it so a second destination cannot inherit an unverified ask. Nothing about
 * this placement says Greece currently requires it.
 *
 * It is not retired, because the operative applicant-facing checklist for this
 * filing context — published by the visa centre the mission names — cannot be
 * read from this environment, and an unreachable source is not evidence that a
 * requirement is gone. That page answers a question about this exact document,
 * which is the requirement-specific signal the audit needed; retiring on the
 * strength of a network failure would strip a document from Greek applicants'
 * checklists on no evidence at all. It is listed in the evidence-gap allowlist
 * in `country-pack-provenance.test.ts`, which bounds the set and demands a
 * written reason for each entry.
 *
 * THREE OTHERS SAT HERE UNTIL E5c. `ID_CARD_COPY`, `PASSPORT_PREVIOUS` and
 * `PREVIOUS_VISAS` were retired once the fidelity audit had read the Visa Code,
 * Annex III and the Greek mission's own pages first-hand and found no support
 * for any of them, with no requirement-specific signal on the one unreachable
 * channel. Quarantine is for evidence we cannot reach; it is not a place to
 * keep asks we have looked for and not found.
 */
export const grTrMissionLayer: RequirementLayer = {
  id: 'gr-tr-mission',
  kind: 'jurisdiction',
  add: [
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
    /**
     * THE SPONSOR BLOCK, MOVED HERE IN E5c AND NOT VERIFIED BY THE MOVE.
     *
     * These four sat in the common layer, so every pack inherited them. The
     * German mission's sheets are closed — they state that in principle only
     * the documents they list are required — and they list none of these, so
     * for Germany the audit could classify them UNSUPPORTED on an adequate
     * search. For Greece it could not: the visa centre checklist its mission
     * directs applicants to is unreachable, and a FAQ on that same site defines
     * who may act as a sponsor, which is a requirement-specific signal that the
     * blocked page may well carry them.
     *
     * Two different evidence states, one shared requirement. Retiring them
     * globally would convert Greece's evidence debt into a finding of absence;
     * leaving them in Common would keep leaking obligations into Germany that
     * its own authority does not make. Moving them to the layer only Greece
     * composes says exactly what is true of each pack, and needs no suppression
     * mechanism to do it.
     *
     * They are copied here **verbatim** — same codes, revisions, requiredness,
     * conditionals and rendered contracts. Nothing about their content is
     * improved while the evidence is unresolved, including the invented
     * "3-6 months" window on the sponsor's statements, which is recorded as a
     * gap rather than quietly corrected into a number no source states.
     */
    {
      code: 'SPONSOR_LETTER',
      nameKey: 'visa-domain:requirements.SPONSOR_LETTER.name',
      descriptionKey: 'visa-domain:requirements.SPONSOR_LETTER.description',
      category: 'sponsor',
      ownerType: 'sponsor',
      required: true,
      conditionalOn: {
        field: 'financing.source',
        operator: 'equals',
        value: 'sponsor',
      },
      validityPeriodDays: 30,
      revision: 1,
    },
    {
      code: 'SPONSOR_BANK_STATEMENTS',
      nameKey: 'visa-domain:requirements.SPONSOR_BANK_STATEMENTS.name',
      descriptionKey:
        'visa-domain:requirements.SPONSOR_BANK_STATEMENTS.description',
      category: 'sponsor',
      ownerType: 'sponsor',
      required: true,
      conditionalOn: {
        field: 'financing.source',
        operator: 'equals',
        value: 'sponsor',
      },
      validityPeriodDays: 30,
      revision: 1,
    },
    {
      code: 'SPONSOR_INCOME_PROOF',
      nameKey: 'visa-domain:requirements.SPONSOR_INCOME_PROOF.name',
      descriptionKey:
        'visa-domain:requirements.SPONSOR_INCOME_PROOF.description',
      category: 'sponsor',
      ownerType: 'sponsor',
      required: true,
      conditionalOn: {
        field: 'financing.source',
        operator: 'equals',
        value: 'sponsor',
      },
      validityPeriodDays: 30,
      revision: 1,
    },
    {
      code: 'RELATIONSHIP_PROOF',
      nameKey: 'visa-domain:requirements.RELATIONSHIP_PROOF.name',
      descriptionKey: 'visa-domain:requirements.RELATIONSHIP_PROOF.description',
      notesKey: 'visa-domain:requirements.RELATIONSHIP_PROOF.notes',
      category: 'civil_registry',
      ownerType: 'applicant',
      required: false,
      conditionalOn: {
        field: 'financing.source',
        operator: 'equals',
        value: 'sponsor',
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
