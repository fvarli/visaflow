import { z } from 'zod'
import {
  DateStringSchema,
  DocumentStatusSchema,
  DocumentCategorySchema,
  OwnerTypeSchema,
} from '../types/common'

export const DocumentSchema = z.object({
  id: z.string(),
  code: z.string().min(1, 'Document code is required'),
  name: z.string().min(1, 'Document name is required'),
  category: DocumentCategorySchema,
  ownerType: OwnerTypeSchema,
  ownerId: z.string(),
  required: z.boolean().default(true),
  status: DocumentStatusSchema.default('not_started'),
  requestedAt: DateStringSchema.optional(),
  receivedAt: DateStringSchema.optional(),
  issuedAt: DateStringSchema.optional(),
  validUntil: DateStringSchema.optional(),
  fileReference: z.string().optional(),
  notes: z.string().optional(),
  verified: z.boolean().default(false),
})

export type Document = z.infer<typeof DocumentSchema>

// Document template for country configurations
export const DocumentTemplateSchema = z.object({
  code: z.string(),
  name: z.string(),
  category: DocumentCategorySchema,
  ownerType: OwnerTypeSchema.default('applicant'),
  required: z.boolean().default(true),
  description: z.string().optional(),
  notes: z.string().optional(),
  validityPeriod: z.number().int().positive().optional(), // in days
  conditionalOn: z
    .object({
      field: z.string(),
      value: z.union([z.string(), z.boolean(), z.number()]),
    })
    .optional(),
})

export type DocumentTemplate = z.infer<typeof DocumentTemplateSchema>
