import { deTrMissionSources } from '../../sources/de-tr-mission.sources'
import type { RequirementLayer } from '../../types'

/**
 * The German missions' authority over applications for Germany lodged in
 * Türkiye.
 *
 * The counterpart of `gr-tr-mission`, and deliberately the same shape: it
 * composes *after* `tr-filing`, so its citations refine in the direction
 * ADR-052 states, and it carries the two requirements the German sheet asks for
 * that no other authority in this repository does.
 *
 * WHY BOTH REQUIREMENTS ARE OWNED HERE AND NOT BY THE GERMANY DESTINATION
 * LAYER. The tempting reading is that a declaration under German law and a
 * German visa-history rule are true "because the destination is Germany". The
 * evidence says otherwise: the German mission in India publishes its own
 * tourism checklist and requires neither. So the common factor is not Germany
 * alone — it is Germany *as applied for in Türkiye*, which is what a mission
 * layer is for. Owning them at destination level would assert of every future
 * Germany-from-elsewhere composition something one official checklist already
 * contradicts.
 *
 * The layer-level quarantine says the same thing structurally: a `destination`
 * layer may not declare a requirement citing jurisdiction-scoped evidence, and
 * the checklist that evidences both of these is scoped to `TR`.
 */
export const deTrMissionLayer: RequirementLayer = {
  id: 'de-tr-mission',
  kind: 'jurisdiction',
  add: [
    /**
     * Item 1 of the checklist, which asks for the form "ve İkamet Kanunu'nun
     * 54. maddesine göre gerekli beyanname" — and the declaration required
     * under § 54 of the Residence Act.
     *
     * Modelled as its own requirement rather than folded into
     * `APPLICATION_FORM`, because it is a separate sheet the applicant signs,
     * and because `APPLICATION_FORM` is common-owned: a layer needing different
     * acceptance criteria must own the requirement outright rather than reword
     * somebody else's (ADR-052).
     *
     * Two citations, two different claims. The checklist establishes that this
     * must be submitted here; § 54(2) no. 8 is the provision the declaration
     * refers to, and its point (b) is why a declaration exists at all — the
     * consequences must have been pointed out beforehand. The statute alone
     * would not establish a document to bring.
     */
    {
      code: 'DE_S54_DECLARATION',
      nameKey: 'visa-domain:requirements.DE_S54_DECLARATION.name',
      descriptionKey: 'visa-domain:requirements.DE_S54_DECLARATION.description',
      notesKey: 'visa-domain:requirements.DE_S54_DECLARATION.notes',
      category: 'application_form',
      ownerType: 'applicant',
      required: true,
      sourceRefs: ['de-tr-tourism-checklist', 'de-aufenthg-54'],
      revision: 1,
    },
    /**
     * Item 3: "Son 10 (on) yıl içinde geçerli olan vizelerinizin (Schengen, AB,
     * Birleşik Krallık, ABD, Kanada) ve ilgili pasaportun birer adet
     * fotokopisi" — one copy each of your visas valid within the last ten
     * years, and of the passport carrying them.
     *
     * A NEW CODE RATHER THAN A REUSE OF `PREVIOUS_VISAS`, AND THAT IS THE RULE
     * RATHER THAN A PREFERENCE. One code carries one acceptance bar
     * (ADR-052a): a code is shared only where the evidence that satisfies one
     * destination would satisfy the other, and these are not interchangeable.
     * `PREVIOUS_VISAS` is Schengen visas, optional, and uncited; this is five
     * visa families, mandatory, bounded to ten years, and includes the passport
     * pages that carry them. An applicant who satisfied the first could fail
     * the second while `satisfiedRevision` claimed otherwise — the portability
     * break that reuse rule exists to prevent.
     *
     * `previous_travel` is the same category, which is correct: the category is
     * how a document is grouped on screen, not what it accepts.
     */
    {
      code: 'DE_TRAVEL_HISTORY_COPIES',
      nameKey: 'visa-domain:requirements.DE_TRAVEL_HISTORY_COPIES.name',
      descriptionKey:
        'visa-domain:requirements.DE_TRAVEL_HISTORY_COPIES.description',
      notesKey: 'visa-domain:requirements.DE_TRAVEL_HISTORY_COPIES.notes',
      category: 'previous_travel',
      ownerType: 'applicant',
      required: true,
      sourceRefs: ['de-tr-tourism-checklist'],
      revision: 1,
    },
    /**
     * MOVED HERE FROM `tr-filing` IN E5c, BECAUSE ONLY THIS DESTINATION ASKS
     * FOR IT.
     *
     * Vergi Levhası appears nowhere in the Commission's Annex III for Türkiye,
     * and the Greek mission's own published requirements — read first-hand —
     * are silent on it too. It sat in the shared Türkiye layer anyway, so Greek
     * applicants were asked for a company tax certificate on no authority at
     * all, while this pack cited it by refinement from the sheet that does ask.
     *
     * Removing it from one composition and keeping it in the other looked like
     * a case for suppression. It is not: the requirement simply was not
     * jurisdiction-level, and moving it to the layer that evidences it makes
     * Greece stop composing it as a consequence rather than as an exception.
     *
     * Two corrections travel with the move, and neither could be made while it
     * was shared. Section 4(c) of the sheet files it under "Firma sahipleri /
     * Serbest meslek sahipleri" — company owners and the self-employed — not
     * under employees, so the condition was targeting the wrong population in
     * both directions. And the sheet lists it without qualification for that
     * category, so it is required rather than optional. The note claiming it
     * "may be required depending on nationality" is gone: no source at any
     * level states a nationality rule of that shape.
     */
    {
      code: 'EMPLOYER_TAX_PLATE',
      nameKey: 'visa-domain:requirements.EMPLOYER_TAX_PLATE.name',
      descriptionKey: 'visa-domain:requirements.EMPLOYER_TAX_PLATE.description',
      category: 'employment',
      ownerType: 'employer',
      required: true,
      conditionalOn: {
        field: 'employment.employmentStatus',
        operator: 'equals',
        value: 'self_employed',
      },
      sourceRefs: ['de-tr-tourism-checklist'],
      revision: 1,
    },
  ],
  /**
   * Citations, and — since C1 — the mission's own acceptance detail.
   *
   * Citations are appended after the instrument each requirement already cites,
   * so the composed order reads authority-first: the Regulation or the
   * Commission act, then the mission's rendering of it. Every entry below
   * corresponds to a numbered item on one of the two sheets. Nothing is refined
   * because it seemed likely.
   *
   * `addDetail` is the second thing a refinement may now do, and eight entries
   * use it. Each carries criteria this mission publishes on a requirement it
   * does not own — an e-Devlet barcode, a policy original, a six-month chamber
   * copy. They are additive: the shared name, description and notes are
   * untouched and identical in Greece, and nothing here can change requiredness
   * or applicability. Each fragment is versioned, so the composed revision
   * moves for German applicants and not for Greek ones.
   */
  refine: [
    // The mission's restatement of the Visa Code criteria (general page).
    {
      // "Son on yıl içinde düzenlenmiş olmalıdır (uzatma kabul edilmemektedir)"
      // — a passport whose validity was extended rather than reissued is
      // refused, which the Visa Code does not say and Greece does not state.
      code: 'PASSPORT_CURRENT',
      addSourceRefs: ['de-tr-schengen-general'],
      addDetail: {
        detailKeys: [
          'visa-domain:detail.de-tr-mission.PASSPORT_CURRENT.extension',
        ],
        revision: 1,
      },
    },
    /**
     * PHOTOS — the case that argued for C1, now rendered rather than only
     * sourced.
     *
     * The general page asks for 35 x 45 mm, not older than six months,
     * full-face with nothing covering the head or eyes. Those are precisely the
     * assertions that left the *common* contract in C2 for having no authority
     * — and here they do have one, but only for this destination in this
     * jurisdiction. For three phases the citation was all that could travel, so
     * the requirement an applicant read said ICAO 9303 conformance and nothing
     * more while the specifics sat in a source record nobody opens.
     *
     * The note that used to sit here said fixing it needed a contract-bearing
     * override. That was the wrong conclusion, and this is the correction: what
     * it needed was an *additive* fragment. The shared contract still says ICAO
     * 9303, identically in both packs; Germany's page adds its measurements
     * beneath it, and Greece sees none of them.
     */
    {
      code: 'PHOTOS',
      addSourceRefs: ['de-tr-schengen-general'],
      addDetail: {
        detailKeys: [
          'visa-domain:detail.de-tr-mission.PHOTOS.size',
          'visa-domain:detail.de-tr-mission.PHOTOS.pose',
        ],
        revision: 1,
      },
    },
    {
      /**
       * Five axes, of which one — repatriation in case of death — was Article
       * 15(1)'s and went into the shared contract in E5a. The four here are the
       * mission's own and cannot: an AT11 policy is a common Turkish product
       * that satisfies the Visa Code and is refused at this counter.
       */
      code: 'TRAVEL_INSURANCE',
      addSourceRefs: ['de-tr-schengen-general'],
      addDetail: {
        detailKeys: [
          'visa-domain:detail.de-tr-mission.TRAVEL_INSURANCE.originalAndCopy',
          'visa-domain:detail.de-tr-mission.TRAVEL_INSURANCE.notRetroactive',
          'visa-domain:detail.de-tr-mission.TRAVEL_INSURANCE.noAgeLimit',
          'visa-domain:detail.de-tr-mission.TRAVEL_INSURANCE.at11',
        ],
        revision: 1,
      },
    },

    // Items 1, 7, 8, 9 and 10 of the checklist: the documents every applicant
    // brings.
    { code: 'APPLICATION_FORM', addSourceRefs: ['de-tr-tourism-checklist'] },
    {
      code: 'TRANSPORT_RESERVATION',
      addSourceRefs: ['de-tr-tourism-checklist'],
    },
    {
      // The sheet offers the same third route in its own words — "diğer
      // ulaşım tercihleri" — so the German evidence for this requirement is
      // independent of the harmonised list, not a restatement of it.
      code: 'TRANSPORT_MEANS_PROOF',
      addSourceRefs: ['de-tr-tourism-checklist'],
    },
    { code: 'ITINERARY', addSourceRefs: ['de-tr-tourism-checklist'] },
    { code: 'ACCOMMODATION', addSourceRefs: ['de-tr-tourism-checklist'] },
    {
      // The row E2 ranked highest for avoidable harm: an extract without the
      // e-Devlet barcode is refused at the counter, and obtaining the right one
      // costs nothing if you know in advance.
      code: 'CIVIL_REGISTRY_EXTRACT',
      addSourceRefs: ['de-tr-tourism-checklist'],
      addDetail: {
        detailKeys: [
          'visa-domain:detail.de-tr-mission.CIVIL_REGISTRY_EXTRACT.edevlet',
        ],
        revision: 1,
      },
    },
    { code: 'BANK_STATEMENTS', addSourceRefs: ['de-tr-tourism-checklist'] },
    { code: 'PAYSLIPS', addSourceRefs: ['de-tr-tourism-checklist'] },

    // Section 4 of the checklist, by applicant category.
    {
      code: 'EMPLOYMENT_LETTER',
      addSourceRefs: ['de-tr-tourism-checklist'],
      addDetail: {
        detailKeys: [
          'visa-domain:detail.de-tr-mission.EMPLOYMENT_LETTER.original',
        ],
        revision: 1,
      },
    },
    {
      // Germany asks for one original letter carrying both this and the
      // employment details. The detail says so; it does not merge the two rows,
      // which would be a structural change a refinement may not make.
      code: 'APPROVED_LEAVE',
      addSourceRefs: ['de-tr-tourism-checklist'],
      addDetail: {
        detailKeys: [
          'visa-domain:detail.de-tr-mission.APPROVED_LEAVE.original',
        ],
        revision: 1,
      },
    },
    {
      code: 'SOCIAL_SECURITY',
      addSourceRefs: ['de-tr-tourism-checklist'],
      addDetail: {
        detailKeys: [
          'visa-domain:detail.de-tr-mission.SOCIAL_SECURITY.edevlet',
          'visa-domain:detail.de-tr-mission.SOCIAL_SECURITY.bothDocuments',
        ],
        revision: 1,
      },
    },
    {
      // "Ticaret veya Sanayi Odası ... (6 aydan eski olmamalı)" — a wider set of
      // acceptable issuers than the shared contract implies, and a recency bar
      // it does not state at all.
      code: 'EMPLOYER_TRADE_REGISTRY',
      addSourceRefs: ['de-tr-tourism-checklist'],
      addDetail: {
        detailKeys: [
          'visa-domain:detail.de-tr-mission.EMPLOYER_TRADE_REGISTRY.chamberAndAge',
        ],
        revision: 1,
      },
    },
    { code: 'STUDENT_CERTIFICATE', addSourceRefs: ['de-tr-tourism-checklist'] },

    /**
     * Deliberately absent, so that the gaps are decisions rather than
     * oversights:
     *
     *  - `PENSIONER_BOOKLET` — the sheet asks for documents showing pension
     *    *payments* over the last three months; Annex III I.4(c) asks for the
     *    pensioner booklet, which is what this requirement's contract renders.
     *    Different documents. Citing the sheet here would attribute to it
     *    something it does not ask for, and changing the contract would be a
     *    destination rewording a requirement it does not own.
     *  - `TAX_PAYMENT_STATEMENT`, `COMPANY_ACTIVITY_CERTIFICATE` — in Annex III
     *    for the jurisdiction, absent from this mission's sheet. They compose
     *    because they are jurisdiction-level, and they carry the Commission act
     *    alone, which is the honest state.
     *  - `PROPERTY_DEED`, the sponsor requirements, `RELATIONSHIP_PROOF` — not
     *    on this sheet at all; they carry their Annex II citations or none.
     */
  ],
  sources: deTrMissionSources,
}
