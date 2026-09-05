import { describe, it, expect } from 'vitest'
import { resolveVisaTemplate, greeceConfig } from '@/config/countries'
import type { DocumentRequirement, PreparationMilestone } from '@/config/types'

/**
 * The Greece composition, pinned exactly as it resolves today.
 *
 * This exists to make the Common Schengen -> Destination -> Filing Jurisdiction
 * split a *provably* behaviour-free refactor rather than a plausible one. The
 * pack is about to be taken apart into three ownership layers and put back
 * together by a composer; the only way to know the applicant sees the same
 * checklist afterwards is to write down what they see now, before anything
 * moves, and refuse to let it change.
 *
 * WHY A LITERAL AND NOT `toMatchSnapshot`. There is no Vitest snapshot anywhere
 * in this repository, and here one would be actively harmful: `vitest -u`
 * regenerates a `.snap` file, which would silently accept the exact reordering
 * this pin exists to catch. A literal has to be edited by hand, which is the
 * point — changing it is a decision somebody makes, not a flag they pass.
 *
 * ORDER IS LOAD-BEARING, not incidental. `documentRequirements` order decides
 * the order documents are seeded into a new dossier, and `deriveNextDocument`
 * picks the *first* required requirement with no record yet — so a reordering
 * changes which document the workspace recommends next. Composition must
 * therefore reproduce this sequence, not merely this set.
 *
 * WHEN THIS FAILS, READ IT AS A QUESTION, NOT A CHORE. During the split, any
 * failure is a regression. Afterwards, a deliberate pack change updates the
 * literal in the same commit that changes the pack — and the diff is then the
 * reviewable record of what applicants will be asked for differently.
 *
 * The five assertions — order, per-requirement contract, envelope, milestones
 * and sources — are kept separate so a failure names the actual mistake instead
 * of reading as one unexplained object mismatch.
 */

const template = resolveVisaTemplate('GR', 'short_stay_tourism')
if (!template) throw new Error('Greece tourism template is not registered')

/** The resolved sequence. Index order is the contract, not just membership. */
const PINNED_ORDER = [
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
  'CIVIL_REGISTRY_EXTRACT',
  'EMPLOYER_TAX_PLATE',
  'EMPLOYER_TRADE_REGISTRY',
  'EMPLOYER_SIGNATURE_CIRCULAR',
  'PROPERTY_DEED',
  'COMPANY_ACTIVITY_CERTIFICATE',
  'TAX_PAYMENT_STATEMENT',
  'STUDENT_CERTIFICATE',
  'PENSIONER_BOOKLET',
]

