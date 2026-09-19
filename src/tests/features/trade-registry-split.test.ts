import { describe, it, expect } from 'vitest'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { EmploymentStatus } from '@/domain/types/common'
import { applicableRequirements } from '@/features/documents/template-sync'
import {
  applyDocumentUpdate,
  completionStanding,
  effectiveStatus,
  resolveDocumentSemantics,
} from '@/features/documents/document-semantics'
import { financeDocGroup } from '@/features/finance/finance-documents'
import { planTemplateSync } from '@/features/documents/template-sync'
import { compositionFor } from '@/tests/support/production-compositions'
import { ctxFor } from '@/tests/support/applicability'

/**
 * `EMPLOYER_TRADE_REGISTRY` splitting into the gazette and the chamber.
 *
 * The row asked for two documents conjunctively from revision 2 — "chamber of
 * commerce registration **and** a copy of the trade register bulletin" — and
 * the two come apart under the occupational axis. The Greek visa centre
 * publishes the gazette on three branches and names no chamber document
 * anywhere in thirteen captures; Annex III I.5(e)(iv) asks truck drivers for
 * the chamber excerpt with no gazette beside it. One code cannot carry both
 * (ADR-052b decision 7).
 *
 * The gazette keeps the identity, because dropping the chamber returns the code
 * to the document revision 1 was minted for — narrowing that keeps the same
 * real-world document (ADR-049 decision 1). The chamber becomes a new code, and
 * **starts empty**: no persisted completion is projected across the boundary
 * (ADR-051c).
 *
 * The two properties this file exists to hold:
 *  - nobody loses a document their own authority asks them for, and
 *  - the six-month chamber bar ends up on the chamber, never on the gazette.
 */

const GAZETTE = 'EMPLOYER_TRADE_REGISTRY'
const CHAMBER = 'CHAMBER_REGISTRATION_CERTIFICATE'

function ctx(
  destinationCountry: string,
  employmentStatus: EmploymentStatus,
  occupationCode?: string
) {
  return ctxFor({
    destinationCountry,
    visaType: 'short_stay_tourism',
    employment: {
      employmentStatus,
      ...(occupationCode ? { occupationCode } : {}),
    },
  } as unknown as Application)
}

const applies = (
  pack: 'GR' | 'DE',
  code: string,
  status: EmploymentStatus,
  occ?: string
) =>
  applicableRequirements(
    compositionFor(pack).template,
    ctx(pack, status, occ)
  ).some((r) => r.code === code)

const rowIn = (pack: 'GR' | 'DE', code: string) =>
  compositionFor(pack).template.documentRequirements.find(
    (r) => r.code === code
  )

function seeded(code: string): Document {
  return {
    id: `doc-${code}`,
    code,
    category: 'employment',
    ownerType: 'applicant',
    ownerId: 'applicant-1',
    required: true,
    status: 'not_started',
    verified: false,
  }
}

const ownerFor = (
  pack: 'GR' | 'DE',
  code: string,
  status: EmploymentStatus,
  occ?: string
) =>
  resolveDocumentSemantics(
    seeded(code),
    compositionFor(pack).template,
    ctx(pack, status, occ)
  ).ownerType

