import { describe, it, expect } from 'vitest'
import {
  taskLink,
  eventLink,
  freshnessLink,
} from '@/features/timeline/timeline-links'
import type { FreshnessRow } from '@/features/timeline/document-freshness'

describe('timeline-links — task routes', () => {
  it('routes each task domain to the place it is completed', () => {
    expect(taskLink('employment')).toBe('/employment?step=documents')
    expect(taskLink('finance')).toBe('/finance?step=documents')
    expect(taskLink('sponsor')).toBe('/sponsors')
    expect(taskLink('insurance')).toBe('/trip?step=insurance')
    expect(taskLink('reservations')).toBe('/trip?step=accommodation')
    expect(taskLink('passport')).toBe('/applicant?step=passport')
    expect(taskLink('review')).toBe('/consistency-checks')
    expect(taskLink('documents')).toBe('/documents?category=identity')
  })
})

describe('timeline-links — event routes', () => {
  it('routes each fixed-event type to its editor', () => {
    // The appointment lives in the trip wizard's dates step; this used to
    // name the page only, so the link opened on whichever step resumed.
    expect(eventLink('appointment')).toBe('/trip?step=dates')
    expect(eventLink('leave')).toBe('/employment?step=leave')
    expect(eventLink('tripEntry')).toBe('/trip?step=dates')
    expect(eventLink('accommodation')).toBe('/trip?step=accommodation')
    expect(eventLink('insurance')).toBe('/trip?step=insurance')
    expect(eventLink('passportExpiry')).toBe('/applicant?step=passport')
    expect(eventLink('documentExpiry')).toBe('/documents')
  })
})

describe('timeline-links — freshness deep-link', () => {
  it('builds a focused Documents link for a freshness row', () => {
    const row = {
      docId: 'x1',
      code: 'BANK_STATEMENTS',
      category: 'financial',
    } as FreshnessRow
    expect(freshnessLink(row)).toBe('/documents?category=financial&doc=x1')
  })
})
