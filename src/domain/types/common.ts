import { z } from 'zod'

// Branded ID types for type-safe entity references
export type ApplicantId = string & { readonly __brand: 'ApplicantId' }
export type ApplicationId = string & { readonly __brand: 'ApplicationId' }
export type DocumentId = string & { readonly __brand: 'DocumentId' }
export type SponsorId = string & { readonly __brand: 'SponsorId' }

// Date string in ISO format (YYYY-MM-DD)
export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

export type DateString = z.infer<typeof DateStringSchema>

// Currency codes
export const CurrencySchema = z.enum([
  'EUR',
  'USD',
  'GBP',
  'TRY',
  'CHF',
  'JPY',
  'CAD',
  'AUD',
  'CNY',
  'INR',
  'OTHER',
])

export type Currency = z.infer<typeof CurrencySchema>

// Country codes (ISO 3166-1 alpha-2)
export const CountryCodeSchema = z.string().length(2).toUpperCase()

export type CountryCode = z.infer<typeof CountryCodeSchema>

// Marital status
export const MaritalStatusSchema = z.enum([
  'single',
  'married',
  'divorced',
  'widowed',
  'separated',
  'civil_partnership',
])

export type MaritalStatus = z.infer<typeof MaritalStatusSchema>

// Employment status
export const EmploymentStatusSchema = z.enum([
  'employed',
  'self_employed',
  'unemployed',
  'retired',
  'student',
  'homemaker',
  'other',
])

export type EmploymentStatus = z.infer<typeof EmploymentStatusSchema>

// Document status
export const DocumentStatusSchema = z.enum([
  'not_started',
  'requested',
  'received',
  'needs_update',
  'ready',
  'not_applicable',
])

export type DocumentStatus = z.infer<typeof DocumentStatusSchema>

// Document categories
export const DocumentCategorySchema = z.enum([
  'identity',
  'passport',
  'employment',
  'financial',
  'sponsor',
  'travel',
  'accommodation',
  'insurance',
  'application_form',
  'civil_registry',
  'previous_travel',
  'supporting',
])

export type DocumentCategory = z.infer<typeof DocumentCategorySchema>

// Owner type for documents
export const OwnerTypeSchema = z.enum(['applicant', 'sponsor', 'employer'])

export type OwnerType = z.infer<typeof OwnerTypeSchema>

// Passport type
export const PassportTypeSchema = z.enum([
  'ordinary',
  'diplomatic',
  'service',
  'official',
  'emergency',
])

export type PassportType = z.infer<typeof PassportTypeSchema>

// Visa type
export const VisaTypeSchema = z.enum([
  'short_stay_tourism',
  'short_stay_business',
  'short_stay_visit',
  'transit',
  'other',
])

export type VisaType = z.infer<typeof VisaTypeSchema>

// Financing source
export const FinancingSourceSchema = z.enum([
  'self',
  'sponsor',
  'employer',
  'mixed',
])

export type FinancingSource = z.infer<typeof FinancingSourceSchema>

// Sponsor relationship
export const SponsorRelationshipSchema = z.enum([
  'spouse',
  'parent',
  'child',
  'sibling',
  'grandparent',
  'grandchild',
  'aunt_uncle',
  'cousin',
  'in_law',
  'friend',
  'employer',
  'business_partner',
  'other',
])

export type SponsorRelationship = z.infer<typeof SponsorRelationshipSchema>

// Expense type
export const ExpenseTypeSchema = z.enum([
  'accommodation',
  'transport',
  'food',
  'insurance',
  'pocket_money',
  'all',
])

export type ExpenseType = z.infer<typeof ExpenseTypeSchema>

// Helper to create ID generators
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function createApplicantId(): ApplicantId {
  return generateId() as ApplicantId
}

export function createApplicationId(): ApplicationId {
  return generateId() as ApplicationId
}

export function createDocumentId(): DocumentId {
  return generateId() as DocumentId
}

export function createSponsorId(): SponsorId {
  return generateId() as SponsorId
}
