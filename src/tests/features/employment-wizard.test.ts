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
import { OCCUPATIONS_BY_STATUS } from '@/domain/types/common'

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

/**
 * The occupational answer as a workflow requirement (H4c2d3).
 *
 * The prerequisite for every subtractive correction still ahead. Those move a
 * condition from a field every dossier has answered onto one most have not, so
 * an applicant who never saw the question would quietly stop being asked for
 * documents. Making the step incomplete is how the question gets asked first.
 *
 * Nothing here touches applicability. The rail changes; the checklist does not.
 */
describe('employment wizard — the status step asks for an occupation', () => {
  const emp = (employmentStatus: string, occupationCode?: string) =>
    ({
      employmentStatus,
      currency: 'EUR',
      ...(occupationCode === undefined ? {} : { occupationCode }),
    }) as Employment

  it.each([
    ['employed', 'employee'],
    ['employed', 'public_servant'],
    ['self_employed', 'company_owner'],
    ['self_employed', 'independent_professional'],
    ['self_employed', 'farmer'],
  ])('is complete for %s + %s', (status, code) => {
    expect(isStatusComplete(emp(status, code))).toBe(true)
  })

  it.each([
    ['no answer at all', 'employed', undefined],
    ['no answer at all', 'self_employed', undefined],
    ['a stale farmer', 'employed', 'farmer'],
    ['a stale public servant', 'self_employed', 'public_servant'],
    ['a code from a newer build', 'employed', 'future_category_2027'],
    ['a code from a newer build', 'self_employed', 'future_category_2027'],
  ])('is incomplete for %s (%s)', (_label, status, code) => {
    /**
     * The unknown and stale rows are the reason this reads the *effective*
     * value. `Boolean(occupationCode)` would call both of them an answer, mark
     * the step done, and leave the applicant in precisely the unclassified
     * state the rule exists to surface.
     */
    expect(isStatusComplete(emp(status, code))).toBe(false)
  })

  it.each(['unemployed', 'retired', 'student', 'homemaker', 'other'])(
    '%s is unaffected — it opens no occupational branch',
    (status) => {
      expect({
        bare: isStatusComplete(emp(status)),
        // A dormant code, including one this build cannot read, must not make
        // a branchless status incomplete: it is not being asked about.
        dormant: isStatusComplete(emp(status, 'future_category_2027')),
        dormantKnown: isStatusComplete(emp(status, 'farmer')),
      }).toEqual({ bare: true, dormant: true, dormantKnown: true })
    }
  )

  it('has no answer at all without a status', () => {
    expect(isStatusComplete(undefined)).toBe(false)
  })

  it('is derived from the registry, not from a second list of statuses', () => {
    /**
     * The duplicate anybody would reach for —
     * `status === 'employed' || status === 'self_employed'` — behaves
     * identically today, so no fixed assertion can tell the two apart. A source
     * scan cannot either: `hasEmployer` in this very module is that exact
     * expression, legitimately.
     *
     * What separates them is what happens when the registry changes. Giving a
     * branchless status an occupational branch must make it start requiring an
     * answer; a hand-written list would keep saying it does not. So the test
     * moves the registry and watches.
     */
    const before = isStatusComplete(emp('student'))
    OCCUPATIONS_BY_STATUS.student = ['employee']
    try {
      expect({ before, after: isStatusComplete(emp('student')) }).toEqual({
        before: true,
        after: false,
      })
    } finally {
      delete OCCUPATIONS_BY_STATUS.student
    }
    expect(isStatusComplete(emp('student'))).toBe(true)
  })

  it('shows the rail, not just the helper', () => {
    /**
     * Asserted with the cursor away from step 0. Every other rail assertion in
     * this file sits at `current: 0`, which paints the status step `current`
     * whatever its completeness says — that masking is how a change here went
     * unnoticed once already.
     */
    const cursorOnReview = 5
    expect({
      unanswered: deriveStepStatuses(
        appWith({ employmentStatus: 'employed' }),
        cursorOnReview
      )[0],
      answered: deriveStepStatuses(
        appWith({
          employmentStatus: 'employed',
          occupationCode: 'employee',
        }),
        cursorOnReview
      )[0],
      branchless: deriveStepStatuses(
        appWith({ employmentStatus: 'retired' }),
        cursorOnReview
      )[0],
    }).toEqual({
      unanswered: 'upcoming',
      answered: 'complete',
      branchless: 'complete',
    })
  })
})
