import { z } from 'zod'
import { DossierSchema, SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
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

  // Check schema version
  if ('schemaVersion' in data && typeof data.schemaVersion === 'string') {
    result.schemaVersion = data.schemaVersion
    if (data.schemaVersion !== SCHEMA_VERSION) {
      warnings.push(
        `Schema version mismatch: expected ${SCHEMA_VERSION}, got ${data.schemaVersion}`
      )
    }
  }

  // Try to parse applicant
  if ('applicant' in data) {
    const applicantResult = ApplicantSchema.safeParse(data.applicant)
    if (applicantResult.success) {
      result.applicant = applicantResult.data
    } else {
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
        errors.push(
          ...zodErrorsToImportErrors(docResult.error).map((e) => ({
            ...e,
            path: `documents[${index}].${e.path}`,
          }))
        )
      }
    })
    result.documents = documents
  }

  // Try to parse sponsors
  if ('sponsors' in data && Array.isArray(data.sponsors)) {
    const sponsors: Sponsor[] = []
    data.sponsors.forEach((sponsor, index) => {
      const sponsorResult = SponsorSchema.safeParse(sponsor)
      if (sponsorResult.success) {
        sponsors.push(sponsorResult.data)
      } else {
        errors.push(
          ...zodErrorsToImportErrors(sponsorResult.error).map((e) => ({
            ...e,
            path: `sponsors[${index}].${e.path}`,
          }))
        )
      }
    })
    result.sponsors = sponsors
  }

  // Determine if import was successful (at least partial data was imported)
  const hasData =
    result.applicant !== undefined ||
    result.application !== undefined ||
    (result.documents?.length ?? 0) > 0 ||
    (result.sponsors?.length ?? 0) > 0

  return {
    success: hasData,
    data: hasData ? result : undefined,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
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
