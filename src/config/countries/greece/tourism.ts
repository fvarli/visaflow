import type { DocumentRequirement, VisaTypeTemplate } from '../../types'
import {
  commonSchengenDocuments,
  commonPreparationMilestones,
} from '../common/schengen-short-stay'

/**
 * Greece — Schengen short-stay, tourism (Type C).
 *
 * Requirements are carried over unchanged from the previous single-country
 * configuration; only user-facing prose became translation keys and the
 * template gained review metadata.
 */
const greeceSpecificDocuments: DocumentRequirement[] = [
  // Employer company documents (may be requested for some nationalities)
  {
    code: 'EMPLOYER_TAX_PLATE',
    nameKey: 'visa-domain:requirements.EMPLOYER_TAX_PLATE.name',
    descriptionKey: 'visa-domain:requirements.EMPLOYER_TAX_PLATE.description',
    notesKey: 'visa-domain:requirements.EMPLOYER_TAX_PLATE.notes',
    category: 'employment',
    ownerType: 'employer',
    required: false,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
  },
  {
    code: 'EMPLOYER_TRADE_REGISTRY',
    nameKey: 'visa-domain:requirements.EMPLOYER_TRADE_REGISTRY.name',
    descriptionKey:
      'visa-domain:requirements.EMPLOYER_TRADE_REGISTRY.description',
    notesKey: 'visa-domain:requirements.EMPLOYER_TRADE_REGISTRY.notes',
    category: 'employment',
    ownerType: 'employer',
    required: false,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
  },
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
  },

  // Property documents (supporting)
  {
    code: 'PROPERTY_DEED',
    nameKey: 'visa-domain:requirements.PROPERTY_DEED.name',
    descriptionKey: 'visa-domain:requirements.PROPERTY_DEED.description',
    notesKey: 'visa-domain:requirements.PROPERTY_DEED.notes',
    category: 'supporting',
    ownerType: 'applicant',
    required: false,
  },

  // Self-employed
  {
    code: 'BUSINESS_LICENSE',
    nameKey: 'visa-domain:requirements.BUSINESS_LICENSE.name',
    descriptionKey: 'visa-domain:requirements.BUSINESS_LICENSE.description',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    },
  },
  {
    code: 'TAX_RETURNS',
    nameKey: 'visa-domain:requirements.TAX_RETURNS.name',
    descriptionKey: 'visa-domain:requirements.TAX_RETURNS.description',
    category: 'financial',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    },
  },

  // Student
  {
    code: 'STUDENT_CERTIFICATE',
    nameKey: 'visa-domain:requirements.STUDENT_CERTIFICATE.name',
    descriptionKey: 'visa-domain:requirements.STUDENT_CERTIFICATE.description',
    category: 'supporting',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'student',
    },
  },

  // Retired
  {
    code: 'PENSION_STATEMENT',
    nameKey: 'visa-domain:requirements.PENSION_STATEMENT.name',
    descriptionKey: 'visa-domain:requirements.PENSION_STATEMENT.description',
    category: 'financial',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'retired',
    },
  },
]

export const greeceTourismTemplate: VisaTypeTemplate = {
  id: 'schengen-short-stay-tourism',
  visaType: 'short_stay_tourism',
  nameKey: 'visa-domain:visaTypes.schengen-short-stay-tourism',
  documentRequirements: [
    ...commonSchengenDocuments,
    ...greeceSpecificDocuments,
  ],
  preparationMilestones: [
    ...commonPreparationMilestones,
    {
      id: 'request-employer-company-docs',
      nameKey: 'visa-domain:milestones.request-employer-company-docs.name',
      descriptionKey:
        'visa-domain:milestones.request-employer-company-docs.description',
      daysBeforeAppointment: 28,
      relatedDocuments: [
        'EMPLOYER_TAX_PLATE',
        'EMPLOYER_TRADE_REGISTRY',
        'EMPLOYER_SIGNATURE_CIRCULAR',
      ],
    },
  ],
  notesKeys: [
    'visa-domain:templateNotes.greece.nationalityVaries',
    'visa-domain:templateNotes.greece.visaCentre',
    'visa-domain:templateNotes.greece.peakSeason',
  ],

  templateVersion: '1.0.0',
  /**
   * Carried over from the previous configuration's `lastUpdated` field. This
   * is the date the template content was last touched in this repository —
   * NOT a date on which it was verified against an official publication.
   */
  lastReviewedAt: '2025-01-15',
  /**
   * Honest status: no requirement in this template has been confirmed against
   * a current official document list within this repository, so it is
   * unverified. Do not raise this without recording real evidence.
   */
  reviewStatus: 'unverified',
  sourceIds: ['gr-mfa-general'],
}
