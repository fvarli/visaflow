import { describe, it, expect } from 'vitest'
import { composeVisaTemplate, CompositionError } from '@/config/composition'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { deriveNextDocument } from '@/features/documents/documents-model'
import { resolveGroupSlots } from '@/features/readiness/satisfaction-groups'
import { resolveVisaTemplate } from '@/config/countries'
import { runValidation } from '@/domain/rules/runner'
import { PRODUCTION_COMPOSITIONS } from '@/tests/support/production-compositions'
import { applyDocumentUpdate } from '@/features/documents/document-semantics'
import { greeceTourismComposition } from '@/config/countries/greece/tourism'
import { germanyTourismComposition } from '@/config/countries/germany/tourism'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { DocumentStatus } from '@/domain/types/common'
import type { DocumentRequirement, RequirementLayer } from '@/config/types'
import { ctxFor } from '@/tests/support/applicability'

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
    requiredRequirementCodes: requiredRequirementCodes(greece, ctxFor(app)),
    template: greece,
    context: ctxFor(app),
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

    const slot = resolveGroupSlots(greece, [], ctxFor(application())).find(
      (s) => s.group.id === 'tr-travel-arrangements'
    )
    expect({ status: slot?.status, satisfiedBy: slot?.satisfiedBy }).toEqual({
      status: 'notStarted',
      satisfiedBy: null,
    })
  })

  it('counts the group once, not once per member', () => {
    // Stated against the arithmetic directly: three requirements, one slot.
    const codes = requiredRequirementCodes(greece, ctxFor(application()))
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
    // Germany's own accommodation choice joined in H3; the employment one is
    // still Greece's alone, which is what this test is about.
    expect(ids).toEqual(['tr-travel-arrangements', 'de-accommodation-evidence'])
    const grIds = (
      greeceTourismComposition.template.satisfactionGroups ?? []
    ).map((g) => g.id)
    expect(grIds).toEqual(['tr-travel-arrangements', 'gr-employment-evidence'])
  })

  it('drops a group whose members do not apply to this dossier', () => {
    // A student owes nothing under the employer-letter choice, so the group
    // must not appear as an obligation they can never meet.
    const ids = resolveGroupSlots(
      greece,
      [],
      ctxFor(application('student'))
    ).map((s) => s.group.id)
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
    const documents = requiredRequirementCodes(greece, ctxFor(app))
      .filter((c) => !TRANSPORT.includes(c))
      .map((code) => doc(code, 'ready'))

    const next = deriveNextDocument(
      documents,
      requiredRequirementCodes(greece, ctxFor(app)),
      greece,
      ctxFor(app)
    )
    expect(TRANSPORT).toContain(next?.code)
  })

  it('never recommends another route once one is ready', () => {
    const documents = requiredRequirementCodes(greece, ctxFor(app)).map(
      (code) => doc(code, TRANSPORT.includes(code) ? 'ready' : 'ready')
    )
    // Everything ready, including the booking — nothing at all should be
    // recommended, and in particular not the itinerary.
    const next = deriveNextDocument(
      documents,
      requiredRequirementCodes(greece, ctxFor(app)),
      greece,
      ctxFor(app)
    )
    expect(next).toBeNull()
  })

  it('does not send the applicant after an itinerary they do not need', () => {
    // The narrow regression this guards: booking ready, itinerary absent. Before
    // C3a the uninstantiated-code branch would have offered `ITINERARY` the
    // moment it entered the required set.
    const documents = requiredRequirementCodes(greece, ctxFor(app))
      .filter((c) => !TRANSPORT.includes(c))
      .map((code) => doc(code, 'ready'))
    documents.push(doc('TRANSPORT_RESERVATION', 'ready'))

    const next = deriveNextDocument(
      documents,
      requiredRequirementCodes(greece, ctxFor(app)),
      greece,
      ctxFor(app)
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

describe('a group may not let an obligation disappear', () => {
  const req = (
    code: string,
    over: Partial<DocumentRequirement> = {}
  ): DocumentRequirement => ({
    code,
    nameKey: 'visa-domain:requirements.PHOTOS.name',
    category: 'identity',
    ownerType: 'applicant',
    required: true,
    revision: 1,
    ...over,
  })

  const base = {
    id: 'test-template',
    visaType: 'short_stay_tourism' as const,
    nameKey: 'visa-domain:visaTypes.schengen-short-stay-tourism',
    templateVersion: '1.0.0',
    reviewStatus: 'unverified' as const,
    preparationMilestones: [],
  }

  const composeWith = (
    members: DocumentRequirement[],
    anyOf = members.map((m) => m.code)
  ) =>
    composeVisaTemplate({
      base,
      layers: [
        { id: 't-common', kind: 'common', add: members },
        {
          id: 't-mission',
          kind: 'jurisdiction',
          groups: [{ id: 'g', anyOf, labelKey: 'visa-domain:groups.x' }],
        },
      ],
    })

  const employed = {
    field: 'employment.employmentStatus',
    operator: 'equals' as const,
    value: 'employed',
  }

  it('refuses a group whose optional member can outlive its required one', () => {
    // THE SILENT DROP. For anyone not employed, the required member does not
    // apply, so `resolveGroupSlots` drops the group — and the optional member
    // that *does* apply is excluded from the optional tally too, so it is
    // counted nowhere at all. The obligation simply vanishes.
    expect(() =>
      composeWith([
        req('A_DOC', { conditionalOn: employed }),
        req('B_DOC', { required: false }),
      ])
    ).toThrow(/would disappear for those applicants/)
  })

  it('refuses a group with no required member at all', () => {
    expect(() =>
      composeWith([
        req('A_DOC', { required: false }),
        req('B_DOC', { required: false }),
      ])
    ).toThrow(CompositionError)
  })

  it('allows mixed conditions when a required member covers everyone', () => {
    // The shape the German accommodation obligation needs: a required
    // unconditional document plus an optional alternative only a sponsored
    // applicant can produce. Safe, and the invariant must not forbid it.
    expect(() =>
      composeWith([
        req('A_DOC'),
        req('B_DOC', {
          required: false,
          conditionalOn: {
            field: 'financing.source',
            operator: 'equals',
            value: 'sponsor',
          },
        }),
      ])
    ).not.toThrow()
  })

  it('allows required members that share one condition', () => {
    // Greece's employer letter / leave approval: neither applies to a student,
    // and nothing is owed then — which is correct, not a drop.
    expect(() =>
      composeWith([
        req('A_DOC', { conditionalOn: employed }),
        req('B_DOC', { conditionalOn: employed }),
      ])
    ).not.toThrow()
  })

  it('allows an optional member that shares its required member’s condition', () => {
    expect(() =>
      composeWith([
        req('A_DOC', { conditionalOn: employed }),
        req('B_DOC', { required: false, conditionalOn: employed }),
      ])
    ).not.toThrow()
  })

  it('holds for every production group', () => {
    // The composer already ran this when the packs were built at module load;
    // resolving them here is what proves it did.
    for (const { countryCode, composition } of PRODUCTION_COMPOSITIONS) {
      expect({
        countryCode,
        groups: (composition.template.satisfactionGroups ?? []).length,
      }).toEqual({
        countryCode,
        groups: 2,
      })
    }
  })
})

describe('Germany accepts an official undertaking instead of an accommodation document', () => {
  /**
   * The checklist states it inside the accommodation item and nowhere else:
   * "Otel rezervasyonu / otel ödemesi veya başka bir konaklama imkanını
   * kanıtlayan belge (resmi bir taahhütname ile ibraz edilmediyse)". Either
   * document answers the obligation; the pack used to demand the booking.
   */
  const germany = resolveVisaTemplate('DE', 'short_stay_tourism')!
  const MEMBERS = ['ACCOMMODATION', 'DE_OFFICIAL_UNDERTAKING']

  const deApp = {
    applicationId: 'app1',
    applicantId: 'a1',
    destinationCountry: 'DE',
    visaType: 'short_stay_tourism',
    status: 'draft',
    createdAt: '2026-09-08T00:00:00.000Z',
    sponsorIds: [],
    documentIds: [],
    notes: [],
    employment: { employmentStatus: 'employed' },
  } as unknown as Application

  const deDoc = (code: string, status: DocumentStatus): Document => {
    const record = {
      id: `doc-${code}`,
      code,
      name: code,
      category: 'accommodation',
      ownerType: 'applicant',
      ownerId: 'a1',
      required: true,
      status,
    } as unknown as Document
    return status === 'ready'
      ? applyDocumentUpdate(
          { ...record, status: 'not_started' },
          { status },
          germany
        )
      : record
  }

  const accommodationSlot = (documents: Document[]) =>
    resolveGroupSlots(germany, documents, ctxFor(deApp)).find(
      (s) => s.group.id === 'de-accommodation-evidence'
    )

  const readinessOf = (documents: Document[]) =>
    buildDocumentReadiness({
      documents,
      requiredRequirementCodes: requiredRequirementCodes(
        germany,
        ctxFor(deApp)
      ),
      template: germany,
      context: ctxFor(deApp),
    })

  it('composes the undertaking, and Greece does not', () => {
    const de = germany.documentRequirements.find(
      (r) => r.code === 'DE_OFFICIAL_UNDERTAKING'
    )
    expect(de).toBeDefined()
    expect(
      germanyTourismComposition.ownership.get('DE_OFFICIAL_UNDERTAKING')
    ).toBe('de-tr-mission')
    expect(greece.documentRequirements.map((r) => r.code)).not.toContain(
      'DE_OFFICIAL_UNDERTAKING'
    )
  })

  it('states no condition on either member', () => {
    // The sheet attaches none, so neither does the pack. Which route an
    // applicant takes is a choice, not a property of the applicant.
    for (const code of MEMBERS) {
      expect(
        germany.documentRequirements.find((r) => r.code === code)?.conditionalOn
      ).toBeUndefined()
    }
  })

  it('pairs exactly the two documents the sheet names', () => {
    expect(accommodationSlot([])?.group.anyOf).toEqual(MEMBERS)
  })

  it('is one obligation, not two', () => {
    const empty = readinessOf([])
    const bothHeld = readinessOf(MEMBERS.map((c) => deDoc(c, 'ready')))
    // Holding both is one obligation met, not two.
    expect(bothHeld.applicable).toBe(empty.applicable)
    expect(bothHeld.ready - empty.ready).toBe(1)
  })

  it('is satisfied by the accommodation document alone', () => {
    expect(accommodationSlot([deDoc('ACCOMMODATION', 'ready')])?.status).toBe(
      'ready'
    )
  })

  it('is satisfied by the undertaking alone', () => {
    // The correction. Before H3 this applicant was still told to produce a
    // hotel booking the mission does not ask them for.
    const slot = accommodationSlot([deDoc('DE_OFFICIAL_UNDERTAKING', 'ready')])
    expect({ status: slot?.status, by: slot?.satisfiedBy }).toEqual({
      status: 'ready',
      by: 'DE_OFFICIAL_UNDERTAKING',
    })
  })

  it('does not call the accommodation document missing or skipped', () => {
    const documents = [
      deDoc('DE_OFFICIAL_UNDERTAKING', 'ready'),
      deDoc('ACCOMMODATION', 'not_applicable'),
    ]
    const findings = runValidation({
      dossier: {
        schemaVersion: '1.0.0',
        exportedAt: '2026-09-08T00:00:00.000Z',
        applicant: {
          id: 'a1',
          firstName: 'A',
          lastName: 'B',
          dateOfBirth: '1990-01-01',
          nationality: 'TR',
          passport: {
            number: 'X',
            issueDate: '2022-01-01',
            expiryDate: '2032-01-01',
            issuingCountry: 'TR',
            passportType: 'ordinary',
          },
          previousPassports: [],
          previousVisas: [],
          previousRefusals: [],
          travelHistory: [],
        },
        application: deApp,
        documents,
        sponsors: [],
      } as never,
      template: germany,
      applicability: ctxFor(deApp),
    }).findings

    expect(
      findings
        .filter((f) => f.ruleId === 'document.requiredNotStarted')
        .flatMap((f) => f.messageParams?.documentCodes?.documents ?? [])
    ).not.toContain('ACCOMMODATION')
    expect(
      findings
        .filter((f) => f.ruleId === 'document.requiredNotSkipped')
        .flatMap((f) => f.messageParams?.documentCodes?.document ?? [])
    ).not.toContain('ACCOMMODATION')
    expect(findings.map((f) => f.id)).not.toContain(
      'missing-obligation-de-accommodation-evidence'
    )
  })

  it('reports one group-level obligation when neither is held', () => {
    expect(accommodationSlot([])?.status).toBe('notStarted')
  })

  it('leaves the transport group and Greece alone', () => {
    expect(
      (germany.satisfactionGroups ?? []).find(
        (g) => g.id === 'tr-travel-arrangements'
      )?.anyOf
    ).toEqual(TRANSPORT)
    expect((greece.satisfactionGroups ?? []).map((g) => g.id)).toEqual([
      'tr-travel-arrangements',
      'gr-employment-evidence',
    ])
  })
})
