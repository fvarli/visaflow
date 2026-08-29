import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import { resolveVisaTemplate } from '@/config/countries'
import {
  resolveDocumentSemantics,
  countsTowardReadiness,
} from '@/features/documents/document-semantics'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { classifyDoc } from '@/features/documents/documents-model'
import { documentLabel } from '@/lib/document-label'
import { importPartial } from '@/features/import-export/services/import.service'
import type { Document } from '@/domain/schemas/document.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { EmploymentStatus } from '@/domain/types/common'

/**
 * What a dossier written before ADR-048 does under the current build.
 *
 * These are the four failures that commit caused, each reproduced against a
 * record shaped exactly as the old build would have written it — no template
 * copy updated since, because nothing has ever updated one (ADR-049).
 */

const template = resolveVisaTemplate('GR', 'short_stay_tourism')
if (!template) throw new Error('Greece tourism template is not registered')

function application(employmentStatus: EmploymentStatus): Application {
  return {
    destinationCountry: 'GR',
    visaType: 'short_stay_tourism',
    employment: { employmentStatus },
  } as unknown as Application
}

/** A record as the pre-ADR-048 build would have persisted it. */
function legacyDoc(code: string, over: Partial<Document> = {}): Document {
  return {
    id: `legacy-${code}`,
    code,
    category: 'financial',
    ownerType: 'applicant',
    ownerId: 'applicant-1',
    required: true,
    status: 'ready',
    verified: false,
    ...over,
  }
}

describe('a retired code keeps its own identity', () => {
  const taxReturns = legacyDoc('TAX_RETURNS', {
    notes: 'Filed 2025 return, stamped copy',
    receivedAt: '2026-02-01',
  })

  it('still labels as the document the applicant actually filed', async () => {
    // The headline regression. `Document.name` is not written, so the label
    // comes from the code — and ADR-048 pointed that code's translation at a
    // different document, silently relabelling every existing record.
    for (const locale of ['en', 'tr'] as const) {
      await i18n.changeLanguage(locale)
      const label = documentLabel(i18n.t, taxReturns.code, taxReturns.name)
      expect(label).not.toMatch(/Payment|Ödeme/i)
    }
    await i18n.changeLanguage('en')
    expect(documentLabel(i18n.t, 'TAX_RETURNS')).toBe('Tax Returns')
    await i18n.changeLanguage('tr')
  })

  it('does not satisfy the requirement that replaced it', () => {
    const codes = requiredRequirementCodes(
      template,
      application('self_employed')
    )
    // The replacement is owed in full; the old record cannot stand in for it.
    expect(codes).toContain('TAX_PAYMENT_STATEMENT')
    expect(codes).not.toContain('TAX_RETURNS')

    const readiness = buildDocumentReadiness({
      documents: [taxReturns],
      requiredRequirementCodes: codes,
      template,
      application: application('self_employed'),
    })
    expect(readiness.notStarted).toBeGreaterThan(0)
  })

  it('falls back to its persisted metadata rather than the replacement', () => {
    // The load-bearing half of read-time derivation: an unknown code must
    // describe itself, or the fix would re-create the bug it removes.
    const semantics = resolveDocumentSemantics(
      taxReturns,
      template,
      application('self_employed')
    )
    expect(semantics.membership).toBe('retired')
    expect(semantics.requirement).toBeUndefined()
    expect(semantics.required).toBe(taxReturns.required)
  })

  it('keeps every byte of user state', () => {
    const parsed = importPartial(JSON.stringify({ documents: [taxReturns] }))
    expect(parsed.data?.documents?.[0]).toEqual(taxReturns)
  })
})

describe('template-owned metadata is re-derived, not frozen', () => {
  // Persisted exactly as the old build wrote it: SGK was optional then.
  const staleSgk = legacyDoc('SOCIAL_SECURITY', {
    category: 'employment',
    required: false,
    status: 'not_started',
  })

  it('treats a stale optional flag as required today', () => {
    const semantics = resolveDocumentSemantics(
      staleSgk,
      template,
      application('employed')
    )
    expect({
      membership: semantics.membership,
      required: semantics.required,
    }).toEqual({ membership: 'active', required: true })
  })

  it('makes readiness, the badge and Review agree at once', () => {
    // Before ADR-049 these disagreed: `classifyDoc` read the template while
    // readiness read the frozen copy, so one document could be badged required
    // and counted optional in the same view.
    const readiness = buildDocumentReadiness({
      documents: [staleSgk],
      requiredRequirementCodes: requiredRequirementCodes(
        template,
        application('employed')
      ),
      template,
      application: application('employed'),
    })
    expect({
      badge: classifyDoc(staleSgk, template),
      countsAsWork: countsTowardReadiness(
        staleSgk,
        template,
        application('employed')
      ),
      outstanding: readiness.outstanding > 0,
    }).toEqual({ badge: 'conditional', countsAsWork: true, outstanding: true })
  })

  it('never writes the correction back into the record', () => {
    const before = JSON.stringify(staleSgk)
    resolveDocumentSemantics(staleSgk, template, application('employed'))
    // User data is not ours to rewrite; the snapshot stays as the export format
    // and the historical fallback.
    expect(JSON.stringify(staleSgk)).toBe(before)
    expect(staleSgk.required).toBe(false)
  })
})

