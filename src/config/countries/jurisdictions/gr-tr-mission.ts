import { grTrMissionSources } from '../../sources/gr-tr-mission.sources'
import type { RequirementLayer } from '../../types'
import { occupationOneOf } from '../../types'

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
     * THE CONTRACT THIS ROW USED TO RENDER WAS WRONG IN BOTH DIRECTIONS.
     * `employed` over-asked the public servant, whose branch carries no company
     * block at all, and missed the company owner and the freelancer, whose
     * branches carry the same block. ADR-047's fourth evidence pass read all
     * five occupational branches at all four consular jurisdictions and they
     * agree: the block is asked of *Çalışan*, *Şirket Sahibi* and *Serbest
     * Meslek*, and not of *Kamu Çalışanı* or *Çiftçi*. The earlier comment here
     * said the condition would stay as it was "until the occupational
     * vocabulary can express the distinction". It can now.
     *
     * ONE CODE, TWO SUBJECTS. On the employed branch the company documents are
     * the employer's; on the two self-employed branches they are the
     * applicant's own. The source names the same instrument on every branch and
     * never says whose, so this is one evidence identity whose subject depends
     * on the profile, not two requirements ([ADR-049a](#adr-049a),
     * [ADR-052b](#adr-052b)).
     *
     * AND THE PRIOR CONTRACT IS KEPT, NOT ASSUMED. An applicant who has not
     * said what kind of work they do is evaluated against the exact coarse
     * condition this row used to carry — so an employed dossier keeps the row
     * and a self-employed one still does not get it, which a membership test on
     * some "unclassified" token could not have expressed
     * ([ADR-053a](#adr-053a)). The entitlement to do that lives in
     * `APPLICABILITY_MIGRATIONS`, not in this file.
     *
     * Still uncited, and for a smaller reason than before: the checklist that
     * supports it has no source record, so there is nothing to cite it to.
     * Requiredness is untouched and remains its own question.
     */
    {
      code: 'EMPLOYER_SIGNATURE_CIRCULAR',
      nameKey: 'visa-domain:requirements.EMPLOYER_SIGNATURE_CIRCULAR.name',
      descriptionKey:
        'visa-domain:requirements.EMPLOYER_SIGNATURE_CIRCULAR.description',
      category: 'employment',
      /**
       * The employer's, by default — which is the answer for an employee and
       * the answer for anyone who has not classified themselves, since the
       * contract they are held to is the employed one.
       */
      ownerType: 'employer',
      ownerByOccupation: {
        employee: 'employer',
        company_owner: 'applicant',
        independent_professional: 'applicant',
      },
      required: false,
      conditionalOn: occupationOneOf([
        'employee',
        'company_owner',
        'independent_professional',
      ]),
      applicabilityMigration: {
        priorCondition: {
          field: 'employment.employmentStatus',
          operator: 'equals',
          value: 'employed',
        },
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
    { code: 'EMPLOYMENT_LETTER', addSourceRefs: ['gr-tr-harmonised-list'] },
    { code: 'APPROVED_LEAVE', addSourceRefs: ['gr-tr-harmonised-list'] },
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
