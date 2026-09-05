import { composeVisaTemplate } from '../../composition'
import { greeceSources } from '../../sources/greece.sources'
import {
  commonSchengenDocuments,
  commonPreparationMilestones,
  commonSchengenLayer,
} from '../common/schengen-short-stay'
import { trFilingLayer } from '../jurisdictions/tr-filing'
import type { RequirementLayer, VisaTypeTemplate } from '../../types'

/**
 * Greece — Schengen short-stay, tourism (Type C), composed for applications
 * lodged in Türkiye.
 *
 * THE DESTINATION LAYER OWNS NO REQUIREMENTS, AND THAT IS A FINDING RATHER THAN
 * AN OVERSIGHT. Classifying all twenty-eight by the evidence the pack actually
 * carries leaves nothing that is true because the destination is Greece: every
 * requirement is either EU-level (the Visa Code) or Türkiye-level (the
 * harmonised list adopted for Türkiye). What Greece genuinely owns is its
 * identity, its review metadata, its three template notes, and the decision
 * about which filing jurisdiction this pack is composed for.
 *
 * That is the clearest evidence the split is drawn in the right place: this
 * pack was never "Greece", it was "EU + Türkiye" wearing a Greek name.
 */
export const greeceDestinationLayer: RequirementLayer = {
  id: 'greece',
  kind: 'destination',
  sources: greeceSources,
}

/**
 * The canonical order of the composed checklist.
 *
 * Order is load-bearing, not presentational. It decides the sequence documents
 * are seeded into a new dossier, and `deriveNextDocument` picks the *first*
 * required requirement with no record yet — so reordering this array changes
 * which document the workspace tells an applicant to get next.
 *
 * It is stated explicitly because layer order would not reproduce it. The
 * Türkiye-owned requirements are interleaved through the middle of the list
 * (positions 9–13) and again at the end, which is where they sat when the pack
 * was two concatenated arrays. Preserving that exactly is what makes the layer
 * split a refactor rather than a change to what applicants are asked for; the
 * pin in `greece-composition-pin.test.ts` is what proves it.
 */
const GREECE_TOURISM_ORDER = [
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

/**
 * Composed once, at module load.
 *
 * `resolveVisaTemplate` therefore returns the same object every time, exactly
 * as it did when this was an array literal — which matters because a dozen
 * `useMemo([template])` hooks across the feature models depend on that
 * reference being stable, and the `DossierProvider` reducer resolves the
 * template synchronously on every document update.
 *
 * Composing here rather than behind a cache in the resolver also means a
 * malformed pack fails at **import** — a boot error naming the conflict, not a
 * lazy one on whichever screen happens to resolve first.
 */
export const greeceTourismComposition = composeVisaTemplate({
  base: {
    id: 'schengen-short-stay-tourism',
    visaType: 'short_stay_tourism',
    nameKey: 'visa-domain:visaTypes.schengen-short-stay-tourism',
    /**
     * Milestones are not layer-owned yet. The composer has a vocabulary for
     * requirements only, so these stay concatenated as they were. Splitting
     * them is a separate question — one of the seven is Greece's and six are
     * shared — and doing it inside the behaviour-risk slice would have meant
     * changing the composer to change the pack at the same time.
     */
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
     * Unchanged by the layer split, deliberately. `templateVersion` versions
     * what the pack *asks an applicant for*, and the composed output is
     * identical to what the concatenated arrays produced — same codes, same
     * order, same revisions, same citations. Bumping it would assert a change
     * to the requirements that did not happen.
     */
    templateVersion: '1.4.0',
    lastReviewedAt: '2026-08-29',
    /**
     * Still derived from evidence rather than chosen: 18 of the 28 requirements
     * carry their own resolvable, dated source. A test recomputes it rather
     * than trusting this line (ADR-047, ADR-048). Moving requirements between
     * layers changes neither their citations nor the arithmetic.
     */
    reviewStatus: 'partially_verified',
    sourceIds: ['gr-mfa-general'],
  },
  /**
   * THE TRANSITIONAL SEAM. The destination declares which filing jurisdiction
   * production composes, because the domain cannot yet answer "where is this
   * application being lodged?" — there is no `filingJurisdiction` field, and
   * `countryOfResidence` means something else (a Turkish national resident in
   * Germany may file in either).
   *
   * This is NOT an assertion that Greece implies Türkiye. It is a placeholder
   * for a selector that does not exist yet, and it is shaped so that when one
   * arrives it replaces this line without disturbing the ownership layers
   * themselves. Do not read it as domain truth, and do not derive a
   * jurisdiction from residence to remove it.
   */
  layers: [commonSchengenLayer, greeceDestinationLayer, trFilingLayer],
  requirementOrder: GREECE_TOURISM_ORDER,
})

export const greeceTourismTemplate: VisaTypeTemplate =
  greeceTourismComposition.template

export { commonSchengenDocuments }
