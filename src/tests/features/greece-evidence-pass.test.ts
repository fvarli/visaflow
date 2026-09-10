import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import { getCountryConfig } from '@/config/countries'
import { greeceTourismComposition } from '@/config/countries/greece/tourism'
import { grTrMissionLayer } from '@/config/countries/jurisdictions/gr-tr-mission'
import { RETIRED_REQUIREMENTS } from '@/config/countries/retired'
import { computeVerificationCoverage } from '@/config/countries/verification-coverage'
import { dynamicT } from '@/lib/i18n-dynamic'

/**
 * What the 2026-09-09 evidence pass changed, and — mostly — what it did not.
 *
 * The Greek visa centre's tourism checklist had been unreachable since the
 * fidelity audit began. It was retrieved, and it turned out to support several
 * things this pack asserts. The tempting conclusion was that the rows it names
 * could now be cited. They cannot: a citation vouches for a requirement's
 * condition as well as its prose (ADR-048), and these conditions describe a
 * different population from the one the checklist does.
 *
 * So the pass shipped two prose corrections and left every contract alone. This
 * file pins that shape, because the failure it guards against is not a bug
 * anyone would notice — it is a later change quietly upgrading "the source
 * mentions this document" into "the source verifies this requirement", which
 * looks like progress and moves a number the applicant reads.
 */

const template = greeceTourismComposition.template
const requirement = (code: string) => {
  const found = template.documentRequirements.find((r) => r.code === code)
  if (!found) throw new Error(`${code} is not composed for Greece`)
  return found
}

describe('Greece evidence pass — the corrections that shipped', () => {
  it.each(['tr', 'en'] as const)(
    'no longer renders a nationality condition on the signature circular in %s',
    async (locale) => {
      await i18n.changeLanguage(locale)
      const td = dynamicT(i18n.t.bind(i18n))
      const rendered = [
        td('visa-domain:requirements.EMPLOYER_SIGNATURE_CIRCULAR.name', {
          defaultValue: '',
        }),
        td('visa-domain:requirements.EMPLOYER_SIGNATURE_CIRCULAR.description', {
          defaultValue: '',
        }),
        td('visa-domain:requirements.EMPLOYER_SIGNATURE_CIRCULAR.notes', {
          defaultValue: '',
        }),
      ].join(' ')
      await i18n.changeLanguage('tr')

      /**
       * The checklist conditions this document on occupation — it sits in the
       * company-document block on the employed branch and is absent from the
       * public-servant one. Nothing anywhere conditions it on nationality, so
       * the note said something no authority states.
       */
      expect(/nationality|uyruğ|uyruk/i.test(rendered)).toBe(false)
    }
  )

  it('renders no notes for the signature circular, in the pack or the bundles', () => {
    // Removing the string without removing the key would leave the panel
    // rendering a raw translation key; removing the key without the string
    // would leave prose no requirement can reach. Both directions, once.
    expect(requirement('EMPLOYER_SIGNATURE_CIRCULAR').notesKey).toBeUndefined()
    for (const locale of ['tr', 'en'] as const) {
      const bundle = i18n.getResourceBundle(locale, 'visa-domain') as {
        requirements?: Record<string, { notes?: string }>
      }
      expect(
        bundle.requirements?.EMPLOYER_SIGNATURE_CIRCULAR?.notes
      ).toBeUndefined()
    }
  })
})

describe('Greece evidence pass — the contracts it deliberately left alone', () => {
  /**
   * Both rows are named by the checklist. Neither may claim it.
   *
   * `tr-filing-provenance` already forbids the mission layer's own requirements
   * from carrying a citation, so this is the second lock rather than the first
   * — and it is here because the reason differs per row and belongs beside the
   * evidence-pass record.
   */
  it.each(['SPONSOR_BANK_STATEMENTS', 'EMPLOYER_SIGNATURE_CIRCULAR'])(
    '%s stays uncited while its condition is unsupported',
    (code) => {
      expect(requirement(code).sourceRefs ?? []).toEqual([])
    }
  )

  it('leaves requiredness and applicability exactly where it found them', () => {
    /**
     * The evidence supports moving both — the checklist lists the signature
     * circular without qualification, and raises the sponsor block from
     * occupation rather than from a funding election. Neither move is made,
     * because `employed` cannot separate a public servant from an ordinary
     * employee and `conditionalOn` cannot see a sponsor's occupation at all.
     * Making them anyway would trade one wrong population for another.
     */
    const circular = requirement('EMPLOYER_SIGNATURE_CIRCULAR')
    const sponsorBank = requirement('SPONSOR_BANK_STATEMENTS')

    expect({
      circular: {
        required: circular.required,
        conditionalOn: circular.conditionalOn,
      },
      sponsorBank: {
        required: sponsorBank.required,
        conditionalOn: sponsorBank.conditionalOn,
      },
    }).toEqual({
      circular: {
        required: false,
        conditionalOn: {
          field: 'employment.employmentStatus',
          operator: 'equals',
          value: 'employed',
        },
      },
      sponsorBank: {
        required: true,
        conditionalOn: {
          field: 'financing.source',
          operator: 'equals',
          value: 'sponsor',
        },
      },
    })
  })

  it('moves no coverage, because a prose correction is not a verification', () => {
    // H4b's own claim, and it still holds — the five it corrected are still
    // uncited and coverage moved by nothing on its account. The figures below
    // have since moved for a different reason (H4c2 added five cited rows), so
    // what this now asserts is the gap: the quarantined block is still five,
    // and still outside the numerator.
    const greece = getCountryConfig('GR')
    const coverage = computeVerificationCoverage(greece!, template)
    expect(coverage.total - coverage.verified).toBe(5)
    expect(coverage.isComplete).toBe(false)
  })

  it('keeps every quarantined mission requirement uncited', () => {
    // Named rather than "everything the layer owns", which stopped meaning the
    // same thing in H4c2: the layer now also owns the occupational rows, which
    // cite the visa centre because their conditions match the branches it
    // raises them from. These five do not, which is why they are still here.
    const QUARANTINED = [
      'SPONSOR_LETTER',
      'SPONSOR_BANK_STATEMENTS',
      'SPONSOR_INCOME_PROOF',
      'RELATIONSHIP_PROOF',
      'EMPLOYER_SIGNATURE_CIRCULAR',
    ]
    const cited = (grTrMissionLayer.add ?? [])
      .filter((r) => QUARANTINED.includes(r.code))
      .filter((r) => (r.sourceRefs ?? []).length > 0)
      .map((r) => r.code)
    expect(cited).toEqual([])
  })
})

