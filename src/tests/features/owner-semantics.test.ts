import { describe, it, expect } from 'vitest'
import type { Document } from '@/domain/schemas/document.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { EmploymentStatus, OwnerType } from '@/domain/types/common'
import { resolveDocumentSemantics } from '@/features/documents/document-semantics'
import {
  filterDocuments,
  EMPTY_FILTERS,
} from '@/features/documents/document-filters'
import { buildFinanceDocuments } from '@/features/finance/finance-documents'
import { buildSponsorDocuments } from '@/features/sponsors/sponsor-documents'
import { buildSubmissionChecklist } from '@/features/review/review-checklist'
import { resolveVisaTemplate } from '@/config/countries'
import {
  PRODUCTION_COMPOSITIONS,
  compositionFor,
} from '@/tests/support/production-compositions'
import { ctxFor } from '@/tests/support/applicability'

/**
 * `ownerType` is template-owned, and every surface that shows one must ask the
 * same resolver.
 *
 * ADR-049 Decision 2: *"Template-owned metadata is re-derived on read, not
 * frozen at seed: `required`, `category`, `ownerType` and applicability come
 * from the current pack through one shared resolver."* Two of those three were
 * honoured and `ownerType` was not — the Documents card, table, row and owner
 * filter, the Finance membership filter and the sponsor linker all read the
 * value copied onto the record at seed time, while the Final Review checklist
 * already read the resolved one. A dossier seeded before ADR-048 moved
 * `EMPLOYER_TRADE_REGISTRY` from the employer to the applicant therefore
 * carried the old owner on its label forever, and two screens disagreed about
 * the same document.
 *
 * The fallback is the other half of the same decision (`decisions.md:1935`):
 * *"An unresolvable code describes itself from its own snapshot, always."*
 */

function applicationFor(
  destinationCountry: string,
  employmentStatus: EmploymentStatus
): Application {
  return {
    destinationCountry,
    visaType: 'short_stay_tourism',
    employment: { employmentStatus },
  } as unknown as Application
}

const GR = applicationFor('GR', 'self_employed')

const grTemplate = resolveVisaTemplate('GR', 'short_stay_tourism')
const grContext = ctxFor(GR)

function record(code: string, ownerType: OwnerType): Document {
  return {
    id: `doc-${code}`,
    code,
    category: 'employment',
    ownerType,
    ownerId: 'applicant-owner',
    required: true,
    status: 'not_started',
    verified: false,
  }
}

const ownerOf = (doc: Document) =>
  resolveDocumentSemantics(doc, grTemplate, grContext).ownerType

describe('owner semantics — the record matrix', () => {
  it('a live requirement whose snapshot agrees resolves to the same owner', () => {
    // EMPLOYER_TRADE_REGISTRY is applicant-owned in the current pack.
    expect(ownerOf(record('EMPLOYER_TRADE_REGISTRY', 'applicant'))).toBe(
      'applicant'
    )
  })

  it('a live requirement whose snapshot is stale resolves to the pack, not the record', () => {
    // The exact historical case: seeded as `employer` before ADR-048 corrected
    // it. The record is never rewritten; the reading is.
    const stale = record('EMPLOYER_TRADE_REGISTRY', 'employer')
    expect(stale.ownerType).toBe('employer')
    expect(ownerOf(stale)).toBe('applicant')
  })

  it('an unknown code keeps its own snapshot', () => {
    expect(ownerOf(record('NOT_A_REQUIREMENT_IN_ANY_PACK', 'employer'))).toBe(
      'employer'
    )
  })

  it('a retired code keeps its own snapshot', () => {
    // TAX_RETURNS is in the retirement registry and in no template.
    const retired = record('TAX_RETURNS', 'employer')
    expect(
      resolveDocumentSemantics(retired, grTemplate, grContext).membership
    ).toBe('retired')
    expect(ownerOf(retired)).toBe('employer')
  })

  it('a custom code keeps its own snapshot', () => {
    const custom = record('CUSTOM-abc123', 'applicant')
    expect(
      resolveDocumentSemantics(custom, grTemplate, grContext).membership
    ).toBe('custom')
    expect(ownerOf(custom)).toBe('applicant')
  })
})

