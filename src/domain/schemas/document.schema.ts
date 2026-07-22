import { z } from 'zod'
import {
  DateStringSchema,
  DocumentStatusSchema,
  DocumentCategorySchema,
  OwnerTypeSchema,
} from '../types/common'

export const DocumentSchema = z.object({
  id: z.string(),
  /**
   * Stable, language-independent identifier. This — not `name` — is what
   * identifies a document, and what the UI translates for display.
   */
  code: z.string().min(1, 'Document code is required'),
  /**
   * @deprecated Transitional. Documents created from a country template no
   * longer write this, because a stored display name would make exported JSON
   * depend on the UI language. Kept optional so every existing schemaVersion
   * 1.0.0 export still imports; legacy values are accepted and used only as a
   * display fallback for codes with no translation. Do not write new values.
   */
  name: z.string().optional(),
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

/**
 * The template counterpart of a Document lives in the configuration layer as
 * `DocumentRequirement` (src/config/types.ts). A duplicate schema previously
 * existed here but was never referenced; keeping one definition avoids the
 * two drifting apart.
 */
