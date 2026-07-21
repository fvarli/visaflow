import type { Dossier } from '@/domain/schemas/dossier.schema'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'

export interface ExportOptions {
  includeApplicant?: boolean
  includeApplication?: boolean
  includeDocuments?: boolean
  includeSponsors?: boolean
  prettyPrint?: boolean
}

const defaultExportOptions: ExportOptions = {
  includeApplicant: true,
  includeApplication: true,
  includeDocuments: true,
  includeSponsors: true,
  prettyPrint: true,
}

/**
 * Export a complete dossier to JSON
 */
export function exportDossier(
  applicant: Applicant | null,
  application: Application | null,
  documents: Document[],
  sponsors: Sponsor[],
  options: ExportOptions = {}
): string {
  const opts = { ...defaultExportOptions, ...options }

  const dossier: Partial<Dossier> & {
    schemaVersion: string
    exportedAt: string
  } = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
  }

  if (opts.includeApplicant && applicant) {
    dossier.applicant = applicant
  }

  if (opts.includeApplication && application) {
    dossier.application = application
  }

  if (opts.includeDocuments) {
    dossier.documents = documents
  }

  if (opts.includeSponsors) {
    dossier.sponsors = sponsors
  }

  return opts.prettyPrint
    ? JSON.stringify(dossier, null, 2)
    : JSON.stringify(dossier)
}

/**
 * Download dossier as a JSON file
 */
export function downloadDossier(
  applicant: Applicant | null,
  application: Application | null,
  documents: Document[],
  sponsors: Sponsor[],
  filename?: string,
  options?: ExportOptions
): void {
  const json = exportDossier(
    applicant,
    application,
    documents,
    sponsors,
    options
  )
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const defaultFilename = generateFilename(applicant, application)
  const link = document.createElement('a')
  link.href = url
  link.download = filename ?? defaultFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate a descriptive filename for the export
 */
function generateFilename(
  applicant: Applicant | null,
  application: Application | null
): string {
  const parts: string[] = ['visaflow']

  if (applicant?.lastName) {
    parts.push(applicant.lastName.toLowerCase().replace(/\s+/g, '-'))
  }

  if (application?.destinationCountry) {
    parts.push(application.destinationCountry.toLowerCase())
  }

  const date = new Date().toISOString().split('T')[0]
  parts.push(date ?? 'export')

  return `${parts.join('-')}.json`
}

/**
 * Export only the applicant data
 */
export function exportApplicant(applicant: Applicant): string {
  return JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      applicant,
    },
    null,
    2
  )
}

/**
 * Export only the documents
 */
export function exportDocuments(documents: Document[]): string {
  return JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      documents,
    },
    null,
    2
  )
}
