import { parseISO, isBefore } from 'date-fns'
import type { Dossier } from '../schemas/dossier.schema'
import type { ValidationFinding, ValidationRule } from './types'

/**
 * Rule 9: Required documents cannot be marked not_applicable without a note
 */
export const requiredDocumentsNotSkipped: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const findings: ValidationFinding[] = []

  for (const doc of dossier.documents) {
    if (doc.required && doc.status === 'not_applicable' && !doc.notes) {
      findings.push({
        id: `required-doc-skipped-${doc.id}`,
        severity: 'warning',
        title: 'Required document marked as not applicable',
        description: `"${doc.name}" is marked as required but set to "not applicable" without an explanation.`,
        relatedFields: [
          `documents.${doc.id}.status`,
          `documents.${doc.id}.notes`,
        ],
        suggestedAction:
          'Add a note explaining why this required document does not apply.',
      })
    }
  }

  return findings
}

/**
 * Rule 10: Documents with validUntil date before appointment must be marked needs_update
 */
export const documentsNotExpiredBeforeAppointment: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const appointment = dossier.application.appointment
  if (!appointment?.date) return []

  const appointmentDate = parseISO(appointment.date)
  const findings: ValidationFinding[] = []

  for (const doc of dossier.documents) {
    if (
      doc.validUntil &&
      doc.status !== 'not_applicable' &&
      doc.status !== 'needs_update'
    ) {
      const validUntil = parseISO(doc.validUntil)

      if (isBefore(validUntil, appointmentDate)) {
        findings.push({
          id: `doc-expires-before-appointment-${doc.id}`,
          severity: 'error',
          title: 'Document expires before appointment',
          description: `"${doc.name}" expires on ${doc.validUntil}, before your appointment on ${appointment.date}.`,
          relatedFields: [`documents.${doc.id}.validUntil`, 'appointment.date'],
          suggestedAction:
            'Obtain an updated version of this document or mark it as "needs update".',
        })
      }
    }
  }

  return findings
}

/**
 * Check for missing required documents
 */
export const missingRequiredDocuments: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const findings: ValidationFinding[] = []

  const notStartedRequired = dossier.documents.filter(
    (doc) => doc.required && doc.status === 'not_started'
  )

  if (notStartedRequired.length > 0) {
    const docNames = notStartedRequired.map((d) => d.name).join(', ')
    findings.push({
      id: 'missing-required-docs',
      severity: 'warning',
      title: 'Required documents not started',
      description: `${notStartedRequired.length} required document(s) have not been started: ${docNames}`,
      relatedFields: notStartedRequired.map((d) => `documents.${d.id}`),
      suggestedAction: 'Begin collecting the required documents.',
    })
  }

  return findings
}

/**
 * Check for documents that need updates
 */
export const documentsNeedingUpdate: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const needsUpdate = dossier.documents.filter(
    (doc) => doc.status === 'needs_update'
  )

  if (needsUpdate.length > 0) {
    const docNames = needsUpdate.map((d) => d.name).join(', ')
    return [
      {
        id: 'docs-need-update',
        severity: 'warning',
        title: 'Documents need updating',
        description: `${needsUpdate.length} document(s) need updating: ${docNames}`,
        relatedFields: needsUpdate.map((d) => `documents.${d.id}`),
        suggestedAction: 'Obtain updated versions of these documents.',
      },
    ]
  }

  return []
}

// Export all document rules
export const documentRules: ValidationRule[] = [
  requiredDocumentsNotSkipped,
  documentsNotExpiredBeforeAppointment,
  missingRequiredDocuments,
  documentsNeedingUpdate,
]