describe('owner semantics — zero behavioural delta for production data', () => {
  it.each(PRODUCTION_COMPOSITIONS.map((p) => [p.countryCode, p] as const))(
    '%s: every requirement resolves to exactly its declared ownerType',
    (_code, entry) => {
      const template = entry.composition.template
      for (const req of template.documentRequirements) {
        const seeded = record(req.code, req.ownerType)
        seeded.category = req.category
        const resolved = resolveDocumentSemantics(
          seeded,
          template,
          ctxFor(GR)
        ).ownerType
        expect(resolved, `${entry.countryCode}/${req.code}`).toBe(req.ownerType)
      }
    }
  )

  it('the two rows this track is about are untouched here', () => {
    // Known debt, deliberately not fixed in this slice: EMPLOYER_TAX_PLATE is
    // self-employed-only and still declares an employer subject. Pinning it
    // means a well-meaning "fix while here" fails loudly.
    const plate = compositionFor('DE').template.documentRequirements.find(
      (r) => r.code === 'EMPLOYER_TAX_PLATE'
    )
    expect(plate?.ownerType).toBe('employer')

    const circular = compositionFor('GR').template.documentRequirements.find(
      (r) => r.code === 'EMPLOYER_SIGNATURE_CIRCULAR'
    )
    expect(circular?.ownerType).toBe('employer')
  })

  it('no requirement carries contextual owner behaviour yet', () => {
    // The capability does not exist. When it arrives it must arrive with its
    // own decision record, not as a field that appeared during a routing slice.
    for (const entry of PRODUCTION_COMPOSITIONS) {
      for (const req of entry.composition.template.documentRequirements) {
        expect(Object.keys(req)).not.toContain('ownerByOccupation')
        expect(Object.keys(req)).not.toContain('ownerOverrides')
      }
    }
  })
})

describe('owner semantics — every surface agrees', () => {
  const stale = record('EMPLOYER_TRADE_REGISTRY', 'employer')

  it('the Documents owner filter matches the resolved owner, not the snapshot', () => {
    const byApplicant = filterDocuments(
      [stale],
      { ...EMPTY_FILTERS, owner: 'applicant' },
      (d) => d.code,
      () => true,
      (d) => d.status,
      ownerOf
    )
    const byEmployer = filterDocuments(
      [stale],
      { ...EMPTY_FILTERS, owner: 'employer' },
      (d) => d.code,
      () => true,
      (d) => d.status,
      ownerOf
    )
    expect(byApplicant).toHaveLength(1)
    expect(byEmployer).toHaveLength(0)
  })

  it('the review checklist resolves the same owner it always did', () => {
    const row = buildSubmissionChecklist(
      [stale],
      grContext,
      grTemplate,
      null
    ).rows.find((r) => r.code === 'EMPLOYER_TRADE_REGISTRY')
    expect(row?.ownerType).toBe('applicant')
    expect(row?.ownerType).toBe(ownerOf(stale))
  })

  it('the sponsor linker renders the resolved owner', () => {
    const letter: Document = {
      ...record('SPONSOR_LETTER', 'applicant'),
      id: 'doc-sponsor-letter',
      category: 'sponsor',
    }
    const view = buildSponsorDocuments(
      {
        id: 'sponsor-1',
        fullName: 'A Sponsor',
        relationship: 'other',
        documentIds: ['doc-sponsor-letter'],
      } as never,
      [letter],
      grContext,
      grTemplate
    )
    // Seeded `applicant`, declared `sponsor` by the pack — the pack wins.
    expect(view.linked[0]?.ownerType).toBe('sponsor')
  })
})

