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
 * Every required-scoped chip filters to `required`, and `filterDocuments`
 * matches on the status readiness *counts* a document under rather than the one
 * stored on it, so the count on a chip and the number of rows it reveals always
 * match — including for a superseded claim, whose stored status is still
 * `ready` while readiness counts it under `needsUpdate`. `obtained` and `notApplicable`
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
  labelOf: (doc: Document) => string,
  /**
   * Effective requiredness, supplied by the caller.
   *
   * A callback rather than a template argument, so this stays a domain-free
   * primitive. Without it the filter falls back to the persisted flag, which
   * for a withdrawn or unrecognised code is not authority for anything
   * (ADR-050) — and would put a row under "required" that the readiness figure
   * does not count.
   */
  requiredOf: (doc: Document) => boolean = (doc) => doc.required,
  /**
   * The status the readiness figures **count** this document under, which is
   * not always the status stored on it.
   *
   * A claim made against a superseded requirement keeps `status: 'ready'` —
   * that is the user's own assertion and is never rewritten (ADR-051) — while
   * readiness counts it under `needsUpdate`. Filtering on the persisted field
   * therefore contradicted the chip above it in both directions at once: "Needs
   * update 1" revealed nothing, and "Ready 6" revealed seven rows, the seventh
   * being the superseded claim shown among the satisfied. Measured in Chrome,
   * not inferred.
   *
   * A callback for the same reason as `requiredOf`: the derived answer needs
   * the country pack, and this primitive stays domain-free.
   */
  statusOf: (doc: Document) => DocumentStatus = (doc) => doc.status
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
    if (filters.status !== 'all' && statusOf(doc) !== filters.status)
      return false
    if (filters.category !== 'all' && doc.category !== filters.category)
      return false
    if (filters.owner !== 'all' && doc.ownerType !== filters.owner) return false
    if (filters.requirement === 'required' && !requiredOf(doc)) return false
    if (filters.requirement === 'optional' && requiredOf(doc)) return false
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
