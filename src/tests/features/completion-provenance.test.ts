import { describe, it, expect } from 'vitest'
import { resolveVisaTemplate } from '@/config/countries'
import {
  REQUIREMENT_REVISIONS,
  currentRevision,
} from '@/config/countries/requirement-revisions'
import {
  applyDocumentUpdate,
  completionStanding,
  requirementRevision,
} from '@/features/documents/document-semantics'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import { buildSubmissionChecklist } from '@/features/review/review-checklist'
import { documentFromRequirement } from '@/features/documents/template-sync'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { importPartial } from '@/features/import-export/services/import.service'
import {
  SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
} from '@/domain/schemas/dossier.schema'
import { STORAGE_FORMAT_VERSION } from '@/features/workspace/saved-dossier'
import type { Document } from '@/domain/schemas/document.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { VisaTypeTemplate, DocumentRequirement } from '@/config/types'

/**
 * A requirement's current definition and a user's claim that they satisfied an
 * earlier one are two different facts (ADR-051).
 *
 * The tests that matter here are the ones that fail for the *seeded-revision*
 * model I originally recommended in ADR-049 — see the t0→t4 timeline below.
 */

const resolved = resolveVisaTemplate('GR', 'short_stay_tourism')
if (!resolved) throw new Error('Greece tourism template is not registered')
const template: VisaTypeTemplate = resolved

const employed = {
  destinationCountry: 'GR',
  visaType: 'short_stay_tourism',
  employment: { employmentStatus: 'employed' },
} as unknown as Application

function doc(over: Partial<Document> = {}): Document {
  return {
    id: 'doc-1',
    code: 'SOCIAL_SECURITY',
    category: 'employment',
    ownerType: 'applicant',
    ownerId: 'applicant-1',
    required: true,
    status: 'not_started',
    verified: false,
    ...over,
  }
}

/** A pack whose SOCIAL_SECURITY sits at an arbitrary revision. */
function packAtRevision(revision: number): VisaTypeTemplate {
  return {
    ...template,
    documentRequirements: template.documentRequirements.map(
      (r): DocumentRequirement =>
        r.code === 'SOCIAL_SECURITY' ? { ...r, revision } : r
    ),
  }
}

describe('the claim is stamped when it is made, not when the record is created', () => {
  it('stamps nothing at seeding — not_started claims nothing', () => {
    // The seam is deliberately not `documentFromRequirement`. A seeded record
    // asserts nothing, and stamping one there is precisely what would leave a
    // user who later complies looking permanently stale (ADR-049).
    const seeded = template.documentRequirements.map((r) =>
      documentFromRequirement(r, 'applicant-1')
    )
    expect(seeded.every((d) => d.satisfiedRevision === undefined)).toBe(true)
    expect(seeded.every((d) => d.status === 'not_started')).toBe(true)
    expect(completionStanding(seeded[0]!, template)).toBe('none')
  })

  it('stamps nothing on any status that is not a claim', () => {
    for (const status of [
      'not_started',
      'requested',
      'received',
      'needs_update',
      'not_applicable',
    ] as const) {
      const moved = applyDocumentUpdate(doc(), { status }, template)
      expect({ status, stamped: 'satisfiedRevision' in moved }).toEqual({
        status,
        stamped: false,
      })
    }
  })

  it('stamps the current revision on entering ready', () => {
    const claimed = applyDocumentUpdate(doc(), { status: 'ready' }, template)
    expect(claimed.satisfiedRevision).toBe(
      requirementRevision('SOCIAL_SECURITY', template)
    )
    expect(completionStanding(claimed, template)).toBe('current')
  })

  it('releases the stamp on leaving ready', () => {
    // The field means "currently claimed satisfied". Keeping it beside a
    // `needs_update` status would turn it into a record of the past.
    const claimed = applyDocumentUpdate(doc(), { status: 'ready' }, template)
    const withdrawn = applyDocumentUpdate(
      claimed,
      { status: 'needs_update' },
      template
    )
    expect(withdrawn.satisfiedRevision).toBeUndefined()
    expect('satisfiedRevision' in withdrawn).toBe(false)
  })

  it('leaves an unrelated edit alone', () => {
    const claimed = applyDocumentUpdate(doc(), { status: 'ready' }, template)
    const annotated = applyDocumentUpdate(
      claimed,
      { notes: 'Collected both SGK documents' },
      template
    )
    expect(annotated.satisfiedRevision).toBe(claimed.satisfiedRevision)
    expect(annotated.notes).toBe('Collected both SGK documents')
  })

  it('stamps nothing for a code with no current acceptance contract', () => {
    // Custom and withdrawn codes have no requirement to satisfy.
    const custom = applyDocumentUpdate(
      doc({ code: 'CUSTOM-abc' }),
      { status: 'ready' },
      template
    )
    expect(custom.satisfiedRevision).toBeUndefined()
    expect(requirementRevision('TAX_RETURNS', template)).toBeUndefined()
  })
})

