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
 * Occupation, one level finer than `EmploymentStatus` — and a different axis,
 * not a finer slicing of the same one.
 *
 * `employmentStatus` answers a routing question ("This determines which
 * employer details apply"), and its seven values are the right vocabulary for
 * that. What they cannot say is what kind of employee or business owner someone
 * is, and the evidence turns on exactly that: the Greek visa centre's checklist
 * branches on an axis it labels *Meslek*, where a *Kamu Çalışanı* is asked for
 * an institution letter and an institution card and is **not** asked for the
 * company-document block an ordinary *Çalışan* gets, and a *Çiftçi* is asked
 * for none of either. Annex III names Farmers and Company owners as categories
 * of their own, so two of these five carry L2 authority rather than only L3.
 *
 * WHY A SEPARATE FIELD RATHER THAN MORE `EmploymentStatus` VALUES. Widening a
 * persisted enum is the one shape this project has never shipped, and the
 * reason is measured: `importPartial` parses `application` as a single unit, so
 * an older build meeting an unknown `employmentStatus` loses the whole
 * application slice — destination country, visa type, appointment, trip,
 * financing — and still reports the import a success. An unknown *key* is
 * dropped harmlessly; an unknown *enum value* takes the document with it
 * (ADR-043, ADR-051). It would also break the four requirements that are
 * genuinely shared: an employee and a public servant both file a social
 * security record and payslips, and `employed` is exactly their union.
 *
 * `employee` is spelled out rather than left implied by absence. Applicability
 * is fail-closed — an unanswered field is not an answer — so someone has to be
 * able to *say* "an ordinary employee" and have that be distinguishable from
 * not having been asked yet.
 */
export const OccupationalCategorySchema = z.enum([
  'employee',
  'public_servant',
  'company_owner',
  'independent_professional',
  'farmer',
])

export type OccupationalCategory = z.infer<typeof OccupationalCategorySchema>

/**
 * Which categories belong under which status.
 *
 * The two vocabularies are not independent: a public servant is employed and a
 * farmer is not. This map is what keeps them consistent — the selector offers
 * only what fits, and a status with no entry asks no category question at all,
 * because for those the coarse value already *is* the branch the source
 * publishes (a pensioner, a student, someone not working).
 */
export const OCCUPATIONAL_CATEGORIES_BY_STATUS: Partial<
  Record<EmploymentStatus, readonly OccupationalCategory[]>
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
