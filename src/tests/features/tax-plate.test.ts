import { describe, it, expect } from 'vitest'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { EmploymentStatus } from '@/domain/types/common'
import { applicableRequirements } from '@/features/documents/template-sync'
import { resolveDocumentSemantics } from '@/features/documents/document-semantics'
import { buildFinanceDocuments } from '@/features/finance/finance-documents'
import { buildEmploymentDocuments } from '@/features/employment/employment-documents'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import {
  PRODUCTION_COMPOSITIONS,
  compositionFor,
} from '@/tests/support/production-compositions'
import tr from '@/i18n/locales/tr/visa-domain.json'
import en from '@/i18n/locales/en/visa-domain.json'
import { ctxFor } from '@/tests/support/applicability'

/**
 * `EMPLOYER_TAX_PLATE`, and the three things wrong with it at once.
 *
 * Section 4(c) of the German mission's checklist files the tax plate under
 * *"Firma sahipleri / Serbest meslek sahipleri"* — company owners and
 * independent professionals. The row reached every `self_employed` applicant, a
 * farmer included; it declared `ownerType: 'employer'` over a population that is
 * entirely the applicant's own business; and it was rendered to that applicant
 * as *"İşveren Vergi Levhası" / "Employer Tax Registration"*, an employer's
 * document for people who have no employer.
 *
 * Germany-only throughout: Greece does not compose `de-tr-mission`.
 */

const CODE = 'EMPLOYER_TAX_PLATE'
const template = compositionFor('DE').template

function ctx(employmentStatus: EmploymentStatus, occupationCode?: string) {
  return ctxFor({
    destinationCountry: 'DE',
    visaType: 'short_stay_tourism',
    employment: {
      employmentStatus,
      ...(occupationCode ? { occupationCode } : {}),
    },
  } as unknown as Application)
}

const applies = (status: EmploymentStatus, occupation?: string) =>
  applicableRequirements(template, ctx(status, occupation)).some(
    (r) => r.code === CODE
  )

function seeded(): Document {
  return {
    id: 'doc-plate',
    code: CODE,
    category: 'employment',
    // The snapshot every existing German dossier carries, and the one this
    // correction must be read through rather than rewrite.
    ownerType: 'employer',
    ownerId: 'applicant-1',
    required: true,
    status: 'not_started',
    verified: false,
  }
}

const ownerFor = (status: EmploymentStatus, occupation?: string) =>
  resolveDocumentSemantics(seeded(), template, ctx(status, occupation))
    .ownerType

describe('tax plate — the classified population is the one §4(c) names', () => {
  it.each([
    ['self_employed', 'company_owner', true],
    ['self_employed', 'independent_professional', true],
    ['self_employed', 'farmer', false],
    ['employed', 'employee', false],
    ['employed', 'public_servant', false],
  ] as const)('%s + %s → applies: %s', (status, occupation, expected) => {
    expect(applies(status, occupation)).toBe(expected)
  })

  it('names exactly those two, and nobody else', () => {
    const req = template.documentRequirements.find((r) => r.code === CODE)
    expect(req?.conditionalOn).toEqual({
      field: 'employment.occupation',
      operator: 'oneOf',
      values: ['company_owner', 'independent_professional'],
    })
  })

  it('is purely subtractive — the corrected set is inside the old one', () => {
    // Nobody gains the row. A farmer stops being asked; that is the change.
    for (const occupation of ['company_owner', 'independent_professional']) {
      expect(applies('self_employed', occupation)).toBe(true)
    }
    for (const status of ['employed', 'retired', 'student'] as const) {
      expect(applies(status), status).toBe(false)
    }
  })
})

