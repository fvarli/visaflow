import type { TaskDomain } from './timeline-policy'
import type { KeyDateType } from './timeline-dates'
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
export function eventLink(type: KeyDateType): string {
  switch (type) {
    case 'appointment':
      return '/trip'
    case 'leave':
      return '/employment?step=leave'
    case 'tripEntry':
    case 'tripExit':
      return '/trip?step=dates'
    case 'routeStop':
      return '/trip?step=route'
    case 'transport':
      return '/trip?step=transportation'
    case 'accommodation':
      return '/trip?step=accommodation'
    case 'insurance':
      return '/trip?step=insurance'
    case 'passportExpiry':
      return '/applicant?step=passport'
    case 'documentExpiry':
      return '/documents'
  }
}

/** A focused Documents deep-link for a freshness row (its category + document). */
export function freshnessLink(row: FreshnessRow): string {
  return `/documents?category=${row.category}&doc=${row.docId}`
}
