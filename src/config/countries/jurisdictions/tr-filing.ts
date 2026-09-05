import { trFilingSources } from '../../sources/tr-filing.sources'
import type { DocumentRequirement, RequirementLayer } from '../../types'

/**
 * Requirements that exist because the application is lodged in **Türkiye**.
 *
 * Not because of Greece. The evidence behind almost all of this is the
 * harmonised list adopted under local Schengen cooperation for Türkiye — it
 * names Turkish document types (SGK belgeleri, vukuatlı nüfus kayıt örneği,
 * Faaliyet Belgesi) and the periods they must cover. An applicant filing for
 * Greece from anywhere else is asked for none of it, and an applicant filing in
 * Türkiye for a different destination would plausibly be asked for most of it.
 * That is what makes this a filing-jurisdiction layer rather than a country one
 * (ADR-048).
 *
 * Thirteen of these were previously split across two files that both implied
 * the wrong owner: five sat in `commonSchengenDocuments`, which claimed they
 * were shared across Schengen, and eight in the Greece array, which claimed
 * they were Greek. They are neither.
 */
const trFilingDocuments: DocumentRequirement[] = [
  {
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
    // Harmonised list I.5.a spells out what the letter must contain. Notably
    // it does *not* ask for salary, which the description used to require.
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },
  {
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
    // Same clause: "letter from employer and/or approval for leave".
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },
  {
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
    // I.4.b — "salary slips of the last three months". The description said
    // 3-6 months, which no source states.
    sourceRefs: ['gr-tr-harmonised-list'],
    revision: 1,
  },
  {
    code: 'SOCIAL_SECURITY',
    nameKey: 'visa-domain:requirements.SOCIAL_SECURITY.name',
    descriptionKey: 'visa-domain:requirements.SOCIAL_SECURITY.description',
    // The readable-QR criterion lived in both locale files with no key to reach
    // it, so no applicant ever saw it — which is why wiring it here is a
    // revision bump and not a copy fix (ADR-051).
    notesKey: 'visa-domain:requirements.SOCIAL_SECURITY.notes',
    category: 'employment',
    ownerType: 'applicant',
    // The harmonised list puts both SGK documents under Employees as
    // requirements, not suggestions, so this is no longer optional (ADR-048).
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'employed',
    },
    validityPeriodDays: 30,
    // I.5.a — SGK statement of employment (Sigortalı İşe Giriş Bildirgesi) and
    // SGK registration and service document (SGK tescil ve hizmet dökümü),
    // both with a readable QR code. Entirely Türkiye-scoped; see the
    // jurisdiction quarantine in the provenance tests.
    sourceRefs: ['gr-tr-harmonised-list'],
    // Two bumps: naming both SGK documents (2), then rendering the readable-QR
    // criterion at all (3). See REQUIREMENT_REVISIONS.
    revision: 3,
  },
  {
    code: 'BANK_STATEMENTS',
    nameKey: 'visa-domain:requirements.BANK_STATEMENTS.name',
    descriptionKey: 'visa-domain:requirements.BANK_STATEMENTS.description',
    notesKey: 'visa-domain:requirements.BANK_STATEMENTS.notes',
    category: 'financial',
    ownerType: 'applicant',
    required: true,
    validityPeriodDays: 30,
    // I.4.a — "bank account statement showing movements over the last three
    // months, proving the source of regular income", and Annex II B.3 names
    // bank statements. The description said 3-6 months.
    sourceRefs: ['eu-visa-code-annex2', 'gr-tr-harmonised-list'],
    // The notes moved from a balance test to an income-provenance test —
    // see REQUIREMENT_REVISIONS. Not the 3-6 month window, which narrowed
    // nothing: anyone holding 3-6 months also holds the last three.
    revision: 2,
  },
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

/**
 * The filing-jurisdiction ownership layer for Türkiye.
 *
 * `refine` is the whole of what this layer does to somebody else's
 * requirement: it appends the citation an applicant filing here actually meets.
 * Six Common requirements are genuinely EU-level — the Visa Code states the
 * rule — and the Ankara mission or the harmonised list restates it in the
 * consulate's own words. Both belong on the requirement, but only one of them
 * belongs to every Schengen pack.
 *
 * It cannot do anything else. Composition may not change an acceptance
 * contract, so this layer cannot alter wording, requiredness, applicability or
 * `revision` on a code it does not own — a jurisdiction needing different
 * criteria has to own the requirement outright. That is what keeps
 * `satisfiedRevision: N` meaning one thing in every composition (ADR-051).
 */
export const trFilingLayer: RequirementLayer = {
  id: 'tr-filing',
  kind: 'jurisdiction',
  add: trFilingDocuments,
  refine: [
    // Article 11 states the form; the Ankara mission asks for the same thing.
    { code: 'APPLICATION_FORM', addSourceRefs: ['gr-mfa-tr-visa-page'] },
    // Article 12 states all three passport criteria; the mission restates them.
    { code: 'PASSPORT_CURRENT', addSourceRefs: ['gr-mfa-tr-visa-page'] },
    // Article 15 sets the cover and the EUR 30 000 minimum.
    { code: 'TRAVEL_INSURANCE', addSourceRefs: ['gr-mfa-tr-visa-page'] },
    // Annex II B.1 lists the reservation; the harmonised list repeats it as
    // one of the accepted travel arrangements.
    { code: 'TRANSPORT_RESERVATION', addSourceRefs: ['gr-tr-harmonised-list'] },
    // Harmonised list I.3 — hotel booking or other proof of accommodation.
    { code: 'ACCOMMODATION', addSourceRefs: ['gr-tr-harmonised-list'] },
    // Harmonised list I.1 offers a travel itinerary as an accepted arrangement.
    { code: 'ITINERARY', addSourceRefs: ['gr-tr-harmonised-list'] },
  ],
  sources: trFilingSources,
}