const PINNED_REQUIREMENTS: Record<string, DocumentRequirement> = {
  APPLICATION_FORM: {
    code: 'APPLICATION_FORM',
    nameKey: 'visa-domain:requirements.APPLICATION_FORM.name',
    descriptionKey: 'visa-domain:requirements.APPLICATION_FORM.description',
    notesKey: 'visa-domain:requirements.APPLICATION_FORM.notes',
    category: 'application_form',
    ownerType: 'applicant',
    required: true,
    sourceRefs: ['eu-visa-code-art11', 'gr-mfa-tr-visa-page'],
    revision: 1,
  },
  PASSPORT_CURRENT: {
    code: 'PASSPORT_CURRENT',
    nameKey: 'visa-domain:requirements.PASSPORT_CURRENT.name',
    descriptionKey: 'visa-domain:requirements.PASSPORT_CURRENT.description',
    notesKey: 'visa-domain:requirements.PASSPORT_CURRENT.notes',
    category: 'passport',
    ownerType: 'applicant',
    required: true,
    validityPeriodDays: 90,
    sourceRefs: ['eu-visa-code-art12', 'gr-mfa-tr-visa-page'],
    revision: 2,
  },
  PASSPORT_PREVIOUS: {
    code: 'PASSPORT_PREVIOUS',
    nameKey: 'visa-domain:requirements.PASSPORT_PREVIOUS.name',
    descriptionKey: 'visa-domain:requirements.PASSPORT_PREVIOUS.description',
    category: 'passport',
    ownerType: 'applicant',
    required: false,
    revision: 1,
  },
  PHOTOS: {
    code: 'PHOTOS',
    nameKey: 'visa-domain:requirements.PHOTOS.name',
    descriptionKey: 'visa-domain:requirements.PHOTOS.description',
    notesKey: 'visa-domain:requirements.PHOTOS.notes',
    category: 'identity',
    ownerType: 'applicant',
    required: true,
    validityPeriodDays: 180,
    revision: 1,
  },
  ID_CARD_COPY: {
    code: 'ID_CARD_COPY',
    nameKey: 'visa-domain:requirements.ID_CARD_COPY.name',
    descriptionKey: 'visa-domain:requirements.ID_CARD_COPY.description',
    category: 'identity',
    ownerType: 'applicant',
    required: true,
    revision: 1,
  },
  TRAVEL_INSURANCE: {
    code: 'TRAVEL_INSURANCE',
    nameKey: 'visa-domain:requirements.TRAVEL_INSURANCE.name',
    descriptionKey: 'visa-domain:requirements.TRAVEL_INSURANCE.description',
    notesKey: 'visa-domain:requirements.TRAVEL_INSURANCE.notes',
    category: 'insurance',
    ownerType: 'applicant',
    required: true,
    sourceRefs: ['eu-visa-code-art15', 'gr-mfa-tr-visa-page'],
    revision: 2,
  },
  TRANSPORT_RESERVATION: {
    code: 'TRANSPORT_RESERVATION',
    nameKey: 'visa-domain:requirements.TRANSPORT_RESERVATION.name',
    descriptionKey:
      'visa-domain:requirements.TRANSPORT_RESERVATION.description',
    notesKey: 'visa-domain:requirements.TRANSPORT_RESERVATION.notes',
    category: 'travel',
    ownerType: 'applicant',
    required: true,
    sourceRefs: ['eu-visa-code-annex2', 'gr-tr-harmonised-list'],
    revision: 1,
  },
  ACCOMMODATION: {
    code: 'ACCOMMODATION',
    nameKey: 'visa-domain:requirements.ACCOMMODATION.name',
    descriptionKey: 'visa-domain:requirements.ACCOMMODATION.description',
    category: 'accommodation',
    ownerType: 'applicant',
    required: true,
    sourceRefs: ['eu-visa-code-annex2', 'gr-tr-harmonised-list'],
    revision: 1,
  },
  ITINERARY: {
    code: 'ITINERARY',
    nameKey: 'visa-domain:requirements.ITINERARY.name',
    descriptionKey: 'visa-domain:requirements.ITINERARY.description',
    category: 'travel',
    ownerType: 'applicant',
    required: false,
    sourceRefs: ['eu-visa-code-annex2', 'gr-tr-harmonised-list'],
    revision: 1,
  },
  EMPLOYMENT_LETTER: {
    code: 'EMPLOYMENT_LETTER',
    nameKey: 'visa-domain:requirements.EMPLOYMENT_LETTER.name',
    descriptionKey: 'visa-domain:requirements.EMPLOYMENT_LETTER.description',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    validityPeriodDays: 30,
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },
  APPROVED_LEAVE: {
    code: 'APPROVED_LEAVE',
    nameKey: 'visa-domain:requirements.APPROVED_LEAVE.name',
    descriptionKey: 'visa-domain:requirements.APPROVED_LEAVE.description',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    validityPeriodDays: 30,
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },
  PAYSLIPS: {
    code: 'PAYSLIPS',
    nameKey: 'visa-domain:requirements.PAYSLIPS.name',
    descriptionKey: 'visa-domain:requirements.PAYSLIPS.description',
    notesKey: 'visa-domain:requirements.PAYSLIPS.notes',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    validityPeriodDays: 30,
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },
  SOCIAL_SECURITY: {
    code: 'SOCIAL_SECURITY',
    nameKey: 'visa-domain:requirements.SOCIAL_SECURITY.name',
    descriptionKey: 'visa-domain:requirements.SOCIAL_SECURITY.description',
    notesKey: 'visa-domain:requirements.SOCIAL_SECURITY.notes',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    validityPeriodDays: 30,
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 3,
  },
  BANK_STATEMENTS: {
    code: 'BANK_STATEMENTS',
    nameKey: 'visa-domain:requirements.BANK_STATEMENTS.name',
    descriptionKey: 'visa-domain:requirements.BANK_STATEMENTS.description',
    notesKey: 'visa-domain:requirements.BANK_STATEMENTS.notes',
    category: 'financial',
    ownerType: 'applicant',
    required: true,
    validityPeriodDays: 30,
    sourceRefs: ['eu-visa-code-annex2', 'gr-tr-harmonised-list'],
    revision: 2,
  },
  SPONSOR_LETTER: {
    code: 'SPONSOR_LETTER',
    nameKey: 'visa-domain:requirements.SPONSOR_LETTER.name',
    descriptionKey: 'visa-domain:requirements.SPONSOR_LETTER.description',
    category: 'sponsor',
    ownerType: 'sponsor',
    required: true,
    conditionalOn: {
      field: 'financing.source',
      operator: 'equals',
      value: 'sponsor',
    },
    validityPeriodDays: 30,
    revision: 1,
  },
  SPONSOR_BANK_STATEMENTS: {
    code: 'SPONSOR_BANK_STATEMENTS',
    nameKey: 'visa-domain:requirements.SPONSOR_BANK_STATEMENTS.name',
    descriptionKey:
      'visa-domain:requirements.SPONSOR_BANK_STATEMENTS.description',
    category: 'sponsor',
    ownerType: 'sponsor',
    required: true,
    conditionalOn: {
      field: 'financing.source',
      operator: 'equals',
      value: 'sponsor',
    },
    validityPeriodDays: 30,
    revision: 1,
  },
  SPONSOR_INCOME_PROOF: {
    code: 'SPONSOR_INCOME_PROOF',
    nameKey: 'visa-domain:requirements.SPONSOR_INCOME_PROOF.name',
    descriptionKey: 'visa-domain:requirements.SPONSOR_INCOME_PROOF.description',
    category: 'sponsor',
    ownerType: 'sponsor',
    required: true,
    conditionalOn: {
      field: 'financing.source',
      operator: 'equals',
      value: 'sponsor',
    },
    validityPeriodDays: 30,
    revision: 1,
  },
  RELATIONSHIP_PROOF: {
    code: 'RELATIONSHIP_PROOF',
    nameKey: 'visa-domain:requirements.RELATIONSHIP_PROOF.name',
    descriptionKey: 'visa-domain:requirements.RELATIONSHIP_PROOF.description',
    notesKey: 'visa-domain:requirements.RELATIONSHIP_PROOF.notes',
    category: 'civil_registry',
    ownerType: 'applicant',
    required: false,
    conditionalOn: {
      field: 'financing.source',
      operator: 'equals',
      value: 'sponsor',
    },
    revision: 1,
  },
  PREVIOUS_VISAS: {
    code: 'PREVIOUS_VISAS',
    nameKey: 'visa-domain:requirements.PREVIOUS_VISAS.name',
    descriptionKey: 'visa-domain:requirements.PREVIOUS_VISAS.description',
    category: 'previous_travel',
    ownerType: 'applicant',
    required: false,
    revision: 1,
  },
  CIVIL_REGISTRY_EXTRACT: {
    code: 'CIVIL_REGISTRY_EXTRACT',
    nameKey: 'visa-domain:requirements.CIVIL_REGISTRY_EXTRACT.name',
    descriptionKey:
      'visa-domain:requirements.CIVIL_REGISTRY_EXTRACT.description',
    notesKey: 'visa-domain:requirements.CIVIL_REGISTRY_EXTRACT.notes',
    category: 'civil_registry',
    ownerType: 'applicant',
    required: true,
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },
  EMPLOYER_TAX_PLATE: {
    code: 'EMPLOYER_TAX_PLATE',
    nameKey: 'visa-domain:requirements.EMPLOYER_TAX_PLATE.name',
    descriptionKey: 'visa-domain:requirements.EMPLOYER_TAX_PLATE.description',
    notesKey: 'visa-domain:requirements.EMPLOYER_TAX_PLATE.notes',
    category: 'employment',
    ownerType: 'employer',
    required: false,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    revision: 1,
  },
  EMPLOYER_TRADE_REGISTRY: {
    code: 'EMPLOYER_TRADE_REGISTRY',
    nameKey: 'visa-domain:requirements.EMPLOYER_TRADE_REGISTRY.name',
    descriptionKey:
      'visa-domain:requirements.EMPLOYER_TRADE_REGISTRY.description',
    notesKey: 'visa-domain:requirements.EMPLOYER_TRADE_REGISTRY.notes',
    category: 'employment',
    ownerType: 'applicant',
    required: false,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    },
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 2,
  },
  EMPLOYER_SIGNATURE_CIRCULAR: {
    code: 'EMPLOYER_SIGNATURE_CIRCULAR',
    nameKey: 'visa-domain:requirements.EMPLOYER_SIGNATURE_CIRCULAR.name',
    descriptionKey:
      'visa-domain:requirements.EMPLOYER_SIGNATURE_CIRCULAR.description',
    notesKey: 'visa-domain:requirements.EMPLOYER_SIGNATURE_CIRCULAR.notes',
    category: 'employment',
    ownerType: 'employer',
    required: false,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    revision: 1,
  },
  PROPERTY_DEED: {
    code: 'PROPERTY_DEED',
    nameKey: 'visa-domain:requirements.PROPERTY_DEED.name',
    descriptionKey: 'visa-domain:requirements.PROPERTY_DEED.description',
    notesKey: 'visa-domain:requirements.PROPERTY_DEED.notes',
    category: 'supporting',
    ownerType: 'applicant',
    required: false,
    sourceRefs: ['eu-visa-code-annex2'],
    revision: 1,
  },
  COMPANY_ACTIVITY_CERTIFICATE: {
    code: 'COMPANY_ACTIVITY_CERTIFICATE',
    nameKey: 'visa-domain:requirements.COMPANY_ACTIVITY_CERTIFICATE.name',
    descriptionKey:
      'visa-domain:requirements.COMPANY_ACTIVITY_CERTIFICATE.description',
    category: 'employment',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    },
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },
  TAX_PAYMENT_STATEMENT: {
    code: 'TAX_PAYMENT_STATEMENT',
    nameKey: 'visa-domain:requirements.TAX_PAYMENT_STATEMENT.name',
    descriptionKey:
      'visa-domain:requirements.TAX_PAYMENT_STATEMENT.description',
    category: 'financial',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    },
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },
  STUDENT_CERTIFICATE: {
    code: 'STUDENT_CERTIFICATE',
    nameKey: 'visa-domain:requirements.STUDENT_CERTIFICATE.name',
    descriptionKey: 'visa-domain:requirements.STUDENT_CERTIFICATE.description',
    category: 'supporting',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'student',
    },
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },
  PENSIONER_BOOKLET: {
    code: 'PENSIONER_BOOKLET',
    nameKey: 'visa-domain:requirements.PENSIONER_BOOKLET.name',
    descriptionKey: 'visa-domain:requirements.PENSIONER_BOOKLET.description',
    category: 'financial',
    ownerType: 'applicant',
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'retired',
    },
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },
}

