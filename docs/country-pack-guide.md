# Country Pack Guide

A **country pack** is how VisaFlow knows what an application needs. It is data, not code:
requirements organized as `country → visa type → requirements`, plus preparation milestones and
honest official-source metadata. Adding support for a country means authoring a pack — you
should not need to touch the validation engine or the UI.

See also: [architecture.md](./architecture.md) (Country Packs layer), [principles.md](./principles.md)
(#6 reusable country packs, #7 configuration over hardcoding), and [ADR-004] / [ADR-014] /
[ADR-015] in [decisions.md](./decisions.md).

> Honesty rule up front: do **not** add placeholder countries. An empty or invented template
> implies support and official backing that do not exist. Only real, authored packs belong in
> the registry. Two are implemented today — Greece and Germany, both Schengen short-stay tourism
> composed for applications lodged in Türkiye.

## What a country pack contains

- **`CountryConfig`** — the country (`countryCode`, `nameKey`, Schengen flag) and its list of
  visa-type templates and source records.
- **`VisaTypeTemplate`** — one per visa type: `id`, the persisted `visaType` enum it maps to,
  `documentRequirements`, `preparationMilestones`, `templateVersion`, and maintenance metadata
  (`reviewStatus`, optional `lastReviewedAt`, `sourceIds`).
- **`DocumentRequirement`** — a document the application may need: stable `code`, translation
  keys (`nameKey` / `descriptionKey` / `notesKey`), `category`, `ownerType`, `required`, an
  optional `conditionalOn` rule, and optional `sourceRefs`.
- **`RequirementSource`** — a manually maintained citation (`authority`, `titleKey`, optional
  `url`, `sourceType`, optional `lastVerifiedAt` / `retrievedAt`). Its **absence is meaningful**.
- **`PreparationMilestone`** — a dated step relative to the appointment, used by the timeline.

Two ideas are load-bearing:

- **Stable, language-independent identifiers.** `countryCode` (ISO 3166-1 alpha-2), `visaTypeId`,
  and requirement `code` are never translated and never change; they are what the dossier and the
  exported JSON reference. User-facing names are **translation keys**, never literal prose
  ([ADR-012]).
- **Honest source metadata.** VisaFlow does not scrape or call official sites. A source with no
  `lastVerifiedAt` and a template left `unverified` are the truthful default until a maintainer
  checks a real publication ([ADR-015]).

## Structure

```
src/config/
  types.ts                          # shared model + RequirementLayer, CitationRefinement
  composition.ts                    # composeVisaTemplate + CompositionError
  sources/<country>.sources.ts      # destination-scoped citations
  sources/<jurisdiction>.sources.ts # filing-jurisdiction-scoped citations
  sources/<cc>-<jx>-mission.sources.ts # one mission's own publications
  countries/
    common/schengen-short-stay.ts   # the Common Schengen layer + milestones
    jurisdictions/<jx>-filing.ts    # a filing-jurisdiction layer
    jurisdictions/<cc>-<jx>-mission.ts # one destination's mission in that jurisdiction
    <country>/
      index.ts                      # CountryConfig
      <visa-type>.ts                # destination layer + composition
    layers.ts                       # every declared layer, for the invariants
    index.ts                        # registry + resolvers
```

## The three layers

A template is **composed**, not concatenated. Each layer answers a different question, and putting a
requirement in the wrong one is how a pack ends up claiming somebody else's authority (ADR-052):

| Layer | Holds a requirement when it is true… |
|---|---|
| **Common Schengen** | of Schengen short-stay applications generally |
| **Destination** | because of the country being travelled to |
| **Filing jurisdiction** | because of where and how the application is lodged |

The test that decides: *would an applicant filing for this destination from a different country be
asked for it?* If no, it is not Common. *Would an applicant filing in this country for a different
destination plausibly be asked for it?* If yes, it is jurisdiction, not destination.

**Both** production packs' destination layers own **zero** requirements. That is not a mistake — and
with two packs it is no longer a curiosity about Greece: nothing in either pack is true *because* the
destination is Greece or Germany. What each destination owns is its identity, its review metadata,
its own statute where it has one, and the decision about which filing jurisdiction it composes.

### A second destination is evidence, not just another consumer

The most useful thing a second pack does is test the first pack's ownership claims. Every requirement
sitting in Common is an assertion that *any* Schengen destination asks for it, and until a second
destination exists that assertion has never been checked against anything.

Building Germany checked it and it was wrong twice: `ID_CARD_COPY` (mandatory, cited by nothing) and
`PASSPORT_PREVIOUS` were in Common, and the German mission's sheet asks for neither. Both moved to
the mission layer that actually carries them, Greece's rendered output did not change, and Germany
inherits neither.

So when you add a pack, read the shared layer against your own evidence and expect to find something.
Note the direction of the finding: a document your sheet does not ask for is evidence that it is **not
common**, not evidence that no consulate may request it — Annex II is explicitly non-exhaustive and
Article 14(3) leaves missions free to ask for more.

### Mission-scoped layers

A filing-jurisdiction layer holds what that jurisdiction's own authority states. A **mission-scoped**
layer — one destination's mission in one filing jurisdiction, such as `gr-tr-mission` — composes
*after* it and holds two things: citations that are that mission's rendering of the jurisdiction
instrument, and requirements the mission carries which no authority at any level supports.

Two of them ship today — `gr-tr-mission` and `de-tr-mission` — and they are composition and
provenance **scopes**: what one destination's mission asks of applicants filing in one jurisdiction,
reaching no other destination.

**Ownership in a mission layer decides scope; citations decide evidence.** The two questions are
independent, and both mission layers demonstrate it. Germany's two requirements are owned there
*and* cited, because its mission publishes a sheet that names them. Greece's four are owned there
and carry **no** citations at all — held as containment, not as a finding that Greece requires them
— and each records its absence of evidence, with a written reason, in the bounded evidence-gap
allowlist in `country-pack-provenance.test.ts`. Attaching a citation to one of those would turn a
recorded gap into a claim of authority. A quarantine is a hold pending a reachable source, not a
permanent answer.

**Destination or mission?** Ask whether an applicant for the same destination filing somewhere else
would be asked for it. Germany's § 54 declaration looks destination-level — it is German law — but
the German mission in India requires no such declaration and no ten-year visa copies, so the common
factor is not Germany alone: it is Germany *as applied for in Türkiye*. Both are mission-owned. The
layer-level quarantine enforces the same conclusion structurally, since a `destination` layer may not
declare a requirement citing jurisdiction-scoped evidence. See ADR-052a.

## Step 1 — Stable identifiers

Choose language-independent identifiers up front:

- `countryCode` — ISO 3166-1 alpha-2 (`GR`)
- `visaTypeId` — e.g. `schengen-short-stay-tourism`
- requirement `code` — e.g. `EMPLOYMENT_LETTER`

These are permanent. User-facing names are translation keys.

## Step 2 — Translations

Add every requirement's name/description/notes under
`src/i18n/locales/{tr,en}/visa-domain.json` at `requirements.<CODE>.{name,description,notes}`.
The parity test enforces that `tr` and `en` carry identical keys.

## Step 3 — Requirements

```typescript
const documentRequirements: DocumentRequirement[] = [
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
    sourceRefs: ['xx-consulate-doc-list'], // optional
    revision: 1, // required — the acceptance-contract version
  },
]
```

Declare it in the layer that **owns** it, then compose. Do not re-list a requirement another layer
already declares — a `code` is owned by exactly one layer registry-wide, and the composer rejects a
second declaration.

### The condition vocabulary

`conditionalOn` is a discriminated union, so the operator decides what payload you may write:

| operator | payload | true when |
|---|---|---|
| `equals` / `notEquals` | `value` | the field is answered **and** compares as stated |
| `oneOf` | `values`, a **non-empty** set | the field is answered and is one of them |
| `includes` | `value` | the field is an **array** containing the value |
| `exists` / `notExists` | none | the field is answered / is not |

Three things to know before authoring one.

**An unanswered field matches nothing.** `equals`, `notEquals` and `oneOf` are all false when the field
is absent, empty or unresolvable. That is deliberate and it is the direction of error the project
chooses: a requirement that appears once somebody fills in their profile is a better failure than a
document nobody needs. `notExists` is the exception, because absence is what it tests.

**`oneOf` is not `includes`.** `includes` wants the *field* to be the array and your value to be the
needle; `oneOf` wants the field to be a single value and the *set* to be the thing you author. They are
mirror images and the wrong one silently never matches.

**Nothing is coerced.** `'1'` does not match `1`. Comparisons are strict in every operator.

An empty `oneOf` set is a compile error, and `src/tests/features/condition-vocabulary.test.ts` rejects
duplicates and non-literal payloads across every layer.

```typescript
export const xxFilingLayer: RequirementLayer = {
  id: 'xx-filing',
  kind: 'jurisdiction',
  add: documentRequirements,
  // Two powers over somebody else's requirement, both additive: append a
  // citation, and append versioned acceptance detail. You cannot change its
  // identity, requiredness, applicability, owner or base prose, and you can
  // neither suppress nor replace — a layer needing a different obligation must
  // own its own code.
  refine: [
    { code: 'APPLICATION_FORM', addSourceRefs: ['xx-consulate-doc-list'] },
    {
      code: 'CIVIL_REGISTRY_EXTRACT',
      addSourceRefs: ['xx-consulate-doc-list'],
      addDetail: {
        detailKeys: ['visa-domain:detail.xx-mission.CIVIL_REGISTRY_EXTRACT.channel'],
        revision: 1,
      },
    },
  ],
  sources: xxSources,
}
```

Then compose, register the layer in `countries/layers.ts`, and declare an explicit
`requirementOrder`:

```typescript
export const xxComposition = composeVisaTemplate({
  base: { /* id, visaType, milestones, templateVersion, reviewStatus, … */ },
  layers: [commonSchengenLayer, xxDestinationLayer, xxFilingLayer, xxMissionLayer],
  requirementOrder: XX_ORDER,
})
```

**Declare the order whenever order is product behaviour, which is nearly always.** It decides the
sequence documents are seeded into a new dossier and `deriveNextDocument` picks the *first* required
requirement with no record yet, so the array decides which document the workspace tells an applicant
to get next. Both shipped packs declare one, for different reasons: Greece's preserves exactly what
the pack asked for before the layer split, and Germany — with no history to preserve — follows its
mission checklist's own numbering, so what an applicant reads on the official page and what the
workspace hands them agree.

Omitting it falls back to layer declaration order, which is defensible only when nothing about the
sequence is meaningful. It is usually worse than it looks: mandatory requirements owned by the
mission layer land *last*, after conditional ones, purely because of where they are declared. The
composer requires an exact bijection — every composed code listed once, nothing listed that is not
composed — so a mis-edited order fails at import rather than silently reordering a checklist.

Composition happens once at module load, so a malformed pack fails at import rather than on whichever
screen resolves first, and `resolveVisaTemplate` keeps returning the same object every call.

### Occupation — the second applicability axis

`employmentStatus` answers *which employer details apply*. It does not answer the question consular
checklists actually branch on. The Greek visa centre asks a *Kamu Çalışanı* for an institution letter
and none of the company-document block; Annex III names Farmers and Company owners as categories in
their own right. That is a second axis, not a finer slicing of the first ([ADR-053]).

**The persisted value is an opaque string; the value your condition sees is not.**
`application.employment.occupationCode` is an open `string` on purpose — a pack may name a category
this build has never heard of, and vocabulary growth must not need a schema migration. Between the
two sits a resolver:

| | |
|---|---|
| **raw** | `occupationCode`, any string, round-trips untouched |
| **known** | it is in `KNOWN_OCCUPATION_CODES` (`employee`, `public_servant`, `company_owner`, `independent_professional`, `farmer`) |
| **effective** | known **and** legal for the recorded `employmentStatus` (`OCCUPATIONS_BY_STATUS`) |

Only the **effective** value reaches `ApplicabilityContext.employment.occupation`. An absent code, a
code from a newer build, and a stale code the status forbids all arrive as `undefined` — one state,
three causes, no special-casing downstream. Nothing is ever inferred from free-text occupation, and
no sentinel is persisted.

**Author the condition with the helper, never by hand.** `occupationIs('company_owner')` and
`occupationOneOf([...])` take `KnownOccupationCode`, so a typo is a compile error where it is written,
and they pin the field to the resolved value rather than the raw one. Writing the literal yourself
reaches a code no build validated; an invariant catches it.

<a id="migrating-a-row-onto-the-occupational-axis"></a>
**Moving an existing row onto this axis is a withdrawal unless you say otherwise.** Most dossiers have
never answered the occupational question, so narrowing `employmentStatus === 'self_employed'` to
`occupationIs('company_owner')` silently drops a required document from people who changed nothing.
`applicabilityMigration.priorCondition` prevents that: while the applicant is **unclassified** the row
evaluates its recorded prior coarse condition, and once **classified** it evaluates the corrected one
and the prior branch is never consulted again — which is what lets a migration subtract as well as add
([ADR-053a]).

```typescript
conditionalOn: occupationIs('company_owner'),
applicabilityMigration: {
  priorCondition: {
    field: 'employment.employmentStatus',
    operator: 'equals',
    value: 'self_employed',
  },
},
```

Entitlement is **historical, and the ledger is the gate**. A condition that quotes a prior contract
proves nothing, so every migrated row also needs an entry in
`src/config/countries/applicability-migrations.ts` recording the exact prior condition, why the row is
entitled to it, and what would retire it — never a date. An invariant cross-checks config and ledger
in both directions. A row authored against the occupational axis from birth has no prior contract and
must never acquire a fallback; `FARMER_CERTIFICATE` is the standing negative example.

<a id="widening-who-is-asked-addapplicableoccupations"></a>
**Widening who is asked — `addApplicableOccupations`.** Article 14(3) leaves the harmonised list
non-exhaustive, so a mission may ask a jurisdiction-owned requirement of more people than the
instrument names. The refinement appends occupations; it is **delta-only** (never restate the base
population), **widen-only**, and occupational only ([ADR-052c]).

```typescript
{
  code: 'EMPLOYER_TRADE_REGISTRY',
  addApplicableOccupations: ['employee', 'independent_professional'],
  addSourceRefs: ['gr-tr-harmonised-list', 'gr-tr-visa-centre-checklist'],
}
```

Two rules follow from this and they are the ones most easily got wrong:

- **A widening does not move `contractKey`.** It changes *who is asked*, not *what satisfies the ask*,
  so it reaches no revision and no key, a claim made in one pack stays valid in the other, and a
  dossier that changes destination is told the row no longer applies rather than that its evidence
  went stale. **Acceptance detail is the opposite**: `addDetail` does move the key, because it changes
  what satisfies the ask. Never smuggle a widening through `addDetail` to save a refinement.
- **A widening never reaches the migration fallback.** While the applicant is unclassified only the
  recorded prior coarse condition runs. A population the widening adds is a *new* obligation for those
  people and fails closed until they answer.

**Whose paper it is can vary with occupation — `ownerByOccupation`.** `ownerType` is the declared
default and the answer for everyone unless the map names their occupation; the map states
**exceptions only** ([ADR-049a]). On the Greek visa centre's *Çalışan* branch the company-document
block is the employer's, so the shared row declares `{ employee: 'employer' }` — carried by both packs
and consulted only by the one that widens to an employee. `ownerType` is never evidence of a financing
source: applicability does not derive ownership, ownership does not derive applicability, and neither
derives financing placement.

### Refinement — citations, and composition-scoped acceptance detail

A refinement is **additive, always**. It may append citations, it may append acceptance criteria your
mission publishes that the shared requirement does not state, and — since [ADR-052c] — it may append
*occupations* the owner's source does not name. It may not change identity, requiredness, owner or
the base contract's own prose; it may never narrow a population, suppress or replace. The composer
refuses anything else, including a field hidden inside the detail fragment.

> Applicability used to be on the forbidden list outright. It is now **widen-only**: see
> [Widening who is asked](#widening-who-is-asked-addapplicableoccupations) in the section above.
> Nothing else about the prohibition moved.

```typescript
{
  code: 'PHOTOS',
  addSourceRefs: ['de-tr-schengen-general'],
  addDetail: {
    detailKeys: ['visa-domain:detail.de-tr-mission.PHOTOS.size'],
    revision: 1,
  },
}
```

The applicant reads the shared contract, then your detail beneath it. Greece sees none of Germany's
and Germany sees none of Greece's.

**Version your fragment.** `revision` on a fragment is yours to maintain, exactly as a requirement's
is, and the rule is the same directional test: move it when the detail starts excluding evidence it
used to accept. A fragment's revision **1** already needs a ledger entry, unlike a requirement's,
because it adds criteria to a contract that was published without them. Record it in
`requirement-revisions.ts` with `viaLayer` naming your layer.

**What the key does.** The composer derives a `contractKey` for every requirement — the owner's
revision plus each attached fragment's layer and revision. It is what a completion claim is stamped
against, so an applicant who confirmed a photograph for one destination is asked to check it again if
they switch to another that judges it differently. You never write a key; you only make sure your
fragment's revision is honest, because the key is built from it. See [ADR-051b].

**One code, or two?** This is the judgement the guide cannot make for you, and it is not mechanically
detectable in either direction.

- **`PHOTOS` is one code.** Greece asks for a recent ICAO photograph; Germany asks for one of
  35 x 45 mm, no older than six months, full-face. One obligation — *the photograph* — judged two
  ways. A `GR_PHOTOS` and a `DE_PHOTOS` would be two codes for one document, and it gets worse with
  every country you add.
- **`TRANSPORT_RESERVATION` and `TRANSPORT_MEANS_PROOF` are two codes.** Annex III I.1 lists a flight
  reservation and other proof of intended means of transport side by side. A booking and a
  non-booking proof are different instruments, not one instrument judged differently — no
  composition-scoped criterion could turn one into the other. They are related by a satisfaction
  group instead.

The test is identity, not strictness: *are these distinct evidence obligations, or the same
obligation with composition-specific criteria?* Do not put two distinct obligations under one code
because they feel similar, and do not mint a second code because two missions judge the same document
differently ([ADR-052b]).

**If a shipped code turns out to hold two obligations, it splits — and the split has a cost you must
plan for.** One child keeps the identity (and therefore every record standing against it) and the
other is new and **starts empty**. No completion claim is ever projected across a `code` boundary, in
either direction, because a claim is an assertion against a contract identity rather than evidence at
conjunct granularity — one status, one file reference and one date for what were two documents. The
applicant is told, never claimed for. Losing a conjunct from the retained child is a *loosening*, so it
takes no revision bump; any acceptance fragment that described only the departed document moves with
it, which does move that child's key. `EMPLOYER_TRADE_REGISTRY` → gazette +
`CHAMBER_REGISTRATION_CERTIFICATE` is the worked example ([ADR-051c]).

### Offer and activate — a definition nobody asks for, until somebody does

Sometimes the document your mission asks for is already **defined** in this repository, owned by
another destination's mission layer, and you cannot compose that layer. Germany's sheet asks for an
employer tax plate; so do Spain's and Greece's authorised visa-centre checklists. A `code` has
exactly one owner registry-wide, so `ES_EMPLOYER_TAX_PLATE` is not an answer — that is two codes for
one document. Neither is moving it into `tr-filing`: the instrument that layer speaks for does not
name it, and *N missions ask for it* is never promoted to a jurisdiction rule ([ADR-052a] Rule 3) —
least of all when the asking reaches you through a delegated intake channel rather than the
jurisdiction's own authority ([ADR-052d]).

What is shared is the *definition*. What is not shared is the *asking*. So `add` splits in two:

| verb | what it asserts |
|---|---|
| `add` | this layer owns the identity **and** every composition including it asks for the document |
| `offer` | this layer owns the identity, and **nobody is asked for anything** |
| `activate` | *this* composition asks for an offered identity, on this layer's own evidence |

> An offered requirement asserts no applicability, presence, requiredness or authority in any
> production composition until an authorized later layer activates it.

An offer is inert in every sense that matters: it is absent from the composed template, from
readiness, from the next-document recommendation, from a pinned `requirementOrder` and from any
satisfaction group. It carries **no citations of its own** — it asserts nothing, so there is nothing
for a citation to vouch for — and a layer that only offers is *not* a claim that the jurisdiction
requires the document, or that every mission in it does.

This ships today, and `EMPLOYER_TAX_PLATE` is the worked example — the only identity using it:

```typescript
// src/config/countries/jurisdictions/tr-mission-practice.ts
// The neutral definition home. Owns the identity; asks nobody; cites nothing.
export const trMissionPracticeLayer: RequirementLayer = {
  id: 'tr-mission-practice',
  kind: 'jurisdiction',
  offer: [{ code: 'EMPLOYER_TAX_PLATE', /* …, */ revision: 1 }],
}

// The mission that does ask, with the evidence that says so.
export const deTrMissionLayer: RequirementLayer = {
  id: 'de-tr-mission',
  kind: 'jurisdiction',
  activate: [
    { code: 'EMPLOYER_TAX_PLATE', addSourceRefs: ['de-tr-tourism-checklist'] },
  ],
}
```

**Both packs compose `tr-mission-practice`; only Germany activates out of it.** That is deliberate
and it is the proof rather than an accident of packaging: if only the activating pack composed the
definition home, "composing the home confers nothing" would be a claim no production composition
ever tested. Greece composes it, activates nothing, and its rendered checklist, order, ownership
tally, contract keys and source pool are unchanged.

**The activation carries its own citations.** Provenance belongs to the activating assertion, not to
the definition, so you do not write an `activate` line and a matching `refine` line — the composer
refuses a layer that does both to one code, the same way it refuses a layer refining what it owns.
Anything a refinement may append, an activation may append, and nothing more: identity, requiredness,
owner, base prose and narrowing stay forbidden exactly as before.

**Activation is key-neutral by itself.** It changes whether you are asked, not what satisfies the
ask, so it does not move `contractKey` — the same rule a widening follows. Acceptance detail you
attach *while* activating still moves the key, because that is a fragment like any other. This is
what makes moving an unchanged definition from an `add` into an `offer` + `activate` safe for stored
claims: same `code`, same base revision, same effective fragments, so the key a claim is compared
against is character-for-character what it was.

**Rules the composer enforces**, each with its own failure so the message names the right mistake:
activation must reference an offer an **earlier** layer made (never your own, never a later layer's,
never an `add`); one offer is activated at most once in a composition; a code that is offered and not
activated cannot be refined or grouped; and every pack that pins `requirementOrder` must list what it
activates — which is what makes an activation a reviewed line in a diff rather than a side effect.

**When to reach for this, and when not to.** Offer a definition when a second mission's own published
evidence asks for a document this repository already defines. Do not offer one speculatively: a
definition nobody activates is dead configuration, and the registry invariants say so. And an
identity that is *unresolved* — one code standing for two obligations, or for a rule rather than a
document — does not become resolvable by becoming reusable. Split it first.

### Satisfaction groups — "any one of these"

When your authority offers a choice — Annex III I.1's "flight reservations, other proof of intended
means of transport, **or** proof of travel itinerary" — declare a group rather than marking one
member required and the rest optional. That rendering demands a document the authority does not.

```typescript
groups: [
  {
    id: 'xx-travel-arrangements',
    anyOf: ['TRANSPORT_RESERVATION', 'TRANSPORT_MEANS_PROOF', 'ITINERARY'],
    labelKey: 'visa-domain:groups.xx-travel-arrangements',
    sourceRefs: ['xx-harmonised-list'],
  },
]
```

A group occupies **one** slot in readiness however many members it has, and is satisfied by the best
any member reaches; the workspace stops recommending the other routes once one is confirmed. Declare
it on the layer whose instrument offers the choice — which is not necessarily the layer that owns the
members — and remember that the choice may not be universal: Annex III's "and/or" for the employer
letter is a real alternative in Greece and is closed by the German mission, which asks for one letter
carrying both, so that group is declared on the Greek mission layer alone.

Members must exist in the composition, a member belongs to at most one group, and a group needs at
least two members. The composer enforces all three.

### `revision` — the acceptance contract

Every requirement declares one, and a new requirement starts at `1`. It versions **the criteria you
render to the applicant**, and it is deliberately not optional: a pack author decides it rather than
inheriting a default nobody chose.

Bump it only when the same requirement starts asking for **stricter** evidence — when a document that
satisfied the criteria you used to render could now fail. Do not bump for wording, translations,
attached sources, clarification that excludes nothing, loosening, or applicability changes. Every
value above `1` needs a matching entry in `src/config/countries/requirement-revisions.ts` explaining
what a previously-sufficient claim would now be missing; a registry-wide test fails the build
otherwise.

A criterion the applicant cannot read is not part of the contract. If you add an acceptance
criterion to `notes`, wire `notesKey` — a test refuses to let a `notes` string exist unreachable, and
making a previously-invisible criterion visible is itself a bump. See ADR-051.

**This number is the owner's, and it is global.** It means the same thing in every composition, and
nothing derives a composed value from it — the criteria a *refining* layer adds are versioned on the
fragment and carried by `contractKey`, never summed into this number. An earlier build did sum them,
and two packs ended up rendering different photographs at the same revision; see [ADR-051b].

## Step 4 — Sources and review status (be honest)

```typescript
export const xxTemplate: VisaTypeTemplate = {
  id: 'schengen-short-stay-tourism',
  visaType: 'short_stay_tourism',
  nameKey: 'visa-domain:visaTypes.schengen-short-stay-tourism',
  documentRequirements,
  preparationMilestones,
  templateVersion: '1.0.0',
  reviewStatus: 'unverified', // until a maintainer verifies against a real source
  sourceIds: [],
}
```

Rules:

- Do **not** set `reviewStatus: 'verified'` or a `lastVerifiedAt` without real evidence recorded
  in the repository.
- Do **not** scrape official sites or invent dates/URLs.
- VisaFlow is never presented as an embassy or authorized visa centre.
- An unverified requirement renders a restrained notice via `SourceNote`.

## Step 5 — Register, in all three places

```typescript
// src/config/countries/index.ts
const countryRegistry: Record<string, CountryConfig> = {
  GR: greeceConfig,
  DE: germanyConfig,
  XX: xxConfig,
}
```

`resolveVisaTemplate(countryCode, visaType)` and the Documents / Timeline pages pick it up
automatically — no UI changes needed. Two more registrations are not optional, and neither is
enforced by the compiler:

1. **`countries/layers.ts`** — every layer the pack declares. The identity invariants walk this list
   to answer "does one code mean one thing across the whole registry", which cannot be asked one
   composition at a time. It is cross-checked in both directions, so a layer added without
   registering it fails, and a registered layer nothing composes fails too.
2. **The production-composition list the invariants iterate** (`src/tests/support/`). **Every
   production pack must participate in the production invariant set** — quarantine, publisher
   authority, layer reachability, coverage. An invariant stated over "every pack" has to read every
   pack, and this is the list that makes that true rather than aspirational.

The second one is there because it was once wrong in the quiet way: the authority invariant mapped
the registry for each pack's identity but evaluated **one pack's composition** for every row, so a
second pack resting entirely on another destination's authority would have passed green. It is now
cross-checked against the registry in both directions like the layer list. If you add a pack and
forget this, the check fails loudly rather than skipping your pack.

## Step 6 — Country-specific validation rules (optional)

If a country needs a rule beyond the shared set, add a rule file in `src/domain/rules/`,
register it in `runner.ts`, and add tests. Findings carry stable `id` / `ruleId` / `messageKey`
plus `messageParams`; add the message under `src/i18n/locales/{tr,en}/validation.json`. See
[validation-engine.md](./validation-engine.md).

## Observed evidence not yet modelled

Retrieved evidence that no pack renders yet. It is recorded here rather than in a requirement, because
a pack must not assert an obligation before the shape it needs exists — and because an observation
that lives only in a session narrative is lost when the session ends.

**`Mükellefiyet Belgesi` — Edirne only, conditioned on a mismatch the model cannot express.**

Observed in the Greek visa centre's captured checklists during the H4c2d2 evidence passes:

- The delta is **Edirne-specific**. It was not observed at the other sampled consular jurisdictions,
  and nothing here generalises it to them.
- On the **`employee`** and **`company_owner`** branches, Edirne adds *Mükellefiyet Belgesi* **when the
  activity code on the tax plate and the NACE code on the activity certificate differ**.
- The **`independent_professional`** branch does not add it.

Why it is not modelled: the condition is a **comparison between two documents' contents**, and
`ConditionalRequirement` has no comparison operator and no access to document content — it evaluates
dossier fields only. Expressing this would need a new capability, argued on its own evidence, not a
requirement bolted onto the current vocabulary.

It was **explicitly excluded from the company-registration split** (H4c2d2x) so that an evidence
question and an identity question would not be settled in one commit. Anyone picking it up should
re-retrieve the Edirne checklist first: the capture behind this note is not in the repository, and a
retrieval failure can never establish absence.

**Greek travel arrangements — visa-centre evidence is ambiguous on narrowing.**

Captured in [ADR-047]'s fifth evidence pass (2026-09-24), at all four consular jurisdictions:

- Every **selected** travel mode emits mode-specific transport evidence — for a flight, a priced
  round-trip reservation with a visible PNR — and none offers an itinerary in its place.
- Leaving the travel mode **unselected still generates a list**, and that list asks for no transport
  evidence at all.
- Edirne additionally asks for a handwritten *Seyahat Planı* on every branch, including that one.

Classified **AMBIGUOUS**, mechanism **INSUFFICIENT**: no explicit refusal, no closed list, and a
workflow that does not make the choice mandatory. It is not evidence that Greece closes Annex III
I.1's itinerary route. No production change is authorized by it — `tr-travel-arrangements` stays as
declared — and the source-authority and satisfaction-group questions it bears on remain unresolved.

**Six identities a third destination asks for, adjudicated but not shipped.**

Spain's short-stay tourism sources (consulate and both consular districts, filed from Türkiye) were
measured against the shipped layers before a line of that pack was authored. Six documents it
publishes are already defined here, each owned by another destination's mission layer. `offer` and
`activate` are the shape that lets a second mission ask for one — but the capability ships against
synthetic packs only, and each identity is adjudicated on its own evidence rather than as a list
([ADR-052d] decision 9):

- **`EMPLOYER_TAX_PLATE`** — **relocated, not settled.** The pilot: its definition now lives in
  `tr-mission-practice` and Germany activates it. Nothing about Germany's composed output moved, and
  the relocation bumped no revision and no `templateVersion`. A second mission may activate the same
  identity when it has its own evidence for it — but **not yet, for this row.** Its static
  `ownerType: 'applicant'` describes the population Germany's section 4(c) names and nobody else:
  the Greek visa centre and both Spanish intake checklists ask for the same document of *employees*,
  where the plate belongs to the employer, not the applicant. Widening the population without an
  owner model would tell an employee their own business files it. See [ADR-052d]'s 2026-09-20
  amendments; the shape of the fix is probably `ownerByOccupation`, as on `EMPLOYER_TRADE_REGISTRY`
  and `EMPLOYER_SIGNATURE_CIRCULAR`, and it is not decided.
- **`EMPLOYER_SIGNATURE_CIRCULAR`** — same identity, but its base is `required: false` while Spain's
  checklists make it mandatory. Requiredness is not composition-scoped and activation must not make
  it so. **Unresolved.**
- **`SPONSOR_LETTER`, `SPONSOR_BANK_STATEMENTS`** — candidates, blocked on the evidence-gap register
  needing composition scope: one mission may hold evidence for an identity while another has a
  genuinely true unresolved limitation on the same identity.
- **travel-history copies (`DE_TRAVEL_HISTORY_COPIES`)** — base prose is Germany-specific (ten years,
  five named visa families). Activating it as-is would render German criteria to a Spanish applicant.
  Needs its own generalisation and revision adjudication.
- **`RELATIONSHIP_PROOF`** — **must not be activated.** Its recorded gap says the checklist
  establishes a relationship *rule* rather than a document, and Spain names two distinct instruments.
  An unresolved identity is not made resolvable by becoming reusable.

`SPONSOR_INCOME_PROOF` is outside the candidate set for the reason its gap entry already gives: it
stands in for several evidence identities at once.

## Toward a country-pack ecosystem

Today packs ship in-repo. The roadmap's **Country Ecosystem** phase (see [roadmap.md](./roadmap.md))
extends this to community-authored packs and a source-verification workflow — which is exactly
why identifiers are stable, requirements are keys-not-prose, and source honesty is enforced now.

[ADR-004]: ./decisions.md
[ADR-012]: ./decisions.md
[ADR-014]: ./decisions.md
[ADR-015]: ./decisions.md
[ADR-047]: ./decisions.md#adr-047
[ADR-049a]: ./decisions.md#adr-049a
[ADR-051b]: ./decisions.md#adr-051b
[ADR-051c]: ./decisions.md#adr-051c
[ADR-052a]: ./decisions.md#adr-052a
[ADR-052b]: ./decisions.md#adr-052b
[ADR-052c]: ./decisions.md#adr-052c
[ADR-052d]: ./decisions.md#adr-052d
[ADR-053]: ./decisions.md#adr-053
[ADR-053a]: ./decisions.md#adr-053a
