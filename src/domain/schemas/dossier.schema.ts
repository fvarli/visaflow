import { z } from 'zod'
import { ApplicantSchema, PartialApplicantSchema } from './applicant.schema'
import { ApplicationSchema } from './application.schema'
import { DocumentSchema } from './document.schema'
import { SponsorSchema } from './sponsor.schema'

export const SCHEMA_VERSION = '1.0.0' as const

export const DossierMetadataSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  exportedAt: z.string().datetime(),
  applicationName: z.string().optional(),
  notes: z.string().optional(),
})

export type DossierMetadata = z.infer<typeof DossierMetadataSchema>

export const DossierSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  exportedAt: z.string().datetime(),
  applicant: ApplicantSchema,
  application: ApplicationSchema,
  documents: z.array(DocumentSchema),
  sponsors: z.array(SponsorSchema),
})

export type Dossier = z.infer<typeof DossierSchema>

// Partial dossier for import validation (allows gradual building)
export const PartialDossierSchema = z.object({
  schemaVersion: z.string().optional(),
  exportedAt: z.string().datetime().optional(),
  applicant: PartialApplicantSchema.optional(),
  application: ApplicationSchema.partial().optional(),
  documents: z.array(DocumentSchema.partial()).optional(),
  sponsors: z.array(SponsorSchema.partial()).optional(),
})

export type PartialDossier = z.infer<typeof PartialDossierSchema>

// Import schema that accepts various formats
export const ImportDossierSchema = z.union([
  DossierSchema,
  z.object({
    applicant: ApplicantSchema,
  }),
  z.object({
    application: ApplicationSchema,
  }),
  z.object({
    documents: z.array(DocumentSchema),
  }),
])

export type ImportDossier = z.infer<typeof ImportDossierSchema>
