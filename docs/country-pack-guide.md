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

### Refinement — citations, and composition-scoped acceptance detail

A refinement is **additive, always**. It may append citations, and it may append acceptance criteria
your mission publishes that the shared requirement does not state. It may not change identity,
requiredness, applicability, owner or the base contract's own prose, and it may never suppress or
replace. The composer refuses anything else, including a field hidden inside the detail fragment.

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

## Toward a country-pack ecosystem

Today packs ship in-repo. The roadmap's **Country Ecosystem** phase (see [roadmap.md](./roadmap.md))
extends this to community-authored packs and a source-verification workflow — which is exactly
why identifiers are stable, requirements are keys-not-prose, and source honesty is enforced now.

[ADR-004]: ./decisions.md
[ADR-012]: ./decisions.md
[ADR-014]: ./decisions.md
[ADR-015]: ./decisions.md
[ADR-051b]: ./decisions.md#adr-051b
[ADR-052b]: ./decisions.md#adr-052b