describe('tax plate — the prior contract is evaluated, not assumed', () => {
  it.each([
    ['self_employed', undefined],
    ['self_employed', 'crypto_farmer_2031'], // unknown to this build
    ['self_employed', 'employee'], // known, but illegal for self_employed
  ] as const)(
    'self-employed + %s / %s keeps the row while unclassified',
    (status, occupation) => {
      expect(applies(status, occupation)).toBe(true)
      expect(ownerFor(status, occupation)).toBe('applicant')
    }
  )

  it.each([
    ['employed', undefined],
    ['employed', 'crypto_farmer_2031'],
    ['employed', 'farmer'],
  ] as const)('employed + %s / %s gains nothing', (status, occupation) => {
    expect(applies(status, occupation)).toBe(false)
  })

  it('records the coarse condition the row actually carried', () => {
    const req = template.documentRequirements.find((r) => r.code === CODE)
    expect(req?.applicabilityMigration?.priorCondition).toEqual({
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    })
  })
})

describe('tax plate — one subject, declared statically', () => {
  /**
   * Every occupation §4(c) names has the same subject, and so does the whole
   * coarse population the fallback preserves — a farmer's tax plate is equally
   * their own. There is no cell where the subject differs, so the row declares
   * `applicant` rather than a per-occupation map.
   */
  it('resolves to the applicant for every state the row reaches', () => {
    for (const [status, occupation] of [
      ['self_employed', 'company_owner'],
      ['self_employed', 'independent_professional'],
      ['self_employed', undefined],
      ['self_employed', 'crypto_farmer_2031'],
    ] as const) {
      expect(ownerFor(status, occupation), `${status}/${occupation}`).toBe(
        'applicant'
      )
    }
  })

  it('declares no per-occupation map, because nothing asks for one', () => {
    const req = template.documentRequirements.find((r) => r.code === CODE)
    expect(req?.ownerType).toBe('applicant')
    expect(req?.ownerByOccupation).toBeUndefined()
  })

  it('reads a stored employer snapshot without rewriting it', () => {
    const record = seeded()
    const before = JSON.stringify(record)
    expect(
      resolveDocumentSemantics(
        record,
        template,
        ctx('self_employed', 'company_owner')
      ).ownerType
    ).toBe('applicant')
    expect(JSON.stringify(record)).toBe(before)
  })
})

describe('tax plate — what stayed put', () => {
  const req = template.documentRequirements.find((r) => r.code === CODE)

  it('requiredness, and the global obligation with it', () => {
    expect(req?.required).toBe(true)
    expect(
      requiredRequirementCodes(template, ctx('self_employed', 'company_owner'))
    ).toContain(CODE)
  })

  it('the acceptance contract — no stored claim is superseded', () => {
    // The rendered name changed and the revision did not: a self-employed
    // applicant's own company tax plate satisfied the old name-and-description
    // pair and satisfies the new one, so the correction excludes no previously
    // accepted evidence (ADR-051a).
    expect(req?.revision).toBe(1)
    expect(req?.contractKey).toBe('EMPLOYER_TAX_PLATE@1')
  })

  it('the identity — one code, not a renamed second one', () => {
    const plates = template.documentRequirements.filter((r) =>
      r.code.includes('TAX_PLATE')
    )
    expect(plates.map((r) => r.code)).toEqual([CODE])
  })

  it('the citation, which already carried a verified source', () => {
    expect(req?.sourceRefs).toEqual(['de-tr-tourism-checklist'])
  })

  it('and the workspace its category names', () => {
    const employment = buildEmploymentDocuments(
      [],
      ctx('self_employed', 'company_owner'),
      template
    )
    expect(employment.rows.map((r) => r.code)).toContain(CODE)
  })
})

describe('tax plate — Greece is untouched', () => {
  it('does not compose the layer that owns it', () => {
    expect(
      compositionFor('GR').template.documentRequirements.map((r) => r.code)
    ).not.toContain(CODE)
  })

  it('and its own corrected row is unaffected by this one', () => {
    const circular = compositionFor('GR').template.documentRequirements.find(
      (r) => r.code === 'EMPLOYER_SIGNATURE_CIRCULAR'
    )
    expect(circular?.ownerType).toBe('employer')
    expect(circular?.conditionalOn).toEqual({
      field: 'employment.occupation',
      operator: 'oneOf',
      values: ['employee', 'company_owner', 'independent_professional'],
    })
  })
})