/** Six shared milestones plus Greece's own, in resolved order. */
const PINNED_MILESTONES: PreparationMilestone[] = [
  {
    id: 'request-employer-docs',
    nameKey: 'visa-domain:milestones.request-employer-docs.name',
    descriptionKey: 'visa-domain:milestones.request-employer-docs.description',
    daysBeforeAppointment: 21,
    relatedDocuments: ['EMPLOYMENT_LETTER', 'APPROVED_LEAVE', 'PAYSLIPS'],
  },
  {
    id: 'obtain-bank-statements',
    nameKey: 'visa-domain:milestones.obtain-bank-statements.name',
    descriptionKey: 'visa-domain:milestones.obtain-bank-statements.description',
    daysBeforeAppointment: 14,
    relatedDocuments: ['BANK_STATEMENTS'],
  },
  {
    id: 'purchase-insurance',
    nameKey: 'visa-domain:milestones.purchase-insurance.name',
    descriptionKey: 'visa-domain:milestones.purchase-insurance.description',
    daysBeforeAppointment: 10,
    relatedDocuments: ['TRAVEL_INSURANCE'],
  },
  {
    id: 'confirm-reservations',
    nameKey: 'visa-domain:milestones.confirm-reservations.name',
    descriptionKey: 'visa-domain:milestones.confirm-reservations.description',
    daysBeforeAppointment: 7,
    relatedDocuments: ['TRANSPORT_RESERVATION', 'ACCOMMODATION'],
  },
  {
    id: 'take-photos',
    nameKey: 'visa-domain:milestones.take-photos.name',
    descriptionKey: 'visa-domain:milestones.take-photos.description',
    daysBeforeAppointment: 5,
    relatedDocuments: ['PHOTOS'],
  },
  {
    id: 'final-review',
    nameKey: 'visa-domain:milestones.final-review.name',
    descriptionKey: 'visa-domain:milestones.final-review.description',
    daysBeforeAppointment: 2,
  },
  {
    id: 'request-employer-company-docs',
    nameKey: 'visa-domain:milestones.request-employer-company-docs.name',
    descriptionKey:
      'visa-domain:milestones.request-employer-company-docs.description',
    daysBeforeAppointment: 28,
    relatedDocuments: [
      'EMPLOYER_TAX_PLATE',
      'EMPLOYER_TRADE_REGISTRY',
      'EMPLOYER_SIGNATURE_CIRCULAR',
    ],
  },
]

