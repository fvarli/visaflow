import { euSources } from '../../sources/eu.sources'
import type {
  DocumentRequirement,
  PreparationMilestone,
  RequirementLayer,
} from '../../types'

/**
 * Requirements shared by Schengen short-stay applications, whatever the
 * destination and wherever the application is lodged.
 *
 * THIS ARRAY USED TO OVERSTATE ITSELF. It held nineteen requirements and was
 * named as though all nineteen were proven across Schengen, while carrying
 * Türkiye-scoped citations and Turkish institution names — SGK documents, the
 * harmonised list adopted for Türkiye, the Ankara mission's own visa page. With
 * no override mechanism, a second destination pack would have inherited every
 * one of them verbatim as if they were its own (ADR-048). Twelve of the
 * nineteen were affected.
 *
 * Those thirteen requirements now live in the filing-jurisdiction layer that
 * actually owns them (`countries/jurisdictions/tr-filing.ts`), and the six that
 * are genuinely EU-level but had picked up a Türkiye citation keep their EU
 * identity here while the overlay appends its citation at composition time.
 * What is left is fifteen requirements that a second pack can inherit without
 * acquiring somebody else's jurisdiction.
 *
 * `PROPERTY_DEED` moved *in*, from the Greece array: it cites Visa Code Annex
 * II B.4 and says nothing about Greece or Türkiye. It was only ever filed under
 * Greece by accident of where it was written.
 *
 * These remain general organisational guidance, NOT an official list. Each
 * destination template records its own review status and sources; nothing here
 * should be presented to a user as verified on its own.
 */
export const commonSchengenDocuments: DocumentRequirement[] = [
  {
    code: 'APPLICATION_FORM',
    nameKey: 'visa-domain:requirements.APPLICATION_FORM.name',
    descriptionKey: 'visa-domain:requirements.APPLICATION_FORM.description',
    notesKey: 'visa-domain:requirements.APPLICATION_FORM.notes',
    category: 'application_form',
    ownerType: 'applicant',
    required: true,
    // Article 11(1) requires a completed, signed form, and the Ankara mission
    // asks for the same. The note used to claim it must be signed "in two
    // places", which Annex I contradicts: the form carries one applicant
    // signature plus a guardian signature for minors (ADR-048).
    sourceRefs: ['eu-visa-code-art11'],
    revision: 1,
  },
  {
    code: 'PASSPORT_CURRENT',
    nameKey: 'visa-domain:requirements.PASSPORT_CURRENT.name',
    descriptionKey: 'visa-domain:requirements.PASSPORT_CURRENT.description',
    notesKey: 'visa-domain:requirements.PASSPORT_CURRENT.notes',
    category: 'passport',
    ownerType: 'applicant',
    required: true,
    validityPeriodDays: 90, // After trip end
    // Visa Code Article 12 states all three claims this requirement makes:
    // (a) validity extending at least three months past the intended
    // departure, (b) at least two blank pages, (c) issued within the previous
    // 10 years — the last of which the notes now carry (ADR-047).
    sourceRefs: ['eu-visa-code-art12'],
    // Gained Article 12(c) — see REQUIREMENT_REVISIONS.
    revision: 2,
  },
  {
    code: 'PASSPORT_PREVIOUS',
    nameKey: 'visa-domain:requirements.PASSPORT_PREVIOUS.name',
    descriptionKey: 'visa-domain:requirements.PASSPORT_PREVIOUS.description',
    category: 'passport',
    ownerType: 'applicant',
    required: false,
    revision: 1,
  },
  {
    code: 'PHOTOS',
    nameKey: 'visa-domain:requirements.PHOTOS.name',
    descriptionKey: 'visa-domain:requirements.PHOTOS.description',
    notesKey: 'visa-domain:requirements.PHOTOS.notes',
    category: 'identity',
    ownerType: 'applicant',
    required: true,
    validityPeriodDays: 180,
    revision: 1,
  },
  {
    code: 'ID_CARD_COPY',
    nameKey: 'visa-domain:requirements.ID_CARD_COPY.name',
    descriptionKey: 'visa-domain:requirements.ID_CARD_COPY.description',
    category: 'identity',
    ownerType: 'applicant',
    required: true,
    revision: 1,
  },
  {
    code: 'TRAVEL_INSURANCE',
    nameKey: 'visa-domain:requirements.TRAVEL_INSURANCE.name',
    descriptionKey: 'visa-domain:requirements.TRAVEL_INSURANCE.description',
    notesKey: 'visa-domain:requirements.TRAVEL_INSURANCE.notes',
    category: 'insurance',
    ownerType: 'applicant',
    required: true,
    // Article 15(3) sets the EUR 30 000 minimum verbatim, and 15(1) lists the
    // cover this requirement names — repatriation, urgent medical attention,
    // emergency hospital treatment.
    sourceRefs: ['eu-visa-code-art15'],
    // Gained Article 15(3) territorial validity and duration.
    revision: 2,
  },
  {
    code: 'TRANSPORT_RESERVATION',
    nameKey: 'visa-domain:requirements.TRANSPORT_RESERVATION.name',
    descriptionKey:
      'visa-domain:requirements.TRANSPORT_RESERVATION.description',
    notesKey: 'visa-domain:requirements.TRANSPORT_RESERVATION.notes',
    category: 'travel',
    ownerType: 'applicant',
    required: true,
    // Annex II B.1 lists "reservation of or return or round ticket". The note
    // used to add that paid tickets are *not* required, which the Code does
    // not say — Article 14(3) makes Annex II non-exhaustive and leaves the
    // consulate free to ask. The note was corrected before citing (ADR-047).
    sourceRefs: ['eu-visa-code-annex2'],
    revision: 1,
  },
  {
    code: 'ACCOMMODATION',
    nameKey: 'visa-domain:requirements.ACCOMMODATION.name',
    descriptionKey: 'visa-domain:requirements.ACCOMMODATION.description',
    category: 'accommodation',
    ownerType: 'applicant',
    required: true,
    // Harmonised list I.3 — "evidence of hotel booking or other proof of
    // accommodation". The description used to add "for entire stay", which
    // neither the Code nor the list states.
    sourceRefs: ['eu-visa-code-annex2'],
    revision: 1,
  },
  {
    code: 'ITINERARY',
    nameKey: 'visa-domain:requirements.ITINERARY.name',
    descriptionKey: 'visa-domain:requirements.ITINERARY.description',
    category: 'travel',
    ownerType: 'applicant',
    required: false,
    // Harmonised list I.1 offers "proof of travel itinerary" as an accepted
    // travel arrangement; Annex II A.3(b) says the same. Neither prescribes a
    // day-by-day form, which is what the description used to demand.
    sourceRefs: ['eu-visa-code-annex2'],
    revision: 1,
  },
  {
    code: 'PROPERTY_DEED',
    nameKey: 'visa-domain:requirements.PROPERTY_DEED.name',
    descriptionKey: 'visa-domain:requirements.PROPERTY_DEED.description',
    notesKey: 'visa-domain:requirements.PROPERTY_DEED.notes',
    category: 'supporting',
    ownerType: 'applicant',
    required: false,
    // Annex II B.4 is "proof of real estate property", and it sits under
    // documentation for assessing the intention to leave — which is exactly
    // what this requirement's note claims it does.
    sourceRefs: ['eu-visa-code-annex2'],
    revision: 1,
  },
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
    descriptionKey: 'visa-domain:requirements.SPONSOR_INCOME_PROOF.description',
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
  {
    code: 'PREVIOUS_VISAS',
    nameKey: 'visa-domain:requirements.PREVIOUS_VISAS.name',
    descriptionKey: 'visa-domain:requirements.PREVIOUS_VISAS.description',
    category: 'previous_travel',
    ownerType: 'applicant',
    required: false,
    revision: 1,
  },
]

