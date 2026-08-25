import { z } from 'zod'
import {
  DateStringSchema,
  CountryCodeSchema,
  PassportTypeSchema,
} from '../types/common'

export const PassportSchema = z.object({
  number: z.string().min(1, 'Passport number is required'),
  issueDate: DateStringSchema,
  expiryDate: DateStringSchema,
  issuingCountry: CountryCodeSchema,
  passportType: PassportTypeSchema.default('ordinary'),
})

export type Passport = z.infer<typeof PassportSchema>

export const PreviousVisaSchema = z.object({
  country: CountryCodeSchema,
  visaType: z.string(),
  issueDate: DateStringSchema.optional(),
  expiryDate: DateStringSchema.optional(),
  entryCount: z.number().int().positive().optional(),
  status: z.enum(['used', 'unused', 'expired', 'cancelled']).optional(),
  notes: z.string().optional(),
})

export type PreviousVisa = z.infer<typeof PreviousVisaSchema>

/**
 * A visa application that was refused.
 *
 * Deliberately **not** a `PreviousVisa` with a `'refused'` status, for two
 * reasons. Semantically, nothing was issued: `issueDate`, `expiryDate` and
 * `entryCount` are all meaningless for a refusal, so the shape would be mostly
 * inapplicable fields. Practically, `previousVisas` is nested inside
 * `ApplicantSchema`, which `importPartial` parses as a single unit — a value
 * outside a `z.enum` fails the whole applicant, so an older build reading a
 * newer file would drop the applicant's name, passport and travel history
 * entirely. An unknown *key* is stripped harmlessly; an unknown *enum value* is
 * fatal. A separate array degrades gracefully (ADR-043).
 *
 * Recorded and shown, never scored: a refusal must not reach readiness or any
 * risk signal (ADR-016).
 */
export const PreviousRefusalSchema = z.object({
  country: CountryCodeSchema,
  /** When the refusal was issued. Optional — an applicant may not recall it. */
  refusedOn: DateStringSchema.optional(),
  /** Free text: the applied-for type, as the applicant knew it. */
  visaType: z.string().optional(),
  notes: z.string().optional(),
})

export type PreviousRefusal = z.infer<typeof PreviousRefusalSchema>

export const TravelHistoryEntrySchema = z.object({
  country: CountryCodeSchema,
  entryDate: DateStringSchema,
  exitDate: DateStringSchema.optional(),
  purpose: z.string().optional(),
  visaRequired: z.boolean().optional(),
})

export type TravelHistoryEntry = z.infer<typeof TravelHistoryEntrySchema>