/** The template envelope: everything about the pack that is not a requirement. */
const PINNED_ENVELOPE = {
  id: 'schengen-short-stay-tourism',
  visaType: 'short_stay_tourism',
  nameKey: 'visa-domain:visaTypes.schengen-short-stay-tourism',
  templateVersion: '1.4.0',
  lastReviewedAt: '2026-08-29',
  reviewStatus: 'partially_verified',
  sourceIds: ['gr-mfa-general'],
  notesKeys: [
    'visa-domain:templateNotes.greece.nationalityVaries',
    'visa-domain:templateNotes.greece.visaCentre',
    'visa-domain:templateNotes.greece.peakSeason',
  ],
}

/** Source records the composed pack exposes, EU first, in declaration order. */
const PINNED_SOURCE_IDS = [
  'eu-visa-code-art11',
  'eu-visa-code-art12',
  'eu-visa-code-art15',
  'eu-visa-code-annex2',
  'gr-mfa-general',
  'gr-tr-harmonised-list',
  'gr-mfa-tr-visa-page',
]

describe('Greece composition — pinned before the layer split', () => {
  it('resolves exactly these requirements, in exactly this order', () => {
    expect(template.documentRequirements.map((r) => r.code)).toEqual(
      PINNED_ORDER
    )
  })

  it.each(PINNED_ORDER)('%s resolves with an unchanged contract', (code) => {
    const actual = template.documentRequirements.find((r) => r.code === code)
    // The whole object, not a chosen subset: pinning selected fields is how a
    // refactor quietly changes the one field nobody thought to list.
    expect(actual).toEqual(PINNED_REQUIREMENTS[code])
  })

  it('resolves an unchanged template envelope', () => {
    expect({
      id: template.id,
      visaType: template.visaType,
      nameKey: template.nameKey,
      templateVersion: template.templateVersion,
      lastReviewedAt: template.lastReviewedAt,
      reviewStatus: template.reviewStatus,
      sourceIds: template.sourceIds,
      notesKeys: template.notesKeys,
    }).toEqual(PINNED_ENVELOPE)
  })

  it('resolves unchanged preparation milestones, in order', () => {
    // Milestones move between layers in the split too — the six shared ones
    // come from the common layer and 'request-employer-company-docs' does not.
    expect(template.preparationMilestones).toEqual(PINNED_MILESTONES)
  })

  it('exposes unchanged source records, in order', () => {
    // Composition merges sources from several layers. A dropped or reordered
    // record would break every sourceRefs lookup that depends on it.
    expect((greeceConfig.sources ?? []).map((s) => s.id)).toEqual(
      PINNED_SOURCE_IDS
    )
  })
})
