import type { DocumentRequirement, VisaTypeTemplate } from '../../types'
import {
  commonSchengenDocuments,
  commonPreparationMilestones,
} from '../common/schengen-short-stay'

/**
 * Greece — Schengen short-stay, tourism (Type C), for applications lodged in
 * Türkiye.
 *
 * The jurisdiction matters and is not cosmetic. The strongest evidence behind
 * this template is the harmonised list adopted under local Schengen
 * cooperation *for Türkiye*, so several requirements state Turkish document
 * types and periods. Some of those requirements still physically live in
 * `commonSchengenDocuments`, which is a known and quarantined inaccuracy —
 * see the jurisdiction invariant in the provenance tests (ADR-048).
 */
const greeceSpecificDocuments: DocumentRequirement[] = [
  /**
   * A general requirement for every applicant in the harmonised list (I.2),
   * and one VisaFlow simply did not have. The document appeared only inside
   * `RELATIONSHIP_PROOF`'s Turkish notes, where it read as evidence of a
   * sponsor relationship — which is not what it is (ADR-048).
   *
   * Unconditional and required, exactly as the source states it. No recency,
   * apostille or translation rule is added: the list states none.
   */
  {
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

  // Employer company documents (may be requested for some nationalities)
  {
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
  {
    code: 'EMPLOYER_TRADE_REGISTRY',
    nameKey: 'visa-domain:requirements.EMPLOYER_TRADE_REGISTRY.name',
    descriptionKey:
      'visa-domain:requirements.EMPLOYER_TRADE_REGISTRY.description',
    notesKey: 'visa-domain:requirements.EMPLOYER_TRADE_REGISTRY.notes',
    category: 'employment',
    /**
     * Corrected from `employer` / `employed` (ADR-048).
     *
     * The harmonised list files the chamber-of-commerce registration and trade
     * register bulletin under **Company owners** — it is the applicant's own
     * company, not their employer's. VisaFlow was asking employees for a
     * document the authority asks of business owners.
     */
    ownerType: 'applicant',
    required: false,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    },
    sourceRefs: ['gr-tr-harmonised-list'],
    // Added the chamber-of-commerce registration — see REQUIREMENT_REVISIONS.
    revision: 2,
  },
  {
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

  // Property documents (supporting)
  {
    code: 'PROPERTY_DEED',
    nameKey: 'visa-domain:requirements.PROPERTY_DEED.name',
    descriptionKey: 'visa-domain:requirements.PROPERTY_DEED.description',
    notesKey: 'visa-domain:requirements.PROPERTY_DEED.notes',
    category: 'supporting',
    ownerType: 'applicant',
    required: false,
    // Annex II B.4 is "proof of real estate property", and it sits under
    // documentation for assessing the intention to leave — which is exactly
    // what this requirement's note claims it does.
    sourceRefs: ['eu-visa-code-annex2'],
    revision: 1,
  },

  // Self-employed
  {
    /**
     * Not a rename of `BUSINESS_LICENSE` — a replacement of it (ADR-049).
     *
     * The old code described a business registration or operating licence. The
     * harmonised list asks company owners for the activity certificate, and an
     * applicant could have satisfied the old wording with a different artifact.
     * Reusing the code would have shown them as already holding this one.
     */
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
    // Company owners: "company activity certificate (Faaliyet Belgesi)" and
    // the chamber-of-commerce registration.
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },
  {
    /**
     * Replaces `TAX_RETURNS`, which described a filing the applicant submits.
     * A statement of taxes payment evidences settlement instead — a filed
     * return proves nothing about it (ADR-049).
     */
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
    // Company owners: "statement of taxes payment" — a payment statement, not
    // the tax returns this requirement used to describe.
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },

  // Student
  {
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
    // I.5.d distinguishes higher education (a YÖK certificate with a readable
    // QR code) from other students and pupils (a student certificate).
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },

  // Retired
  {
    /**
     * Replaces `PENSION_STATEMENT`, which described periodic payment
     * printouts. The booklet is an identity document; holding one is no
     * evidence of holding the other (ADR-049).
     */
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
    // I.4.c — "pensioner booklet, if relevant". A different document from the
    // payment statements this requirement used to describe.
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },
]

export const greeceTourismTemplate: VisaTypeTemplate = {
  id: 'schengen-short-stay-tourism',
  visaType: 'short_stay_tourism',
  nameKey: 'visa-domain:visaTypes.schengen-short-stay-tourism',
  documentRequirements: [
    ...commonSchengenDocuments,
    ...greeceSpecificDocuments,
  ],
  preparationMilestones: [
    ...commonPreparationMilestones,
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
  ],
  notesKeys: [
    'visa-domain:templateNotes.greece.nationalityVaries',
    'visa-domain:templateNotes.greece.visaCentre',
    'visa-domain:templateNotes.greece.peakSeason',
  ],

  /**
   * Bumped: every requirement now declares its acceptance-contract `revision`
   * explicitly, `BANK_STATEMENTS` records a tightening that shipped unlogged,
   * and `SOCIAL_SECURITY` renders a criterion that had been unreachable. The
   * pack version is its own axis — the app, the dossier schema and the storage
   * format are all untouched.
   */
  templateVersion: '1.4.0',
  /**
   * The date this template was last reviewed by a maintainer. Still not a
   * verification date — `lastVerifiedAt` on each source is that.
   */
  lastReviewedAt: '2026-08-29',
  /**
   * Derived from evidence, not chosen: 18 of the 28 requirements carry their
   * own resolvable, dated source and 10 do not. A test recomputes it rather
   * than trusting this line (ADR-047, ADR-048).
   *
   * The jump from 4 came from the harmonised list adopted for Türkiye, which
   * names actual Turkish document types and the periods they must cover. Ten
   * requirements are still uncited, three of them because a nearby source
   * exists but does not say what VisaFlow claims — the photo dimensions, the
   * employer tax plate and the signature circular.
   */
  reviewStatus: 'partially_verified',
  sourceIds: ['gr-mfa-general'],
}
