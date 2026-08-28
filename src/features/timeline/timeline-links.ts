import type { TaskDomain } from './timeline-policy'
import type { KeyDateEvent } from './timeline-dates'
import type { FreshnessRow } from './document-freshness'

/**
 * Deep-link resolution for timeline items — a thin domain→route map that
 * complements (never duplicates) `finding-actions.ts`. Every actionable item
 * links to the exact place it is completed; unknown cases fall back to a safe
 * category-level route so there are no dead ends.
 */

/** Where a preparation task is completed. */
export function taskLink(domain: TaskDomain): string {
  switch (domain) {
    case 'employment':
      return '/employment?step=documents'
    case 'finance':
      return '/finance?step=documents'
    case 'sponsor':
      return '/sponsors'
    case 'insurance':
      return '/trip?step=insurance'
    case 'reservations':
      return '/trip?step=accommodation'
    case 'passport':
      return '/applicant?step=passport'
    case 'review':
      return '/consistency-checks'
    case 'documents':
      return '/documents?category=identity'
    default:
      return '/documents'
  }
}

/** Where a fixed key-date event is edited. */
export function eventLink(event: KeyDateEvent): string {
  switch (event.type) {
    case 'appointment':
      // The appointment is edited in the trip wizard's dates step, which is
      // what `review-summary` already links to. This pointed at the page but
      // not the step, so the link opened on whatever step the wizard resumed.
      return '/trip?step=dates'
    case 'leave':
      return '/employment?step=leave'
    case 'tripEntry':
    case 'tripExit':
      return '/trip?step=dates'
    case 'routeStop':
      return '/trip?step=route'
    case 'transport':
    case 'transportArrival':
      return '/trip?step=transportation'
    case 'accommodation':
      return '/trip?step=accommodation'
    case 'insurance':
      return '/trip?step=insurance'
    case 'passportExpiry':
      return '/applicant?step=passport'
    case 'documentExpiry':
      // The exact document, with its panel open — the same contract
      // `freshnessLink` has always used. This used to hand you the whole
      // documents page and leave you to find which of twenty expires
      // (ADR-045). Falls back to the list when the id is somehow absent, so
      // there is still no dead end.
      return event.documentId
        ? `/documents?doc=${event.documentId}`
        : '/documents'
  }
}

/** A focused Documents deep-link for a freshness row (its category + document). */
export function freshnessLink(row: FreshnessRow): string {
  return `/documents?category=${row.category}&doc=${row.docId}`
}
