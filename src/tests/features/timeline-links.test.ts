import { describe, it, expect } from 'vitest'
import {
  taskLink,
  eventLink,
  freshnessLink,
} from '@/features/timeline/timeline-links'
import type { FreshnessRow } from '@/features/timeline/document-freshness'
import type { KeyDateEvent } from '@/features/timeline/timeline-dates'

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
  const event = (over: Partial<KeyDateEvent>): KeyDateEvent => ({
    id: 'e',
    type: 'appointment',
    date: '2027-04-01',
    status: 'upcoming',
    ...over,
  })

  it('routes each fixed-event type to its editor', () => {
    // The appointment lives in the trip wizard's dates step; this used to
    // name the page only, so the link opened on whichever step resumed.
    expect(eventLink(event({ type: 'appointment' }))).toBe('/trip?step=dates')
    expect(eventLink(event({ type: 'leave' }))).toBe('/employment?step=leave')
    expect(eventLink(event({ type: 'tripEntry' }))).toBe('/trip?step=dates')
    expect(eventLink(event({ type: 'accommodation' }))).toBe(
      '/trip?step=accommodation'
    )
    expect(eventLink(event({ type: 'insurance' }))).toBe('/trip?step=insurance')
    expect(eventLink(event({ type: 'passportExpiry' }))).toBe(
      '/applicant?step=passport'
    )
    expect(eventLink(event({ type: 'transportArrival' }))).toBe(
      '/trip?step=transportation'
    )
  })

  it('opens the exact document a validity date belongs to', () => {
    // It used to hand you the whole documents page and leave you to work out
    // which of twenty expires on that date (ADR-045).
    expect(
      eventLink(
        event({
          type: 'documentExpiry',
          documentId: 'doc-7',
          documentCode: 'X',
        })
      )
    ).toBe('/documents?doc=doc-7')
  })

  it('still has somewhere to go when the id is missing', () => {
    expect(eventLink(event({ type: 'documentExpiry' }))).toBe('/documents')
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
