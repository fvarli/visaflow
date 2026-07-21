import type { DocumentRequirement, PreparationMilestone } from '../types'

/**
 * Common document requirements for Schengen short-stay visa applications.
 * These are typical requirements across most Schengen countries.
 *
 * DISCLAIMER: These are general guidelines only. Always verify requirements
 * with the official embassy or visa center for your specific application.
 */

export const commonSchengenDocuments: DocumentRequirement[] = [
  // Application Form
  {
    code: 'APPLICATION_FORM',
    name: 'Visa Application Form',
    category: 'application_form',
    ownerType: 'applicant',
    required: true,
    description: 'Completed and signed Schengen visa application form',
    notes: 'Must be signed in two places',
  },

  // Identity & Passport
  {
    code: 'PASSPORT_CURRENT',
    name: 'Current Passport',
    category: 'passport',
    ownerType: 'applicant',
    required: true,
    description:
      'Valid passport with at least 3 months validity beyond return date',
    notes: 'Must have at least 2 blank pages',
    validityPeriodDays: 90, // After trip end
  },
  {
    code: 'PASSPORT_PREVIOUS',
    name: 'Previous Passports',
    category: 'passport',
    ownerType: 'applicant',
    required: false,
    description: 'Previous passports with Schengen visas if applicable',
  },
  {
    code: 'PHOTOS',
    name: 'Biometric Photos',
    category: 'identity',
    ownerType: 'applicant',
    required: true,
    description: '2 recent biometric passport photos (35x45mm)',
    notes: 'White background, taken within last 6 months',
    validityPeriodDays: 180,
  },
  {
    code: 'ID_CARD_COPY',
    name: 'National ID Card Copy',
    category: 'identity',
    ownerType: 'applicant',
    required: true,
    description: 'Copy of national identity card (both sides)',
  },

  // Travel Documents
  {
    code: 'TRAVEL_INSURANCE',
    name: 'Travel Medical Insurance',
    category: 'insurance',
    ownerType: 'applicant',
    required: true,
    description: 'Travel insurance with minimum 30,000 EUR coverage',
    notes: 'Must cover medical expenses, hospitalization, and repatriation',
  },
  {
    code: 'TRANSPORT_RESERVATION',
    name: 'Round-trip Transport Reservation',
    category: 'travel',
    ownerType: 'applicant',
    required: true,
    description: 'Flight or other transport booking showing entry and exit',
    notes:
      'Reservation is sufficient; paid tickets not required at application',
  },
  {
    code: 'ACCOMMODATION',
    name: 'Accommodation Reservation',
    category: 'accommodation',
    ownerType: 'applicant',
    required: true,
    description: 'Hotel bookings or proof of accommodation for entire stay',
  },
  {
    code: 'ITINERARY',
    name: 'Travel Itinerary',
    category: 'travel',
    ownerType: 'applicant',
    required: false,
    description: 'Day-by-day travel plan if visiting multiple locations',
  },

  // Employment Documents
  {
    code: 'EMPLOYMENT_LETTER',
    name: 'Employment Letter',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    description:
      'Letter from employer stating position, salary, and approved leave',
    validityPeriodDays: 30,
  },
  {
    code: 'APPROVED_LEAVE',
    name: 'Approved Leave Letter',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    description: 'Official approval of leave from employer',
    validityPeriodDays: 30,
  },
  {
    code: 'PAYSLIPS',
    name: 'Recent Payslips',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    description: 'Last 3-6 months payslips',
    notes: 'Should show consistent income',
    validityPeriodDays: 30,
  },
  {
    code: 'SOCIAL_SECURITY',
    name: 'Social Security Record',
    category: 'employment',
    ownerType: 'applicant',
    required: false,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    description: 'Employment history from social security authority',
    validityPeriodDays: 30,
  },

  // Financial Documents
  {
    code: 'BANK_STATEMENTS',
    name: 'Bank Statements',
    category: 'financial',
    ownerType: 'applicant',
    required: true,
    description: 'Bank statements for last 3-6 months',
    notes: 'Should show sufficient funds for the trip',
    validityPeriodDays: 30,
  },

  // Sponsor Documents (conditional)
  {
    code: 'SPONSOR_LETTER',
    name: 'Sponsorship Letter',
    category: 'sponsor',
    ownerType: 'sponsor',
    required: true,
    conditionalOn: {
      field: 'financing.source',
      operator: 'equals',
      value: 'sponsor',
    },
    description: 'Letter from sponsor declaring financial support',
    validityPeriodDays: 30,
  },
  {
    code: 'SPONSOR_BANK_STATEMENTS',
    name: 'Sponsor Bank Statements',
    category: 'sponsor',
    ownerType: 'sponsor',
    required: true,
    conditionalOn: {
      field: 'financing.source',
      operator: 'equals',
      value: 'sponsor',
    },
    description: 'Sponsor bank statements for last 3-6 months',
    validityPeriodDays: 30,
  },
  {
    code: 'SPONSOR_INCOME_PROOF',
    name: 'Sponsor Income Documents',
    category: 'sponsor',
    ownerType: 'sponsor',
    required: true,
    conditionalOn: {
      field: 'financing.source',
      operator: 'equals',
      value: 'sponsor',
    },
    description: 'Proof of sponsor income (payslips, tax returns)',
    validityPeriodDays: 30,
  },
  {
    code: 'RELATIONSHIP_PROOF',
    name: 'Proof of Relationship',
    category: 'civil_registry',
    ownerType: 'applicant',
    required: false,
    conditionalOn: {
      field: 'financing.source',
      operator: 'equals',
      value: 'sponsor',
    },
    description: 'Documents proving relationship with sponsor',
    notes: 'Birth certificate, marriage certificate, etc.',
  },

  // Previous Travel
  {
    code: 'PREVIOUS_VISAS',
    name: 'Previous Schengen Visa Copies',
    category: 'previous_travel',
    ownerType: 'applicant',
    required: false,
    description: 'Copies of previous Schengen visas if applicable',
  },
]

export const commonPreparationMilestones: PreparationMilestone[] = [
  {
    id: 'request-employer-docs',
    name: 'Request employer documents',
    description:
      'Request employment letter, leave approval, and payslips from HR',
    daysBeforeAppointment: 21,
    relatedDocuments: ['EMPLOYMENT_LETTER', 'APPROVED_LEAVE', 'PAYSLIPS'],
  },
  {
    id: 'obtain-bank-statements',
    name: 'Obtain bank statements',
    description: 'Get recent bank statements from your bank',
    daysBeforeAppointment: 14,
    relatedDocuments: ['BANK_STATEMENTS'],
  },
  {
    id: 'purchase-insurance',
    name: 'Purchase travel insurance',
    description: 'Buy travel medical insurance meeting Schengen requirements',
    daysBeforeAppointment: 10,
    relatedDocuments: ['TRAVEL_INSURANCE'],
  },
  {
    id: 'confirm-reservations',
    name: 'Confirm reservations',
    description: 'Finalize and print transport and accommodation reservations',
    daysBeforeAppointment: 7,
    relatedDocuments: ['TRANSPORT_RESERVATION', 'ACCOMMODATION'],
  },
  {
    id: 'take-photos',
    name: 'Take biometric photos',
    description: 'Get professional biometric photos taken',
    daysBeforeAppointment: 5,
    relatedDocuments: ['PHOTOS'],
  },
  {
    id: 'final-review',
    name: 'Final dossier review',
    description: 'Review all documents, make copies, organize dossier',
    daysBeforeAppointment: 2,
  },
]
