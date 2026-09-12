import { describe, it, expect } from 'vitest'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { DocumentRequirement, VisaTypeTemplate } from '@/config/types'
import type { EmploymentStatus } from '@/domain/types/common'
import { KNOWN_OCCUPATION_CODES, OwnerTypeSchema } from '@/domain/types/common'
import { resolveDocumentSemantics } from '@/features/documents/document-semantics'
import { financeDocGroup } from '@/features/finance/finance-documents'
import { ctxFor } from '@/tests/support/applicability'
import { PRODUCTION_COMPOSITIONS } from '@/tests/support/production-compositions'
import { composeVisaTemplate } from '@/config/composition'
import type { CompositionError } from '@/config/composition'
import { testCommonLayer } from '@/tests/fixtures/test-packs'

/**
 * A requirement may say whose situation its evidence describes *per occupation*,
 * and nothing in production says it yet.
 *
 * The case this exists for: the Greek visa centre asks an employee, a company
 * owner and a freelancer for the same `İmza Sirküleri` — the employer's company
 * for the first, the applicant's own for the other two. ADR-049a settles that
 * the subject is not identity, so that is one code with two subjects rather than
 * two codes.
 *
 * Built here, used nowhere. The migration that uses it is its own slice.
 */

const CIRCULAR: DocumentRequirement = {
  code: 'SYNTHETIC_COMPANY_CIRCULAR',
  nameKey: 'visa-domain:requirements.SYNTHETIC_COMPANY_CIRCULAR.name',
  category: 'employment',
  ownerType: 'employer',
  ownerByOccupation: {
    employee: 'employer',
    company_owner: 'applicant',
    independent_professional: 'applicant',
  },
  required: false,
  revision: 1,
}

/**
 * A map that names only the occupations it changes, and whose values never
 * include the declared default.
 *
 * `CIRCULAR` above maps `employee` back to `employer`, which is honest about
 * the source but hides one class of mistake: a fallback that reached for the
 * first entry instead of the declared owner would return `employer` there and
 * look correct. This fixture makes that mistake visible, and it is also the
 * shape a real pack would author — a map states the exceptions.
 */
const SPARSE: DocumentRequirement = {
  ...CIRCULAR,
  code: 'SYNTHETIC_SPARSE_MAP',
  ownerByOccupation: {
    company_owner: 'applicant',
    independent_professional: 'applicant',
  },
}

const sparseTemplate = {
  countryCode: 'XX',
  visaType: 'short_stay_tourism',
  templateVersion: '1.0.0',
  documentRequirements: [SPARSE],
  preparationMilestones: [],
} as unknown as VisaTypeTemplate

const sparseOwnerFor = (status: EmploymentStatus, occupation?: string) =>
  resolveDocumentSemantics(
    { ...record(), code: SPARSE.code },
    sparseTemplate,
    ctx(status, occupation)
  ).ownerType

const TEST_BASE = {
  countryCode: 'XX',
  visaType: 'short_stay_tourism',
  templateVersion: '1.0.0',
  preparationMilestones: [],
  reviewStatus: 'unverified',
} as never

const template = {
  countryCode: 'XX',
  visaType: 'short_stay_tourism',
  templateVersion: '1.0.0',
  documentRequirements: [CIRCULAR],
  preparationMilestones: [],
} as unknown as VisaTypeTemplate

function record(code = CIRCULAR.code): Document {
  return {
    id: 'doc-1',
    code,
    category: 'employment',
    ownerType: 'employer',
    ownerId: 'applicant-1',
    required: false,
    status: 'not_started',
    verified: false,
  }
}

/**
 * Built through the production context builder, never as a literal — that is
 * what makes the stale and unknown rows below mean anything. The builder is
 * where a raw code is checked against this build's vocabulary and against the
 * recorded status; handing the resolver a hand-made context would test the
 * assertion instead of the rule.
 */
function ctx(employmentStatus: EmploymentStatus, occupationCode?: string) {
  return ctxFor({
    destinationCountry: 'XX',
    visaType: 'short_stay_tourism',
    employment: {
      employmentStatus,
      ...(occupationCode ? { occupationCode } : {}),
    },
  } as unknown as Application)
}

const ownerFor = (status: EmploymentStatus, occupation?: string) =>
  resolveDocumentSemantics(record(), template, ctx(status, occupation))
    .ownerType