export const commonPreparationMilestones: PreparationMilestone[] = [
  {
    id: 'request-employer-docs',
    nameKey: 'visa-domain:milestones.request-employer-docs.name',
    descriptionKey: 'visa-domain:milestones.request-employer-docs.description',
    daysBeforeAppointment: 21,
    relatedDocuments: ['EMPLOYMENT_LETTER', 'APPROVED_LEAVE', 'PAYSLIPS'],
  },
  {
    id: 'obtain-bank-statements',
    nameKey: 'visa-domain:milestones.obtain-bank-statements.name',
    descriptionKey: 'visa-domain:milestones.obtain-bank-statements.description',
    daysBeforeAppointment: 14,
    relatedDocuments: ['BANK_STATEMENTS'],
  },
  {
    id: 'purchase-insurance',
    nameKey: 'visa-domain:milestones.purchase-insurance.name',
    descriptionKey: 'visa-domain:milestones.purchase-insurance.description',
    daysBeforeAppointment: 10,
    relatedDocuments: ['TRAVEL_INSURANCE'],
  },
  {
    id: 'confirm-reservations',
    nameKey: 'visa-domain:milestones.confirm-reservations.name',
    descriptionKey: 'visa-domain:milestones.confirm-reservations.description',
    daysBeforeAppointment: 7,
    relatedDocuments: ['TRANSPORT_RESERVATION', 'ACCOMMODATION'],
  },
  {
    id: 'take-photos',
    nameKey: 'visa-domain:milestones.take-photos.name',
    descriptionKey: 'visa-domain:milestones.take-photos.description',
    daysBeforeAppointment: 5,
    relatedDocuments: ['PHOTOS'],
  },
  {
    id: 'final-review',
    nameKey: 'visa-domain:milestones.final-review.name',
    descriptionKey: 'visa-domain:milestones.final-review.description',
    daysBeforeAppointment: 2,
  },
]

/**
 * The Common Schengen ownership layer.
 *
 * It contributes the shared requirements and the EU source records they cite.
 * Anything that is true only of one destination, or only of applicants filing
 * in one jurisdiction, belongs to a later layer — the composer has no way to
 * take a requirement back out once this layer has declared it.
 */
export const commonSchengenLayer: RequirementLayer = {
  id: 'schengen-short-stay',
  kind: 'common',
  add: commonSchengenDocuments,
  sources: euSources,
}
