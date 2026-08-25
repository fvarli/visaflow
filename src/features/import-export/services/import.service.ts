import { z } from 'zod'
import {
  DossierSchema,
  SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
  isSupportedSchemaVersion,
} from '@/domain/schemas/dossier.schema'
import { ApplicantSchema } from '@/domain/schemas/applicant.schema'
import { ApplicationSchema } from '@/domain/schemas/application.schema'
import { DocumentSchema } from '@/domain/schemas/document.schema'
import { SponsorSchema } from '@/domain/schemas/sponsor.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'

export interface ImportError {
  path: string
  message: string
}

export interface ImportResult<T> {
  success: boolean
  data?: T
  errors?: ImportError[]
  warnings?: string[]
  /**
   * How many top-level items in the file were understood but dropped.
   *
   * `errors` cannot answer this: one malformed document can produce several Zod
   * issues, so counting them overstates the loss, and a `documents` key that is
   * not an array produced no issue at all. This counts *things the user would
   * recognise* — an applicant, a trip, one document, one sponsor — which is the
   * only unit worth putting in a sentence they read (ADR-041).
   */
  omitted?: number
}

export interface PartialDossierImport {
  applicant?: Applicant
  application?: Application
  documents?: Document[]
  sponsors?: Sponsor[]
  schemaVersion?: string
}

/**
 * Parse and validate a JSON string
 */
function parseJson(jsonString: string): ImportResult<unknown> {
  try {
    const data: unknown = JSON.parse(jsonString)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: 'root',
          message:
            error instanceof Error ? error.message : 'Invalid JSON format',
        },
      ],
    }
  }
}

/**
 * Convert Zod errors to ImportError array
 */
