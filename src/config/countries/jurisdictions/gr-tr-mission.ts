import { grTrMissionSources } from '../../sources/gr-tr-mission.sources'
import type { RequirementLayer } from '../../types'

/**
 * The Greek mission's authority over applications lodged in Türkiye.
 *
 * Greece's consulate publishes its own rendering of the harmonised list the
 * Commission adopted for Türkiye, and restates the Visa Code's passport,
 * insurance and application-form criteria in the consulate's own words. Both
 * are real evidence about what an applicant filing for Greece actually faces —
 * and neither is evidence about any other destination, which is why they attach
 * here and reach nothing else.
 *
 * WHY THIS IS A SEPARATE LAYER RATHER THAN PART OF `greeceDestinationLayer`.
 * The destination layer composes *before* `tr-filing`, so putting these
 * refinements there would have an earlier layer refining a later layer's
 * requirement — the reverse of the order ADR-052 states. The composer's
 * two-pass resolution would permit it, which is precisely the problem: the ADR
 * would then be describing something the code does not do. A mission layer
 * placed after `tr-filing` refines in the stated direction and names its
 * authority accurately.
 *
 * IT ALSO OWNS FIVE REQUIREMENTS, AND THAT IS NOT A FINDING. The signature
 * circular was inherited from before the layer split; the four sponsor
 * requirements arrived in E5c. All five are held here as **quarantine**, not
 * endorsement: scoped to the one pack that carries them so a second destination
 * cannot inherit an unverified ask. Nothing about this placement says Greece
 * currently requires them.
 *
 * WHAT CHANGED ON 2026-09-09, AND WHAT DID NOT. The visa centre's checklist —
 * the operative applicant-facing list for this filing context, published by the
 * centre the mission names — was unreachable for months and was retrieved that
 * day through ordinary site navigation. So the reason these five stay uncited
 * is no longer "we cannot read the source". It is that the source supports the
 * documents while the contracts around them do not yet match: their
 * applicability conditions describe a different population from the one the
 * checklist does, and one of them is not a single document at all. A citation
 * vouches for a requirement's condition as well as its prose (ADR-048), so
 * citing them now would assert something the evidence does not carry.
 *
 * Each records its own current blocker in the evidence-gap allowlist in
 * `country-pack-provenance.test.ts`, which bounds the set and demands a written
 * reason for each entry.
 *
 * THREE OTHERS SAT HERE UNTIL E5c. `ID_CARD_COPY`, `PASSPORT_PREVIOUS` and
 * `PREVIOUS_VISAS` were retired once the fidelity audit had read the Visa Code,
 * Annex III and the Greek mission's own pages first-hand and found no support
 * for any of them, with no requirement-specific signal on the one channel that
 * was then unreachable. That channel has since been read, and it does list all
 * three — recorded on the retirement entries themselves, which keep their
 * original reasons and carry the amendment beside them. The codes stay retired:
 * a retired identity is never reused (ADR-049).
 */
