import type { CountryConfig, DocumentRequirement } from '../types'
import {
  commonSchengenDocuments,
  commonPreparationMilestones,
} from './common-schengen'

/**
 * Greece Short-Stay Tourism Visa Configuration
 *
 * DISCLAIMER: This configuration is for organizational purposes only.
 * Requirements may change. Always verify with the official Greek embassy
 * or authorized visa center for your country.
 *
 * Last reviewed: January 2025
 */

// Greece-specific additional documents
const greeceSpecificDocuments: DocumentRequirement[] = [
  // Employer company documents (specific requirement for some nationalities)
  {
    code: 'EMPLOYER_TAX_PLATE',
    name: 'Employer Tax Registration',
    category: 'employment',
    ownerType: 'employer',
    required: false,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    description: 'Company tax registration certificate',
    notes: 'May be required depending on nationality',
  },
  {
    code: 'EMPLOYER_TRADE_REGISTRY',
    name: 'Employer Trade Registry Record',
    category: 'employment',
    ownerType: 'employer',
    required: false,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    description: 'Company registration from trade registry',
    notes: 'May be required depending on nationality',
  },
  {
    code: 'EMPLOYER_SIGNATURE_CIRCULAR',
    name: 'Employer Signature Circular',
    category: 'employment',
    ownerType: 'employer',
    required: false,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    description: 'Company signature authorization document',
    notes: 'May be required depending on nationality',
  },

  // Property documents (supporting)
  {
    code: 'PROPERTY_DEED',
    name: 'Property Ownership Documents',
    category: 'supporting',
    ownerType: 'applicant',
    required: false,
    description: 'Proof of property ownership if applicable',
    notes: 'Can strengthen ties to home country',
  },

  // Self-employed specific
  {
    code: 'BUSINESS_LICENSE',
    name: 'Business License',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    },
    description: 'Business registration or license',
  },
  {
    code: 'TAX_RETURNS',
    name: 'Tax Returns',
    category: 'financial',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    },
    description: 'Last 2 years tax returns',
  },

  // Student specific
  {
    code: 'STUDENT_CERTIFICATE',
    name: 'Student Certificate',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'student',
    },
    description: 'Certificate of enrollment from educational institution',
    validityPeriodDays: 30,
  },

  // Retired specific
  {
    code: 'PENSION_STATEMENT',
    name: 'Pension Statement',
    category: 'financial',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'retired',
    },
    description: 'Recent pension payment statements',
  },
]

// Merge common and Greece-specific documents
const allDocuments: DocumentRequirement[] = [
  ...commonSchengenDocuments,
  ...greeceSpecificDocuments,
]

export const greeceConfig: CountryConfig = {
  id: 'GR',
  name: 'Greece',
  visaType: 'Short-Stay Tourism (Type C)',
  schengenMember: true,
  embassy: {
    name: 'Greek Embassy / VFS Global',
    website: 'https://www.mfa.gr/en/',
  },
  documentRequirements: allDocuments,
  preparationMilestones: [
    ...commonPreparationMilestones,
    {
      id: 'request-employer-company-docs',
      name: 'Request employer company documents',
      description:
        'Request company tax plate, trade registry, and signature circular if required',
      daysBeforeAppointment: 28,
      relatedDocuments: [
        'EMPLOYER_TAX_PLATE',
        'EMPLOYER_TRADE_REGISTRY',
        'EMPLOYER_SIGNATURE_CIRCULAR',
      ],
    },
  ],
  notes: [
    'Requirements may vary based on your nationality and the visa center processing your application.',
    'VFS Global processes visa applications for Greece in many countries.',
    'Appointment slots may be limited during peak travel seasons.',
  ],
  disclaimer: `This document checklist is provided for organizational purposes only.
It does not represent official requirements from the Greek government or any embassy.
Requirements may change without notice. Always verify current requirements with the
official Greek embassy, consulate, or authorized visa center for your country.`,
  lastUpdated: '2025-01-15',
}
