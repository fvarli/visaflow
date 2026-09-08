import type {
  DocumentCategory,
  OwnerType,
  VisaType,
} from '@/domain/types/common'

/**
 * Configuration model: country → visa type → requirements.
 *
 * Everything here is a TEMPLATE describing what an application may need. It
 * is never applicant data. The distinction matters:
 *
 *   DocumentRequirement — configuration. "A short-stay tourism application
 *                         may need an employment letter."
 *   Document (instance) — applicant record. "This applicant's employment
 *                         letter is requested and expires on 2026-09-01."
 *
 * Identifiers (countryCode, visaTypeId, requirement `code`) are stable and
 * language-independent. Everything a user reads is a translation key.
 */

export interface ConditionalRequirement {
  field: string
  operator: 'equals' | 'notEquals' | 'exists' | 'notExists' | 'includes'
  value?: string | boolean | number
}

/**
 * Where a requirement came from.
 *
 * VisaFlow does not scrape or call official websites. A source record is a
 * manually maintained citation, and its absence is meaningful: it means the
 * requirement has not been checked against a current official publication.
 */
export type RequirementSourceType =
  | 'embassy'
  | 'consulate'
  | 'authorized_visa_center'
  | 'government'
  | 'regulation'
  | 'other'

export interface RequirementSource {
  id: string
  /** Publishing body, as it names itself. A proper noun, so not translated. */
  authority: string
  /** Translation key for the document or page title. */
  titleKey: string
  url?: string
  sourceType: RequirementSourceType
  /** ISO 3166-1 alpha-2 where this source has authority. */
  jurisdiction?: string
  /** BCP 47 tag of the source document itself, not of the UI. */
  language?: string
  /** ISO date a maintainer last confirmed this template against the source. */
  lastVerifiedAt?: string
  /** ISO date the source was retrieved. */
  retrievedAt?: string
  notesKey?: string
}

/**
 * Content-maintenance status. NOT a legal guarantee, and never a statement
 * about whether a visa will be granted — only a record of how recently a
 * human checked this template against an official publication.
 */
export type ReviewStatus =
  'unverified' | 'partially_verified' | 'verified' | 'needs_review'

export interface DocumentRequirement {
  /** Stable and language-independent. Also the key into visa-domain strings. */
  code: string
  nameKey: string
  descriptionKey?: string
  notesKey?: string
  category: DocumentCategory
  ownerType: OwnerType
  required: boolean
  conditionalOn?: ConditionalRequirement
  /**
   * @deprecated Non-authoritative. Do not read this in production code.
   *
   * Ten of these numbers exist across the packs (90, 180, 30×8) and **nothing
   * consumes them**. That is the only reason they are harmless: they are
   * document-age rules with no recorded source, so the moment a consumer
   * appears VisaFlow begins asserting "payslips are valid 30 days" on nobody's
   * authority — an invented deadline of exactly the kind ADR-015 forbids.
   *
   * Kept rather than deleted because removing it is a change to the shared
   * pack contract with no offsetting benefit while it is inert. A normative
   * validity or freshness value must carry a verified `sourceRefs` entry
   * **before** any readiness, freshness, timeline, warning or UI consumer may
   * read it (ADR-046). A test pins the absence of consumers.
   */
  validityPeriodDays?: number
  /** Zero or more RequirementSource ids. Empty means unverified. */
  sourceRefs?: string[]
  /**
   * Composition-scoped acceptance detail, appended by a later layer.
   *
   * Never declared by the owner — an owner's criteria belong in its own
   * `descriptionKey`/`notesKey`. These are i18n keys a *refining* layer
   * attached because the destination or filing jurisdiction publishes a bar the
   * shared requirement cannot state: Germany's civil-registry extract must
   * carry an e-Devlet barcode, and Greece's must not be told so.
   *
   * Additive by construction. The base contract is untouched, so an applicant
   * still sees the shared name, description and notes; this is extra detail
   * beneath them, in the order the layers composed. Absent when no layer
   * attached any, which is every requirement in a single-layer composition.
   */
  detailKeys?: string[]
  /**
   * The **acceptance contract** version — the criteria this pack *renders to
   * the applicant*, not what the authority has always required.
   *
   * Bumped only when a claim that was previously sufficient might no longer be:
   * the same requirement, asking for stricter evidence. Wording, translations
   * and citations move freely without it, because invalidating somebody's
   * completed work over a copy edit would be worse than the staleness it
   * detects. The governing test is directional — did the *rendered* criteria
   * start accepting a strictly smaller set of evidence? Motive is irrelevant:
   * correcting our own under-specification lands on the applicant exactly like
   * a deliberate tightening, because they confirmed against the shorter list.
   *
   * **Required, and starts at 1.** It was briefly optional with an implicit
   * `?? 1` default, which is how a `revision: 0` typo could reach the persisted
   * schema and make a dossier unimportable — and, worse, let a new requirement
   * acquire a revision nobody chose. Declaring it is a decision a pack author
   * must make, not boilerplate to infer.
   *
   * Every value above 1 is recorded in `REQUIREMENT_REVISIONS` with its reason,
   * and registry-wide tests hold the two in agreement (ADR-051).
   */
  revision: number
}

