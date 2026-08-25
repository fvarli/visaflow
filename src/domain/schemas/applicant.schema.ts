import { z } from 'zod'
import {
  DateStringSchema,
  CountryCodeSchema,
  MaritalStatusSchema,
} from '../types/common'
import {
  PassportSchema,
  PreviousRefusalSchema,
  PreviousVisaSchema,
  TravelHistoryEntrySchema,
} from './passport.schema'

export const ApplicantSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: DateStringSchema,
  nationality: CountryCodeSchema,
  countryOfResidence: CountryCodeSchema.optional(),
  maritalStatus: MaritalStatusSchema.optional(),
  occupation: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      country: CountryCodeSchema.optional(),
    })
    .optional(),
  passport: PassportSchema,
  previousPassports: z.array(PassportSchema).default([]),
  previousVisas: z.array(PreviousVisaSchema).default([]),
  /**
   * Refusals are their own fact, not a visa with a bad outcome — see
   * `PreviousRefusalSchema`. Added in dossier schema 1.1.0; a 1.0.0 file gains
   * an empty array by default, which changes nothing it recorded.
   */
  previousRefusals: z.array(PreviousRefusalSchema).default([]),
  travelHistory: z.array(TravelHistoryEntrySchema).default([]),
})

export type Applicant = z.infer<typeof ApplicantSchema>

export const PartialApplicantSchema = ApplicantSchema.partial().extend({
  id: z.string(),
})

export type PartialApplicant = z.infer<typeof PartialApplicantSchema>