describe('the SOCIAL_SECURITY timeline that seeded-revision gets wrong', () => {
  const packV1 = packAtRevision(1)
  const packV2 = packAtRevision(2)

  // t0–t1: seeded under the old pack, then claimed against it.
  const t1 = applyDocumentUpdate(doc(), { status: 'ready' }, packV1)

  it('t1: the claim stands under the definition it was made against', () => {
    expect(t1.satisfiedRevision).toBe(1)
    expect(completionStanding(t1, packV1)).toBe('current')
  })

  it('t2: the bar rises, and the old claim is superseded', () => {
    expect(completionStanding(t1, packV2)).toBe('superseded')
  })

  it('t3: re-claiming the SAME record clears it — the seeded model cannot', () => {
    // The decisive case. The record was seeded and first claimed under
    // revision 1; the user then obtained both SGK documents and re-marked the
    // existing record ready. A stamp recorded at seed time would still say
    // "revision 1" and flag this person forever — punishing exactly the user
    // who complied, which is why ADR-049's recommendation was wrong.
    const t3 = applyDocumentUpdate(t1, { status: 'ready' }, packV2)
    expect(t3.satisfiedRevision).toBe(2)
    expect(completionStanding(t3, packV2)).toBe('current')
  })

  it('t4: a copy-only pack change leaves the claim standing', () => {
    // The reason the stamp is per-requirement rather than per-pack: a pack
    // version moves for translation fixes, and invalidating every completion
    // in the dossier over one would be worse than the staleness it detects.
    const t3 = applyDocumentUpdate(t1, { status: 'ready' }, packV2)
    const copyOnlyBump = packAtRevision(2)
    expect(completionStanding(t3, copyOnlyBump)).toBe('current')
  })
})

describe('what a superseded claim does to canonical readiness', () => {
  const packV2 = packAtRevision(2)
  const staleClaim = doc({ status: 'ready', satisfiedRevision: 1 })

  const readinessOf = (documents: Document[], pack: VisaTypeTemplate) =>
    buildDocumentReadiness({
      documents,
      requiredRequirementCodes: requiredRequirementCodes(pack, employed),
      template: pack,
      application: employed,
    })

  it('does not count as ready', () => {
    const readiness = readinessOf([staleClaim], packV2)
    expect({
      ready: readiness.ready,
      needsUpdate: readiness.needsUpdate,
    }).toEqual({ ready: 0, needsUpdate: 1 })
  })

  it('never rewrites the stored status', () => {
    // The user said `ready`. That assertion is theirs; only our reading of it
    // changed.
    const before = JSON.stringify(staleClaim)
    readinessOf([staleClaim], packV2)
    expect(JSON.stringify(staleClaim)).toBe(before)
    expect(staleClaim.status).toBe('ready')
  })

  it('still exports as ready', () => {
    const parsed = importPartial(JSON.stringify({ documents: [staleClaim] }))
    expect(parsed.data?.documents?.[0]).toEqual(staleClaim)
  })

  it('counts again once the user re-confirms it', () => {
    const reclaimed = applyDocumentUpdate(
      staleClaim,
      { status: 'ready' },
      packV2
    )
    expect(readinessOf([reclaimed], packV2).ready).toBe(1)
  })
})