describe('an applicability change strands a record without losing it', () => {
  // Seeded when the requirement was keyed to `employed`; it is now keyed to
  // `self_employed` (ADR-048).
  const stranded = legacyDoc('EMPLOYER_TRADE_REGISTRY', {
    category: 'employment',
    required: true,
    status: 'ready',
    notes: 'Collected from the chamber in March',
  })

  it('stops counting as work while it does not apply', () => {
    const employed = application('employed')
    expect(
      resolveDocumentSemantics(stranded, template, employed).isApplicable
    ).toBe(false)
    expect(countsTowardReadiness(stranded, template, employed)).toBe(false)
  })

  it('counts again if the applicant becomes self-employed', () => {
    const selfEmployed = application('self_employed')
    expect(
      resolveDocumentSemantics(stranded, template, selfEmployed).isApplicable
    ).toBe(true)
  })

  it('is never deleted, and never duplicated when it returns', () => {
    const selfEmployed = application('self_employed')
    const codes = requiredRequirementCodes(template, selfEmployed)
    const readiness = buildDocumentReadiness({
      documents: [stranded],
      requiredRequirementCodes: codes,
      template,
      application: selfEmployed,
    })
    // The template marks this requirement optional, so once it applies again
    // the record is counted as optional work rather than outstanding — and
    // exactly once, because it satisfies its own code and the template-side
    // backstop must not add a second entry for it.
    expect({
      countedOnce: readiness.optional,
      // The backstop adds a `notStarted` for any required code without a
      // record. This one is optional, so it must not appear there at all —
      // that is what would double-count the record it already has.
      alsoOwedAsMissing: codes.includes('EMPLOYER_TRADE_REGISTRY'),
    }).toEqual({ countedOnce: 1, alsoOwedAsMissing: false })
    expect(stranded.notes).toBe('Collected from the chamber in March')
  })
})

/**
 * Historical visibility is not current requirement satisfaction (ADR-050).
 *
 * These pin the distinction that `9eb151b` failed to make. A retired record
 * carries `required: true` in storage forever, and readiness used to believe
 * it: a withdrawn obligation the applicant had once collected counted as
 * satisfied work and pushed the percentage *up*, while an uncollected one made
 * 100% unreachable. The record must stay visible and untouched, and contribute
 * nothing.
 */