export interface PreparationMilestone {
  id: string
  nameKey: string
  descriptionKey: string
  daysBeforeAppointment: number
  relatedDocuments?: string[]
}

export interface VisaTypeTemplate {
  /** Stable, language-independent, e.g. 'schengen-short-stay-tourism'. */
  id: string
  /** Maps to the persisted dossier `application.visaType` enum. */
  visaType: VisaType
  nameKey: string
  documentRequirements: DocumentRequirement[]
  preparationMilestones: PreparationMilestone[]
  notesKeys?: string[]

  /** Template maintenance metadata. */
  templateVersion: string
  lastReviewedAt?: string
  reviewStatus: ReviewStatus
  sourceIds?: string[]
}

export interface CountryConfig {
  /** ISO 3166-1 alpha-2. The stable identifier stored in the dossier. */
  countryCode: string
  nameKey: string
  schengenMember: boolean
  visaTypes: VisaTypeTemplate[]
  /** Source records referenced by this country's requirements. */
  sources?: RequirementSource[]
}

/**
 * Which ownership layer a set of requirements belongs to.
 *
 * The three answer three different questions, and conflating them is what
 * ADR-048 quarantined: `commonSchengenDocuments` claims to be shared across
 * Schengen while carrying Türkiye-scoped citations and Turkish institution
 * names, which a second pack would inherit whole.
 *
 *  - `common`       — true of Schengen short-stay applications generally.
 *  - `destination`  — true because of the country being travelled to.
 *  - `jurisdiction` — true because of where and how the application is lodged.
 *
 * Rank is meaningful, not decorative: layers compose in this order, and the
 * composer refuses a list that is not in it. A `kind` nothing reads would be
 * the shape ADR-050 warns about — metadata that looks authoritative and is
 * never consulted.
 */
export type LayerKind = 'common' | 'destination' | 'jurisdiction'

/**
 * One ownership layer's contribution to a composed template.
 *
 * A layer may declare requirements it **owns**, and may append citations to
 * requirements an earlier layer owns. That is the whole vocabulary. It cannot
 * remove a requirement, hide one, or change what one asks for — see
 * `CitationRefinement` for why.
 */
export interface RequirementLayer {
  /** Stable layer id, e.g. 'schengen-short-stay' | 'greece' | 'tr-filing'. */
  id: string
  kind: LayerKind
  /**
   * Requirements this layer owns.
   *
   * A `code` is the identity of a record in someone's dossier (ADR-049), so it
   * must mean one thing everywhere: exactly one layer owns a code, registry-
   * wide, and that layer owns its `revision`.
   */
  add?: DocumentRequirement[]
  refine?: CitationRefinement[]
  /** Source records this layer contributes to the composed pool. */
  sources?: RequirementSource[]
}

