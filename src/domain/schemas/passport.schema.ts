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

export const TravelHistoryEntrySchema = z.object({
  country: CountryCodeSchema,
  entryDate: DateStringSchema,
  exitDate: DateStringSchema.optional(),
  purpose: z.string().optional(),
  visaRequired: z.boolean().optional(),
})

export type TravelHistoryEntry = z.infer<typeof TravelHistoryEntrySchema>