describe('every surface that shows a completion agrees about it', () => {
  /**
   * The failure this whole sprint is about, at the smallest scale it can occur:
   * a green row or caption sitting beside a ring that has already stopped
   * counting the same document.
   */
  const packV2 = packAtRevision(2)

  it('the Final Review checklist does not call a superseded claim done', () => {
    const stale = doc({ status: 'ready', satisfiedRevision: 1 })
    const { rows } = buildSubmissionChecklist(
      [stale],
      employed,
      packV2,
      '2099-04-01'
    )
    const row = rows.find((r) => r.code === 'SOCIAL_SECURITY')
    // It is in the package — never "missing", which would tell someone to go
    // and fetch a document already sitting in their folder.
    expect(row?.state).toBe('needsAttention')
    expect(row?.status).toBe('ready')
  })

  it('an unrecorded claim still reads as done there too', () => {
    const legacy = doc({ status: 'ready' })
    const { rows } = buildSubmissionChecklist(
      [legacy],
      employed,
      packV2,
      '2099-04-01'
    )
    expect(rows.find((r) => r.code === 'SOCIAL_SECURITY')?.state).toBe('ready')
  })
})

describe('a claim from before provenance existed', () => {
  const packV2 = packAtRevision(2)
  const legacy = doc({ status: 'ready' })

  it('is unrecorded, never superseded', () => {
    // Absence of a stamp says nothing about the evidence. Reading it as
    // staleness would demote every existing user over a claim we cannot
    // assess — the ADR-049 principle, verbatim.
    expect(legacy.satisfiedRevision).toBeUndefined()
    expect(completionStanding(legacy, packV2)).toBe('unrecorded')
  })

  it('keeps counting as ready', () => {
    const readiness = buildDocumentReadiness({
      documents: [legacy],
      requiredRequirementCodes: requiredRequirementCodes(packV2, employed),
      template: packV2,
      application: employed,
    })
    expect({
      ready: readiness.ready,
      needsUpdate: readiness.needsUpdate,
    }).toEqual({ ready: 1, needsUpdate: 0 })
  })
})

describe('the acceptance-contract ledger', () => {
  it('agrees with every revision the packs declare', () => {
    // The guard. Acceptance criteria live in translated prose, so nothing can
    // detect a tightening automatically — a bump has to be written down, and
    // this is what refuses to let one appear or vanish silently.
    const declared = template.documentRequirements
      .filter((r) => (r.revision ?? 1) > 1)
      .map((r) => `${r.code}@${r.revision}`)
      .sort()
    const recorded = REQUIREMENT_REVISIONS.map(
      (entry) => `${entry.code}@${entry.revision}`
    ).sort()
    expect(declared).toEqual(recorded)
  })

  it('records why each bump was necessary', () => {
    for (const entry of REQUIREMENT_REVISIONS) {
      expect({
        code: entry.code,
        hasReason: entry.reason.trim().length > 30,
        hasVersion: /^\d+\.\d+\.\d+$/.test(entry.bumpedIn),
        startsAboveOne: entry.revision > 1,
      }).toEqual({
        code: entry.code,
        hasReason: true,
        hasVersion: true,
        startsAboveOne: true,
      })
    }
  })

  it('defaults an unbumped requirement to revision 1', () => {
    expect(currentRevision('ACCOMMODATION')).toBe(1)
    expect(currentRevision('SOCIAL_SECURITY')).toBe(2)
  })
})

describe('version axes', () => {
  it('announces the new field without breaking older files', () => {
    // The bump is about meaning, not parsing: an older build strips the key and
    // a re-export would lose the provenance with nothing said (ADR-043).
    expect(SCHEMA_VERSION).toBe('1.2.0')
    expect(SUPPORTED_SCHEMA_VERSIONS).toContain('1.0.0')
    expect(SUPPORTED_SCHEMA_VERSIONS).toContain('1.1.0')
  })

  it('leaves the storage envelope alone', () => {
    // A dossier gained a field; the IndexedDB record wrapping it did not change
    // shape, so this axis must not move (ADR-036/043).
    expect(STORAGE_FORMAT_VERSION).toBe(2)
  })
})
