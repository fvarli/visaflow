import { describe, it, expect } from 'vitest'
import { composeVisaTemplate, CompositionError } from '@/config/composition'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { deriveNextDocument } from '@/features/documents/documents-model'
import { resolveGroupSlots } from '@/features/readiness/satisfaction-groups'
import { resolveVisaTemplate } from '@/config/countries'
import { applyDocumentUpdate } from '@/features/documents/document-semantics'
import { greeceTourismComposition } from '@/config/countries/greece/tourism'
import { germanyTourismComposition } from '@/config/countries/germany/tourism'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { DocumentStatus } from '@/domain/types/common'
import type { RequirementLayer } from '@/config/types'

/**
 * C3a — one obligation, several accepted documents.
 *
 * Annex III I.1 accepts a flight reservation, other proof of intended means of
 * transport, *or* a travel itinerary. VisaFlow used to render the first as
 * mandatory and the other two as optional extras, so an applicant holding an
 * acceptable itinerary was told they were missing a booking and the percentage
 * agreed with the demand rather than the authority.
 *
 * The test that matters most is the last one in the first block: the obligation
 * has to stay real. It would be easy to make "one of three" pass by dropping all
 * three from the denominator, and that would let a dossier holding none of them
 * read as complete.
 */

const application = (status = 'employed'): Application =>
  ({
    applicationId: 'app1',
    applicantId: 'a1',
    destinationCountry: 'GR',
    visaType: 'short_stay_tourism',
    status: 'draft',
    createdAt: '2026-09-08T00:00:00.000Z',
    sponsorIds: [],
    documentIds: [],
    notes: [],
    employment: { employmentStatus: status },
  }) as unknown as Application

const doc = (code: string, status: DocumentStatus): Document => {
  const record = {
    id: `doc-${code}`,
    code,
    name: code,
    category: 'supporting',
    ownerType: 'applicant',
    ownerId: 'a1',
    required: true,
    status,
  } as unknown as Document
  // A `ready` record is stamped the way production stamps it. Unstamped ready
  // claims are treated as needing re-check on requirements carrying
  // composition-scoped detail, and `PHOTOS` is one — so a hand-built "all
  // ready" dossier would fail for a reason that has nothing to do with groups.
  return status === 'ready'
    ? applyDocumentUpdate(
        { ...record, status: 'not_started' },
        { status },
        greece
      )
    : record
}

const greece = resolveVisaTemplate('GR', 'short_stay_tourism')!
const TRANSPORT = [
  'TRANSPORT_RESERVATION',
  'TRANSPORT_MEANS_PROOF',
  'ITINERARY',
]

function readinessWith(documents: Document[], app = application()) {
  return buildDocumentReadiness({
    documents,
    requiredRequirementCodes: requiredRequirementCodes(greece, app),
    template: greece,
    application: app,
  })
}

