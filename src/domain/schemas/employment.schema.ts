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
  /**
   * @deprecated No longer collected. VisaFlow asked for a national identity
   * number and a tax ID and then did nothing with either — not displayed, not
   * validated, not reviewed, not printed, not required by any country pack. A
   * privacy-first product should not hold personal identifiers it has no use
   * for, so the inputs are gone (ADR-043).
   *
   * The fields stay in the schema, optional, so a dossier that already carries
   * them still imports and round-trips byte-for-byte. Removing them would
   * silently destroy data the user gave us, which is the opposite of the point.
   * Do not add consumers.
   */
  socialSecurityNumber: z.string().optional(),
  /** @deprecated See `socialSecurityNumber`. */
  taxId: z.string().optional(),
  notes: z.string().optional(),
})

export type Employment = z.infer<typeof EmploymentSchema>

/**
 * @deprecated Never written or read by any build.
 *
 * `application.employerDetails` has no editor, no display, no validation rule
 * and no country-pack consumer; it is absent from the example dossier and from
 * every export VisaFlow has ever produced. It is kept, not deleted, so a
 * hand-authored file carrying it still imports unchanged — but nothing should
 * grow a dependency on it. A canonical dossier field needs a named consumer
 * (ADR-043).
 */
export const EmployerDetailsSchema = z.object({
  companyName: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  address: z.string().optional(),
  establishedDate: DateStringSchema.optional(),
  industry: z.string().optional(),
})

export type EmployerDetails = z.infer<typeof EmployerDetailsSchema>
