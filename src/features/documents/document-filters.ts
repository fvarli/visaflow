import { useCallback, useMemo, useState } from 'react'
import type { Document } from '@/domain/schemas/document.schema'
import type {
  DocumentCategory,
  DocumentStatus,
  OwnerType,
} from '@/domain/types/common'
import type { BucketKey } from './documents-model'

/**
 * Reusable filter architecture for the Documents workspace. The filter state
 * is view-independent, so switching Cards/List/Table preserves it; the pure
 * `filterDocuments` keeps the predicate testable and free of React.
 */
export interface DocumentFilters {
  search: string
  status: DocumentStatus | 'all'
  category: DocumentCategory | 'all'
  owner: OwnerType | 'all'
  requirement: 'all' | 'required' | 'optional'
}

export const EMPTY_FILTERS: DocumentFilters = {
  search: '',
  status: 'all',
  category: 'all',
  owner: 'all',
  requirement: 'all',
}

/**
 * The filter each overview-hero bucket applies when clicked.
 *
 * Every required-scoped chip filters to `required`, so the count on a chip and
 * the number of rows it reveals always match. `obtained` and `notApplicable`
 * exist because those documents were previously reachable only through the
 * manual status dropdown — the hero counted them nowhere and no chip found them.
 */
export const QUICK_FILTERS: Record<BucketKey, Partial<DocumentFilters>> = {
  ready: { status: 'ready', requirement: 'required' },
  obtained: { status: 'received', requirement: 'required' },
  requested: { status: 'requested', requirement: 'required' },
  needsUpdate: { status: 'needs_update', requirement: 'required' },
  missing: { status: 'not_started', requirement: 'required' },
  notApplicable: { status: 'not_applicable', requirement: 'required' },
  optional: { status: 'all', requirement: 'optional' },
}

export function filterDocuments(
  documents: Document[],
  filters: DocumentFilters,
  labelOf: (doc: Document) => string
): Document[] {
  const q = filters.search.trim().toLocaleLowerCase()
  return documents.filter((doc) => {
    if (
      q &&
      !labelOf(doc).toLocaleLowerCase().includes(q) &&
      !doc.code.toLocaleLowerCase().includes(q)
    ) {
      return false
    }
    if (filters.status !== 'all' && doc.status !== filters.status) return false
    if (filters.category !== 'all' && doc.category !== filters.category)
      return false
    if (filters.owner !== 'all' && doc.ownerType !== filters.owner) return false
    if (filters.requirement === 'required' && !doc.required) return false
    if (filters.requirement === 'optional' && doc.required) return false
    return true
  })
}

/** Which hero bucket, if any, the current filters correspond to. */
export function matchQuickFilter(filters: DocumentFilters): BucketKey | null {
  for (const [key, preset] of Object.entries(QUICK_FILTERS) as [
    BucketKey,
    Partial<DocumentFilters>,
  ][]) {
    const merged = { ...EMPTY_FILTERS, ...preset }
    if (
      merged.status === filters.status &&
      merged.requirement === filters.requirement &&
      filters.category === 'all' &&
      filters.owner === 'all' &&
      filters.search === ''
    ) {
      return key
    }
  }
  return null
}

export function useDocumentFilters() {
  const [filters, setFilters] = useState<DocumentFilters>(EMPTY_FILTERS)

  const update = useCallback(
    <K extends keyof DocumentFilters>(key: K, value: DocumentFilters[K]) =>
      setFilters((f) => ({ ...f, [key]: value })),
    []
  )
  const reset = useCallback(() => setFilters(EMPTY_FILTERS), [])
  const applyQuickFilter = useCallback((key: BucketKey) => {
    setFilters((current) => {
      // Toggle off if the same bucket is already active.
      const same = matchQuickFilter(current) === key
      return same ? EMPTY_FILTERS : { ...EMPTY_FILTERS, ...QUICK_FILTERS[key] }
    })
  }, [])

  const activeCount = useMemo(() => {
    let n = 0
    if (filters.search) n++
    if (filters.status !== 'all') n++
    if (filters.category !== 'all') n++
    if (filters.owner !== 'all') n++
    if (filters.requirement !== 'all') n++
    return n
  }, [filters])

  return { filters, setFilters, update, reset, applyQuickFilter, activeCount }
}