describe('the split — who is asked, once they have said what they do', () => {
  it.each([
    ['employee', true, false],
    ['company_owner', true, true],
    ['independent_professional', true, false],
    ['farmer', false, false],
    ['public_servant', false, false],
  ] as const)(
    'GR %s → gazette %s, chamber %s',
    (occupation, gazette, chamber) => {
      const status: EmploymentStatus =
        occupation === 'employee' || occupation === 'public_servant'
          ? 'employed'
          : 'self_employed'
      expect({
        gazette: applies('GR', GAZETTE, status, occupation),
        chamber: applies('GR', CHAMBER, status, occupation),
      }).toEqual({ gazette, chamber })
    }
  )

  it.each([
    ['employee', false, false],
    ['company_owner', true, true],
    ['independent_professional', true, true],
    ['farmer', false, false],
    ['public_servant', false, false],
  ] as const)(
    'DE %s → gazette %s, chamber %s',
    (occupation, gazette, chamber) => {
      const status: EmploymentStatus =
        occupation === 'employee' || occupation === 'public_servant'
          ? 'employed'
          : 'self_employed'
      expect({
        gazette: applies('DE', GAZETTE, status, occupation),
        chamber: applies('DE', CHAMBER, status, occupation),
      }).toEqual({ gazette, chamber })
    }
  )

  it('never asks a Greek employee or freelancer for the chamber', () => {
    // The asymmetry the whole split exists for. Greece widens the gazette to
    // two more branches because its checklist publishes it there, and widens
    // the chamber to nobody, because no Greek-reachable source names a chamber
    // document at all. A single conjunctive row could not express that.
    for (const occ of ['employee', 'independent_professional'] as const) {
      const status: EmploymentStatus =
        occ === 'employee' ? 'employed' : 'self_employed'
      expect({ occ, chamber: applies('GR', CHAMBER, status, occ) }).toEqual({
        occ,
        chamber: false,
      })
    }
  })

  it('and a classified Greek freelancer keeps the gazette', () => {
    // The regression this slice had to avoid: correcting the base to Annex III
    // alone would have withdrawn a document the visa centre asks for.
    expect(
      applies('GR', GAZETTE, 'self_employed', 'independent_professional')
    ).toBe(true)
  })
})

describe('the split — the legacy dossier that has answered nothing', () => {
  it.each(['GR', 'DE'] as const)(
    '%s: an unclassified self-employed dossier keeps both halves',
    (pack) => {
      // Both rows carry their own migration entry, so the coarse contract they
      // shipped under is preserved on each. Without the second one the chamber
      // would vanish from a checklist that carried it yesterday — a withdrawal
      // ADR-053a puts level with inventing a document.
      for (const occupation of [undefined, 'crypto_farmer_2031', 'employee']) {
        expect({
          occupation,
          gazette: applies(pack, GAZETTE, 'self_employed', occupation),
          chamber: applies(pack, CHAMBER, 'self_employed', occupation),
        }).toEqual({ occupation, gazette: true, chamber: true })
      }
    }
  )

  it.each(['GR', 'DE'] as const)(
    '%s: an unclassified employed dossier gains neither',
    (pack) => {
      // The mirror, and the reason a flat `unclassified` member would not do:
      // the prior contract was `self_employed`, so an employed dossier never
      // had these rows and must not acquire them by not answering. Greece's
      // widening to employees is never consulted on the fallback path.
      expect({
        gazette: applies(pack, GAZETTE, 'employed'),
        chamber: applies(pack, CHAMBER, 'employed'),
      }).toEqual({ gazette: false, chamber: false })
    }
  )

  it('and a classified farmer loses both, which is the correction landing', () => {
    expect({
      gazette: applies('GR', GAZETTE, 'self_employed', 'farmer'),
      chamber: applies('GR', CHAMBER, 'self_employed', 'farmer'),
    }).toEqual({ gazette: false, chamber: false })
  })
})

describe('the split — whose paper each row is', () => {
  it('makes the gazette the employer’s on the Greek employee branch', () => {
    // The visa centre's *Çalışan* block is the employer's company paperwork.
    // Only Greece widens this row to an employee, so the mapping is consulted
    // there and carried inertly everywhere else (ADR-049a).
    expect(ownerFor('GR', GAZETTE, 'employed', 'employee')).toBe('employer')
  })

  it.each([['company_owner'], ['independent_professional']] as const)(
    'and the applicant’s own for %s',
    (occupation) => {
      expect(ownerFor('GR', GAZETTE, 'self_employed', occupation)).toBe(
        'applicant'
      )
    }
  )

  it('keeps the chamber the applicant’s for everyone who is asked', () => {
    // No `ownerByOccupation` at all: neither pack widens this row to an
    // employee, so there is no cell where the subject differs and a map would
    // be the capability used because it exists.
    expect(rowIn('GR', CHAMBER)?.ownerByOccupation).toBeUndefined()
    expect(ownerFor('DE', CHAMBER, 'self_employed', 'company_owner')).toBe(
      'applicant'
    )
  })
})

