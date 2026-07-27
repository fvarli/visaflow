import { describe, it, expect } from 'vitest'
import {
  classifyBand,
  deriveTasks,
  type TasksInput,
} from '@/features/timeline/timeline-tasks'
import { resolveVisaTemplate } from '@/config/countries'
import type { Application } from '@/domain/schemas/application.schema'
import type { Employment } from '@/domain/schemas/employment.schema'
import type { Document } from '@/domain/schemas/document.schema'

const template = resolveVisaTemplate('GR', 'short_stay_tourism')
const APPT = '2027-03-15'
const TRIP = '2027-05-01'

const doc = (
  code: string,
  status: Document['status'],
  category: Document['category'] = 'employment'
): Document => ({
  id: `d-${code}`,
  code,
  category,
  ownerType: 'applicant',
  ownerId: 'a1',
  required: true,
  status,
  verified: status === 'ready',
})

const application = (
  opts: {
    appointment?: string
    trip?: string
    employment?: Partial<Employment>
    source?: 'self' | 'sponsor'
  } = {}
): Application => ({
  applicationId: 'app1',
  applicantId: 'a1',
  destinationCountry: 'GR',
  visaType: 'short_stay_tourism',
  status: 'draft',
  createdAt: new Date().toISOString(),
  sponsorIds: [],
  documentIds: [],
  notes: [],
  ...(opts.appointment ? { appointment: { date: opts.appointment } } : {}),
  ...(opts.trip
    ? {
        trip: {
          entryDate: opts.trip,
          exitDate: '2027-05-10',
          firstEntryCountry: 'GR',
          mainDestinationCountry: 'GR',
          route: [],
          transportReservations: [],
          accommodationReservations: [],
          budgetCurrency: 'EUR',
        },
      }
    : {}),
  ...(opts.employment
    ? { employment: { currency: 'EUR', ...opts.employment } as Employment }
    : {}),
  ...(opts.source
    ? { financing: { source: opts.source, currency: 'EUR' } }
    : {}),
})

const input = (
  application: Application | null,
  documents: Document[] = []
): TasksInput => ({
  application,
  documents,
  template,
  findings: [],
})

describe('classifyBand — proximity bands', () => {
  const now = new Date('2027-03-01')
  it('places a target on the appointment day', () => {
    expect(classifyBand(APPT, 'notStarted', now, APPT, TRIP)).toBe(
      'appointmentDay'
    )
  })
  it('detects today and this-week (end-of-week boundary at 7 days)', () => {
    expect(classifyBand('2027-03-01', 'notStarted', now, APPT, TRIP)).toBe(
      'today'
    )
    expect(classifyBand('2027-03-08', 'notStarted', now, APPT, TRIP)).toBe(
      'thisWeek'
    )
    expect(classifyBand('2027-03-09', 'notStarted', now, APPT, TRIP)).toBe(
      'beforeAppointment'
    )
  })
  it('marks an incomplete past target overdue, but not a completed one', () => {
    expect(classifyBand('2027-02-22', 'notStarted', now, APPT, TRIP)).toBe(
      'overdue'
    )
    expect(classifyBand('2027-02-22', 'ready', now, APPT, TRIP)).toBe(
      'beforeAppointment'
    )
  })
  it('places a post-appointment, pre-travel target under before travel', () => {
    expect(classifyBand('2027-04-28', 'notStarted', now, APPT, TRIP)).toBe(
      'beforeTravel'
    )
    expect(classifyBand('2027-05-03', 'notStarted', now, APPT, TRIP)).toBe(
      'travel'
    )
  })
})

describe('deriveTasks — target dates & bands', () => {
  const now = new Date('2027-03-01')

  it('derives target dates as appointment minus the lead time', () => {
    const tasks = deriveTasks(input(application({ appointment: APPT })), now)
    const bank = tasks.find((t) => t.milestoneId === 'obtain-bank-statements')
    expect(bank?.targetDate).toBe('2027-03-01') // 14 days before 15 Mar
    const review = tasks.find((t) => t.milestoneId === 'final-review')
    expect(review?.targetDate).toBe('2027-03-13') // 2 days before
  })

  it('falls back to calm relative phases when there is no appointment', () => {
    const tasks = deriveTasks(input(application({})), now)
    expect(tasks.every((t) => t.targetDate === null)).toBe(true)
    expect(
      tasks.every((t) =>
        ['startNow', 'soon', 'beforeAppointment', 'finalSteps'].includes(t.band)
      )
    ).toBe(true)
  })

  it('adds a before-travel task derived from the trip date', () => {
    const tasks = deriveTasks(
      input(application({ appointment: APPT, trip: TRIP })),
      now
    )
    const travel = tasks.find((t) => t.id === 'task-travel-prep')
    expect(travel?.band).toBe('beforeTravel')
    expect(travel?.source).toBe('derived')
  })
})

describe('deriveTasks — status from real state', () => {
  const now = new Date('2027-03-01')
  const employed = { employmentStatus: 'employed' as const }

  it('is ready when the related documents are ready', () => {
    const docs = [
      doc('EMPLOYMENT_LETTER', 'ready'),
      doc('APPROVED_LEAVE', 'ready'),
      doc('PAYSLIPS', 'ready'),
    ]
    const tasks = deriveTasks(
      input(application({ appointment: APPT, employment: employed }), docs),
      now
    )
    const t = tasks.find((x) => x.milestoneId === 'request-employer-docs')
    expect(t?.status).toBe('ready')
  })

  it('is overdue when a past-target task is still missing evidence', () => {
    // No documents → employer docs not started; target 21 days before is past.
    const tasks = deriveTasks(
      input(application({ appointment: APPT, employment: employed })),
      now
    )
    const t = tasks.find((x) => x.milestoneId === 'request-employer-docs')
    expect(t?.band).toBe('overdue')
    expect(t?.status).toBe('overdue')
  })

  it('is not-applicable when the related documents do not apply', () => {
    // A retiree → employer documents are not applicable.
    const tasks = deriveTasks(
      input(
        application({
          appointment: APPT,
          employment: { employmentStatus: 'retired' },
        })
      ),
      now
    )
    const t = tasks.find((x) => x.milestoneId === 'request-employer-docs')
    expect(t?.status).toBe('notApplicable')
  })
})
