import { z } from 'zod'
import {
  DateStringSchema,
  CountryCodeSchema,
  CurrencySchema,
} from '../types/common'

export const TransportTypeSchema = z.enum([
  'flight',
  'train',
  'bus',
  'car',
  'ferry',
  'other',
])

export type TransportType = z.infer<typeof TransportTypeSchema>

export const TransportReservationSchema = z.object({
  type: TransportTypeSchema,
  carrier: z.string().optional(),
  reservationNumber: z.string().optional(),
  departureDate: DateStringSchema,
  departureTime: z.string().optional(),
  departureCity: z.string(),
  departureCountry: CountryCodeSchema.optional(),
  arrivalDate: DateStringSchema.optional(),
  arrivalTime: z.string().optional(),
  arrivalCity: z.string(),
  arrivalCountry: CountryCodeSchema.optional(),
  passengerName: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'ticketed']).default('pending'),
  notes: z.string().optional(),
})

export type TransportReservation = z.infer<typeof TransportReservationSchema>

export const AccommodationReservationSchema = z.object({
  type: z
    .enum(['hotel', 'airbnb', 'hostel', 'apartment', 'friend_family', 'other'])
    .default('hotel'),
  name: z.string(),
  address: z.string().optional(),
  city: z.string(),
  country: CountryCodeSchema.optional(),
  checkInDate: DateStringSchema,
  checkOutDate: DateStringSchema,
  reservationNumber: z.string().optional(),
  guestName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'paid']).default('pending'),
  notes: z.string().optional(),
})

export type AccommodationReservation = z.infer<
  typeof AccommodationReservationSchema
>

export const InsuranceSchema = z.object({
  provider: z.string(),
  policyNumber: z.string().optional(),
  coverageStartDate: DateStringSchema,
  coverageEndDate: DateStringSchema,
  coverageAmount: z.number().nonnegative().optional(),
  currency: CurrencySchema.default('EUR'),
  medicalCoverage: z.boolean().default(true),
  repatriationCoverage: z.boolean().default(false),
  insuredName: z.string().optional(),
  notes: z.string().optional(),
})

export type Insurance = z.infer<typeof InsuranceSchema>

export const RouteStopSchema = z.object({
  city: z.string(),
  country: CountryCodeSchema,
  arrivalDate: DateStringSchema,
  departureDate: DateStringSchema,
  nights: z.number().int().nonnegative(),
  purpose: z.string().optional(),
})

export type RouteStop = z.infer<typeof RouteStopSchema>

export const TripSchema = z.object({
  entryDate: DateStringSchema,
  exitDate: DateStringSchema,
  firstEntryCountry: CountryCodeSchema,
  mainDestinationCountry: CountryCodeSchema,
  entryCity: z.string().optional(),
  exitCity: z.string().optional(),
  route: z.array(RouteStopSchema).default([]),
  transportReservations: z.array(TransportReservationSchema).default([]),
  accommodationReservations: z
    .array(AccommodationReservationSchema)
    .default([]),
  insurance: InsuranceSchema.optional(),
  tripPurpose: z.string().optional(),
  estimatedBudget: z.number().nonnegative().optional(),
  budgetCurrency: CurrencySchema.default('EUR'),
})

export type Trip = z.infer<typeof TripSchema>
