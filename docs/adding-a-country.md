# Adding a New Country Configuration

Country templates follow `country → visa type → requirements`. This guide
reflects the structure introduced in iteration 3 (see ADR-014/ADR-015).

> Not in this iteration: Spain, Italy, and France are *not* implemented. Do not
> add placeholder countries — an empty template implies support that does not
> exist.

## Structure

```
src/config/
  types.ts                         # shared model
  sources/<country>.sources.ts     # official-source citations
  countries/
    common/schengen-short-stay.ts  # shared Schengen requirements
    <country>/
      index.ts                     # CountryConfig
      <visa-type>.ts               # VisaTypeTemplate
    index.ts                       # registry + resolvers
```

## Step 1 — Stable identifiers

Everything persisted or cross-referenced is language-independent:

- `countryCode` — ISO 3166-1 alpha-2 (`GR`)
- `visaTypeId` — e.g. `schengen-short-stay-tourism`
- requirement `code` — e.g. `EMPLOYMENT_LETTER`

User-facing names are **translation keys**, never literal text.

## Step 2 — Translations

Add every requirement's name/description/notes under
`src/i18n/locales/{tr,en}/visa-domain.json` at
`requirements.<CODE>.{name,description,notes}`. The parity test enforces that
`tr` and `en` carry identical keys.

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
  },
]
```

Reuse `commonSchengenDocuments` for the shared Schengen set.

## Step 4 — Sources and review status (be honest)

```typescript
export const xxTemplate: VisaTypeTemplate = {
  id: 'schengen-short-stay-tourism',
  visaType: 'short_stay_tourism',
  nameKey: 'visa-domain:visaTypes.schengen-short-stay-tourism',
  documentRequirements,
  preparationMilestones,
  templateVersion: '1.0.0',
  reviewStatus: 'unverified', // until a maintainer verifies against a source
  sourceIds: [],
}
```

Rules:

- Do **not** set `reviewStatus: 'verified'` or a `lastVerifiedAt` without real
  evidence recorded in the repository.
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

`resolveVisaTemplate(countryCode, visaType)` and the document/timeline pages
pick it up automatically.

## Step 6 — Country-specific validation rules (optional)

Unchanged from before: add a rule file in `src/domain/rules/`, register it in
`runner.ts`, and add tests. Findings carry stable `id`/`ruleId`/`messageKey`
plus `messageParams`; add the message under
`src/i18n/locales/{tr,en}/validation.json`.