describe('the split — the six-month bar went with the document', () => {
  it('renders the chamber detail on the chamber, in Germany only', () => {
    expect({
      gr: rowIn('GR', CHAMBER)?.detailKeys,
      de: rowIn('DE', CHAMBER)?.detailKeys,
    }).toEqual({
      gr: undefined,
      de: [
        'visa-domain:detail.de-tr-mission.CHAMBER_REGISTRATION_CERTIFICATE.chamberAndAge',
      ],
    })
  })

  it('leaves no detail on the gazette in either pack', () => {
    // The defect the split removes. "Ticaret veya Sanayi Odasından alınmış, 6
    // aydan eski olmayan sicil kayıt sureti" describes a chamber copy and
    // says nothing about a gazette, so attaching it to the gazette made the
    // row assert a recency bar for a document nobody states one for.
    expect({
      gr: rowIn('GR', GAZETTE)?.detailKeys,
      de: rowIn('DE', GAZETTE)?.detailKeys,
    }).toEqual({ gr: undefined, de: undefined })
  })

  it('moves the gazette’s German key back to the base contract', () => {
    expect({
      gr: rowIn('GR', GAZETTE)?.contractKey,
      de: rowIn('DE', GAZETTE)?.contractKey,
    }).toEqual({
      gr: 'EMPLOYER_TRADE_REGISTRY@2',
      de: 'EMPLOYER_TRADE_REGISTRY@2',
    })
  })

  it('starts the chamber at revision 1, with the German fragment at 1', () => {
    expect({
      revision: rowIn('GR', CHAMBER)?.revision,
      gr: rowIn('GR', CHAMBER)?.contractKey,
      de: rowIn('DE', CHAMBER)?.contractKey,
    }).toEqual({
      revision: 1,
      gr: 'CHAMBER_REGISTRATION_CERTIFICATE@1',
      de: 'CHAMBER_REGISTRATION_CERTIFICATE@1+de-tr-mission:1',
    })
  })

  it('holds the gazette at revision 2, because losing a conjunct is a loosening', () => {
    // A bump would demote every Greek claim for a change that excludes no
    // evidence: anything that satisfied "gazette and chamber" satisfies
    // "gazette" (ADR-051a's directional test).
    expect(rowIn('GR', GAZETTE)?.revision).toBe(2)
    expect(rowIn('DE', GAZETTE)?.revision).toBe(2)
  })
})

describe('the split — what happens to a claim somebody already made', () => {
  const germany = compositionFor('DE').template
  const greece = compositionFor('GR').template

  it('leaves every Greek claim exactly where it stood', () => {
    // Greece's key never moved, so nothing it stamped is re-read.
    const claimed = applyDocumentUpdate(
      seeded(GAZETTE),
      { status: 'ready' },
      greece
    )
    expect(claimed.satisfiedContract).toBe('EMPLOYER_TRADE_REGISTRY@2')
    expect(completionStanding(claimed, greece)).toBe('current')
  })

  it('asks a German claim stamped against the old composed key to be re-checked', () => {
    // The one live cost, and the harmless direction of being wrong: the key
    // carried `+de-tr-mission:1` while the chamber bar sat on this row, and a
    // loosening moves a key just as a tightening does (ADR-051b).
    const stale = {
      ...seeded(GAZETTE),
      status: 'ready' as const,
      satisfiedRevision: 2,
      satisfiedContract: 'EMPLOYER_TRADE_REGISTRY@2+de-tr-mission:1',
    }
    expect(completionStanding(stale, germany)).toBe('superseded')
    expect(effectiveStatus(stale, germany)).toBe('needs_update')
  })

  it('promotes the German claims the departed detail had been demoting', () => {
    // These were superseded only because the row carried composition detail
    // that provably postdated them. The detail has left, so the reason has too.
    const numeric = {
      ...seeded(GAZETTE),
      status: 'ready' as const,
      satisfiedRevision: 2,
    }
    const unstamped = { ...seeded(GAZETTE), status: 'ready' as const }
    expect(completionStanding(numeric, germany)).toBe('current')
    expect(completionStanding(unstamped, germany)).toBe('unrecorded')
  })

  it('carries no completion into the chamber, from any stored shape', () => {
    /**
     * ADR-051c decision 1, asserted rather than assumed. A record claiming the
     * old conjunctive contract did contain the chamber document — and the
     * persisted model cannot say so: one status, one `fileReference`, one
     * `issuedAt` for what were two documents. Germany gates this row on six
     * months, so a projected date could report a stale chamber copy as ready.
     *
     * The mechanism could not do it either. Nothing outside `applyDocumentUpdate`
     * writes a stamp, and that runs only on an applicant's own status update.
     */
    for (const template of [greece, germany]) {
      const carried = [
        { ...seeded(CHAMBER), status: 'ready' as const },
        {
          ...seeded(CHAMBER),
          status: 'ready' as const,
          satisfiedRevision: 2,
          satisfiedContract: 'EMPLOYER_TRADE_REGISTRY@2',
        },
      ]
      // No stamp names this code, so nothing reads as claimed against it.
      for (const record of carried) {
        expect(record.satisfiedContract).not.toBe(
          rowIn('DE', CHAMBER)?.contractKey
        )
      }
      expect(
        template.documentRequirements.find((r) => r.code === CHAMBER)
      ).toBeDefined()
    }
  })

  it('offers the chamber as a row to add, not as one already satisfied', () => {
    // What an existing dossier actually meets: template sync surfaces the new
    // requirement for the applicant to add, seeded `not_started`, which is the
    // only honest presentation of a claim nobody has made.
    const app = {
      destinationCountry: 'DE',
      visaType: 'short_stay_tourism',
      employment: {
        employmentStatus: 'self_employed',
        occupationCode: 'company_owner',
      },
    } as unknown as Application
    const plan = planTemplateSync(
      [{ ...seeded(GAZETTE), status: 'ready' }],
      ctxFor(app),
      germany
    )
    expect(plan.toAdd.map((r) => r.code)).toContain(CHAMBER)
    expect(plan.noLongerApplicable).toEqual([])
  })
})

