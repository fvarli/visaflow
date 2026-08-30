import { describe, expect, it } from 'vitest'

import { resolveVisaTemplate } from '@/config/countries'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import {
  EMPTY_FILTERS,
  QUICK_FILTERS,
  filterDocuments,
} from '@/features/documents/document-filters'
import {
  BUCKET_COUNT,
  type BucketKey,
} from '@/features/documents/documents-model'
import {
  countsTowardReadiness,
  effectiveStatus,
} from '@/features/documents/document-semantics'
import {
  ALL_FIXTURE_ENTRIES,
  canonicalReadiness,
  withSupersededClaim,
} from '@/tests/fixtures/dossiers'
import type { Document } from '@/domain/schemas/document.schema'

/**
 * The Documents hero promises something specific: the number on a chip is the
 * number of rows clicking it reveals. Both `documents-model.ts` and
 * `document-filters.ts` said so in prose, and it was false.
 *
 * A superseded claim keeps `status: 'ready'` while readiness counts it under
 * `needsUpdate`, so filtering on the persisted field broke the promise in both
 * directions at once. Measured in Chrome 149 against the production build:
 * "Needs update 1" revealed an empty state, and "Ready 6" revealed seven rows —
 * the seventh being the superseded passport, presented among the satisfied
 * (ADR-051).
 *
 * This asserts the promise itself rather than the symptom, so any future
 * derived reclassification that the filter does not learn about fails here.
 */

/** The buckets whose chip maps to a status; `optional` is a requiredness flag. */
const STATUS_BUCKETS: BucketKey[] = [
  'ready',
  'obtained',
  'requested',
  'needsUpdate',
  'missing',
  'notApplicable',
]

describe('effectiveStatus', () => {
  const template = resolveVisaTemplate('GR', 'short_stay_tourism')
  const passport = withSupersededClaim.documents.find(
    (d) => d.code === 'PASSPORT_CURRENT'
  ) as Document

  it('reclassifies a superseded claim as needing an update', () => {
    expect(passport.status).toBe('ready')
    expect(passport.satisfiedRevision).toBe(1)
    expect(effectiveStatus(passport, template)).toBe('needs_update')
  })

  it('leaves a claim stamped at the current revision alone', () => {
    const current = { ...passport, satisfiedRevision: 2 }
    expect(effectiveStatus(current, template)).toBe('ready')
  })

  it('leaves an unrecorded claim alone — no stamp is not evidence', () => {
    const { satisfiedRevision: _drop, ...unrecorded } = passport
    expect(effectiveStatus(unrecorded as Document, template)).toBe('ready')
  })

  it('never moves a status that claims nothing', () => {
    const notStarted = { ...passport, status: 'not_started' as const }
    expect(effectiveStatus(notStarted, template)).toBe('not_started')
  })

  it('cannot judge staleness without a template, so it does not try', () => {
    expect(effectiveStatus(passport, undefined)).toBe('ready')
  })
})

describe('a bucket chip and the rows it reveals', () => {
  it.each(ALL_FIXTURE_ENTRIES)('agree for %s', (_name, fixture) => {
    const template = resolveVisaTemplate(
      fixture.application?.destinationCountry,
      fixture.application?.visaType
    )
    const readiness = canonicalReadiness(fixture)
    const labelOf = (doc: Document) => doc.code
    const requiredOf = (doc: Document) =>
      countsTowardReadiness(doc, template, fixture.application)
    const statusOf = (doc: Document) => effectiveStatus(doc, template)

    /**
     * A required requirement with no record at all is counted as not-started
     * work, and no filter can reveal a row that does not exist. That gap is
     * stated separately by the hero ("… haven't been added to your dossier yet
     * — use Sync"), so it is an allowance on `missing` alone, computed rather
     * than assumed — if it ever leaks into another bucket, this fails.
     */
    const present = new Set(fixture.documents.map((d) => d.code))
    const uninstantiated = requiredRequirementCodes(
      template,
      fixture.application
    ).filter((code) => !present.has(code)).length

    for (const key of STATUS_BUCKETS) {
      const rows = filterDocuments(
        fixture.documents,
        { ...EMPTY_FILTERS, ...QUICK_FILTERS[key] },
        labelOf,
        requiredOf,
        statusOf
      )
      const allowance = key === 'missing' ? uninstantiated : 0
      expect(
        rows.length + allowance,
        `bucket "${key}" claims ${BUCKET_COUNT[key](readiness)} but reveals ` +
          `${rows.length}${allowance ? ` (+${allowance} with no record yet)` : ''}`
      ).toBe(BUCKET_COUNT[key](readiness))
    }
  })

  it('puts the superseded claim under "needs update", not under "ready"', () => {
    const fixture = withSupersededClaim
    const template = resolveVisaTemplate(
      fixture.application?.destinationCountry,
      fixture.application?.visaType
    )
    const labelOf = (doc: Document) => doc.code
    const requiredOf = (doc: Document) =>
      countsTowardReadiness(doc, template, fixture.application)
    const statusOf = (doc: Document) => effectiveStatus(doc, template)
    const rowsFor = (key: BucketKey) =>
      filterDocuments(
        fixture.documents,
        { ...EMPTY_FILTERS, ...QUICK_FILTERS[key] },
        labelOf,
        requiredOf,
        statusOf
      ).map((d) => d.code)

    expect(rowsFor('needsUpdate')).toContain('PASSPORT_CURRENT')
    expect(rowsFor('ready')).not.toContain('PASSPORT_CURRENT')
  })
})
