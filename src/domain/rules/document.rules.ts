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
        ruleId: 'document.requiredNotSkipped',
        severity: 'warning',
        messageKey: 'findings.requiredDocSkipped',
        messageParams: { documentCodes: { document: [doc.code] } },
        relatedFields: [
          `documents.${doc.id}.status`,
          `documents.${doc.id}.notes`,
        ],
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
          ruleId: 'document.validUntilBeforeAppointment',
          severity: 'error',
          messageKey: 'findings.docExpiresBeforeAppointment',
          messageParams: {
            documentCodes: { document: [doc.code] },
            dates: {
              validUntil: doc.validUntil,
              appointmentDate: appointment.date,
            },
          },
          relatedFields: [`documents.${doc.id}.validUntil`, 'appointment.date'],
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
    findings.push({
      id: 'missing-required-docs',
      ruleId: 'document.requiredNotStarted',
      severity: 'warning',
      messageKey: 'findings.missingRequiredDocs',
      messageParams: {
        values: { count: notStartedRequired.length },
        documentCodes: {
          documents: notStartedRequired.map((d) => d.code),
        },
      },
      relatedFields: notStartedRequired.map((d) => `documents.${d.id}`),
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
    return [
      {
        id: 'docs-need-update',
        ruleId: 'document.needingUpdate',
        severity: 'warning',
        messageKey: 'findings.docsNeedUpdate',
        messageParams: {
          values: { count: needsUpdate.length },
          documentCodes: { documents: needsUpdate.map((d) => d.code) },
        },
        relatedFields: needsUpdate.map((d) => `documents.${d.id}`),
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
