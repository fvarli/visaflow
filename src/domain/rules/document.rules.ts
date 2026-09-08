import { parseISO, isBefore } from 'date-fns'
import {
  countsTowardReadiness,
  effectiveStatus,
} from '@/features/documents/document-semantics'
import type {
  ValidationContext,
  ValidationFinding,
  ValidationRule,
} from './types'

/**
 * Rule 9: Required documents cannot be marked not_applicable without a note
 */
export const requiredDocumentsNotSkipped: ValidationRule = ({
  dossier,
  template,
}: ValidationContext): ValidationFinding[] => {
  const findings: ValidationFinding[] = []

  for (const doc of dossier.documents) {
    /**
     * Requiredness comes from the pack, not from the flag stored on the record.
     *
     * `Document.required` is a snapshot taken when the record was seeded, so a
     * pack that later made a document mandatory left this rule silent while the
     * readiness ring counted the same document as outstanding. Two surfaces, one
     * dossier, two answers (ADR-050, ADR-051).
     *
     * `countsTowardReadiness` is the definition readiness, the timeline and the
     * next-document recommendation already share; a second implementation here
     * is how they would drift again. It also settles two cases this rule used to
     * get wrong: a **custom** document is the applicant's own and needs no
     * justification to set aside, and a **retired** requirement is not current
     * work at all.
     */
    if (
      countsTowardReadiness(doc, template, dossier.application) &&
      doc.status === 'not_applicable' &&
      !doc.notes
    ) {
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
export const documentsNotExpiredBeforeAppointment: ValidationRule = ({
  dossier,
}: ValidationContext): ValidationFinding[] => {
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
export const missingRequiredDocuments: ValidationRule = ({
  dossier,
  template,
}: ValidationContext): ValidationFinding[] => {
  const findings: ValidationFinding[] = []

  // Same correction as `requiredDocumentsNotSkipped`, and the one that made the
  // disagreement visible: `EMPLOYER_TRADE_REGISTRY` and `EMPLOYER_TAX_PLATE`
  // both became required after dossiers had already been seeded with them
  // optional, so this rule reported nothing missing while the ring counted them.
  const notStartedRequired = dossier.documents.filter(
    (doc) =>
      countsTowardReadiness(doc, template, dossier.application) &&
      doc.status === 'not_started'
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
export const documentsNeedingUpdate: ValidationRule = ({
  dossier,
  template,
}: ValidationContext): ValidationFinding[] => {
  /**
   * The *effective* status, not the stored one.
   *
   * A claim made against an acceptance contract that is no longer in force keeps
   * `status: 'ready'` — that is the applicant's own assertion and is never
   * rewritten — while the derived answer is `needs_update`. Reading the stored
   * field made this rule blind to every superseded claim, which is precisely
   * what the Documents chips were already showing (ADR-051, ADR-051b).
   *
   * The comparison itself belongs to `completionStanding`; nothing about
   * contract keys is repeated here.
   */
  const needsUpdate = dossier.documents.filter(
    (doc) => effectiveStatus(doc, template) === 'needs_update'
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
