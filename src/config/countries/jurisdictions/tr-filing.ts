import { trFilingSources } from '../../sources/tr-filing.sources'
import type {
  DocumentRequirement,
  RequirementLayer,
  SatisfactionGroup,
} from '../../types'

/** The jurisdiction-level instrument every requirement below is measured against. */
const COMMISSION_ANNEX_III = 'eu-c2021-5156-turkey-annex3'

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
    sourceRefs: ['eu-c2021-5156-turkey-annex3'],
    // Gained the two I.5.a elements the description had dropped: the consulate
    // the letter is addressed to, and the signatory's name and position.
    revision: 2,
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
    sourceRefs: ['eu-c2021-5156-turkey-annex3'],
    // Same two I.5.a elements as the employer letter — the clause's content
    // bullets attach to whichever of the two documents is submitted.
    revision: 2,
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
    sourceRefs: ['eu-c2021-5156-turkey-annex3'],
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
    sourceRefs: ['eu-c2021-5156-turkey-annex3'],
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
    sourceRefs: ['eu-visa-code-annex2', 'eu-c2021-5156-turkey-annex3'],
    // The notes moved from a balance test to an income-provenance test —
    // see REQUIREMENT_REVISIONS. Not the 3-6 month window, which narrowed
    // nothing: anyone holding 3-6 months also holds the last three.
    revision: 2,
  },
  {
    /**
     * The third thing Annex III I.1 accepts as travel arrangements, and the one
     * VisaFlow had no way to name.
     *
     * I.1 verbatim: "Travel arrangements: flight reservations, **other proof of
     * intended means of transport**, or proof of travel itinerary." The common
     * layer carries the first (`TRANSPORT_RESERVATION`) and the third
     * (`ITINERARY`). The middle one had nowhere to go: an applicant driving
     * their own car, or travelling by a means they cannot pre-book, was told to
     * produce a booking that does not exist. The German mission states the same
     * alternative independently — "diğer ulaşım tercihleri" — so this is not one
     * pack's reading of one clause.
     *
     * WHY IT IS NOT A BROADENING OF `TRANSPORT_RESERVATION`. Widening that
     * requirement to "a reservation *or* other proof" would put two acceptance
     * bars on one code, which ADR-052a forbids for exactly the reason it shows
     * up here: a reader could no longer tell which bar a `ready` tick was
     * claimed against. One code, one bar — so the second bar gets its own code
     * and the two are related as alternatives, which is how the authority
     * writes them.
     *
     * WHY IT IS OWNED HERE AND NOT BY THE COMMON LAYER. The phrase is Annex
     * III's, and Annex III is the harmonised list for Türkiye — this layer's own
     * instrument. The Visa Code does not state it: Annex II B.1 offers only
     * "reservation of or return or round ticket", and Article 14(3)'s
     * non-exhaustiveness lets a consulate ask for *more*, never the applicant
     * offer less. Writing this into the common layer would assert to every
     * future Schengen pack something only the Türkiye list says, which is the
     * defect C2 removed and ADR-052a Rule 3 names.
     *
     * Optional, and that is a placeholder rather than a judgement: the authority
     * treats these three as equivalent routes, which nothing in the model can
     * yet express. Until it can, marking this required would demand a document
     * from applicants who correctly hold a reservation instead.
     */
    code: 'TRANSPORT_MEANS_PROOF',
    nameKey: 'visa-domain:requirements.TRANSPORT_MEANS_PROOF.name',
    descriptionKey:
      'visa-domain:requirements.TRANSPORT_MEANS_PROOF.description',
    notesKey: 'visa-domain:requirements.TRANSPORT_MEANS_PROOF.notes',
    category: 'travel',
    ownerType: 'applicant',
    required: false,
    sourceRefs: ['eu-c2021-5156-turkey-annex3'],
    revision: 1,
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
    sourceRefs: ['eu-c2021-5156-turkey-annex3'],
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
    /**
     * Required, not optional. Annex III I.5(c) lists the chamber registration
     * and trade-register bulletin for company owners without qualification, and
     * the German mission's sheet lists them the same way — so both production
     * compositions want the same answer and neither is made wrong by it.
     *
     * It sat at `false`, which meant readiness left it out of the denominator
     * entirely: a self-employed applicant could reach 100% ready while missing
     * a document the jurisdiction instrument requires of them. No revision bump
     * — requiredness is not the acceptance contract, and ADR-051 excludes
     * applicability-shaped changes.
     */
    required: true,
    conditionalOn: {
      field: 'employment.employmentStatus',
      operator: 'equals',
      value: 'self_employed',
    },
    sourceRefs: ['eu-c2021-5156-turkey-annex3'],
    // Added the chamber-of-commerce registration — see REQUIREMENT_REVISIONS.
    revision: 2,
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
    sourceRefs: ['eu-c2021-5156-turkey-annex3'],
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
    sourceRefs: ['eu-c2021-5156-turkey-annex3'],
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
    sourceRefs: ['eu-c2021-5156-turkey-annex3'],
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
    sourceRefs: ['eu-c2021-5156-turkey-annex3'],
    revision: 1,
  },
  {
    /**
     * I.5(g), verbatim: "Non-Turkish nationals: Proof of residence in Turkey,
     * valid three months beyond the intended date of departure from the
     * territory of the Member States."
     *
     * WHY IT IS HERE AND NOT IN A MISSION LAYER. The clause is Annex III's, and
     * Annex III is this layer's instrument — the harmonised list the Commission
     * adopted for Türkiye, binding on every mission that receives applications
     * lodged here. Scoping it to one destination would assert that a foreign
     * resident's permit is that mission's own practice, when it is the
     * jurisdiction's requirement of everyone filing in it. Both packs compose
     * this layer and both now ask for it, which is the correct answer rather
     * than a leak: the German mission's sheet enumerates non-Turkish citizens
     * among its applicant categories independently.
     *
     * WHY THE CODE IS NOT `RESIDENCE_PERMIT`. A bare name reads as the
     * destination's permit, which is the opposite document — and ADR-052
     * already records generic codes monopolised by Türkiye-specific contracts
     * as a limitation this project has, so taking another obvious name would
     * repeat it. The prefix names what the obligation is about: proving lawful
     * residence in the country the application is *filed* in. It derives
     * nothing — filing jurisdiction remains config-declared (ADR-052a).
     *
     * THE THREE-MONTH BAR IS RENDERED, NOT ENFORCED, AND THAT IS DELIBERATE.
     * `Document.validUntil` and `trip.exitDate` both exist, and
     * `passport.validAfterTrip` already performs this exact arithmetic for the
     * passport — so a rule is expressible and is filed as its own decision
     * rather than smuggled in beside the obligation. Until one exists the
     * criterion lives where an applicant reads it, which is the same place the
     * blank-pages rule ended up for the same reason.
     */
    code: 'FILING_COUNTRY_RESIDENCE_PERMIT',
    nameKey: 'visa-domain:requirements.FILING_COUNTRY_RESIDENCE_PERMIT.name',
    descriptionKey:
      'visa-domain:requirements.FILING_COUNTRY_RESIDENCE_PERMIT.description',
    notesKey: 'visa-domain:requirements.FILING_COUNTRY_RESIDENCE_PERMIT.notes',
    category: 'identity',
    ownerType: 'applicant',
    /**
     * Required for the population it applies to. I.5 lists documents "to be
     * presented by specific categories of applicants" and attaches no
     * qualifier to this one — requiredness and applicability are separate axes,
     * so a conditional requirement is not thereby a soft one (ADR-051a).
     */
    required: true,
    conditionalOn: {
      field: 'applicant.nationality',
      operator: 'notEquals',
      value: 'TR',
    },
    sourceRefs: ['eu-c2021-5156-turkey-annex3'],
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
/**
 * Annex III I.1 offers a choice, and this is where the pack finally says so.
 *
 * "Travel arrangements: flight reservations, other proof of intended means of
 * transport, **or** proof of travel itinerary." Three routes, one obligation.
 * VisaFlow rendered the first as mandatory and the other two as optional extras,
 * which demanded a booking the binding list does not — the defect E1 and E2 both
 * scored as UNSUPPORTED on `TRANSPORT_RESERVATION`, in both packs.
 *
 * DECLARED HERE, THOUGH TWO MEMBERS BELONG TO THE COMMON LAYER. The choice is
 * Annex III's, and Annex III is this layer's instrument — so every composition
 * that files in Türkiye inherits the group, and a future pack filing elsewhere
 * gets whatever its own jurisdiction offers instead. A group reaches backwards
 * to requirements already declared, exactly as a citation refinement does.
 */
const trFilingGroups: SatisfactionGroup[] = [
  {
    id: 'tr-travel-arrangements',
    anyOf: ['TRANSPORT_RESERVATION', 'TRANSPORT_MEANS_PROOF', 'ITINERARY'],
    labelKey: 'visa-domain:groups.tr-travel-arrangements',
    sourceRefs: ['eu-c2021-5156-turkey-annex3'],
  },
]

export const trFilingLayer: RequirementLayer = {
  id: 'tr-filing',
  kind: 'jurisdiction',
  add: trFilingDocuments,
  groups: trFilingGroups,
  refine: [
    // Annex III I.1 — "Travel arrangements: flight reservations, other proof
    // of intended means of transport, or proof of travel itinerary."
    { code: 'TRANSPORT_RESERVATION', addSourceRefs: [COMMISSION_ANNEX_III] },
    { code: 'ITINERARY', addSourceRefs: [COMMISSION_ANNEX_III] },
    // Annex III I.3 — "Proof of accommodation: evidence of hotel booking or
    // other proof of accommodation."
    { code: 'ACCOMMODATION', addSourceRefs: [COMMISSION_ANNEX_III] },
    //
    // APPLICATION_FORM, PASSPORT_CURRENT and TRAVEL_INSURANCE deliberately get
    // nothing here. Annex III does not cover them — they are Visa Code Article
    // 11, 12 and 15 matters, already cited as such in the common layer. The
    // Greek mission's restatement of them is destination-specific and arrives
    // from `gr-tr-mission`.
  ],
  sources: trFilingSources,
}
