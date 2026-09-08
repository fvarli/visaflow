import { describe, it, expect } from 'vitest'
import { runValidation } from '@/domain/rules/runner'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { resolveVisaTemplate } from '@/config/countries'
import { effectiveStatus } from '@/features/documents/document-semantics'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'

/**
 * The readiness ring and the findings list must answer the same question the
 * same way.
 *
 * They did not. Two rules decided requiredness from `Document.required` — the
 * flag written when the record was seeded — while readiness resolved it from
 * the pack. `EMPLOYER_TRADE_REGISTRY` became required in E5b and
 * `EMPLOYER_TAX_PLATE` in E5c-3, so on every dossier seeded before those the
 * ring counted a document as outstanding and this rule said nothing about it.
 *
 * A third rule filtered the persisted `status`, so a claim superseded because
 * its acceptance contract moved was invisible to it — including every claim
 * F1c demotes.
 */

const GREECE = resolveVisaTemplate('GR', 'short_stay_tourism')

const application = (employmentStatus: string): Application =>
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
    employment: { employmentStatus },
  }) as unknown as Application

const doc = (over: Partial<Document> & Pick<Document, 'code'>): Document =>
  ({
    id: `d-${over.code}`,
    name: over.code,
    category: 'supporting',
    ownerType: 'applicant',
    ownerId: 'a1',
    required: true,
    status: 'not_started',
    ...over,
  }) as unknown as Document