export const grTrMissionLayer: RequirementLayer = {
  id: 'gr-tr-mission',
  kind: 'jurisdiction',
  add: [
    /**
     * Absent from Visa Code Annex II, from the Commission's Annex III for
     * Türkiye, and from the German mission's own sheet. ADR-048 already
     * declined to re-point it.
     *
     * The Greek visa centre's checklist does list it, in all four consular
     * jurisdictions, inside the company-document block on the employed branch
     * — and not on the public-servant branch, which carries no such block. That
     * is support for the document and a contradiction of the nationality note
     * this requirement used to render, which H4b removed. It is not support for
     * the contract, because the condition over-applies: the public-servant
     * branch carries no company block at all.
     *
     * THE VOCABULARY NOW EXISTS AND THIS ROW STILL DOES NOT USE IT (ADR-053).
     * `occupationalCategory` could express "an ordinary employee, not a public
     * servant" today. Narrowing the condition to it would read a field that
     * every dossier written before this release has left unanswered, and
     * applicability is fail-closed — so the row would silently vanish for
     * every employed applicant who never saw the question. Withdrawing a
     * document from someone preparing a file is the one direction that can
     * cost them the appointment, and ADR-051a classes an applicability change
     * as no revision bump, so nothing in the contract machinery would announce
     * it. That correction is its own decision, with its own approval; it is
     * not a consequence of the vocabulary arriving.
     */
    {
      code: 'EMPLOYER_SIGNATURE_CIRCULAR',
      nameKey: 'visa-domain:requirements.EMPLOYER_SIGNATURE_CIRCULAR.name',
      descriptionKey:
        'visa-domain:requirements.EMPLOYER_SIGNATURE_CIRCULAR.description',
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
    /**
     * THE SPONSOR BLOCK, MOVED HERE IN E5c AND NOT VERIFIED BY THE MOVE.
     *
     * These four sat in the common layer, so every pack inherited them. The
     * German mission's sheets are closed — they state that in principle only
     * the documents they list are required — and they list none of these, so
     * for Germany the audit could classify them UNSUPPORTED on an adequate
     * search. For Greece it could not, because the visa centre checklist its
     * mission directs applicants to could not then be read.
     *
     * Two different evidence states, one shared requirement. Retiring them
     * globally would convert Greece's evidence debt into a finding of absence;
     * leaving them in Common would keep leaking obligations into Germany that
     * its own authority does not make. Moving them to the layer only Greece
     * composes says exactly what is true of each pack, and needs no suppression
     * mechanism to do it.
     *
     * THAT CHECKLIST WAS READ ON 2026-09-09, AND IT ASKS FOR THREE OF THE FOUR.
     * The sponsor's petition, the sponsor's bank statements and the sponsor's
     * own occupational documents are all on it. None of the four is cited even
     * so, and the reasons differ per row — recorded one by one in the
     * evidence-gap allowlist rather than summarised here.
     *
     * What they share is the condition. All four fire on
     * `financing.source == 'sponsor'`, a funding election the applicant makes;
     * the checklist raises the sponsor block from occupation instead, on
     * applicants who do not work. Every working branch it publishes — employee,
     * public servant, company owner, freelancer, farmer, pensioner — asks for
     * no sponsor document at all. So the rows can be shown to someone the
     * authority does not ask them of, which is a condition mismatch and not a
     * wording one, and no prose edit reaches it.
     *
     * One correction did land: the invented "3-6 months" window on the
     * sponsor's statements is gone. The checklist states the last three months,
     * which is what the contract now renders — a loosening, so no revision
     * moved.
     */
    {
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
    {
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
    {
      code: 'SPONSOR_INCOME_PROOF',
      nameKey: 'visa-domain:requirements.SPONSOR_INCOME_PROOF.name',
      descriptionKey:
        'visa-domain:requirements.SPONSOR_INCOME_PROOF.description',
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
    {
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
    /**
     * THE OCCUPATIONAL ROWS. Four documents the checklist asks of three of its
     * *Meslek* branches, none of which any applicant could previously be shown,
     * because `employmentStatus` had no value that named the population
     * (ADR-053).
     *
     * These are the first requirements in the repository to cite the visa
     * centre. They can, where the older five could not, for the reason that
     * kept those five uncited: the checklist raises each of these from an
     * occupational branch, and each of these fires on exactly that branch. The
     * condition and the citation agree, which is what ADR-048 asks of a
     * citation in the first place.
     *
     * THEY ARE ADDITIVE, AND ONLY ADDITIVE. Nothing above is narrowed to make
     * room for them. A farmer who says so is now asked for the certificate
     * Annex III names *and* still asked for the company-owner block the
     * checklist does not ask them for; a public servant gets an institution
     * card *and* still gets the signature circular. Half a correction is a
     * strange thing to ship deliberately, so it is worth being plain about why:
     * the other half withdraws documents, from dossiers that never answered the
     * new question, and that is a decision to take on its own evidence rather
     * than to slip in beside a vocabulary change.
     */
    {
      /**
       * *Kurum Kartı* — "Çalıştığınız resmi kurumun kimlik kartı ve
       * fotokopisi." The identity card of the public institution you work for.
       *
       * A DISTINCT EVIDENCE IDENTITY, UNLIKE THE LETTER BESIDE IT. The same
       * branch also asks for a *Kurum Yazısı*, and that one is not a new
       * obligation — it is `EMPLOYMENT_LETTER` and `APPROVED_LEAVE` addressed
       * to a public employer, because a public authority is still an employer.
       * Acceptance detail, not a code (ADR-052b), and it is attached as detail
       * below. A card is not a letter under any acceptance criterion, so it is
       * a code.
       */
      code: 'INSTITUTION_ID_CARD',
      nameKey: 'visa-domain:requirements.INSTITUTION_ID_CARD.name',
      descriptionKey:
        'visa-domain:requirements.INSTITUTION_ID_CARD.description',
      notesKey: 'visa-domain:requirements.INSTITUTION_ID_CARD.notes',
      category: 'employment',
      /**
       * The applicant's. The institution issues it, but it identifies the
       * holder — `EMPLOYER_SIGNATURE_CIRCULAR` above is `employer` because the
       * employer's own signatures are what it attests, and this is the
       * opposite case.
       */
      ownerType: 'applicant',
      // The branch lists it without qualification, unlike the professional
      // card below, which it hedges with "Var ise".
      required: true,
      conditionalOn: {
        field: 'employment.occupationalCategory',
        operator: 'equals',
        value: 'public_servant',
      },
      sourceRefs: ['gr-kosmos-checklist'],
      revision: 1,
    },
    {
      /**
       * *Çiftçi Kayıt Belgesi (ÇKS)* — the farmer registration record, "bağlı
       * olunan kurum tarafından verilmiş veya e-devletten alınan".
       *
       * Not the same document as `FARMER_CERTIFICATE`, which the filing layer
       * owns on Annex III I.5(b)'s authority. That is the chamber of
       * agriculture's certificate of being a farmer; this is the state
       * registry's record of the holding. The checklist asks for both, in
       * separate lines, and holding one is no evidence of holding the other —
       * which is precisely when two obligations need two codes (ADR-052b).
       * Only the certificate has L2 backing, so only it sits in the layer both
       * packs compose.
       */
      code: 'FARMER_REGISTRY_RECORD',
      nameKey: 'visa-domain:requirements.FARMER_REGISTRY_RECORD.name',
      descriptionKey:
        'visa-domain:requirements.FARMER_REGISTRY_RECORD.description',
      notesKey: 'visa-domain:requirements.FARMER_REGISTRY_RECORD.notes',
      category: 'employment',
      ownerType: 'applicant',
      required: true,
      conditionalOn: {
        field: 'employment.occupationalCategory',
        operator: 'equals',
        value: 'farmer',
      },
      sourceRefs: ['gr-kosmos-checklist'],
      revision: 1,
    },
    {
      /**
       * *Tarla Tapuları* — "Çiftçilik belgesinde geçen tarlalardan en az 1
       * tanesinin tapusu veya başkasından kiralandı ise tapu ve ona ait olan
       * kira kontratı gerekmektedir."
       *
       * The title deed to at least one of the fields named on the farmer
       * certificate — or, where the land is rented, the deed together with the
       * lease. The alternative is stated inside the obligation, so it is one
       * requirement with two acceptable answers rather than two requirements;
       * the description carries it, which is the pattern this pack settled on
       * for a condition that is part of what the document *is*.
       */
      code: 'FARMLAND_TITLE_DEED',
      nameKey: 'visa-domain:requirements.FARMLAND_TITLE_DEED.name',
      descriptionKey:
        'visa-domain:requirements.FARMLAND_TITLE_DEED.description',
      notesKey: 'visa-domain:requirements.FARMLAND_TITLE_DEED.notes',
      category: 'supporting',
      ownerType: 'applicant',
      required: true,
      conditionalOn: {
        field: 'employment.occupationalCategory',
        operator: 'equals',
        value: 'farmer',
      },
      sourceRefs: ['gr-kosmos-checklist'],
      revision: 1,
    },
    {
      /**
       * *Meslek Kartı* — "Var ise, meslek kimlik kartı fotokopisi."
       *
       * OPTIONAL, AND THE SOURCE IS THE REASON. "Var ise" — if you have one.
       * The branch states the qualifier on this line and on no other, so
       * rendering it as required would assert something the checklist declines
       * to. Requiredness is part of the claim a citation vouches for (ADR-048),
       * which is why the flag follows the wording rather than the row's
       * neighbours.
       */
      code: 'PROFESSIONAL_ID_CARD',
      nameKey: 'visa-domain:requirements.PROFESSIONAL_ID_CARD.name',
      descriptionKey:
        'visa-domain:requirements.PROFESSIONAL_ID_CARD.description',
      notesKey: 'visa-domain:requirements.PROFESSIONAL_ID_CARD.notes',
      category: 'employment',
      ownerType: 'applicant',
      required: false,
      conditionalOn: {
        field: 'employment.occupationalCategory',
        operator: 'equals',
        value: 'independent_professional',
      },
      sourceRefs: ['gr-kosmos-checklist'],
      revision: 1,
    },
  ],
  refine: [
    // The consulate's restatement of the Visa Code criteria. These carry no
    // Commission citation because Annex III does not cover them.
    { code: 'APPLICATION_FORM', addSourceRefs: ['gr-mfa-tr-visa-page'] },
    { code: 'PASSPORT_CURRENT', addSourceRefs: ['gr-mfa-tr-visa-page'] },
    { code: 'TRAVEL_INSURANCE', addSourceRefs: ['gr-mfa-tr-visa-page'] },
    {
      /**
       * The one Greek acceptance detail, and the reason it is here rather than
       * in the common contract.
       *
       * The Ankara page asks for "a recent photograph conforming to ICAO
       * standards". Article 13 states the ICAO conformance and says nothing
       * about age, so "recent" is the consulate's, not the Regulation's.
       * Writing it into the shared requirement would assert a mission's word to
       * every future Schengen pack — the C2 defect, and ADR-052a Rule 3.
       *
       * It sat in the E5a plan as a shared-copy fix and was pulled out for
       * exactly that reason, which is what moved it into C1's row set. Germany
       * attaches its own, sharper detail to the same requirement; neither
       * composition sees the other's.
       */
      code: 'PHOTOS',
      addSourceRefs: ['gr-mfa-tr-visa-page'],
      addDetail: {
        detailKeys: ['visa-domain:detail.gr-tr-mission.PHOTOS.recent'],
        revision: 1,
      },
    },

    // The mission's rendering of Annex III, appended after the instrument
    // itself so the composed citation reads authority-first.
    { code: 'TRANSPORT_RESERVATION', addSourceRefs: ['gr-tr-harmonised-list'] },
    {
      // The mission's own copy of the harmonised list is where I.1's third
      // alternative is readable for a Greek application.
      code: 'TRANSPORT_MEANS_PROOF',
      addSourceRefs: ['gr-tr-harmonised-list'],
    },
    { code: 'ACCOMMODATION', addSourceRefs: ['gr-tr-harmonised-list'] },
    { code: 'ITINERARY', addSourceRefs: ['gr-tr-harmonised-list'] },
    /**
     * The public-servant letter, said without a new code.
     *
     * The checklist's *Kamu Çalışanı* branch replaces *İşveren Yazısı* with
     * *Kurum Yazısı* — "Çalıştığınız resmi kurumdan alınmış" — and asks it to
     * carry the same six things: the employee's name and passport number, the
     * start date and function, the purpose of travel, the leave dates and
     * whether the leave is paid. That is not a second obligation. A public
     * authority is still an employer, and the same evidence identity with a
     * different acceptable issuer is acceptance detail, not a new code
     * (ADR-052b).
     *
     * THE CONDITION IS IN THE SENTENCE, WHICH IS WHY THIS NEEDS NO
     * APPLICABILITY. `addDetail` is unconditional by construction — a refining
     * layer may append detail, not narrow who sees it — so the detail is
     * written as the branch it describes ("if you work for a public
     * institution…"). An employee in the private sector reads a clause that
     * plainly is not about them; a public servant reads the one line that
     * tells them their letter comes from somewhere else. That is the same
     * shape the companion's visa copy settled on in H4a.1, and it is why this
     * half of the public-servant gap was never actually blocked on the
     * vocabulary.
     */
    {
      code: 'EMPLOYMENT_LETTER',
      addSourceRefs: ['gr-tr-harmonised-list', 'gr-kosmos-checklist'],
      addDetail: {
        detailKeys: [
          'visa-domain:detail.gr-tr-mission.EMPLOYMENT_LETTER.publicInstitution',
        ],
        revision: 1,
      },
    },
    {
      code: 'APPROVED_LEAVE',
      addSourceRefs: ['gr-tr-harmonised-list', 'gr-kosmos-checklist'],
      addDetail: {
        detailKeys: [
          'visa-domain:detail.gr-tr-mission.APPROVED_LEAVE.publicInstitution',
        ],
        revision: 1,
      },
    },
    { code: 'PAYSLIPS', addSourceRefs: ['gr-tr-harmonised-list'] },
    { code: 'SOCIAL_SECURITY', addSourceRefs: ['gr-tr-harmonised-list'] },
    { code: 'BANK_STATEMENTS', addSourceRefs: ['gr-tr-harmonised-list'] },
    {
      code: 'CIVIL_REGISTRY_EXTRACT',
      addSourceRefs: ['gr-tr-harmonised-list'],
    },
    {
      code: 'EMPLOYER_TRADE_REGISTRY',
      addSourceRefs: ['gr-tr-harmonised-list'],
    },
    { code: 'STUDENT_CERTIFICATE', addSourceRefs: ['gr-tr-harmonised-list'] },
    {
      /**
       * The e-Devlet route, which is the visa centre's and not Annex III's.
       *
       * The clause names the chamber of agriculture and stops there; the
       * checklist adds "veya e-devletten alınan". That is one mission's
       * acceptance detail, so it attaches here rather than in the shared filing
       * layer — where a guard in `country-pack-provenance.test.ts` catches
       * exactly this leak, and caught this one.
       */
      code: 'FARMER_CERTIFICATE',
      addSourceRefs: ['gr-kosmos-checklist'],
      addDetail: {
        detailKeys: [
          'visa-domain:detail.gr-tr-mission.FARMER_CERTIFICATE.edevlet',
        ],
        revision: 1,
      },
    },
    {
      code: 'COMPANY_ACTIVITY_CERTIFICATE',
      addSourceRefs: ['gr-tr-harmonised-list'],
    },
    { code: 'TAX_PAYMENT_STATEMENT', addSourceRefs: ['gr-tr-harmonised-list'] },
    { code: 'PENSIONER_BOOKLET', addSourceRefs: ['gr-tr-harmonised-list'] },
    {
      code: 'FILING_COUNTRY_RESIDENCE_PERMIT',
      addSourceRefs: ['gr-tr-harmonised-list'],
    },

    // EMPLOYER_TAX_PLATE and EMPLOYER_SIGNATURE_CIRCULAR get nothing. Neither
    // appears in Annex III, and ADR-048 already recorded that vergi levhası
    // appears in no reachable Greek source and that the signature circular is
    // absent entirely. Attaching a citation to either would be inventing
    // evidence to make a requirement look verified.
  ],
  /**
   * Annex III I.5(a) says "letter from employer **and/or** approval for leave",
   * and for a Greek application that "or" is real: either document, carrying the
   * clause's content bullets, satisfies the obligation.
   *
   * WHY GREECE AND NOT GERMANY, WHEN THE CLAUSE IS THE SHARED INSTRUMENT'S. The
   * German mission narrows it. Its sheet asks for one original letter carrying
   * the employment details *and* the leave information together, so a German
   * applicant who brought only a leave approval would be short — the choice
   * Annex III offers is not one that mission accepts. Declaring the group on
   * `tr-filing` would hand Germany a route its own authority closed, which is
   * the mirror image of the leak C1 exists to prevent.
   *
   * So it lives here, on the layer that composes for Greece alone, and Germany
   * keeps both requirements as the two documents its sheet expects.
   */
  groups: [
    {
      id: 'gr-employment-evidence',
      anyOf: ['EMPLOYMENT_LETTER', 'APPROVED_LEAVE'],
      labelKey: 'visa-domain:groups.gr-employment-evidence',
      sourceRefs: ['gr-tr-harmonised-list'],
    },
  ],
  sources: grTrMissionSources,
}
