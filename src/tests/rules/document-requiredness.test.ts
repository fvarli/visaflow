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
    const ids = ruleIds(dossierOf([notApplicable], app))
    expect(ids).not.toContain('document.requiredNotStarted')

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