describe('contextual owner — the effective subject, per occupation', () => {
  it('employed + employee → the employer, as mapped', () => {
    expect(ownerFor('employed', 'employee')).toBe('employer')
  })

  it('self-employed + company owner → the applicant', () => {
    expect(ownerFor('self_employed', 'company_owner')).toBe('applicant')
  })

  it('self-employed + independent professional → the applicant', () => {
    expect(ownerFor('self_employed', 'independent_professional')).toBe(
      'applicant'
    )
  })

  it('an occupation the map does not name falls to the declared owner', () => {
    expect(ownerFor('employed', 'public_servant')).toBe('employer')
    expect(ownerFor('self_employed', 'farmer')).toBe('employer')
  })

  it('no occupation at all falls to the declared owner', () => {
    expect(ownerFor('employed')).toBe('employer')
    expect(ownerFor('retired')).toBe('employer')
  })

  it('the fallback is the declared owner, not the first entry in the map', () => {
    // With a sparse map the two differ: every value is `applicant`, the
    // declared owner is `employer`. A fallback that reached into the map would
    // hand an unclassified applicant somebody else's document.
    expect(Object.values(SPARSE.ownerByOccupation ?? {})).not.toContain(
      SPARSE.ownerType
    )
    expect(sparseOwnerFor('employed')).toBe('employer')
    expect(sparseOwnerFor('self_employed')).toBe('employer')
    expect(sparseOwnerFor('employed', 'public_servant')).toBe('employer')
    expect(sparseOwnerFor('self_employed', 'unknown_future_code')).toBe(
      'employer'
    )
    // ...and the mapped occupations still resolve.
    expect(sparseOwnerFor('self_employed', 'company_owner')).toBe('applicant')
  })
})

describe('contextual owner — the raw persisted code is never consulted', () => {
  /**
   * Three different causes, one answer. The context carries an occupation only
   * when it is known to this build *and* legal for the recorded status, so a
   * code from a newer version and a code left behind by a status change are
   * already indistinguishable from absence by the time the rule runs. If the
   * rule ever read the raw string these three would diverge.
   */
  it('a code this build does not know resolves to the declared owner', () => {
    expect(ownerFor('self_employed', 'crypto_farmer_2031')).toBe('employer')
  })

  it('a known code that is illegal for the status resolves to the declared owner', () => {
    // `farmer` is self-employed-only; recorded under `employed` it is stale.
    expect(ownerFor('employed', 'farmer')).toBe('employer')
    // ...and the mirror: `employee` is employed-only.
    expect(ownerFor('self_employed', 'employee')).toBe('employer')
  })

  it('the stale case is not quietly mapped by the code it names', () => {
    // `company_owner` under `employed` is illegal, so it must NOT pick up the
    // `applicant` mapping its own name would otherwise match.
    expect(ownerFor('employed', 'company_owner')).toBe('employer')
  })
})

describe('contextual owner — an unresolvable code still describes itself', () => {
  const context = ctx('self_employed', 'company_owner')

  it('an unknown code keeps its persisted snapshot', () => {
    const doc = record('NOT_IN_ANY_TEMPLATE')
    const semantics = resolveDocumentSemantics(doc, template, context)
    expect(semantics.membership).toBe('unknown')
    expect(semantics.ownerType).toBe('employer')
  })

  it('a retired code keeps its persisted snapshot', () => {
    const doc = record('TAX_RETURNS')
    const semantics = resolveDocumentSemantics(doc, template, context)
    expect(semantics.membership).toBe('retired')
    expect(semantics.ownerType).toBe('employer')
  })

  it('no record is mutated by resolving it', () => {
    const doc = record()
    const before = JSON.stringify(doc)
    resolveDocumentSemantics(doc, template, context)
    expect(JSON.stringify(doc)).toBe(before)
  })

  it('without a context the declared owner stands', () => {
    expect(resolveDocumentSemantics(record(), template).ownerType).toBe(
      'employer'
    )
  })
})

describe('contextual owner — Finance cannot notice', () => {
  /**
   * The firewall ADR-049a decision 6 asks for, held by construction rather than
   * by convention: `financeDocGroup` takes a code and a category, so there is no
   * argument through which a subject could reach it.
   */
  it('the subject changes and the finance answer does not', () => {
    const asEmployee = ownerFor('employed', 'employee')
    const asOwner = ownerFor('self_employed', 'company_owner')
    expect(asEmployee).not.toBe(asOwner)

    expect(financeDocGroup(CIRCULAR.code, CIRCULAR.category)).toBe(
      financeDocGroup(CIRCULAR.code, CIRCULAR.category)
    )
    // And an employment-category company document is not financial evidence at
    // all, under either subject.
    expect(financeDocGroup(CIRCULAR.code, CIRCULAR.category)).toBeNull()
  })

  it('the finance classifier takes no owner argument', () => {
    expect(financeDocGroup.length).toBe(2)
  })
})

