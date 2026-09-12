import type {
  CountryCode,
  DocumentCategory,
  EmploymentStatus,
  FinancingSource,
  KnownOccupationCode,
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

/** What a condition may be authored against. Literal primitives only. */
export type ConditionValue = string | number | boolean

/**
 * When a requirement applies, as a discriminated union rather than one shape
 * with optional payloads.
 *
 * The looser form — `value?` and `values?` side by side — lets a pack author
 * `oneOf` with a scalar, `equals` with a set, a presence operator carrying
 * either, or an empty set, and leaves all four to be caught at runtime by a
 * test somebody has to remember to write. Discriminating on the operator makes
 * them unrepresentable instead.
 *
 * THIS IS NOT THE THING ADR-053 REJECTED. That decision refused a discriminated
 * union at the **persisted** boundary, because an inconsistent file must never
 * fail its whole slice on the way in. Nothing here is parsed, persisted or
 * round-tripped: this is a config-authoring type, read only from source a
 * maintainer wrote, and compile-time strictness costs a user nothing.
 */
export type ConditionalRequirement =
  | {
      field: string
      operator: 'equals' | 'notEquals' | 'includes'
      value: ConditionValue
    }
  | { field: string; operator: 'exists' | 'notExists' }
  | {
      field: string
      operator: 'oneOf'
      /**
       * Non-empty by type. An empty set matches nothing, which is never what an
       * author meant and is invisible when it happens — so a tuple makes
       * `values: []` a compile error, and the config invariant covers what the
       * type cannot (duplicates, non-literals).
       */
      values: readonly [ConditionValue, ...ConditionValue[]]
    }

/**
 * The one way a pack asks about occupation.
 *
 * `ConditionalRequirement.value` is `string | boolean | number`, so a pack has
 * never been type-checked against any vocabulary — `value: 'farmr'` compiles
 * today and would compile against a closed enum too. This is where that safety
 * is created rather than assumed: the argument is a `KnownOccupationCode`, so a
 * typo is a compile error at the site where it is made.
 *
 * It also fixes the field, which matters more than it looks. `employment.occupation`
 * is the **effective** value the resolver produced; `employment.occupationCode`
 * is the raw persisted string, and a pack that reached for the second would be
 * comparing against a code no build validated. Authors cannot choose the wrong
 * one through this door, and an invariant test catches anyone who writes the
 * literal instead (ADR-053).
 *
 * Deliberately not a builder. One field, one operator, one code — a general
 * expression API is a capability with no caller, and `oneOf` is a separate
 * decision on its own evidence.
 */
export function occupationIs(
  code: KnownOccupationCode
): ConditionalRequirement {
  return { field: 'employment.occupation', operator: 'equals', value: code }
}

/**
 * Ask about occupation with a set of known codes.
 *
 * `oneOf`'s own tuple only guarantees non-emptiness, and its members are
 * `ConditionValue` — so `values: ['farmr']` compiles. This narrows both: the
 * argument is a non-empty tuple of `KnownOccupationCode`, so an empty set and a
 * typo are each a compile error at the site where they are written, and the
 * field is fixed to the resolved value rather than the raw persisted one.
 */
export function occupationOneOf(
  codes: readonly [KnownOccupationCode, ...KnownOccupationCode[]]
): ConditionalRequirement {
  return { field: 'employment.occupation', operator: 'oneOf', values: codes }
}

/**
 * How a requirement behaves for an applicant who has no usable occupational
 * classification — the compatibility half of a coarse→fine migration (ADR-053a).
 *
 * WHY THIS SITS BESIDE `conditionalOn` RATHER THAN INSIDE IT. They answer
 * different questions. `conditionalOn` says *when does this requirement apply*;
 * this says *what did it used to say, and for whom, while we wait for the
 * applicant to tell us something the old contract never needed*. Folding the
 * second into the condition language would mean a nested condition inside a
 * condition — general machinery built for one narrow case, and a shape in which
 * the ordinary reading of a requirement's applicability is no longer a single
 * expression.
 *
 * IT IS NOT AN ENTITLEMENT. Carrying this object does not make a requirement
 * entitled to it: a row written tomorrow could quote any prior contract it
 * liked. `APPLICABILITY_MIGRATIONS` is the authoritative gate and this is its
 * executable representation, held in agreement by an invariant that checks both
 * directions — exactly how `REQUIREMENT_REVISIONS` relates to `revision`, which
 * likewise has no runtime accessor.
 */
export interface ApplicabilityMigration {
  /**
   * The accepted coarse condition this requirement applied under before its
   * applicability moved to the occupational axis.
   *
   * Evaluated verbatim while classification is unavailable — *evaluated*, not
   * treated as "applies to everyone unclassified". A row whose prior contract
   * was `employmentStatus = employed` must still not reach a self-employed
   * applicant, which is the case that ruled out a flat sentinel (ADR-053a).
   */
  priorCondition: ConditionalRequirement
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
  /**
   * Whose situation this evidence describes — the **declared default**, and the
   * answer for everyone unless `ownerByOccupation` names their occupation.
   *
   * Required, and deliberately not made optional by the contextual map beside
   * it. It is what a seeded record copies, what an unclassified applicant gets,
   * and what an unresolvable code falls back to ([ADR-049a](#adr-049a)).
   */
  ownerType: OwnerType
  /**
   * The subject, where a source asks the same document of populations it
   * belongs to differently.
   *
   * The Greek visa centre asks an employee, a company owner and a freelancer
   * for the same `İmza Sirküleri`: the employer's company in the first case and
   * the applicant's own in the other two. One evidence identity, one code, one
   * acceptance bar — and two subjects. ADR-049a settles that a subject is not
   * identity, so this is metadata rather than a second requirement.
   *
   * **An object map rather than a list, for what the compiler gets from it.** A
   * repeated occupation is unstateable in an object literal; a misspelled one is
   * caught by excess-property checking at the authoring site; and
   * `noUncheckedIndexedAccess` types the lookup as possibly-undefined, so the
   * fallback below is forced rather than remembered.
   *
   * Only occupation, deliberately. ADR-049a authorises a bounded profile
   * dependence and this is the narrowest form of it — no nationality, no
   * financing, no sponsor, no condition tree, no raw dossier access.
   */
  ownerByOccupation?: Partial<Record<KnownOccupationCode, OwnerType>>
  required: boolean
  conditionalOn?: ConditionalRequirement
  /**
   * Present only on a requirement whose applicability is being migrated from
   * the coarse employment axis to the occupational one, and only where
   * `APPLICABILITY_MIGRATIONS` records the entitlement (ADR-053a).
   *
   * Absent on every requirement that was authored against the fine axis to
   * begin with — those have no prior contract to preserve and must keep failing
   * closed until the applicant classifies themselves.
   */
  applicabilityMigration?: ApplicabilityMigration
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
   * The identity of the acceptance contract *this composition* renders — set by
   * the composer, never authored in a layer.
   *
   * `revision` says how far one contract has tightened over time; this says
   * *which* contract, and the two are different questions the moment a
   * requirement can carry composition-scoped detail. It is what a completion
   * claim is stamped against, so that a claim made under Greece cannot read as
   * current under Germany merely because two numbers happen to match.
   *
   * Optional on the type because a hand-built `DocumentRequirement` in a test
   * has no composer to derive it; every requirement reaching production through
   * `composeVisaTemplate` has one.
   */
  contractKey?: string
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
  /**
   * Obligations an authority lets the applicant satisfy in more than one way.
   *
   * Absent when the pack has none, so a template composed before C3a is
   * unchanged. See `SatisfactionGroup`.
   */
  satisfactionGroups?: SatisfactionGroup[]

  /** Template maintenance metadata. */
  templateVersion: string
  lastReviewedAt?: string
  reviewStatus: ReviewStatus
  sourceIds?: string[]
}

/**
 * One obligation, several accepted documents — "any one of these will do".
 *
 * Annex III I.1 is the case that forced it: "Travel arrangements: flight
 * reservations, other proof of intended means of transport, **or** proof of
 * travel itinerary." VisaFlow rendered that as one mandatory requirement and two
 * optional ones, which is stricter than the binding list — an applicant holding
 * a perfectly acceptable itinerary was told they were missing a booking, and
 * readiness agreed with the demand rather than the authority.
 *
 * WHY IT IS NOT REQUIREDNESS. Marking all three optional removes the obligation
 * from readiness entirely, so somebody with none of them reads as complete.
 * Marking one required keeps the false demand. The obligation is real and the
 * *choice* is real, and neither flag can say both — which is why this is a
 * group rather than a flag.
 *
 * WHAT IT IS NOT. It cannot suppress a requirement, replace one, or change what
 * any member asks for; members keep their own contracts and revisions. A group
 * only says how many of them the applicant owes: one.
 */
export interface SatisfactionGroup {
  /** Stable within a composition. Used in tests and diagnostics, never stored. */
  id: string
  /**
   * The codes, in the order the authority lists them.
   *
   * Order is load-bearing in one place: when nothing in the group is satisfied,
   * the first *applicable* member is what the workspace recommends next.
   */
  anyOf: string[]
  /** i18n key naming the obligation the members share. */
  labelKey: string
  /** The clause that offers the choice. */
  sourceRefs?: string[]
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
  /**
   * Alternative-satisfaction groups this layer declares.
   *
   * Declared by the layer whose instrument offers the choice, which is not
   * necessarily the layer that owns the members: Annex III offers the travel
   * alternatives and two of the three codes belong to the common layer. Like a
   * refinement, a group may only reach requirements already declared.
   */
  groups?: SatisfactionGroup[]
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
   * Moves when the *detail* tightens, and it is part of the composed
   * `contractKey` rather than being added into `revision`. The owner's revision
   * is untouched — a German fragment must never supersede a Greek applicant's
   * claim, and summing the two numbers was how it once could.
   *
   * A fragment's revision 1 is itself a contract change, unlike a requirement's:
   * the requirement is being born, while the fragment is adding criteria to
   * something already published. So the ledger records fragments from 1, not
   * from 2.
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
 * THE PORTABILITY CONSEQUENCE, AND HOW IT IS CARRIED. The same code renders a
 * different acceptance bar in two compositions, so a claim made under Greece
 * must not read as satisfied under Germany. That is not the aliasing ADR-049
 * forbids — ADR-049 forbids one code meaning two different *requirements*, and
 * this is one requirement whose bar genuinely differs by destination. Being
 * asked to re-check a photograph against Germany's stated size is the correct
 * answer, not a defect.
 *
 * It is carried by `DocumentRequirement.contractKey`, not by the revision. An
 * earlier version of this note claimed the composed revision was enough because
 * it increased monotonically; it was wrong, because monotonic is not unique,
 * and both packs shipped `PHOTOS` at revision 2 with different bars. The
 * comparison `satisfiedRevision < revision` assumes a total order, and a
 * requirement with per-composition detail has a tree of contracts rather than a
 * chain.
 */
export interface CitationRefinement {
  code: string
  addSourceRefs?: string[]
  addDetail?: AcceptanceDetailFragment
}

/**
 * What a requirement's `conditionalOn` may read — the whole capability surface,
 * written out.
 *
 * A **bounded projection of the dossier, not a window onto it.** The dossier
 * holds passports, previous visas, refusals and two deprecated identifiers that
 * nothing may consume; handing all of that to pack configuration because it
 * happens to be in scope would let any future condition reach any of it, and
 * nobody would notice until a pack asserted something on a field it had no
 * business reading. Widening this type is how the capability grows, and it
 * should take an argument each time.
 *
 * Each field is typed nominally from `domain/types/common`, which the config
 * layer already depends on — so this stays a projection rather than a copy of
 * the schema shapes, and adding it opens no new dependency edge. Importing
 * `Employment` or `Applicant` from `domain/schemas` instead would pull in every
 * field those carry, which is the thing being avoided.
 *
 * Being a real type rather than `Record<string, unknown>` is also what stops a
 * caller handing this function some other object that happens to be in scope —
 * the failure that let three call sites drift apart before H4c1.
 */
export interface ApplicabilityContext {
  /**
   * Two fields, one axis apart, and the second one is already resolved.
   *
   * `employmentStatus` is the coarse state. `occupation` is the **effective**
   * occupational code — known to this build *and* legal for that status — as
   * produced by the resolver in `features/documents/applicability.ts`. The raw
   * persisted string never arrives here: a code this build does not recognise,
   * or one that contradicts the status, is inert by being absent rather than by
   * being special-cased downstream (ADR-053).
   *
   * Widening this type took an argument, as the comment above requires. The
   * argument is that consular checklists branch on occupation — an institution
   * letter and card for a public servant, no company-document block, neither
   * for a farmer — and that Annex III names Farmers and Company owners as
   * categories of their own.
   */
  employment?: {
    employmentStatus?: EmploymentStatus
    occupation?: KnownOccupationCode
  }
  financing?: { source?: FinancingSource }
  /**
   * Nationality only. Nothing else about the applicant is exposed.
   *
   * The `never`s are the boundary, not decoration. Without them a whole
   * `Applicant` is assignable here — a reference, so the excess-property check
   * never fires — and a pack could then author
   * `conditionalOn: 'applicant.passport.number'` and have it resolve, because
   * the evaluator walks whatever object it is handed. Naming two of the fields
   * that must not arrive is what makes "nationality only" a fact rather than an
   * intention.
   */
  applicant?: { nationality?: CountryCode; id?: never; passport?: never }
  applicationId?: never
  /**
   * This is not an `Application`, and the type now says so.
   *
   * H4c1 gave the context a name but not an identity: `Application` carries
   * optional `employment` and `financing` too, so it satisfied this interface
   * structurally and could be passed anywhere a context was expected. It
   * resolved those two fields and silently dropped nationality. Five production
   * call sites in the validation rules did exactly that, and the defect shipped
   * — every rules fixture is Turkish, so a green suite proved nothing.
   *
   * `applicationId` is a required `string` on `Application`, so declaring it
   * `never` here is an ordinary assignability failure rather than an
   * excess-property check: it fires on variables and member expressions, which
   * is precisely what the excess-property check could not do. It costs nothing
   * at runtime and the builder never sets it.
   */
}

/**
 * One notion of "the dossier does not say", shared by every operator that needs
 * it, so the presence tests and the value comparisons cannot drift apart.
 */
function isAbsent(fieldValue: unknown): boolean {
  return fieldValue === undefined || fieldValue === null || fieldValue === ''
}

/**
 * Whose situation this requirement's evidence describes, for this applicant.
 *
 * The declared `ownerType` unless the applicant has an effective occupation the
 * requirement maps differently. *Effective* is the whole safety property: the
 * context carries only a code this build knows **and** that is legal for the
 * recorded status, so an absent answer, a code from a newer version and a stale
 * code left behind by a status change are already indistinguishable here — all
 * three arrive as `undefined` and all three get the declared default. The raw
 * persisted string is not reachable from this function and must never become so
 * ([ADR-053](#adr-053), [ADR-049a](#adr-049a)).
 *
 * Pure, and total: there is no state in which this returns nothing.
 */
export function effectiveOwnerType(
  requirement: DocumentRequirement,
  context: ApplicabilityContext
): OwnerType {
  const occupation = context.employment?.occupation
  if (occupation === undefined) return requirement.ownerType
  return requirement.ownerByOccupation?.[occupation] ?? requirement.ownerType
}

/**
 * Does this requirement apply to the dossier described by `context`?
 *
 * ABSENT FIELDS DO NOT MATCH A VALUE COMPARISON, and that is a correction, not
 * an inherited behaviour. `notEquals` was a bare `!==`, so a condition of the
 * form "nationality is not TR" returned **true** for a dossier that had not
 * said what the nationality was — an unknown answer became a positive one, and
 * the engine manufactured an obligation out of ignorance. For a checklist that
 * is the wrong direction to fail in: a document nobody needs is worse than a
 * requirement that appears once the applicant fills the field in.
 *
 * It applies to `equals` and `notEquals` only. `exists` and `notExists` are
 * presence tests — `notExists` is *defined* by absence, and a blanket rule
 * would turn it into a dead operator. `includes` already returns false for an
 * absent field through its `Array.isArray` guard.
 *
 * Safe to change when it was changed: every `conditionalOn` in the repository,
 * in the packs and in the tests alike, used `equals`, which already behaved
 * this way. The correction is to an operator nothing had used yet.
 */
export function isRequirementApplicable(
  requirement: DocumentRequirement,
  context: ApplicabilityContext
): boolean {
  if (!requirement.conditionalOn) return true

  /**
   * A migrated requirement answers with its prior contract until the applicant
   * has an occupation this build can route from, and with its corrected one
   * afterwards (ADR-053a).
   *
   * The test is the **effective** value, so absent, unknown-to-this-build and
   * known-but-stale all land here together — they are one state with three
   * causes, and the resolver has already collapsed them. Nothing reads the raw
   * persisted code, and nothing is inferred from its absence.
   *
   * Once classified the prior contract is not consulted at all, which is what
   * lets a migration subtract as well as add: a self-employed farmer stops
   * matching a company-document row the moment they say so.
   */
  const migration = requirement.applicabilityMigration
  const condition =
    migration && context.employment?.occupation === undefined
      ? migration.priorCondition
      : requirement.conditionalOn

  const fieldValue = getNestedValue(
    context as Record<string, unknown>,
    condition.field
  )

  // Destructured per arm rather than up front: the switch narrows the union, so
  // each case can read only the payload its own operator declares.
  switch (condition.operator) {
    case 'equals':
      return !isAbsent(fieldValue) && fieldValue === condition.value
    case 'notEquals':
      return !isAbsent(fieldValue) && fieldValue !== condition.value
    case 'exists':
      return !isAbsent(fieldValue)
    case 'notExists':
      return isAbsent(fieldValue)
    case 'includes':
      return Array.isArray(fieldValue) && fieldValue.includes(condition.value)
    /**
     * Is the scalar at `field` one of an authored set?
     *
     * The mirror of `includes`, and deliberately not an alias for it:
     * `includes` wants the *field* to be the array and the value to be the
     * needle. Here the set is authored and the field is a single value.
     *
     * `isAbsent` first, so an unanswered field matches nothing — the same rule
     * `equals` follows, and the reason an unknown or contradictory occupational
     * code is inert without this operator knowing occupation exists: the
     * context carries a resolved value or nothing at all.
     *
     * `includes` on the authored array is a strict `===` search, so no
     * coercion: `'1'` does not match `1`.
     */
    case 'oneOf':
      return (
        !isAbsent(fieldValue) &&
        condition.values.includes(fieldValue as ConditionValue)
      )
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