describe('Greece evidence pass — the retirements it did not undo', () => {
  const E5C = ['ID_CARD_COPY', 'PASSPORT_PREVIOUS', 'PREVIOUS_VISAS']
  const composed = new Set(template.documentRequirements.map((r) => r.code))

  it.each(E5C)('%s stays out of the composition', (code) => {
    // The checklist asks for all three. That supersedes the *reason* they were
    // retired; it does not un-retire them, because a shipped identity is never
    // re-pointed at a new contract (ADR-049). Restoring the obligation would
    // take a new code, argued on its own.
    expect(composed.has(code)).toBe(false)
  })

  it.each(E5C)(
    '%s records the later evidence beside its original reason',
    (code) => {
      const entry = RETIRED_REQUIREMENTS.find((r) => r.code === code)
      const amendment = entry?.amendedBy?.[0]
      expect({
        code,
        readAt: amendment?.readAt,
        explained: (amendment?.note.trim().length ?? 0) > 80,
      }).toEqual({ code, readAt: '2026-09-09', explained: true })
    }
  )

  it('leaves the original retirement reasons untouched', () => {
    /**
     * The amendment is append-only on purpose. A decision made on the evidence
     * available at the time is not made wrong by evidence that arrives later,
     * and rewriting the reason would leave the file claiming the retirement had
     * always rested on grounds nobody held.
     */
    const idCard = RETIRED_REQUIREMENTS.find((r) => r.code === 'ID_CARD_COPY')
    expect(idCard?.reason).toContain('Mandatory and cited by nothing')
    expect(idCard?.reason).not.toContain('2026-09-09')
  })
})

describe('Annex III I.5(g) — the obligation the evidence work produced', () => {
  const PERMIT = 'FILING_COUNTRY_RESIDENCE_PERMIT'

  it.each(['tr', 'en'] as const)(
    'renders the three-month bar the clause states, in %s',
    async (locale) => {
      /**
       * "Valid three months beyond the intended date of departure from the
       * territory of the Member States" — the same event the Greek visa
       * centre's checklist describes from the other side, as three months from
       * the date of return. Both authorities agree, so the contract states it.
       *
       * H4c1c added the rule that checks it, so the contract and the engine
       * now say the same thing. This test still pins only the *rendered*
       * wording, which is the half that reaches an applicant who has not filled
       * in an expiry date yet — `residence-permit-validity.test.ts` owns the
       * behaviour.
       */
      await i18n.changeLanguage(locale)
      const td = dynamicT(i18n.t.bind(i18n))
      const rendered = [
        td(`visa-domain:requirements.${PERMIT}.description`, {
          defaultValue: '',
        }),
        td(`visa-domain:requirements.${PERMIT}.notes`, { defaultValue: '' }),
      ].join(' ')
      await i18n.changeLanguage('tr')

      expect(/three months|üç ay/i.test(rendered)).toBe(true)
    }
  )

  it('cites the instrument that states both the ask and the bar', () => {
    // One citation covering identity, population, requiredness and the
    // three-month criterion — so no part of the contract outruns its evidence
    // (ADR-047, ADR-048).
    expect(requirement(PERMIT).sourceRefs).toEqual([
      'eu-c2021-5156-turkey-annex3',
      'gr-tr-harmonised-list',
    ])
  })

  it('moves Greece to twenty-six of thirty-one', () => {
    // The permit was the first row this evidence effort added rather than
    // corrected, and it arrived cited; H4c2's five occupational rows did the
    // same. The property being pinned is not the pair of numbers but that they
    // move together — a requirement may not join this pack without its own
    // source, so the uncited five stay exactly five.
    const greece = getCountryConfig('GR')
    expect(computeVerificationCoverage(greece!, template)).toEqual({
      total: 31,
      verified: 26,
      isComplete: false,
    })
  })
})