/**
 * Acceptance detail a refining layer attaches to an inherited requirement.
 *
 * The detail is *additional* criteria the applicant must meet in this
 * composition, so by the ADR-051 directional test it tightens the bar: evidence
 * that satisfied the shared contract can fail the composed one. It therefore
 * carries its own `revision`, and the composed requirement's revision moves
 * with it. Attaching detail without versioning it would be the under-
 * specification ADR-051a forbids, wearing a new hat.
 */
export interface AcceptanceDetailFragment {
  /**
   * i18n keys, rendered beneath the inherited contract in declaration order.
   *
   * Keys rather than prose for the same reason every other contract string is a
   * key: the pack must not carry language, and both locales must stay in step.
   */
  detailKeys: string[]
  /**
   * This fragment's own contract version, starting at 1.
   *
   * Moves when the *detail* tightens. The owner's `revision` is untouched — a
   * German fragment must never supersede a Greek applicant's claim.
   */
  revision: number
}

/**
 * What a layer may do to a requirement it does not own: append citations, and
 * append composition-scoped acceptance detail.
 *
 * Deliberately **not** a partial `DocumentRequirement`, and the distinction is
 * the whole design. A refinement cannot change identity, requiredness,
 * applicability, category, ownership or the base contract's own prose. It can
 * only *add* — a citation, or detail rendered beneath what the owner wrote.
 *
 * WHY `addDetail` EXISTS, HAVING BEEN REFUSED BEFORE. Both production packs
 * inherit `CIVIL_REGISTRY_EXTRACT`, `TRAVEL_INSURANCE` and `PHOTOS` from layers
 * they share, and the German mission publishes acceptance bars on all three
 * that the Greek one does not. Every current-model route was tried and each is
 * wrong in a different way: putting the German bar in the shared contract
 * asserts it to Greek applicants and to every future pack; a second code breaks
 * one-code-one-bar; moving ownership deletes the requirement from the other
 * pack. The rejected alternative was a *contract-bearing override* that
 * replaces prose or `required`, and that stays rejected — this is strictly
 * additive and cannot express replacement or suppression.
 *
 * THE PORTABILITY CONSEQUENCE, STATED RATHER THAN HIDDEN. Because a fragment
 * moves the composed revision, the same code can carry a different revision in
 * two compositions, and a dossier exported from Greece and imported for Germany
 * may find a `ready` claim superseded. Earlier notes here called that the
 * aliasing ADR-049 forbids. It is not: ADR-049 forbids one code meaning two
 * different *requirements*, and this is one requirement whose composed bar
 * genuinely differs by destination. Being asked to re-check a photograph
 * against Germany's stated size and age is the correct answer, not a defect.
 * What is *not* solved is the reverse ambiguity — two compositions can arrive
 * at the same composed number by different routes — and that is why the number
 * is only ever compared within one composition.
 */
export interface CitationRefinement {
  code: string
  addSourceRefs?: string[]
  addDetail?: AcceptanceDetailFragment
}

/**
 * Unchanged from the previous configuration model — conditional evaluation
 * must behave identically, so this logic is reused verbatim.
 */
export function isRequirementApplicable(
  requirement: DocumentRequirement,
  context: Record<string, unknown>
): boolean {
  if (!requirement.conditionalOn) return true

  const { field, operator, value } = requirement.conditionalOn
  const fieldValue = getNestedValue(context, field)

  switch (operator) {
    case 'equals':
      return fieldValue === value
    case 'notEquals':
      return fieldValue !== value
    case 'exists':
      return (
        fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
      )
    case 'notExists':
      return (
        fieldValue === undefined || fieldValue === null || fieldValue === ''
      )
    case 'includes':
      return Array.isArray(fieldValue) && fieldValue.includes(value)
    default:
      return true
  }
}

// Helper to get nested object value by dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}
