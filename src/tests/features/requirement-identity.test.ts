import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import { getAllCountryConfigs } from '@/config/countries'
import {
  RETIRED_REQUIREMENTS,
  isRetiredRequirement,
} from '@/config/countries/retired'
import { dynamicT } from '@/lib/i18n-dynamic'

/**
 * The requirement-identity contract (ADR-049).
 *
 * A document `code` is the identity of a record in someone's dossier. The
 * dossier stores the code and nothing else — `Document.name` is deprecated and
 * no longer written — so the label comes from the code's translation at render
 * time. Change what a code means and you rewrite the meaning of documents
 * people already filed, in files already on their disk.
 *
 * That is what ADR-048 did to three requirements, and these tests exist so it
 * cannot happen quietly again. They cannot understand meaning; what they can do
 * is refuse to let a shipped code vanish or be reused without somebody saying
 * so out loud in `RETIRED_REQUIREMENTS`.
 */

/**
 * Every code this project has shipped in a country pack.
 *
 * Frozen deliberately. Deriving it from the current template would make the
 * guard vacuous — a renamed code would simply leave the list and the test would
 * keep passing, which is precisely the failure being guarded against.
 */
const SHIPPED_CODES = [
  // Shared Schengen array
  'APPLICATION_FORM',
  'PASSPORT_CURRENT',
  'PASSPORT_PREVIOUS',
  'PHOTOS',
  'ID_CARD_COPY',
  'TRAVEL_INSURANCE',
  'TRANSPORT_RESERVATION',
  'ACCOMMODATION',
  'ITINERARY',
  'EMPLOYMENT_LETTER',
  'APPROVED_LEAVE',
  'PAYSLIPS',
  'SOCIAL_SECURITY',
  'BANK_STATEMENTS',
  'SPONSOR_LETTER',
  'SPONSOR_BANK_STATEMENTS',
  'SPONSOR_INCOME_PROOF',
  'RELATIONSHIP_PROOF',
  'PREVIOUS_VISAS',
  // Greece/Türkiye
  'CIVIL_REGISTRY_EXTRACT',
  'EMPLOYER_TAX_PLATE',
  'EMPLOYER_TRADE_REGISTRY',
  'EMPLOYER_SIGNATURE_CIRCULAR',
  'PROPERTY_DEED',
  'STUDENT_CERTIFICATE',
  'COMPANY_ACTIVITY_CERTIFICATE',
  'TAX_PAYMENT_STATEMENT',
  'PENSIONER_BOOKLET',
  // Retired in template 1.2.0 — still held by dossiers written before it
  'TAX_RETURNS',
  'BUSINESS_LICENSE',
  'PENSION_STATEMENT',
] as const

const activeCodes = new Set(
  getAllCountryConfigs().flatMap((pack) =>
    pack.visaTypes.flatMap((t) => t.documentRequirements.map((r) => r.code))
  )
)

describe('requirement identity — a shipped code is never orphaned', () => {
  it.each(SHIPPED_CODES)(
    '%s is either active in a template or explicitly retired',
    (code) => {
      // The acknowledgement this guard exists to force. A code removed from
      // every template without a `RETIRED_REQUIREMENTS` entry means somebody
      // deleted or renamed an identity that users' files still refer to.
      expect({
        code,
        accountedFor: activeCodes.has(code) || isRetiredRequirement(code),
      }).toEqual({ code, accountedFor: true })
    }
  )

  it.each(['tr', 'en'] as const)(
    'every shipped code still resolves to a label in %s',
    async (locale) => {
      await i18n.changeLanguage(locale)
      const td = dynamicT(i18n.t.bind(i18n))
      const unresolved = SHIPPED_CODES.filter(
        (code) =>
          !td(`visa-domain:requirements.${code}.name`, { defaultValue: '' })
      )
      await i18n.changeLanguage('tr')

      // Without this a retired record falls through `documentLabel` to its raw
      // code and the applicant sees "TAX_RETURNS" where a document name
      // belongs.
      expect(unresolved).toEqual([])
    }
  )
})

describe('requirement identity — retirement is not reuse', () => {
  it('never lets a retired code back into a template', () => {
    const resurrected = RETIRED_REQUIREMENTS.map((r) => r.code).filter((code) =>
      activeCodes.has(code)
    )
    expect(resurrected).toEqual([])
  })

  it('gives every replacement a genuinely new identity', () => {
    // `replacedBy` is documentation, never resolution. If a replacement ever
    // shared its predecessor's code the retirement would be a rename wearing a
    // retirement's clothes.
    const collisions = RETIRED_REQUIREMENTS.filter(
      (r) => r.replacedBy && r.replacedBy === r.code
    ).map((r) => r.code)
    expect(collisions).toEqual([])
  })

  it('records why each identity could not be reused', () => {
    for (const retired of RETIRED_REQUIREMENTS) {
      expect({
        code: retired.code,
        hasReason: retired.reason.trim().length > 20,
        hasVersion: /^\d+\.\d+\.\d+$/.test(retired.retiredIn),
      }).toEqual({ code: retired.code, hasReason: true, hasVersion: true })
    }
  })

  it('retires exactly the three ADR-048 replacements', () => {
    expect(RETIRED_REQUIREMENTS.map((r) => r.code).sort()).toEqual([
      'BUSINESS_LICENSE',
      'PENSION_STATEMENT',
      'TAX_RETURNS',
    ])
  })
})
