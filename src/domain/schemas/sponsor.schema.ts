import { z } from 'zod'
import {
  DateStringSchema,
  CountryCodeSchema,
  CurrencySchema,
  EmploymentStatusSchema,
  SponsorRelationshipSchema,
  ExpenseTypeSchema,
} from '../types/common'

export const OwnedAssetSchema = z.object({
  type: z.enum(['property', 'vehicle', 'business', 'investment', 'other']),
  description: z.string(),
  estimatedValue: z.number().nonnegative().optional(),
  currency: CurrencySchema.default('EUR'),
  location: z.string().optional(),
})

export type OwnedAsset = z.infer<typeof OwnedAssetSchema>

export const InvestmentSchema = z.object({
  type: z.enum(['stocks', 'bonds', 'mutual_funds', 'crypto', 'other']),
  description: z.string().optional(),
  value: z.number().nonnegative(),
  currency: CurrencySchema.default('EUR'),
  institution: z.string().optional(),
})

export type Investment = z.infer<typeof InvestmentSchema>

export const SponsorSchema = z.object({
  id: z.string(),
  relationship: SponsorRelationshipSchema,
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: DateStringSchema.optional(),
  nationality: CountryCodeSchema.optional(),
  countryOfResidence: CountryCodeSchema.optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  employmentStatus: EmploymentStatusSchema.optional(),
  employerName: z.string().optional(),
  jobTitle: z.string().optional(),
  monthlyIncome: z.number().nonnegative().optional(),
  currency: CurrencySchema.default('EUR'),
  liquidAssets: z.number().nonnegative().optional(),
  investments: z.array(InvestmentSchema).default([]),
  ownedAssets: z.array(OwnedAssetSchema).default([]),
  coveredExpenses: z.array(ExpenseTypeSchema).default([]),
  sponsorshipLetter: z.boolean().default(false),
  proofOfRelationship: z.boolean().default(false),
  documentIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

export type Sponsor = z.infer<typeof SponsorSchema>
