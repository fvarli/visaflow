import { parseISO, isBefore } from 'date-fns'
import {
  countsTowardReadiness,
  effectiveStatus,
} from '@/features/documents/document-semantics'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import {
  groupedCodes,
  resolveGroupSlots,
} from '@/features/readiness/satisfaction-groups'
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
  const grouped = groupedCodes(template)

  for (const doc of dossier.documents) {
    /**
     * A member of a satisfaction group is never "skipped".
     *
     * Setting one aside is how an applicant says which route they are taking —
     * marking the flight reservation not-applicable because they are bringing an
     * itinerary is the correct thing to do, not an obligation abandoned. The
     * obligation is reported once, at group level, by
     * `missingRequiredObligations`.
     */
    if (grouped.has(doc.code)) continue

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

  /**
   * Obligations, not records.
   *
   * Two things this rule used to miss, both of which readiness has always
   * counted. A requirement the pack requires but the dossier has **no record
   * for** is work that has not been started — the ring said so and this rule
   * said nothing. And a requirement that became required after the record was
   * seeded was read from the record's stale flag (`EMPLOYER_TRADE_REGISTRY` in
   * E5b, `EMPLOYER_TAX_PLATE` in E5c-3).
   *
   * Grouped codes are excluded because a group is one obligation however many
   * documents can satisfy it; `missingRequiredObligations` reports those. Left
   * in, an applicant with a ready itinerary was told the flight reservation was
   * missing.
   */
  const grouped = groupedCodes(template)
  const present = new Set(dossier.documents.map((doc) => doc.code))

  const notStartedRecords = dossier.documents.filter(
    (doc) =>
      !grouped.has(doc.code) &&
      countsTowardReadiness(doc, template, dossier.application) &&
      doc.status === 'not_started'
  )
  const uninstantiated = requiredRequirementCodes(
    template,
    dossier.application
  ).filter((code) => !grouped.has(code) && !present.has(code))

  const outstanding = [
    ...notStartedRecords.map((doc) => doc.code),
    ...uninstantiated,
  ]

  if (outstanding.length > 0) {
    findings.push({
      id: 'missing-required-docs',
      ruleId: 'document.requiredNotStarted',
      severity: 'warning',
      messageKey: 'findings.missingRequiredDocs',
      messageParams: {
        values: { count: outstanding.length },
        documentCodes: { documents: outstanding },
      },
      relatedFields: [
        ...notStartedRecords.map((doc) => `documents.${doc.id}`),
        ...(uninstantiated.length > 0 ? ['documents'] : []),
      ],
    })
  }

  return findings
}

/**
 * An obligation the authority lets the applicant meet in more than one way, with
 * nothing started for it.
 *
 * Reported once per group, and named by the group rather than by a member. The
 * member name would be false: if a travel itinerary satisfies the obligation,
 * telling somebody that a *flight reservation* has not been started asserts a
 * requirement the authority does not make. `SatisfactionGroup.labelKey` is the
 * applicant-facing name of the obligation itself, already rendered on the
 * document detail panel, so nothing new is invented here and no member names are
 * concatenated at runtime.
 *
 * One finding per group rather than one aggregate finding for all of them: that
 * keeps each finding's id stable and lets it carry its own label through the
 * existing `enumKeys` channel, which translates one key.
 */
export const missingRequiredObligations: ValidationRule = ({
  dossier,
  template,
}: ValidationContext): ValidationFinding[] => {
  const slots = resolveGroupSlots(
    template,
    dossier.documents,
    dossier.application
  )
  const present = new Set(dossier.documents.map((doc) => doc.code))
  const required = new Set(
    requiredRequirementCodes(template, dossier.application)
  )

  return (
    slots
      .filter((slot) => slot.status === 'notStarted')
      // A group enters on the same terms an ungrouped requirement does: some
      // member has a record, or some member is a required requirement of this
      // pack. The same gate readiness applies, so the two agree.
      .filter((slot) =>
        slot.applicableCodes.some(
          (code) => present.has(code) || required.has(code)
        )
      )
      .map((slot) => ({
        id: `missing-obligation-${slot.group.id}`,
        ruleId: 'document.requiredObligationNotStarted',
        severity: 'warning' as const,
        messageKey: 'findings.missingRequiredObligation',
        messageParams: { enumKeys: { obligation: slot.group.labelKey } },
        relatedFields: ['documents'],
      }))
  )
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
  missingRequiredObligations,
  documentsNeedingUpdate,
]
