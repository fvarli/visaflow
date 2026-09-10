import { z } from 'zod'
import { ApplicantSchema, PartialApplicantSchema } from './applicant.schema'
import { ApplicationSchema } from './application.schema'
import { DocumentSchema } from './document.schema'
import { SponsorSchema } from './sponsor.schema'

/**
 * The version this build **writes**. Independent of the application version and
 * of `STORAGE_FORMAT_VERSION` — see the note at the top of `CHANGELOG.md`.
 *
 * 1.1.0 added `applicant.previousRefusals`. 1.2.0 added
 * `document.satisfiedRevision` — how far the requirement had tightened when a
 * completion claim was made. 1.3.0 adds `document.satisfiedContract`, which
 * says *which* definition it was, because one code can now render a different
 * acceptance bar in each pack and two of those bars can share a number. 1.4.0
 * adds `application.employment.occupationCode` — occupation as a second axis,
 * carrying the distinction between a public servant and an ordinary employee,
 * or a farmer and a company owner, that the coarse status cannot (ADR-053).
 *
 * 1.4.0 is also the last bump occupation will ask for. The field is an open
 * string, not an enum, so the vocabulary it carries may grow without the format
 * changing — which is the point of the shape. That says nothing about future
 * bumps for anything else.
 *
 * The rule is unchanged and it is about meaning, not parsing: no field changed
 * meaning and none was removed, so every older document is already valid here.
 * The bump exists so the loss is *announced*. An older build strips the unknown
 * key without complaint, and a user who imported a 1.2.0 file there and
 * re-exported it would lose the provenance behind their completions with
 * nothing said. The version mismatch is what warns them first (ADR-043,
 * ADR-051).
 */
export const SCHEMA_VERSION = '1.4.0' as const

/**
 * Every version this build can **read**. Import accepts all of them unchanged;
 * only a version outside this list is worth warning about.
 */
export const SUPPORTED_SCHEMA_VERSIONS = [
  '1.0.0',
  '1.1.0',
  '1.2.0',
  '1.3.0',
  '1.4.0',
] as const

export type SupportedSchemaVersion = (typeof SUPPORTED_SCHEMA_VERSIONS)[number]

export function isSupportedSchemaVersion(
  value: string
): value is SupportedSchemaVersion {
  return (SUPPORTED_SCHEMA_VERSIONS as readonly string[]).includes(value)
}

/** Accepts any version this build reads, rather than only the one it writes. */
const SchemaVersionSchema = z.enum(SUPPORTED_SCHEMA_VERSIONS)

export const DossierMetadataSchema = z.object({
  schemaVersion: SchemaVersionSchema,
  exportedAt: z.string().datetime(),
  /** @deprecated Never written or read by any build. Kept so a hand-authored
   * file carrying it still imports; do not add consumers (ADR-043). */
  applicationName: z.string().optional(),
  notes: z.string().optional(),
})

export type DossierMetadata = z.infer<typeof DossierMetadataSchema>

export const DossierSchema = z.object({
  schemaVersion: SchemaVersionSchema,
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