describe('retired records are visible history, never current work', () => {
  const employed = application('employed')

  /** A dossier written before template 1.2.0 retired these three codes. */
  const preRetirement: Document[] = [
    legacyDoc('TAX_RETURNS', {
      status: 'ready',
      notes: 'Filed 2025 return, stamped copy',
      receivedAt: '2026-02-01',
      fileReference: 'drive://tax-2025.pdf',
    }),
    legacyDoc('PENSION_STATEMENT', {
      status: 'ready',
      notes: 'Three months of statements',
      issuedAt: '2026-01-15',
      fileReference: 'drive://pension.pdf',
    }),
    legacyDoc('BUSINESS_LICENSE', {
      status: 'ready',
      category: 'employment',
      notes: 'Chamber copy',
      receivedAt: '2026-01-20',
      fileReference: 'drive://licence.pdf',
    }),
  ]

  const live: Document[] = [
    legacyDoc('PASSPORT_CURRENT', { category: 'passport', status: 'ready' }),
    legacyDoc('TRAVEL_INSURANCE', { category: 'insurance', status: 'ready' }),
    legacyDoc('ACCOMMODATION', {
      category: 'accommodation',
      status: 'not_started',
    }),
  ]

  const readinessOf = (documents: Document[]) =>
    buildDocumentReadiness({
      documents,
      requiredRequirementCodes: requiredRequirementCodes(template, employed),
      template,
      application: employed,
    })

  it('classifies all three as retired, never as custom', () => {
    for (const doc of preRetirement) {
      expect({
        code: doc.code,
        membership: resolveDocumentSemantics(doc, template, employed)
          .membership,
        kind: classifyDoc(doc, template),
      }).toEqual({ code: doc.code, membership: 'retired', kind: 'retired' })
    }
  })

  it('keeps their historical labels, not their replacements', async () => {
    await i18n.changeLanguage('en')
    const labels = preRetirement.map((d) => documentLabel(i18n.t, d.code))
    await i18n.changeLanguage('tr')
    expect(labels).toEqual([
      'Tax Returns',
      'Pension Statement',
      'Business License',
    ])
  })

  it('leaves every replacement unsatisfied', () => {
    const selfEmployed = application('self_employed')
    const codes = requiredRequirementCodes(template, selfEmployed)
    const readiness = buildDocumentReadiness({
      documents: preRetirement,
      requiredRequirementCodes: codes,
      template,
      application: selfEmployed,
    })
    for (const replacement of [
      'TAX_PAYMENT_STATEMENT',
      'COMPANY_ACTIVITY_CERTIFICATE',
    ]) {
      expect(codes).toContain(replacement)
    }
    // Every applicable required code is unstarted: no retired record stood in.
    expect(readiness.notStarted).toBe(codes.length)
    expect(readiness.ready).toBe(0)
  })

  it('counts as historical and nothing else', () => {
    const withHistory = readinessOf([...live, ...preRetirement])
    expect(withHistory.historical).toBe(3)
  })

  it('changes no current-readiness figure at all', () => {
    // The whole contract in one assertion: adding three retired records to a
    // dossier must be arithmetically invisible.
    const before = readinessOf(live)
    const after = readinessOf([...live, ...preRetirement])

    const currentWork = (r: typeof before) => ({
      applicable: r.applicable,
      ready: r.ready,
      obtained: r.obtained,
      inProgress: r.inProgress,
      notStarted: r.notStarted,
      needsUpdate: r.needsUpdate,
      optional: r.optional,
      outstanding: r.outstanding,
      percent: r.percent,
      complete: r.complete,
      requiredTotal: r.requiredTotal,
    })

    expect(currentWork(after)).toEqual(currentWork(before))
    expect({ before: before.historical, after: after.historical }).toEqual({
      before: 0,
      after: 3,
    })
  })

  it('preserves user-owned state byte for byte', () => {
    const parsed = importPartial(JSON.stringify({ documents: preRetirement }))
    expect(parsed.data?.documents).toEqual(preRetirement)
  })
})

describe('an unrecognised code is not retired, and not current work', () => {
  const employed = application('employed')

  /** No template entry, no retirement entry, no CUSTOM- prefix. */
  const foreign = legacyDoc('LEGACY_FOREIGN_REQUIREMENT', {
    required: true,
    status: 'ready',
    notes: 'Written by a build this one does not know',
  })

  const live = [
    legacyDoc('PASSPORT_CURRENT', { category: 'passport', status: 'ready' }),
  ]

  const readinessOf = (documents: Document[]) =>
    buildDocumentReadiness({
      documents,
      requiredRequirementCodes: requiredRequirementCodes(template, employed),
      template,
      application: employed,
    })

  it('is classified unknown, not retired', () => {
    // Retirement is decided by the registry, never by absence from the
    // template — otherwise every foreign code would claim a history it has not
    // got.
    expect(
      resolveDocumentSemantics(foreign, template, employed).membership
    ).toBe('unknown')
  })

  it('changes every readiness figure by exactly zero', () => {
    const before = readinessOf(live)
    const after = readinessOf([...live, foreign])
    expect(after).toEqual(before)
  })

  it('is not counted as historical', () => {
    expect(readinessOf([...live, foreign]).historical).toBe(0)
  })

  it('still round-trips and stays visible', () => {
    const parsed = importPartial(JSON.stringify({ documents: [foreign] }))
    expect(parsed.data?.documents?.[0]).toEqual(foreign)
  })
})

describe('a custom document is never an authoritative requirement', () => {
  it('counts as optional even when an import claims it is required', () => {
    // `DocumentSchema.required` defaults to `true`, so a hand-edited file that
    // simply omits the field yields a required custom document. It must not
    // reach the denominator on that basis.
    const parsed = importPartial(
      JSON.stringify({
        documents: [
          {
            id: 'imported-custom',
            code: 'CUSTOM-abc',
            name: 'Extra supporting letter',
            category: 'supporting',
            ownerType: 'applicant',
            ownerId: 'applicant-1',
            status: 'ready',
          },
        ],
      })
    )
    const imported = parsed.data?.documents?.[0]
    expect(imported?.required).toBe(true)

    const employed = application('employed')
    const readiness = buildDocumentReadiness({
      documents: [imported!],
      requiredRequirementCodes: [],
      template,
      application: employed,
    })
    expect({
      optional: readiness.optional,
      applicable: readiness.applicable,
      ready: readiness.ready,
      historical: readiness.historical,
    }).toEqual({ optional: 1, applicable: 0, ready: 0, historical: 0 })
    expect(classifyDoc(imported!, template)).toBe('custom')
  })
})
