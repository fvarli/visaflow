import { z } from 'zod'
import {
  DateStringSchema,
  CurrencySchema,
  EmploymentStatusSchema,
} from '../types/common'

export const EmploymentSchema = z.object({
  employmentStatus: EmploymentStatusSchema,
  employerName: z.string().optional(),
  employerAddress: z.string().optional(),
  employerPhone: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  startDate: DateStringSchema.optional(),
  monthlyNetIncome: z.number().nonnegative().optional(),
  currency: CurrencySchema.default('EUR'),
  salaryBank: z.string().optional(),
  approvedLeaveStart: DateStringSchema.optional(),
  approvedLeaveEnd: DateStringSchema.optional(),
  socialSecurityNumber: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
})

export type Employment = z.infer<typeof EmploymentSchema>

// Employer details for company documents
export const EmployerDetailsSchema = z.object({
  companyName: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  address: z.string().optional(),
  establishedDate: DateStringSchema.optional(),
  industry: z.string().optional(),
})

export type EmployerDetails = z.infer<typeof EmployerDetailsSchema>
