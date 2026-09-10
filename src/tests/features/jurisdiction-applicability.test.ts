import { describe, it, expect } from 'vitest'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import {
  applicableRequirements,
  planTemplateSync,
} from '@/features/documents/template-sync'
import { buildApplicabilityContext } from '@/features/documents/applicability'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { resolveVisaTemplate } from '@/config/countries'
import type { Application } from '@/domain/schemas/application.schema'
import type { EmploymentStatus } from '@/domain/types/common'

/**
 * The applicability corrections the harmonised list forced (ADR-048).
 *
 * These are behavioural, not cosmetic. VisaFlow was asking *employees* for the
 * chamber-of-commerce registration and trade register bulletin — documents the
 * authority asks of **company owners**. And it treated the SGK documents as
 * optional when the list files them under Employees as requirements.
 *
 * A requirement's condition and its requiredness are part of what it asserts,
 * so getting them wrong is the same class of error as wrong wording: the
 * checklist tells the applicant to fetch something nobody asked them for, and
 * stays silent about something that was.
 */

const template = resolveVisaTemplate('GR', 'short_stay_tourism')
if (!template) throw new Error('Greece tourism template is not registered')

function applicationWith(employmentStatus: EmploymentStatus): Application {
  return {
    destinationCountry: 'GR',
    visaType: 'short_stay_tourism',
    employment: { employmentStatus },
  } as unknown as Application
}

const codesFor = (employmentStatus: EmploymentStatus) =>
  applicableRequirements(template, applicationWith(employmentStatus)).map(
    (r) => r.code
  )

/**
 * Documents the harmonised list files under "Company owners".
 *
 * Two of these carry codes minted in template 1.2.0: the requirements they
 * replaced described different documents, so reusing their identities would
 * have shown existing holders as already satisfying them (ADR-049).
 */
const COMPANY_OWNER_DOCUMENTS = [
  'EMPLOYER_TRADE_REGISTRY',
  'COMPANY_ACTIVITY_CERTIFICATE',
  'TAX_PAYMENT_STATEMENT',
]

describe('company-owner documents follow the applicant, not the employer', () => {
  it('does not ask an employee for their employer’s company registration', () => {
    // The correction. Before ADR-048 an employed applicant was handed
    // EMPLOYER_TRADE_REGISTRY, which the source never asks of them.
    expect(codesFor('employed')).not.toContain('EMPLOYER_TRADE_REGISTRY')
  })

  it('asks a self-employed applicant for all three', () => {
    const codes = codesFor('self_employed')
    for (const code of COMPANY_OWNER_DOCUMENTS) {
      expect(codes).toContain(code)
    }
  })

  it('keeps the trade registry owned by the applicant', () => {
    // It is the applicant's own company, so `ownerType` moved off `employer`
    // too — otherwise the document would be filed under someone who does not
    // exist in a self-employed dossier.
    const requirement = template?.documentRequirements.find(
      (r) => r.code === 'EMPLOYER_TRADE_REGISTRY'
    )
    expect(requirement?.ownerType).toBe('applicant')
  })
})

describe('SGK documents are required of employed applicants', () => {
  it('counts toward what an employed applicant still owes', () => {
    expect(
      requiredRequirementCodes(template, applicationWith('employed'))
    ).toContain('SOCIAL_SECURITY')
  })

  it('disappears entirely when the applicant is not employed', () => {
    // Requiredness never overrides applicability: a retired applicant is not
    // asked for an employment-entry statement at all.
    expect(codesFor('retired')).not.toContain('SOCIAL_SECURITY')
    expect(
      requiredRequirementCodes(template, applicationWith('retired'))
    ).not.toContain('SOCIAL_SECURITY')
  })
})

describe('the civil registry extract is asked of everyone', () => {
  it('applies regardless of employment status', () => {
    // The harmonised list states it as a general requirement, so it carries no
    // condition — the one requirement here that every applicant owes.
    for (const status of [
      'employed',
      'self_employed',
      'student',
      'retired',
      'unemployed',
    ] as EmploymentStatus[]) {
      expect(codesFor(status)).toContain('CIVIL_REGISTRY_EXTRACT')
      expect(
        requiredRequirementCodes(template, applicationWith(status))
      ).toContain('CIVIL_REGISTRY_EXTRACT')
    }
  })

  it('adds exactly one item to what a fresh dossier owes', () => {
    // The sprint's one genuine readiness change for existing users: an unseeded
    // required code counts as not-started, so every dossier gains this item.
    const required = requiredRequirementCodes(
      template,
      applicationWith('employed')
    )
    expect(required.filter((c) => c === 'CIVIL_REGISTRY_EXTRACT')).toHaveLength(
      1
    )
  })
})

/**
 * Annex III I.5(g) — the first requirement in either pack whose applicability
 * turns on who the applicant is rather than what they do.
 *
 * The clause asks non-Turkish nationals for proof that they reside lawfully in
 * Türkiye. Until H4c1 the condition could not be written at all: applicability
 * saw only employment and financing, so a real obligation with real evidence
 * behind it sat in the MISSING inventory for want of a field the dossier had
 * carried since the beginning.
 */
describe('Annex III I.5(g) — residence in the filing country', () => {
  const PERMIT = 'FILING_COUNTRY_RESIDENCE_PERMIT'

  const codesForNationality = (nationality: string | null) =>
    applicableRequirements(
      template,
      buildApplicabilityContext({
        applicant:
          nationality === null
            ? null
            : ({ id: 'a1', nationality } as unknown as Applicant),
        application: applicationWith('employed'),
      })
    ).map((r) => r.code)

  it('asks a non-Turkish national for it', () => {
    expect(codesForNationality('PL')).toContain(PERMIT)
  })

  it('does not ask a Turkish national for it', () => {
    // The whole point of the clause: it is the *non*-Turkish category.
    expect(codesForNationality('TR')).not.toContain(PERMIT)
  })

  it.each([
    ['a dossier with no applicant yet', null],
    ['an applicant who has not answered', ''],
  ])('does not ask %s for it', (_label, nationality) => {
    /**
     * A fresh dossier initialises `nationality` to `''`, so without H4c1's
     * fail-closed rule every new dossier would open by demanding a residence
     * permit of someone who may well be Turkish. An unknown answer is not a
     * foreign one.
     */
    expect(codesForNationality(nationality)).not.toContain(PERMIT)
  })

  it('is required for the population it applies to', () => {
    // Conditional applicability and requiredness are separate axes: I.5 lists
    // this without qualification for its category, so it is not a soft ask
    // merely because it is a conditional one.
    const permit = template.documentRequirements.find((r) => r.code === PERMIT)
    expect({ required: permit?.required, category: permit?.category }).toEqual({
      required: true,
      category: 'identity',
    })
  })

  it('leaves the record behind rather than deleting it if nationality changes', () => {
    // ADR-049: an applicability change is not a withdrawal. `planTemplateSync`
    // reports the row as no longer applicable and the user's state survives.
    const seeded = [{ code: PERMIT } as never]
    const plan = planTemplateSync(
      seeded,
      buildApplicabilityContext({
        applicant: { id: 'a1', nationality: 'TR' } as unknown as Applicant,
        application: applicationWith('employed'),
      }),
      template
    )
    expect(plan.noLongerApplicable.map((d) => d.code)).toContain(PERMIT)
  })
})
