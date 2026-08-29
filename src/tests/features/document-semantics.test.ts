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
    expect(semantics.isKnown).toBe(false)
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
      isKnown: semantics.isKnown,
      required: semantics.required,
    }).toEqual({ isKnown: true, required: true })
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
