import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Document } from '@/domain/schemas/document.schema'
import type {
  DocumentCategory,
  DocumentStatus,
  OwnerType,
} from '@/domain/types/common'

/**
 * Document freshness — a **factual** view over recorded document dates and
 * status. It never invents an expiry date or an official recency rule (ADR): a
 * document is only "needs update" when its status says so or a validation
 * finding flags it, and "expires before appointment" only when its recorded
 * `validUntil` actually precedes the appointment. Organizational preparation
 * timing lives in the Preparation Plan, not here. Pure.
 */

export type FreshnessClass =
  | 'needsUpdate'
  | 'expiresBeforeAppointment'
  | 'validThroughAppointment'
  | 'issuedNoExpiry'
  | 'noDates'

export interface FreshnessRow {
  docId: string
  code: string
  name?: string
  category: DocumentCategory
  /**
   * The **persisted** snapshot, deliberately, because nothing reads it.
   *
   * Every other surface that shows an owner resolves it through
   * `resolveDocumentSemantics` (ADR-049); this row carries the field and no
   * Timeline component renders it, so threading a template and an applicability
   * context through `buildFreshness` would add plumbing for a value with no
   * consumer. The moment something does render it, it must take the resolved
   * answer instead — the owner-semantics census guard fails if a production
   * module starts reading a `Document.ownerType` outside the resolver.
   */
  ownerType: OwnerType
  status: DocumentStatus
  freshness: FreshnessClass
  issuedAt: string | null
  validUntil: string | null
  /** Age in days as of the appointment — only when an issued date exists. */
  ageDays: number | null
}

export interface FreshnessView {
  rows: FreshnessRow[]
  /** Whether an appointment date exists to anchor expiry comparisons. */
  appointmentKnown: boolean
}

export function classifyFreshness(
  doc: Document,
  appointmentIso: string | null,
  hasFinding: boolean
): FreshnessClass {
  if (hasFinding || doc.status === 'needs_update') return 'needsUpdate'
  if (doc.validUntil) {
    if (appointmentIso) {
      return differenceInCalendarDays(
        parseISO(doc.validUntil),
        parseISO(appointmentIso)
      ) < 0
        ? 'expiresBeforeAppointment'
        : 'validThroughAppointment'
    }
    return 'validThroughAppointment'
  }
  if (doc.issuedAt) return 'issuedNoExpiry'
  return 'noDates'
}

export function buildFreshness(
  documents: Document[],
  appointmentIso: string | null,
  findingsByDoc: Map<string, unknown[]>
): FreshnessView {
  const rows: FreshnessRow[] = documents
    .filter((d) => d.status !== 'not_applicable')
    .map((doc) => {
      const hasFinding = (findingsByDoc.get(doc.id)?.length ?? 0) > 0
      const ageDays =
        doc.issuedAt && appointmentIso
          ? differenceInCalendarDays(
              parseISO(appointmentIso),
              parseISO(doc.issuedAt)
            )
          : null
      return {
        docId: doc.id,
        code: doc.code,
        name: doc.name,
        category: doc.category,
        ownerType: doc.ownerType,
        status: doc.status,
        freshness: classifyFreshness(doc, appointmentIso, hasFinding),
        issuedAt: doc.issuedAt ?? null,
        validUntil: doc.validUntil ?? null,
        ageDays,
      }
    })

  return { rows, appointmentKnown: appointmentIso !== null }
}
