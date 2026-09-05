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
> the registry. Greece (Schengen short-stay tourism) is currently the one implemented pack.

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
  countries/
    common/schengen-short-stay.ts   # the Common Schengen layer + milestones
    jurisdictions/<jx>-filing.ts    # a filing-jurisdiction layer
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

Greece's destination layer owns **zero** requirements. That is not a mistake — nothing in that pack
is true because the destination is Greece.

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
  // The only override a layer has: append a citation to somebody else's
  // requirement. You cannot change its wording, requiredness, applicability or
  // revision — a layer needing different criteria must own it outright.
  refine: [{ code: 'APPLICATION_FORM', addSourceRefs: ['xx-consulate-doc-list'] }],
  sources: xxSources,
}
```

Then compose, register the layer in `countries/layers.ts`, and declare an explicit
`requirementOrder` if the pack has an established order to preserve — order decides document seeding
and which document the workspace recommends next, so it is behaviour rather than presentation:

```typescript
export const xxComposition = composeVisaTemplate({
  base: { /* id, visaType, milestones, templateVersion, reviewStatus, … */ },
  layers: [commonSchengenLayer, xxDestinationLayer, xxFilingLayer],
  requirementOrder: XX_ORDER, // omit for a new pack with no order to preserve
})
```

Composition happens once at module load, so a malformed pack fails at import rather than on whichever
screen resolves first, and `resolveVisaTemplate` keeps returning the same object every call.

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

## Step 5 — Register

```typescript
// src/config/countries/index.ts
const countryRegistry: Record<string, CountryConfig> = {
  GR: greeceConfig,
  XX: xxConfig,
}
```

`resolveVisaTemplate(countryCode, visaType)` and the Documents / Timeline pages pick it up
automatically — no UI changes needed.

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