describe('contextual owner — exactly one production carrier', () => {
  const carriersIn = (countryCode: string) =>
    (
      PRODUCTION_COMPOSITIONS.find((p) => p.countryCode === countryCode)
        ?.composition.template.documentRequirements ?? []
    )
      .filter((req) => req.ownerByOccupation !== undefined)
      .map((req) => req.code)

  it('Greece carries it on the corrected circular and nothing else', () => {
    expect(carriersIn('GR')).toEqual(['EMPLOYER_SIGNATURE_CIRCULAR'])
  })

  it('Germany carries none — the layer that declares it is Greece-composed', () => {
    expect(carriersIn('DE')).toEqual([])
  })

  it('EMPLOYER_TAX_PLATE takes a static subject, not a map', () => {
    // H4c2d2k corrected it to `applicant` without a per-occupation map: every
    // occupation its source names, and the whole coarse population its
    // migration preserves, has the same subject. Declaring a map there would
    // have been the capability used because it exists.
    const req = PRODUCTION_COMPOSITIONS.find(
      (p) => p.countryCode === 'DE'
    )?.composition.template.documentRequirements.find(
      (r) => r.code === 'EMPLOYER_TAX_PLATE'
    )
    expect(req?.ownerType).toBe('applicant')
    expect(req?.ownerByOccupation).toBeUndefined()
  })

  it('every authored mapping names a known occupation and a real owner', () => {
    // The type system catches a misspelled key in an inline literal. It cannot
    // see a map built dynamically or widened through a `const`, so the invariant
    // walks what actually shipped.
    const known = new Set<string>(KNOWN_OCCUPATION_CODES)
    for (const entry of PRODUCTION_COMPOSITIONS) {
      for (const req of entry.composition.template.documentRequirements) {
        for (const [occupation, owner] of Object.entries(
          req.ownerByOccupation ?? {}
        )) {
          expect(known, `${req.code}/${occupation}`).toContain(occupation)
          expect(OwnerTypeSchema.safeParse(owner).success).toBe(true)
        }
      }
    }
  })
})

describe('contextual owner — one production interpreter', () => {
  const SOURCES: Record<string, string> = import.meta.glob(
    '/src/**/*.{ts,tsx}',
    { query: '?raw', import: 'default', eager: true }
  )

  /** Where the rule is declared, its single wrapper, and the resolver. */
  const ALLOWED = new Set([
    '/src/config/types.ts',
    '/src/features/documents/applicability.ts',
    '/src/features/documents/document-semantics.ts',
  ])

  const isTest = (path: string) => path.startsWith('/src/tests/')
  const code = (contents: string) =>
    contents.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

  it('scans a realistic number of production files', () => {
    expect(
      Object.keys(SOURCES).filter((p) => !isTest(p)).length
    ).toBeGreaterThan(50)
  })

  it('no other module reads the mapping or the rule', () => {
    // A pack may *declare* a mapping — that is authoring, not interpretation —
    // so the country packs are excluded from the read census. Everything else
    // must go through the resolver.
    const isPack = (path: string) => path.startsWith('/src/config/countries/')
    const offenders = Object.entries(SOURCES)
      .filter(([path]) => !isTest(path) && !isPack(path) && !ALLOWED.has(path))
      .filter(([, contents]) =>
        /ownerByOccupation|effectiveOwnerType/.test(code(contents))
      )
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('the finance module does not reach for it', () => {
    const finance = code(
      SOURCES['/src/features/finance/finance-documents.ts'] ?? ''
    )
    expect(finance).not.toMatch(/ownerByOccupation|effectiveOwner/)
  })
})

describe('contextual owner — the owning layer keeps it', () => {
  /**
   * A refinement may append citations and versioned acceptance detail, and
   * nothing else (ADR-052b decision 6, which lists owner beside identity). The
   * composer already refuses any other key, so this needed no widening — only a
   * test, because the guard it depends on is a string set that a future author
   * could extend in one line.
   */
  it('a refinement cannot inject a mapping', () => {
    const widened = {
      code: 'TEST_A',
      ownerByOccupation: { company_owner: 'applicant' },
    } as unknown as { code: string }

    let kind: string | undefined
    try {
      composeVisaTemplate({
        base: TEST_BASE,
        layers: [
          testCommonLayer,
          { id: 'test-jy', kind: 'jurisdiction', refine: [widened] },
        ],
      })
    } catch (error) {
      kind = (error as CompositionError).kind
    }
    expect(kind).toBe('invalid-refinement')
  })

  it("the owner's own mapping survives composition intact", () => {
    // The composer spreads the requirement rather than rebuilding it
    // field-by-field, so a field added to the type is carried without the
    // composer knowing about it. Pinned, because a reconstruction would drop it
    // silently and the capability would look inert for the wrong reason.
    const composed = composeVisaTemplate({
      base: TEST_BASE,
      layers: [
        {
          id: 'test-common',
          kind: 'common',
          add: [{ ...CIRCULAR, code: 'TEST_CTX_OWNER' }],
        },
      ],
    })
    const req = composed.template.documentRequirements.find(
      (r) => r.code === 'TEST_CTX_OWNER'
    )
    expect(req?.ownerByOccupation).toEqual(CIRCULAR.ownerByOccupation)
  })
})
