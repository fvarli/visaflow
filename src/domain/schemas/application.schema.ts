import { z } from 'zod'
import {
  DateStringSchema,
  CountryCodeSchema,
  VisaTypeSchema,
  FinancingSourceSchema,
  CurrencySchema,
} from '../types/common'
import { TripSchema } from './trip.schema'
import { EmploymentSchema, EmployerDetailsSchema } from './employment.schema'

export const AppointmentSchema = z.object({
  date: DateStringSchema,
  time: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(['vfs', 'embassy', 'consulate', 'visa_center']).optional(),
  confirmationNumber: z.string().optional(),
  notes: z.string().optional(),
})

export type Appointment = z.infer<typeof AppointmentSchema>

export const FinancingSchema = z.object({
  source: FinancingSourceSchema,
  selfFundedAmount: z.number().nonnegative().optional(),
  sponsoredAmount: z.number().nonnegative().optional(),
  currency: CurrencySchema.default('EUR'),
  bankName: z.string().optional(),
  accountBalance: z.number().nonnegative().optional(),
  statementDate: DateStringSchema.optional(),
  notes: z.string().optional(),
})

export type Financing = z.infer<typeof FinancingSchema>

export const ApplicationNoteSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  title: z.string().optional(),
  content: z.string(),
  category: z
    .enum(['general', 'document', 'timeline', 'appointment', 'other'])
    .default('general'),
})

export type ApplicationNote = z.infer<typeof ApplicationNoteSchema>

export const ApplicationSchema = z.object({
  applicationId: z.string(),
  applicantId: z.string(),
  destinationCountry: CountryCodeSchema,
  visaType: VisaTypeSchema,
  status: z
    .enum([
      'draft',
      'preparing',
      'ready_to_submit',
      'submitted',
      'approved',
      'rejected',
      'cancelled',
    ])
    .default('draft'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  appointment: AppointmentSchema.optional(),
  trip: TripSchema.optional(),
  employment: EmploymentSchema.optional(),
  employerDetails: EmployerDetailsSchema.optional(),
  financing: FinancingSchema.optional(),
  sponsorIds: z.array(z.string()).default([]),
  documentIds: z.array(z.string()).default([]),
  notes: z.array(ApplicationNoteSchema).default([]),
})

export type Application = z.infer<typeof ApplicationSchema>
