import { describe, it, expect } from 'vitest'
import {
  buildFreshness,
  classifyFreshness,
} from '@/features/timeline/document-freshness'
import type { Document } from '@/domain/schemas/document.schema'

const doc = (partial: Partial<Document>): Document => ({
  id: 'd',
  code: 'BANK_STATEMENTS',
  category: 'financial',
  ownerType: 'applicant',
  ownerId: 'a1',
  required: true,
  status: 'ready',
  verified: true,
  ...partial,
})

const APPT = '2027-03-15'

describe('classifyFreshness — factual only', () => {
  it('flags needs-update from status or a finding, never from age alone', () => {
    expect(
      classifyFreshness(doc({ status: 'needs_update' }), APPT, false)
    ).toBe('needsUpdate')
    expect(classifyFreshness(doc({ issuedAt: '2000-01-01' }), APPT, true)).toBe(
      'needsUpdate'
    )
    // Old, but no expiry, no finding, status fine → NOT stale.
    expect(
      classifyFreshness(doc({ issuedAt: '2000-01-01' }), APPT, false)
    ).toBe('issuedNoExpiry')
  })

  it('classifies validity against the appointment', () => {
    expect(
      classifyFreshness(doc({ validUntil: '2027-03-01' }), APPT, false)
    ).toBe('expiresBeforeAppointment')
    expect(
      classifyFreshness(doc({ validUntil: '2027-04-01' }), APPT, false)
    ).toBe('validThroughAppointment')
  })

  it('classifies documents with no dates', () => {
    expect(classifyFreshness(doc({}), APPT, false)).toBe('noDates')
  })

  it('never invents an expiry when only an issue date exists', () => {
    expect(
      classifyFreshness(doc({ issuedAt: '2027-02-01' }), APPT, false)
    ).toBe('issuedNoExpiry')
  })
})

describe('buildFreshness', () => {
  it('computes age as of the appointment only when an issue date exists', () => {
    const view = buildFreshness(
      [
        doc({ id: '1', issuedAt: '2027-02-13', validUntil: '2027-06-01' }),
        doc({ id: '2', validUntil: '2027-06-01' }),
      ],
      APPT,
      new Map()
    )
    expect(view.rows.find((r) => r.docId === '1')?.ageDays).toBe(30)
    expect(view.rows.find((r) => r.docId === '2')?.ageDays).toBeNull()
    expect(view.appointmentKnown).toBe(true)
  })

  it('marks appointment unknown and skips not-applicable documents', () => {
    const view = buildFreshness(
      [doc({ id: '1' }), doc({ id: '2', status: 'not_applicable' })],
      null,
      new Map()
    )
    expect(view.appointmentKnown).toBe(false)
    expect(view.rows.map((r) => r.docId)).toEqual(['1'])
  })
})
