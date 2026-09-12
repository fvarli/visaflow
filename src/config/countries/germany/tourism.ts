import { composeVisaTemplate } from '../../composition'
import { germanySources } from '../../sources/germany.sources'
import {
  commonPreparationMilestones,
  commonSchengenLayer,
} from '../common/schengen-short-stay'
import { deTrMissionLayer } from '../jurisdictions/de-tr-mission'
import { trFilingLayer } from '../jurisdictions/tr-filing'
import type { RequirementLayer, VisaTypeTemplate } from '../../types'

/**
 * Germany — Schengen short-stay, tourism (Type C), composed for applications
 * lodged in Türkiye.
 *
 * The second production pack, and the first evidence that the layer model does
 * what ADR-052 claimed. Everything shared with Greece is inherited rather than
 * copied: the Visa Code requirements from the common layer, the Türkiye
 * documents from `tr-filing` with the Commission's act as their authority. What
 * is Germany's own is two requirements and a set of citations, and nothing
 * Greek reaches it.
 *
 * THE DESTINATION LAYER OWNS NO REQUIREMENTS, WHICH IS THE SAME FINDING GREECE
 * PRODUCED — now with a second data point behind it. The two candidates were
 * the § 54 declaration and the ten-year visa copies, and the German mission in
 * India requires neither, so neither is true because the destination is
 * Germany. What this layer contributes is Germany's own statute, cited by the
 * declaration that refers to it.
 */
export const germanyDestinationLayer: RequirementLayer = {
  id: 'germany',
  kind: 'destination',
  sources: germanySources,
}

/**
 * The canonical order of the composed checklist.
 *
 * Order is behaviour: it decides the sequence documents are seeded into a new
 * dossier, and `deriveNextDocument` picks the *first* required requirement with
 * no record yet. Greece's order exists to preserve what the pack asked for
 * before the layer split; Germany has no history to preserve, so it follows the
 * mission checklist's own sequence instead — the general documents in the order
 * the sheet numbers them, then its applicant-category sections in the order it
 * presents them.
 *
 * Layer order was the alternative and it is worse here for a reason that has
 * nothing to do with taste: it would put the two mandatory German documents
 * last, after conditional student and pensioner items, because they happen to
 * be declared in the layer that composes last. What an applicant reads on the
 * mission's page and what the workspace hands them should not disagree because
 * of where a requirement is declared.
 */
const GERMANY_TOURISM_ORDER = [
  // Section 3 of the sheet — every applicant.
  'APPLICATION_FORM',
  'DE_S54_DECLARATION',
  'PASSPORT_CURRENT',
  'DE_TRAVEL_HISTORY_COPIES',
  'PHOTOS',
  'TRAVEL_INSURANCE',
  'TRANSPORT_RESERVATION',
  'TRANSPORT_MEANS_PROOF',
  'ITINERARY',
  'CIVIL_REGISTRY_EXTRACT',
  'ACCOMMODATION',
  'DE_OFFICIAL_UNDERTAKING',
  'BANK_STATEMENTS',
  'PAYSLIPS',
  'PENSIONER_BOOKLET',
  // Annex II evidence the sheet does not enumerate but the common layer
  // carries, kept beside the financial block it belongs to. The four sponsor
  // requirements that sat here until E5c are gone: the mission's sheets are
  // closed and list none of them.
  'PROPERTY_DEED',
  // Section 4(a) — employees.
  'EMPLOYMENT_LETTER',
  'APPROVED_LEAVE',
  'SOCIAL_SECURITY',
  // Section 4(c) — business owners and the self-employed. The last two are
  // Annex III items this sheet does not list; they sit with the block they
  // belong to.
  'EMPLOYER_TRADE_REGISTRY',
  'EMPLOYER_TAX_PLATE',
  'TAX_PAYMENT_STATEMENT',
  'COMPANY_ACTIVITY_CERTIFICATE',
  // Annex III I.5(b) — farmers, which this sheet asks for at its own section
  // 4(b). Inherited rather than declared: the clause belongs to the instrument
  // adopted for applications lodged in Türkiye, so it reaches every mission
  // that receives them, exactly as the residence permit below does.
  'FARMER_CERTIFICATE',
  // Section 4(d) — students.
  'STUDENT_CERTIFICATE',
  // Annex III I.5(g). The sheet enumerates non-Turkish citizens as a category
  // of its own; the jurisdiction's instrument is what states the document and
  // its three-month bar, so this pack inherits rather than declares it.
  'FILING_COUNTRY_RESIDENCE_PERMIT',
]