describe('tax plate — Finance stays out of it', () => {
  it.each([
    ['self_employed', 'company_owner'],
    ['self_employed', 'independent_professional'],
    ['self_employed', undefined],
  ] as const)(
    '%s + %s: not financial evidence, and no employer group',
    (status, occupation) => {
      const view = buildFinanceDocuments(
        [seeded()],
        ctx(status, occupation),
        template
      )
      expect(view.rows.some((r) => r.code === CODE)).toBe(false)
      expect(view.groups.some((g) => g.id === 'employer')).toBe(false)
      expect(view.gather.some((g) => g.id === 'employer')).toBe(false)
    }
  )
})

describe('tax plate — the name no longer says employer', () => {
  /**
   * The rendered name was *"İşveren Vergi Levhası" / "Employer Tax
   * Registration"* over a population that has no employer. The description
   * already said whose it was — *"Şirkete ait güncel vergi levhası"* — so a
   * self-employed applicant's own company tax plate satisfied the old pair and
   * satisfies the new one. That is a clarification excluding no previously
   * accepted evidence, which is why no revision moved; the same shape as
   * `EMPLOYER_TRADE_REGISTRY` becoming *Company Registration* in ADR-048.
   *
   * The `EMPLOYER_` code prefix stays. Renaming a code means retire plus a new
   * identity under ADR-049, and ADR-052a already reports these prefixes as
   * tolerated debt rather than renaming them.
   */
  const names = {
    tr: tr.requirements.EMPLOYER_TAX_PLATE,
    en: en.requirements.EMPLOYER_TAX_PLATE,
  }

  it('renders the document, not a party', () => {
    expect(names.tr.name).toBe('Vergi Levhası')
    expect(names.en.name).toBe('Tax Registration Certificate')
  })

  it('and the description still says whose company it is', () => {
    expect(names.tr.description).toContain('Şirkete ait')
    expect(names.en.description).toContain('Company')
  })

  it('no statically applicant-owned requirement names an employer', () => {
    /**
     * The family invariant this correction earns. A row whose declared subject
     * is the applicant, with no per-occupation map to complicate it, must not
     * tell that applicant to fetch an employer's document.
     *
     * `EMPLOYER_SIGNATURE_CIRCULAR` is deliberately outside it: its declared
     * subject is `employer` — correct for an employee and for anyone
     * unclassified — while two occupations map to `applicant`. Its rendered
     * name is still *İşveren İmza Sirküleri*, which is a known open item left
     * by H4c2d2i rather than something this invariant can speak to.
     */
    /**
     * Naming the **issuer** is legitimate and is not what this catches.
     * `EMPLOYMENT_LETTER` is *İşveren yazısı* — a letter the employer writes
     * about the applicant's own employment — and ADR-049a draws exactly that
     * line: a chamber of agriculture issues the farmer's certificate and does
     * not own it. The tax plate was the other thing: issued by the tax office,
     * about the applicant's own business, and still attributed to an employer.
     */
    const NAMES_ITS_ISSUER = new Set(['EMPLOYMENT_LETTER'])

    const offenders = new Set<string>()
    for (const entry of PRODUCTION_COMPOSITIONS) {
      for (const req of entry.composition.template.documentRequirements) {
        if (req.ownerType !== 'applicant' || req.ownerByOccupation) continue
        if (NAMES_ITS_ISSUER.has(req.code)) continue
        const code = req.code as keyof typeof tr.requirements
        const trName = tr.requirements[code]?.name ?? ''
        const enName = en.requirements[code]?.name ?? ''
        if (/İşveren/.test(trName) || /Employer/.test(enName)) {
          offenders.add(`${req.code}: ${trName} / ${enName}`)
        }
      }
    }
    expect([...offenders]).toEqual([])
  })
})