describe('owner semantics — the Finance coupling, pinned as it stands', () => {
  /**
   * `financeDocGroup` reads `ownerType === 'employer'` as "employer-funded
   * evidence". `ownerType` means *whose situation the document describes*, and
   * those are different claims — a self-employed applicant's own tax plate is
   * not an employer-funded trip. That coupling predates this routing and is
   * deliberately unchanged here.
   *
   * These assertions exist so it cannot move by accident: the slice that makes
   * ownership profile-dependent must decide the Finance placement explicitly,
   * and will see these fail if it does not.
   */
  it('membership follows the resolved owner, not the stored one', () => {
    // `financeDocGroup` returning null is the one consumer that hides a
    // document outright, and for an `employment`-category row only the owner
    // decides. So a record seeded with the wrong subject used to be dropped
    // from the Finance workspace entirely; the pack's answer now decides.
    const employedCtx = ctxFor(applicationFor('GR', 'employed'))
    const stale = record('EMPLOYER_SIGNATURE_CIRCULAR', 'applicant')

    expect(
      buildFinanceDocuments([stale], employedCtx, grTemplate).rows.find(
        (r) => r.code === 'EMPLOYER_SIGNATURE_CIRCULAR'
      )?.group
    ).toBe('employer')
    expect(
      resolveDocumentSemantics(stale, grTemplate, employedCtx).ownerType
    ).toBe('employer')
  })

  it('an employer-subject requirement still lands in the employer group', () => {
    const view = buildFinanceDocuments(
      [],
      ctxFor(applicationFor('DE', 'self_employed')),
      compositionFor('DE').template
    )
    const plate = view.rows.find((r) => r.code === 'EMPLOYER_TAX_PLATE')
    expect(plate?.group).toBe('employer')
  })
})

describe('owner semantics — no production module reads a stored ownerType', () => {
  const SOURCES: Record<string, string> = import.meta.glob(
    '/src/**/*.{ts,tsx}',
    { query: '?raw', import: 'default', eager: true }
  )

  /**
   * The resolver owns the persisted/derived choice; `template-sync` writes the
   * seed-time snapshot; `document-freshness` carries the field on a row nothing
   * renders, and says so in place. Everything else must go through the resolver.
   */
  const ALLOWED = new Set([
    '/src/features/documents/document-semantics.ts',
    '/src/features/documents/template-sync.ts',
    '/src/features/timeline/document-freshness.ts',
    // The `ownerOf` parameter's default. This primitive stays domain-free — it
    // cannot resolve a template it is not given — and the default is ADR-049's
    // own fallback, which is also what an unresolvable code gets. Every
    // production caller passes the resolver.
    '/src/features/documents/document-filters.ts',
  ])

  const isTest = (path: string) => path.startsWith('/src/tests/')
  const isPack = (path: string) => path.startsWith('/src/config/')
  const isPlayground = (path: string) => path.includes('PlaygroundPage')

  /** Read the code, not the prose — several files discuss this in comments. */
  const code = (contents: string) =>
    contents.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

  it('scans a realistic number of production files', () => {
    const scanned = Object.keys(SOURCES).filter((p) => !isTest(p))
    expect(scanned.length).toBeGreaterThan(50)
  })

  it('only the resolver and the seed path touch a record ownerType', () => {
    // `doc.ownerType` / `d.ownerType` / `document.ownerType` — a read off a
    // stored record, as opposed to `req.ownerType`, which is the template's own
    // value and is already current by construction.
    const RECORD_READ = /\b(?:doc|d|document|record|instance)\.ownerType\b/
    const offenders = Object.entries(SOURCES)
      .filter(
        ([path]) =>
          !isTest(path) &&
          !isPack(path) &&
          !isPlayground(path) &&
          !ALLOWED.has(path)
      )
      .filter(([, contents]) => RECORD_READ.test(code(contents)))
      .map(([path]) => path)

    expect(offenders).toEqual([])
  })
})
