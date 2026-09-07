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
 * IT ALSO OWNS FOUR REQUIREMENTS, AND NONE IS A FINDING. All four were
 * inherited from before the layer split and none has a resolvable official
 * source. They are held here as **quarantine**, not endorsement: scoped to the
 * one pack that carries them so a second destination cannot inherit an
 * unverified ask. Nothing about this placement says Greece currently requires
 * any of them.
 *
 * They are not retired instead, because the Greek mission page returns HTTP 403
 * to this environment, and an unreachable source is not evidence that the
 * requirement is gone. Retiring on that basis would strip documents from Greek
 * applicants' checklists on the strength of a network failure. All four are
 * listed in the evidence-gap allowlist in `country-pack-provenance.test.ts`,
 * which bounds the set and demands a written reason for each.
 *
 * Two arrived with the composition split (ADR-052a); two more followed when
 * the German mission's sheet gave a second destination's answer to the same
 * question and it turned out to be no.
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
     * the applicant.
     *
     * An earlier version of this comment added that Germany scopes its own
     * version to the UK, USA and Canada "because those are the visas the VIS
     * cannot see". The German mission's sheet says otherwise: it asks for
     * Schengen, EU, UK, US and Canadian visas alike. The tidy explanation was
     * mine, not the source's, and it is withdrawn rather than left standing.
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
    /**
     * Left the common layer in the same movement, and for the same reason:
     * no authority at any level asks for it of Schengen applicants generally.
     *
     * Absent from Visa Code Annex II (sections A, B and C read in full),
     * absent from the Commission's Annex III for Türkiye, and absent from the
     * German mission's sheet — which asks instead for a copy of the passport
     * that carries the visas it wants to see, a different and narrower thing
     * that Germany's own requirement states.
     *
     * `required: false` did not make its place in Common harmless: a second
     * destination would have inherited a vague travel-document ask alongside
     * its own specific one.
     */
    {
      code: 'PASSPORT_PREVIOUS',
      nameKey: 'visa-domain:requirements.PASSPORT_PREVIOUS.name',
      descriptionKey: 'visa-domain:requirements.PASSPORT_PREVIOUS.description',
      category: 'passport',
      ownerType: 'applicant',
      required: false,
      revision: 1,
    },
    /**
     * The strongest of the four: **mandatory and cited by nothing at all.**
     *
     * Absent from Annex II, from Annex III and from the German mission's
     * sheet, which asks for the barcoded civil-registry extract and no
     * identity card. A `required: true` requirement resting on no authority is
     * the worst thing the common layer can hold, because every future pack
     * inherits it silently.
     *
     * ADR-052 recorded the opposite decision as a known limitation — that
     * moving it would leave a second destination asking for no ID copy at all,
     * and that the Turkish translation naming nüfus cüzdanı was a translator
     * being helpful rather than a jurisdictional claim. The second half still
     * stands; the first is now answered by evidence rather than by worry, and
     * the answer is that the second destination does not ask for one. The
     * locale-gloss allowlist that limitation justified is deleted with this
     * move.
     */
    {
      code: 'ID_CARD_COPY',
      nameKey: 'visa-domain:requirements.ID_CARD_COPY.name',
      descriptionKey: 'visa-domain:requirements.ID_CARD_COPY.description',
      category: 'identity',
      ownerType: 'applicant',
      required: true,
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