/**
 * Composed once, at module load — same as Greece, and for the same reasons:
 * `resolveVisaTemplate` returns a stable reference, and a malformed pack fails
 * at import rather than on whichever screen resolves first.
 */
export const germanyTourismComposition = composeVisaTemplate({
  base: {
    /**
     * The same template id as Greece's, deliberately. It names the visa type —
     * Schengen short-stay tourism — not the pack, and its translation is the
     * shared `visaTypes` key. Two packs offering the same visa type is the
     * normal case, and giving each a private id would imply the types differ.
     */
    id: 'schengen-short-stay-tourism',
    visaType: 'short_stay_tourism',
    nameKey: 'visa-domain:visaTypes.schengen-short-stay-tourism',
    /**
     * The shared milestones only. Greece's extra employer milestone names
     * `EMPLOYER_SIGNATURE_CIRCULAR`, which this pack must not carry — no German
     * source asks for it and it is quarantined to the Greek mission layer.
     * Writing a German near-copy would mean new translation keys asserting
     * preparation advice no source states, so the pack ships with the six
     * shared milestones and nothing invented.
     */
    preparationMilestones: commonPreparationMilestones,
    /**
     * `1.4.0`, and every step of it changed what this pack asks for, which is
     * the only thing that moves this number. `1.0.0` was the first published
     * version; `1.1.0` took the E5a corrections to four shared contracts;
     * `1.2.0` lost the sponsor block, which no German sheet lists; `1.3.0`
     * makes the tax plate a German-owned requirement that is mandatory for the
     * self-employed rather than an optional Türkiye-wide one; `1.4.0` names the
     * third travel-arrangement alternative the mission's own sheet offers;
     * `1.7.0` names the official undertaking the sheet accepts in place of an
     * accommodation document, so the pack stops demanding a booking from
     * applicants it does not ask one of;
     * `1.5.0` renders eight acceptance bars the mission publishes on
     * requirements this pack inherits rather than owns; `1.6.0` adds the
     * photograph count, which sits on the tourism checklist rather than the
     * general page the rest of that fragment came from; `1.8.0` inherits Annex
     * III I.5(g), the residence permit a non-Turkish national files with —
     * declared by the jurisdiction whose instrument states it, so this pack
     * gains it without the German layers asserting anything.
     *
     * Greece's number counts its own history and the two are unrelated —
     * `templateVersion` is per pack, not repository-wide.
     */
    templateVersion: '1.11.0',
    lastReviewedAt: '2026-09-07',
    /**
     * `verified`, and the word means exactly one thing here: **every** composed
     * requirement carries its own resolvable, dated source. A test recomputes
     * that through the same helper the UI uses rather than trusting this line
     * (ADR-047), and `partially_verified` would now be the unsupported claim.
     *
     * It became true by subtraction, not by new evidence. The four uncited rows
     * were the sponsor block, which E5c moved to the layer only Greece
     * composes, because the German mission's sheets are closed and list none of
     * them. Removing obligations this pack could not support is what completed
     * the citation coverage.
     *
     * What it does not mean: that a human has audited every rendered criterion
     * against its source. The E2 audit found eleven contracts thinner than the
     * clause they cite, and that is a fidelity question this status does not
     * measure.
     */
    reviewStatus: 'verified',
    sourceIds: ['de-tr-tourism-checklist'],
  },
  /**
   * THE SAME TRANSITIONAL SEAM AS GREECE. The destination declares which filing
   * jurisdiction production composes, because the domain still cannot answer
   * "where is this application being lodged?" — there is no `filingJurisdiction`
   * field, and `countryOfResidence` means something else.
   *
   * This is not the assertion "Germany implies Türkiye". It is a placeholder for
   * a selector that does not exist yet, and the second pack makes that plainer
   * rather than less plain: both packs pick `tr-filing` from configuration, and
   * when a selector arrives it replaces both lines without touching a layer.
   */
  layers: [
    commonSchengenLayer,
    germanyDestinationLayer,
    trFilingLayer,
    deTrMissionLayer,
  ],
  requirementOrder: GERMANY_TOURISM_ORDER,
})

export const germanyTourismTemplate: VisaTypeTemplate =
  germanyTourismComposition.template