describe('any accepted member satisfies the obligation', () => {
  const baseline = readinessWith([])

  it.each(TRANSPORT)(
    '%s alone satisfies the travel-arrangements group',
    (code) => {
      const withOne = readinessWith([doc(code, 'ready')])
      // One more ready than the empty dossier, and the same denominator: the
      // obligation was always owed and is now met.
      expect({
        ready: withOne.ready - baseline.ready,
        applicable: withOne.applicable - baseline.applicable,
      }).toEqual({ ready: 1, applicable: 0 })
    }
  )

  it('treats the three as interchangeable, not cumulative', () => {
    // Every single-member dossier produces the same readiness figure. If any
    // member were privileged — the one flagged `required`, say — these would
    // differ.
    const figures = TRANSPORT.map((code) => readinessWith([doc(code, 'ready')]))
    expect(new Set(figures.map((f) => f.percent)).size).toBe(1)
    expect(new Set(figures.map((f) => f.applicable)).size).toBe(1)
  })

  it('does not double-count when the applicant holds more than one', () => {
    const one = readinessWith([doc('TRANSPORT_RESERVATION', 'ready')])
    const all = readinessWith(TRANSPORT.map((code) => doc(code, 'ready')))
    // Holding all three is not three times the credit, and it is not extra
    // work either. It is the same obligation, met.
    expect({
      ready: all.ready,
      applicable: all.applicable,
      percent: all.percent,
    }).toEqual({
      ready: one.ready,
      applicable: one.applicable,
      percent: one.percent,
    })
  })

  it('leaves the unsatisfied alternatives out of the outstanding count', () => {
    const withBooking = readinessWith([doc('TRANSPORT_RESERVATION', 'ready')])
    // The other two routes are not missing documents. Before C3a the itinerary
    // sat in `optional`, which at least did not inflate the denominator — but
    // the *reservation* sat in it as a mandatory row nobody could satisfy any
    // other way.
    expect(withBooking.outstanding).toBe(baseline.outstanding - 1)
    expect(withBooking.notStarted).toBe(baseline.notStarted - 1)
  })

  it('still represents a real obligation when nothing is held', () => {
    // The load-bearing one. A group must cost exactly one slot in the
    // denominator, so a dossier with none of the three can never read complete.
    expect(baseline.notStarted).toBeGreaterThan(0)
    expect(baseline.complete).toBe(false)

    const slot = resolveGroupSlots(greece, [], application()).find(
      (s) => s.group.id === 'tr-travel-arrangements'
    )
    expect({ status: slot?.status, satisfiedBy: slot?.satisfiedBy }).toEqual({
      status: 'notStarted',
      satisfiedBy: null,
    })
  })

  it('counts the group once, not once per member', () => {
    // Stated against the arithmetic directly: three requirements, one slot.
    const codes = requiredRequirementCodes(greece, application())
    const ungrouped = codes.filter((c) => !TRANSPORT.includes(c))
    // `EMPLOYMENT_LETTER`/`APPROVED_LEAVE` are the other group, so the employed
    // applicant's denominator is the ungrouped requirements plus two slots.
    expect(baseline.applicable).toBe(ungrouped.length - 2 + 1 + 1)
  })
})

describe('unrelated requirements are untouched', () => {
  it('leaves an independent requirement counted on its own', () => {
    const before = readinessWith([])
    const after = readinessWith([doc('PASSPORT_CURRENT', 'ready')])
    expect({
      ready: after.ready - before.ready,
      applicable: after.applicable - before.applicable,
    }).toEqual({ ready: 1, applicable: 0 })
  })

  it('does not group anything in Germany’s employment evidence', () => {
    // The German mission asks for one letter carrying both the employment
    // details and the leave information, so Annex III's "and/or" is a choice it
    // does not offer. Germany must keep both rows.
    const ids = (
      germanyTourismComposition.template.satisfactionGroups ?? []
    ).map((g) => g.id)
    expect(ids).toEqual(['tr-travel-arrangements'])
    const grIds = (
      greeceTourismComposition.template.satisfactionGroups ?? []
    ).map((g) => g.id)
    expect(grIds).toEqual(['tr-travel-arrangements', 'gr-employment-evidence'])
  })

  it('drops a group whose members do not apply to this dossier', () => {
    // A student owes nothing under the employer-letter choice, so the group
    // must not appear as an obligation they can never meet.
    const ids = resolveGroupSlots(greece, [], application('student')).map(
      (s) => s.group.id
    )
    expect(ids).toEqual(['tr-travel-arrangements'])
  })
})

