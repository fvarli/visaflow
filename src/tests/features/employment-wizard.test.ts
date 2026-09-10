import { describe, it, expect } from 'vitest'
import {
  EMPLOYMENT_STEP_IDS,
  deriveStepStatuses,
  hasEmployer,
  isEmployerComplete,
  isIncomeComplete,
  isLeaveComplete,
  isStatusComplete,
  leaveApplies,
} from '@/features/employment/employment-wizard'
import type { Application } from '@/domain/schemas/application.schema'
import type { Employment } from '@/domain/schemas/employment.schema'

const appWith = (employment?: Partial<Employment>): Application =>
  ({
    employment: employment ? { currency: 'EUR', ...employment } : undefined,
  }) as unknown as Application

describe('employment wizard — step model', () => {
  it('has the six steps in order', () => {
    expect(EMPLOYMENT_STEP_IDS).toEqual([
      'status',
      'employer',
      'income',
      'leave',
      'documents',
      'review',
    ])
  })

  it('knows which statuses involve an employer / leave', () => {
    expect(hasEmployer('employed')).toBe(true)
    expect(hasEmployer('self_employed')).toBe(true)
    expect(hasEmployer('retired')).toBe(false)
    expect(hasEmployer(undefined)).toBe(false)
    expect(leaveApplies('employed')).toBe(true)
    expect(leaveApplies('self_employed')).toBe(false)
  })

  it('checks employer/income/leave completeness', () => {
    const full: Employment = {
      employmentStatus: 'employed',
      employerName: 'Acme',
      jobTitle: 'Dev',
      startDate: '2024-01-01',
      monthlyNetIncome: 4000,
      currency: 'EUR',
      approvedLeaveStart: '2027-05-01',
      approvedLeaveEnd: '2027-05-10',
    }
    expect(isEmployerComplete(full)).toBe(true)
    expect(isIncomeComplete(full)).toBe(true)
    expect(isLeaveComplete(full)).toBe(true)
    expect(isEmployerComplete({ ...full, employerName: undefined })).toBe(false)
    expect(isIncomeComplete({ ...full, monthlyNetIncome: undefined })).toBe(
      false
    )
    expect(isLeaveComplete({ ...full, approvedLeaveEnd: undefined })).toBe(
      false
    )
  })
})

describe('employment wizard — deriveStepStatuses is status-aware', () => {
  it('marks employer/income/leave/documents complete for non-employed', () => {
    // Retired: nothing to fill in for those steps, so the rail never nags.
    const statuses = deriveStepStatuses(
      appWith({ employmentStatus: 'retired' }),
      0
    )
    // status is current; employer/income/leave/documents complete; review upcoming.
    expect(statuses).toEqual([
      'current',
      'complete',
      'complete',
      'complete',
      'complete',
      'upcoming',
    ])
  })

  it('counts the status step done on the status alone', () => {
    /**
     * The occupational category is optional and must stay that way in the rail.
     * Requiring it would flip every dossier written before it existed from
     * complete to upcoming on load, for a question their consulate may not even
     * ask them — and it would nag the four statuses that are offered no
     * category at all.
     *
     * Asserted on `isStatusComplete` directly, and on `deriveStepStatuses` with
     * the cursor somewhere else. The rail assertions in this file all sit at
     * `current: 0`, which paints the status step `current` whatever its
     * completeness says — so a change here would have passed all of them. It
     * did: making the category mandatory left this whole file green until this
     * test existed.
     */
    expect({
      statusOnly: isStatusComplete({
        employmentStatus: 'employed',
        currency: 'EUR',
      }),
      withCategory: isStatusComplete({
        employmentStatus: 'employed',
        occupationalCategory: 'public_servant',
        currency: 'EUR',
      }),
      noStatus: isStatusComplete(undefined),
    }).toEqual({ statusOnly: true, withCategory: true, noStatus: false })

    // Cursor on `review`, so the status step reports its own completeness.
    expect(
      deriveStepStatuses(appWith({ employmentStatus: 'retired' }), 5)[0]
    ).toBe('complete')
  })

  it('leaves employer/income/leave upcoming for an employed applicant with gaps', () => {
    const statuses = deriveStepStatuses(
      appWith({ employmentStatus: 'employed' }),
      0
    )
    expect(statuses[0]).toBe('current')
    expect(statuses[1]).toBe('upcoming') // employer incomplete
    expect(statuses[3]).toBe('upcoming') // leave incomplete
    expect(statuses[5]).toBe('upcoming') // review never auto-completes
  })

  it('completes employer/income/leave once an employed applicant fills them', () => {
    const statuses = deriveStepStatuses(
      appWith({
        employmentStatus: 'employed',
        employerName: 'Acme',
        jobTitle: 'Dev',
        startDate: '2024-01-01',
        monthlyNetIncome: 4000,
        approvedLeaveStart: '2027-05-01',
        approvedLeaveEnd: '2027-05-10',
      }),
      5
    )
    expect(statuses[1]).toBe('complete')
    expect(statuses[2]).toBe('complete')
    expect(statuses[3]).toBe('complete')
    expect(statuses[5]).toBe('current')
  })
})