function zodErrorsToImportErrors(error: z.ZodError): ImportError[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

/**
 * Import a complete dossier from JSON
 */
export function importDossier(jsonString: string): ImportResult<Dossier> {
  const parseResult = parseJson(jsonString)
  if (!parseResult.success) {
    return parseResult as ImportResult<Dossier>
  }

  const result = DossierSchema.safeParse(parseResult.data)

  if (!result.success) {
    return {
      success: false,
      errors: zodErrorsToImportErrors(result.error),
    }
  }

  return {
    success: true,
    data: result.data,
  }
}

/**
 * Import partial data (flexible import that accepts various formats)
 */
export function importPartial(
  jsonString: string
): ImportResult<PartialDossierImport> {
  const parseResult = parseJson(jsonString)
  if (!parseResult.success) {
    return parseResult as ImportResult<PartialDossierImport>
  }

  const data = parseResult.data as Record<string, unknown>
  const result: PartialDossierImport = {}
  const errors: ImportError[] = []
  const warnings: string[] = []
  // Counted separately from `errors` — see `ImportResult.omitted`.
  let omitted = 0

  // Check schema version.
  //
  // Warn on versions this build cannot read, not merely on versions it does not
  // *write*. A 1.0.0 export is read exactly as it always was, so warning about
  // it would be noise; a version from a newer build is worth saying out loud,
  // because whatever it added is being dropped here (ADR-043).
  if ('schemaVersion' in data && typeof data.schemaVersion === 'string') {
    result.schemaVersion = data.schemaVersion
    if (!isSupportedSchemaVersion(data.schemaVersion)) {
      warnings.push(
        `Schema version mismatch: this build reads ${SUPPORTED_SCHEMA_VERSIONS.join(
          ' / '
        )} and writes ${SCHEMA_VERSION}, but the file says ${data.schemaVersion}`
      )
    }
  }

  // Try to parse applicant
  if ('applicant' in data) {
    const applicantResult = ApplicantSchema.safeParse(data.applicant)
    if (applicantResult.success) {
      result.applicant = applicantResult.data
    } else {
      omitted += 1
      errors.push(
        ...zodErrorsToImportErrors(applicantResult.error).map((e) => ({
          ...e,
          path: `applicant.${e.path}`,
        }))
      )
    }
  }

  // Try to parse application
  if ('application' in data) {
    const applicationResult = ApplicationSchema.safeParse(data.application)
    if (applicationResult.success) {
      result.application = applicationResult.data
    } else {
      omitted += 1
      errors.push(
        ...zodErrorsToImportErrors(applicationResult.error).map((e) => ({
          ...e,
          path: `application.${e.path}`,
        }))
      )
    }
  }

  // Try to parse documents
  if ('documents' in data && Array.isArray(data.documents)) {
    const documents: Document[] = []
    data.documents.forEach((doc, index) => {
      const docResult = DocumentSchema.safeParse(doc)
      if (docResult.success) {
        documents.push(docResult.data)
      } else {
        omitted += 1
        errors.push(
          ...zodErrorsToImportErrors(docResult.error).map((e) => ({
            ...e,
            path: `documents[${index}].${e.path}`,
          }))
        )
      }
    })
    result.documents = documents
  } else if ('documents' in data) {
    // A `documents` key that is not a list used to vanish without a trace:
    // no parse attempt, no error, no count. The whole collection was dropped
    // and the import still reported success.
    omitted += 1
    errors.push({
      path: 'documents',
      message: 'Expected an array of documents',
    })
  }

  // Try to parse sponsors
  if ('sponsors' in data && Array.isArray(data.sponsors)) {
    const sponsors: Sponsor[] = []
    data.sponsors.forEach((sponsor, index) => {
      const sponsorResult = SponsorSchema.safeParse(sponsor)
      if (sponsorResult.success) {
        sponsors.push(sponsorResult.data)
      } else {
        omitted += 1
        errors.push(
          ...zodErrorsToImportErrors(sponsorResult.error).map((e) => ({
            ...e,
            path: `sponsors[${index}].${e.path}`,
          }))
        )
      }
    })
    result.sponsors = sponsors
  } else if ('sponsors' in data) {
    omitted += 1
    errors.push({ path: 'sponsors', message: 'Expected an array of sponsors' })
  }

  // Determine if import was successful (at least partial data was imported)
  const hasData =
    result.applicant !== undefined ||
    result.application !== undefined ||
    (result.documents?.length ?? 0) > 0 ||
    (result.sponsors?.length ?? 0) > 0

  // `success` deliberately means "something survived", not "everything did":
  // rescuing four of five documents from a file the user can no longer edit is
  // the right outcome. What was wrong was reporting only the first half of that
  // sentence — hence `omitted`, which every caller must now say out loud.
  return {
    success: hasData,
    data: hasData ? result : undefined,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    omitted: omitted > 0 ? omitted : undefined,
  }
}

/**
 * Import only applicant data
 */
export function importApplicant(jsonString: string): ImportResult<Applicant> {
  const parseResult = parseJson(jsonString)
  if (!parseResult.success) {
    return parseResult as ImportResult<Applicant>
  }

  const data = parseResult.data as Record<string, unknown>
  const applicantData = 'applicant' in data ? data.applicant : data

  const result = ApplicantSchema.safeParse(applicantData)

  if (!result.success) {
    return {
      success: false,
      errors: zodErrorsToImportErrors(result.error),
    }
  }

  return { success: true, data: result.data }
}

/**
 * Import only documents
 */
export function importDocuments(jsonString: string): ImportResult<Document[]> {
  const parseResult = parseJson(jsonString)
  if (!parseResult.success) {
    return parseResult as ImportResult<Document[]>
  }

  const data = parseResult.data as Record<string, unknown>
  const documentsData =
    'documents' in data && Array.isArray(data.documents)
      ? data.documents
      : Array.isArray(parseResult.data)
        ? parseResult.data
        : []

  const DocumentArraySchema = z.array(DocumentSchema)
  const result = DocumentArraySchema.safeParse(documentsData)

  if (!result.success) {
    return {
      success: false,
      errors: zodErrorsToImportErrors(result.error),
    }
  }

  return { success: true, data: result.data }
}

/**
 * Read a file and return its contents as a string
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read file as text'))
      }
    }
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    reader.readAsText(file)
  })
}