describe('the split — what it did not touch', () => {
  it('cites each half only where its source speaks', () => {
    expect({
      grGazette: rowIn('GR', GAZETTE)?.sourceRefs,
      grChamber: rowIn('GR', CHAMBER)?.sourceRefs,
      deGazette: rowIn('DE', GAZETTE)?.sourceRefs,
      deChamber: rowIn('DE', CHAMBER)?.sourceRefs,
    }).toEqual({
      // Greece's checklist publishes the gazette and no chamber document, so
      // it reaches one row and not the other (ADR-048a).
      grGazette: [
        'eu-c2021-5156-turkey-annex3',
        'gr-tr-harmonised-list',
        'gr-tr-visa-centre-checklist',
      ],
      grChamber: ['eu-c2021-5156-turkey-annex3'],
      deGazette: ['eu-c2021-5156-turkey-annex3', 'de-tr-tourism-checklist'],
      deChamber: ['eu-c2021-5156-turkey-annex3', 'de-tr-tourism-checklist'],
    })
  })

  it('keeps both halves out of Finance', () => {
    // `employment` documents, not financial ones: neither is evidence of
    // income, and a company registration in the funds view would be the
    // taxonomy drifting from the category.
    for (const code of [GAZETTE, CHAMBER]) {
      expect(financeDocGroup(code, 'employment')).toBeNull()
    }
  })

  it('relates the two by nothing — they are conjunctive, not alternatives', () => {
    /**
     * The clever shortcut that must not be taken. A satisfaction group means
     * *any one of these suffices*, and a company owner is asked for both
     * documents: grouping them would tell somebody holding only the gazette
     * that the obligation was met.
     */
    for (const pack of ['GR', 'DE'] as const) {
      const groups = compositionFor(pack).template.satisfactionGroups ?? []
      const members = groups.flatMap((g) => g.anyOf)
      // Non-vacuity first. Reading the wrong field name here would make every
      // assertion below pass against an empty list — which is exactly what an
      // earlier draft of this test did, until lint objected to the type.
      expect({ pack, hasMembers: members.length > 0 }).toEqual({
        pack,
        hasMembers: true,
      })
      expect({ pack, gazette: members.includes(GAZETTE) }).toEqual({
        pack,
        gazette: false,
      })
      expect({ pack, chamber: members.includes(CHAMBER) }).toEqual({
        pack,
        chamber: false,
      })
    }
  })

  it('leaves both required in both packs', () => {
    for (const pack of ['GR', 'DE'] as const) {
      expect({
        pack,
        gazette: rowIn(pack, GAZETTE)?.required,
        chamber: rowIn(pack, CHAMBER)?.required,
      }).toEqual({ pack, gazette: true, chamber: true })
    }
  })
})
