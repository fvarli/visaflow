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

/**
 * Occupation — a second axis, not a finer slicing of the first (ADR-053).
 *
 * `employmentStatus` answers a routing question: which employer details apply.
 * These answer a different one: which *branch* of a consulate's checklist an
 * applicant falls into. The Greek visa centre publishes an axis it labels
 * *Meslek* on which a *Kamu Çalışanı* is asked for an institution letter and
 * card and is **not** asked for the company-document block an ordinary
 * *Çalışan* gets, and a *Çiftçi* is asked for neither. Annex III names Farmers
 * and Company owners as categories in their own right, and the German mission
 * sheet has its own farmer category.
 *
 * THIS IS NOT AN ONTOLOGY OF PROFESSIONS. It is a record of distinctions
 * particular authorities draw, and nothing may be inferred from a category's
 * absence: Annex III I.5(e) has truck drivers with a document set of their own
 * and they are deliberately not here, because no reviewed pass has adjudicated
 * them.
 *
 * `employee` is spelled out rather than left implied by absence. Applicability
 * is fail-closed, so "no code" already means "has not answered"; without an
 * explicit value there would be no way to say *ordinary employee* and have it
 * be distinguishable from silence.
 *
 * These are the codes this build **knows**. The persisted field is an open
 * string and may hold others — see `occupationCode` on `EmploymentSchema`.
 */
export const KNOWN_OCCUPATION_CODES = [
  'employee',
  'public_servant',
  'company_owner',
  'independent_professional',
  'farmer',
] as const

export type KnownOccupationCode = (typeof KNOWN_OCCUPATION_CODES)[number]

export function isKnownOccupationCode(
  value: unknown
): value is KnownOccupationCode {
  return (KNOWN_OCCUPATION_CODES as readonly unknown[]).includes(value)
}

/**
 * Which codes are legal under which coarse status.
 *
 * The two vocabularies are not independent — a public servant is employed and
 * a farmer is not — and this map is the single place that relationship is
 * stated. The selector offers from it and the resolver decides from it, so the
 * question a user is asked and the answer applicability accepts cannot drift
 * apart.
 *
 * A status with no entry asks no occupational question at all. For a pensioner,
 * a student or someone not working the coarse value already *is* the branch the
 * checklists publish, so narrowing further would be a question with no
 * consequence.
 */
export const OCCUPATIONS_BY_STATUS: Partial<
  Record<EmploymentStatus, readonly KnownOccupationCode[]>
> = {
  employed: ['employee', 'public_servant'],
  self_employed: ['company_owner', 'independent_professional', 'farmer'],
}

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