const dossierOf = (documents: Document[], app: Application): Dossier =>
  ({
    schemaVersion: '1.0.0',
    exportedAt: '2026-09-08T00:00:00.000Z',
    applicant: {
      id: 'a1',
      firstName: 'Ayşe',
      lastName: 'Demir',
      dateOfBirth: '1990-04-11',
      nationality: 'TR',
      passport: {
        number: 'U1234567',
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
    application: app,
    documents,
    sponsors: [],
  }) as unknown as Dossier

const ruleIds = (dossier: Dossier) =>
  runValidation({ dossier, template: GREECE }).findings.map((f) => f.ruleId)

/** The document codes the missing-required finding actually names. */
const namedMissing = (dossier: Dossier): string[] =>
  runValidation({ dossier, template: GREECE })
    .findings.filter((f) => f.ruleId === 'document.requiredNotStarted')
    .flatMap((f) => f.messageParams?.documentCodes?.documents ?? [])

describe('requiredness comes from the pack, not from the seeded flag', () => {
  /**
   * The exact shape that shipped: a dossier seeded while
   * `EMPLOYER_TRADE_REGISTRY` was optional, opened after E5b made it required.
   */
  const app = application('self_employed')
  const stale = doc({
    code: 'EMPLOYER_TRADE_REGISTRY',
    category: 'employment',
    ownerType: 'employer',
    required: false,
    status: 'not_started',
  })

  it('reports a document the pack now requires, whatever the record says', () => {
    expect(stale.required).toBe(false)
    expect(ruleIds(dossierOf([stale], app))).toContain(
      'document.requiredNotStarted'
    )
  })

  it('agrees with the readiness ring about the same document', () => {
    // The whole point. Before the fix the ring counted this document and the
    // findings list did not, on one dossier, at the same moment.
    const readiness = buildDocumentReadiness({
      documents: [stale],
      requiredRequirementCodes: requiredRequirementCodes(GREECE, app),
      template: GREECE,
      application: app,
    })
    const flagged = runValidation({
      dossier: dossierOf([stale], app),
      template: GREECE,
    }).findings.some((f) =>
      (f.messageParams?.documentCodes?.documents ?? []).includes(
        'EMPLOYER_TRADE_REGISTRY'
      )
    )
    expect({ countedByReadiness: readiness.notStarted > 0, flagged }).toEqual({
      countedByReadiness: true,
      flagged: true,
    })
  })

  it('flags a required document set aside without a reason', () => {
    const skipped = doc({
      ...stale,
      status: 'not_applicable',
      notes: undefined,
    })
    expect(ruleIds(dossierOf([skipped], app))).toContain(
      'document.requiredNotSkipped'
    )
  })

  it('does not manufacture a finding from a stale required flag', () => {
    // The other direction, and the one a naive fix breaks. This requirement is
    // conditional on being employed, so it does not apply to a self-employed
    // applicant — no matter what the record was seeded with.
    const notApplicable = doc({
      code: 'EMPLOYER_SIGNATURE_CIRCULAR',
      category: 'employment',
      required: true,
      status: 'not_started',
    })
    // Asserted on the *codes named*, not on the finding existing: this dossier
    // legitimately has other required documents outstanding, so the finding is
    // there — it just must not be about this one.
    expect(namedMissing(dossierOf([notApplicable], app))).not.toContain(
      'EMPLOYER_SIGNATURE_CIRCULAR'
    )

    const skipped = doc({ ...notApplicable, status: 'not_applicable' })
    expect(ruleIds(dossierOf([skipped], app))).not.toContain(
      'document.requiredNotSkipped'
    )
  })

  it('leaves the applicant’s own documents alone', () => {
    // A deliberate consequence of using the shared definition: a custom
    // document is the applicant's, and setting one aside needs no justification.
    // Readiness has treated it that way since ADR-050.
    const custom = doc({
      code: 'CUSTOM-abc',
      required: true,
      status: 'not_applicable',
    })
    expect(ruleIds(dossierOf([custom], app))).not.toContain(
      'document.requiredNotSkipped'
    )
  })
})

describe('a superseded claim reaches the needs-update finding', () => {
  const app = application('employed')

  /**
   * The F1c shape: a `ready` claim carrying a revision and no contract key, on
   * a requirement whose composed contract now includes Greek acceptance detail.
   * Its effective status is `needs_update`; its stored status is not.
   */
  const legacy = doc({
    code: 'PHOTOS',
    category: 'identity',
    status: 'ready',
    satisfiedRevision: 1,
  })

  it('is superseded in effect while still stored as ready', () => {
    expect(legacy.status).toBe('ready')
    expect(legacy.satisfiedContract).toBeUndefined()
    expect(effectiveStatus(legacy, GREECE)).toBe('needs_update')
  })

  it('is reported, where the persisted status alone hid it', () => {
    expect(ruleIds(dossierOf([legacy], app))).toContain(
      'document.needingUpdate'
    )
  })

  it('does not rewrite the record to say so', () => {
    // Validation reads; it never asserts on the applicant's behalf (ADR-051).
    const documents = [legacy]
    runValidation({ dossier: dossierOf(documents, app), template: GREECE })
    expect(documents[0]!.status).toBe('ready')
    expect(documents[0]!.satisfiedRevision).toBe(1)
  })

  it('still reports a document stored as needing an update', () => {
    // The original behaviour has to survive the widening.
    const plain = doc({ code: 'BANK_STATEMENTS', status: 'needs_update' })
    expect(ruleIds(dossierOf([plain], app))).toContain('document.needingUpdate')
  })
})

describe('no rule resolves its own template', () => {
  it('reports nothing about requiredness when no pack is resolved', () => {
    // A dossier with no destination has no template, and a rule must not go
    // looking for one. Without a pack there is no current requiredness to
    // report, so these two findings must be absent rather than guessed at.
    const orphan = doc({ code: 'EMPLOYER_TRADE_REGISTRY', required: true })
    const ids = runValidation({
      dossier: dossierOf([orphan], application('self_employed')),
      template: undefined,
    }).findings.map((f) => f.ruleId)
    expect(ids).not.toContain('document.requiredNotStarted')
    expect(ids).not.toContain('document.requiredNotSkipped')
  })
})

describe('a grouped obligation is one obligation, named once', () => {
  const app = application('employed')
  const TRANSPORT = [
    'TRANSPORT_RESERVATION',
    'TRANSPORT_MEANS_PROOF',
    'ITINERARY',
  ]
  const obligationIds = (dossier: Dossier) =>
    runValidation({ dossier, template: GREECE })
      .findings.filter(
        (f) => f.ruleId === 'document.requiredObligationNotStarted'
      )
      .map((f) => f.id)

  /** The route the applicant actually took. */
  const readyItinerary = (): Document => {
    const seeded = doc({
      code: 'ITINERARY',
      category: 'travel',
      required: false,
    })
    return {
      ...seeded,
      status: 'ready',
      satisfiedRevision: 1,
      satisfiedContract: GREECE?.documentRequirements.find(
        (r) => r.code === 'ITINERARY'
      )?.contractKey,
    }
  }

  it('does not call the reservation missing when an itinerary satisfies it', () => {
    // THE DEFECT THAT SHIPPED. `TRANSPORT_RESERVATION` is `required: true` and a
    // group member, so before this it was reported missing while readiness
    // counted the obligation satisfied — the same two-surfaces-one-dossier
    // disagreement H1 was about.
    const dossier = dossierOf(
      [
        readyItinerary(),
        doc({ code: 'TRANSPORT_RESERVATION', category: 'travel' }),
      ],
      app
    )
    expect(namedMissing(dossier)).not.toContain('TRANSPORT_RESERVATION')
    // Scoped to the transport obligation: this employed applicant genuinely
    // owes the employment obligation too, and that one is not what is under
    // test here.
    expect(obligationIds(dossier)).not.toContain(
      'missing-obligation-tr-travel-arrangements'
    )
  })

  it('does not call the reservation skipped when an itinerary satisfies it', () => {
    // Setting a member aside is choosing a route, not abandoning an obligation.
    const dossier = dossierOf(
      [
        readyItinerary(),
        doc({
          code: 'TRANSPORT_RESERVATION',
          category: 'travel',
          status: 'not_applicable',
        }),
      ],
      app
    )
    expect(ruleIds(dossier)).not.toContain('document.requiredNotSkipped')
  })

  it('reports one obligation, not one finding per member', () => {
    const dossier = dossierOf([], app)
    // Exactly one, and named by the group rather than by any member.
    expect(obligationIds(dossier)).toContain(
      'missing-obligation-tr-travel-arrangements'
    )
    expect(
      obligationIds(dossier).filter((id) => id.includes('travel-arrangements'))
    ).toHaveLength(1)
    // And no member is named among the ordinary missing documents.
    for (const code of TRANSPORT) {
      expect(namedMissing(dossier)).not.toContain(code)
    }
  })

  it('names the obligation, never a member', () => {
    const finding = runValidation({
      dossier: dossierOf([], app),
      template: GREECE,
    }).findings.find(
      (f) => f.id === 'missing-obligation-tr-travel-arrangements'
    )
    expect(finding?.messageParams?.enumKeys?.obligation).toBe(
      'visa-domain:groups.tr-travel-arrangements'
    )
    expect(finding?.messageParams?.documentCodes).toBeUndefined()
  })

  it('is satisfied when one member is ready and another is superseded', () => {
    // The slot takes the best any member reached, so a stale claim on one route
    // does not reopen an obligation another route has met.
    const superseded = doc({
      code: 'TRANSPORT_RESERVATION',
      category: 'travel',
      status: 'ready',
      satisfiedRevision: 1,
      satisfiedContract: 'TRANSPORT_RESERVATION@0+stale:1',
    })
    expect(
      obligationIds(dossierOf([readyItinerary(), superseded], app))
    ).not.toContain('missing-obligation-tr-travel-arrangements')
  })
})

describe('validation and readiness owe the same obligations', () => {
  it.each([
    ['nothing recorded', [] as Document[]],
    ['one grouped member ready', [] as Document[]],
  ])('agree on the outstanding count — %s', (_label) => {
    const app = application('employed')
    const documents: Document[] = []
    const readiness = buildDocumentReadiness({
      documents,
      requiredRequirementCodes: requiredRequirementCodes(GREECE, app),
      template: GREECE,
      application: app,
    })
    const findings = runValidation({
      dossier: dossierOf(documents, app),
      template: GREECE,
    }).findings
    const named = findings
      .filter((f) => f.ruleId === 'document.requiredNotStarted')
      .flatMap((f) => f.messageParams?.documentCodes?.documents ?? []).length
    const obligations = findings.filter(
      (f) => f.ruleId === 'document.requiredObligationNotStarted'
    ).length

    // Every obligation readiness counts as outstanding is named by validation,
    // once. Before H2 this was 0 against 11.
    expect(named + obligations).toBe(readiness.outstanding)
  })
})