describe('the workspace stops asking once the obligation is met', () => {
  const app = application()

  it('recommends a member while the group is unsatisfied', () => {
    // Everything else ready and no transport document at all: the obligation is
    // the only outstanding work, so it must be what the workspace names. An
    // empty dossier would prove nothing here — it would recommend whatever
    // comes first in the pack's order.
    const documents = requiredRequirementCodes(greece, app)
      .filter((c) => !TRANSPORT.includes(c))
      .map((code) => doc(code, 'ready'))

    const next = deriveNextDocument(
      documents,
      requiredRequirementCodes(greece, app),
      greece,
      app
    )
    expect(TRANSPORT).toContain(next?.code)
  })

  it('never recommends another route once one is ready', () => {
    const documents = requiredRequirementCodes(greece, app).map((code) =>
      doc(code, TRANSPORT.includes(code) ? 'ready' : 'ready')
    )
    // Everything ready, including the booking — nothing at all should be
    // recommended, and in particular not the itinerary.
    const next = deriveNextDocument(
      documents,
      requiredRequirementCodes(greece, app),
      greece,
      app
    )
    expect(next).toBeNull()
  })

  it('does not send the applicant after an itinerary they do not need', () => {
    // The narrow regression this guards: booking ready, itinerary absent. Before
    // C3a the uninstantiated-code branch would have offered `ITINERARY` the
    // moment it entered the required set.
    const documents = requiredRequirementCodes(greece, app)
      .filter((c) => !TRANSPORT.includes(c))
      .map((code) => doc(code, 'ready'))
    documents.push(doc('TRANSPORT_RESERVATION', 'ready'))

    const next = deriveNextDocument(
      documents,
      requiredRequirementCodes(greece, app),
      greece,
      app
    )
    expect(next?.code).not.toBe('ITINERARY')
    expect(next?.code).not.toBe('TRANSPORT_MEANS_PROOF')
  })
})

describe('a group cannot promise a route the pack does not carry', () => {
  const shared = {
    code: 'A_DOC',
    nameKey: 'visa-domain:requirements.PHOTOS.name',
    category: 'identity' as const,
    ownerType: 'applicant' as const,
    required: true,
    revision: 1,
  }
  const common: RequirementLayer = {
    id: 'g-common',
    kind: 'common',
    add: [shared, { ...shared, code: 'B_DOC' }],
  }
  const base = {
    id: 'test-template',
    visaType: 'short_stay_tourism' as const,
    nameKey: 'visa-domain:visaTypes.schengen-short-stay-tourism',
    templateVersion: '1.0.0',
    reviewStatus: 'unverified' as const,
    preparationMilestones: [],
  }
  const withGroups = (groups: RequirementLayer['groups']) => () =>
    composeVisaTemplate({
      base,
      layers: [common, { id: 'g-mission', kind: 'jurisdiction', groups }],
    })

  it('refuses a member no layer declares', () => {
    expect(
      withGroups([
        {
          id: 'g',
          anyOf: ['A_DOC', 'MISSING'],
          labelKey: 'visa-domain:groups.x',
        },
      ])
    ).toThrow(/no layer in this composition declares/)
  })

  it('refuses a group of one', () => {
    expect(
      withGroups([
        { id: 'g', anyOf: ['A_DOC'], labelKey: 'visa-domain:groups.x' },
      ])
    ).toThrow(/at least two/)
  })

  it('refuses a requirement claimed by two groups', () => {
    expect(
      withGroups([
        {
          id: 'g1',
          anyOf: ['A_DOC', 'B_DOC'],
          labelKey: 'visa-domain:groups.x',
        },
        {
          id: 'g2',
          anyOf: ['A_DOC', 'B_DOC'],
          labelKey: 'visa-domain:groups.x',
        },
      ])
    ).toThrow(/One document may satisfy one obligation/)
  })

  it('refuses two groups sharing an id', () => {
    expect(
      withGroups([
        {
          id: 'g',
          anyOf: ['A_DOC', 'B_DOC'],
          labelKey: 'visa-domain:groups.x',
        },
        {
          id: 'g',
          anyOf: ['A_DOC', 'B_DOC'],
          labelKey: 'visa-domain:groups.x',
        },
      ])
    ).toThrow(CompositionError)
  })

  it('composes no `satisfactionGroups` field at all when a pack declares none', () => {
    const composed = composeVisaTemplate({ base, layers: [common] })
    expect(composed.template.satisfactionGroups).toBeUndefined()
  })
})
