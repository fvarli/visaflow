import type { DocumentRequirement, PreparationMilestone } from '../../types'

/**
 * Requirements typical of a Schengen short-stay application, shared by every
 * Schengen country template.
 *
 * These are general organisational guidance, NOT an official list. Each
 * country template records its own review status and sources; nothing here
 * should be presented to a user as verified on its own.
 *
 * Structure, codes, categories, owner types, `required` flags, conditionals
 * and validity periods are carried over unchanged from the previous
 * configuration — only user-facing prose became translation keys.
 */
export const commonSchengenDocuments: DocumentRequirement[] = [
  // Application form
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
    sourceRefs: ['eu-visa-code-art11', 'gr-mfa-tr-visa-page'],
  },

  // Identity & passport
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
    sourceRefs: ['eu-visa-code-art12', 'gr-mfa-tr-visa-page'],
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
  },
  {
    code: 'ID_CARD_COPY',
    nameKey: 'visa-domain:requirements.ID_CARD_COPY.name',
    descriptionKey: 'visa-domain:requirements.ID_CARD_COPY.description',
    category: 'identity',
    ownerType: 'applicant',
    required: true,
  },

  // Travel
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
    sourceRefs: ['eu-visa-code-art15', 'gr-mfa-tr-visa-page'],
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
    sourceRefs: ['eu-visa-code-annex2', 'gr-tr-harmonised-list'],
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
    sourceRefs: ['eu-visa-code-annex2', 'gr-tr-harmonised-list'],
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
    sourceRefs: ['eu-visa-code-annex2', 'gr-tr-harmonised-list'],
  },

  // Employment
  {
    code: 'EMPLOYMENT_LETTER',
    nameKey: 'visa-domain:requirements.EMPLOYMENT_LETTER.name',
    descriptionKey: 'visa-domain:requirements.EMPLOYMENT_LETTER.description',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    validityPeriodDays: 30,
    // Harmonised list I.5.a spells out what the letter must contain. Notably
    // it does *not* ask for salary, which the description used to require.
    sourceRefs: ['gr-tr-harmonised-list'],
  },
  {
    code: 'APPROVED_LEAVE',
    nameKey: 'visa-domain:requirements.APPROVED_LEAVE.name',
    descriptionKey: 'visa-domain:requirements.APPROVED_LEAVE.description',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    validityPeriodDays: 30,
    // Same clause: "letter from employer and/or approval for leave".
    sourceRefs: ['gr-tr-harmonised-list'],
  },
  {
    code: 'PAYSLIPS',
    nameKey: 'visa-domain:requirements.PAYSLIPS.name',
    descriptionKey: 'visa-domain:requirements.PAYSLIPS.description',
    notesKey: 'visa-domain:requirements.PAYSLIPS.notes',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    validityPeriodDays: 30,
    // I.4.b — "salary slips of the last three months". The description said
    // 3-6 months, which no source states.
    sourceRefs: ['gr-tr-harmonised-list'],
  },
  {
    code: 'SOCIAL_SECURITY',
    nameKey: 'visa-domain:requirements.SOCIAL_SECURITY.name',
    descriptionKey: 'visa-domain:requirements.SOCIAL_SECURITY.description',
    category: 'employment',
    ownerType: 'applicant',
    // The harmonised list puts both SGK documents under Employees as
    // requirements, not suggestions, so this is no longer optional (ADR-048).
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    validityPeriodDays: 30,
    // I.5.a — SGK statement of employment (Sigortalı İşe Giriş Bildirgesi) and
    // SGK registration and service document (SGK tescil ve hizmet dökümü),
    // both with a readable QR code. Entirely Türkiye-scoped; see the
    // jurisdiction quarantine in the provenance tests.
    sourceRefs: ['gr-tr-harmonised-list'],
    // One SGK record no longer suffices — see REQUIREMENT_REVISIONS.
    revision: 2,
  },

  // Financial
  {
    code: 'BANK_STATEMENTS',
    nameKey: 'visa-domain:requirements.BANK_STATEMENTS.name',
    descriptionKey: 'visa-domain:requirements.BANK_STATEMENTS.description',
    notesKey: 'visa-domain:requirements.BANK_STATEMENTS.notes',
    category: 'financial',
    ownerType: 'applicant',
    required: true,
    validityPeriodDays: 30,
    // I.4.a — "bank account statement showing movements over the last three
    // months, proving the source of regular income", and Annex II B.3 names
    // bank statements. The description said 3-6 months.
    sourceRefs: ['eu-visa-code-annex2', 'gr-tr-harmonised-list'],
  },

  // Sponsor (conditional)
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
  },

  // Previous travel
  {
    code: 'PREVIOUS_VISAS',
    nameKey: 'visa-domain:requirements.PREVIOUS_VISAS.name',
    descriptionKey: 'visa-domain:requirements.PREVIOUS_VISAS.description',
    category: 'previous_travel',
    ownerType: 'applicant',
    required: false,
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
