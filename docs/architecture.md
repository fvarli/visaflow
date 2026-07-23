# Architecture

This is the canonical system map for VisaFlow. It describes the layers, their responsibilities,
and the dependency rules between them. Per-layer deep dives live in dedicated documents:
[validation-engine.md](./validation-engine.md), [dashboard-architecture.md](./dashboard-architecture.md),
[country-pack-guide.md](./country-pack-guide.md), [json-schema.md](./json-schema.md), and
[privacy.md](./privacy.md). The reasoning behind individual choices is in
[decisions.md](./decisions.md) (ADRs); the commitments they serve are in [principles.md](./principles.md).

## Shape of the system

VisaFlow is a **client-only** React/TypeScript application. There is no backend. State lives in
memory; the only durable artifact is a JSON file the user exports. The code is organized into
layers whose dependencies point **downward only** — presentation depends on the domain, never
the reverse.

```
            ┌───────────────────────────────────────────────┐
            │                 Presentation                   │  React pages, design system,
            │   pages · components/ui · dashboard widgets    │  widget dashboard, i18n
            └───────────────┬───────────────────────────────┘
                            │ depends on ▼ (never upward)
   ┌──────────────┬─────────┴─────────┬──────────────────────┐
   │  Validation  │   Country packs   │    Import / Export    │
   │   engine     │   (config layer)  │   (JSON boundary)     │
   └──────┬───────┴─────────┬─────────┴──────────┬───────────┘
          │                 │                    │
          └───────────────► Domain ◄─────────────┘   Zod schemas · branded types · pure rules
                              │
                        ┌─────┴─────┐
                        │  Privacy  │   cross-cutting invariant: nothing personal leaves the device
                        └───────────┘
```

## Directory structure

```
src/
├── app/
│   ├── providers/          # DossierProvider, LocaleProvider, ThemeProvider (React Context)
│   └── router/             # Lazy-loaded route definitions
├── components/
│   ├── ui/                 # Design-system primitives (shadcn/ui + custom)
│   ├── dashboard/          # Dashboard widgets (composed over the presentation adapter)
│   └── layout/             # App shell (Header, Sidebar, …)
├── features/
│   ├── dashboard/          # dashboard-model.ts — pure presentation adapter
│   └── import-export/      # JSON import/export services
├── domain/
│   ├── schemas/            # Zod schemas (source of truth for data shapes)
│   ├── types/              # Branded ID types + shared enums
│   └── rules/              # Pure validation rules + runner
├── config/
│   ├── countries/          # Country packs: country → visa type → requirements
│   └── sources/            # Manually maintained official-source citations
├── i18n/                   # i18next init + tr/en locale namespaces
├── lib/                    # format.ts, finding-text.ts, i18n-dynamic.ts, utils
├── data/examples/          # Fictional example dossier
├── pages/                  # Route page components
└── tests/                  # Vitest unit + render tests
```

## The layers

### 1. Domain

**Responsibility:** the model of visa preparation — what a dossier *is* and what a valid one
looks like. Lives in `src/domain/`. Zod schemas are the single source of truth for data shapes
([ADR-002]); TypeScript types are inferred from them. IDs are branded types ([ADR-009]).
**Depends on:** nothing but Zod and plain TypeScript — it is framework-independent by design, so
the valuable part of the product outlives any framework choice. **Must not:** import React, touch
the DOM, or perform I/O.

### 2. Validation engine

**Responsibility:** turn a dossier into deterministic **findings**. Rules are pure functions
`(Dossier) => ValidationFinding[]`, composed by `src/domain/rules/runner.ts` with a stable
severity order ([ADR-003]). Findings carry stable keys + typed params, never prose, and are never
persisted. Full detail: [validation-engine.md](./validation-engine.md). **Depends on:** Domain.
**Must not:** depend on the UI, the network, or a country pack's *rendering*.

### 3. Country packs (configuration layer)

**Responsibility:** *what an application needs*, as data. `src/config/` holds
`CountryConfig → VisaTypeTemplate → DocumentRequirement`, plus preparation milestones and honest
`RequirementSource` records ([ADR-004], [ADR-014], [ADR-015]). Requirements use translation keys,
not prose; identifiers are stable and language-independent. `resolveVisaTemplate(countryCode,
visaType)` maps the persisted dossier enum to a template. Authoring guide:
[country-pack-guide.md](./country-pack-guide.md). **Depends on:** Domain types. **Must not:**
contain applicant data or invented/scraped source information.

### 4. Import / Export

**Responsibility:** the open JSON boundary. `src/features/import-export/` serializes the dossier
to a single documented, **versioned** JSON document and validates imports with Zod. The format is
language-independent — an export is byte-identical regardless of UI language ([ADR-010],
[ADR-012]). Spec: [json-schema.md](./json-schema.md). **Depends on:** Domain schemas. **Must
not:** write UI-language-dependent values into the file.

### 5. Presentation

**Responsibility:** everything the user sees. React pages (`src/pages/`), the design system
(`src/components/ui/`), the widget-based dashboard (`src/components/dashboard/` over the pure
adapter `src/features/dashboard/dashboard-model.ts`), the app shell, and internationalization.
Pages read/write state through `DossierProvider`; formatting goes through `src/lib/format.ts`
(never `Intl` directly); finding prose is resolved via `src/lib/finding-text.ts`. Dashboard
detail: [dashboard-architecture.md](./dashboard-architecture.md). Reusable UI is demonstrated in
the [Playground](./playground.md) before use. **Depends on:** all layers below. **Must not:** be
depended *on* by them.

### 6. Privacy (cross-cutting)

**Responsibility:** the invariant that nothing personal leaves the device. No server, no
database, no analytics, no third-party calls; the dossier lives only in memory; the only
`localStorage` keys are the non-personal `visaflow-theme` and `visaflow-locale` ([ADR-006],
[ADR-013]). This is not a module but a constraint every layer respects. Model:
[privacy.md](./privacy.md).

## State management

A single `DossierProvider` (`src/app/providers/DossierProvider.tsx`) holds the working state
with React's `useReducer` ([ADR-005]) — a flat shape (`applicant`, `application`, `documents`,
`sponsors`, plus dirty/saved flags), not a nested `Dossier`. Actions are explicit
(`LOAD_DOSSIER`, `UPDATE_APPLICANT`, `ADD_DOCUMENT`, …). Redux/Zustand would add dependencies and
concepts the app's simple state doesn't need. `LocaleProvider` and `ThemeProvider` follow the
same pattern for the two non-personal preferences.

## Data flow

```
┌──────────────────────────── Browser (no network for user data) ───────────────────────────┐
│                                                                                            │
│  Forms ──▶ DossierProvider (useReducer) ──▶ state                                          │
│                     │                                                                       │
│                     ├──▶ runValidation(dossier) ──▶ findings ──▶ finding-text ──▶ UI       │
│                     ├──▶ buildDashboardModel(state) ──▶ dashboard widgets                   │
│                     └──▶ resolveVisaTemplate(country, visaType) ──▶ requirements/timeline   │
│                                                                                            │
│  Import service ◀────────── JSON file ──────────▶ Export service                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Performance

- **Lazy routes** — every page is code-split ([ADR-008]); the dashboard has a tailored skeleton
  fallback for its chunk load.
- **Memoized derivation** — validation and the dashboard model recompute only when state changes.
- **No network** — zero latency for all operations; all assets are bundled.

## Testing strategy

- **Unit** — validation rules, schema validation, and the pure dashboard adapter (no React).
- **Render** — bilingual component/page tests (e.g. dashboard, app shell) using the real provider
  stack, asserting translated output and accessibility wiring.
- Run with `pnpm test` (Vitest + Testing Library). Integration/E2E flows are future work.

## Extension points

- **Add a validation rule** → [validation-engine.md](./validation-engine.md).
- **Add a country pack** → [country-pack-guide.md](./country-pack-guide.md).
- **Add a dashboard widget** → [dashboard-architecture.md](./dashboard-architecture.md).
- **Add a reusable UI primitive** → build it, demonstrate it in the [Playground](./playground.md),
  then use it.

[ADR-002]: ./decisions.md
[ADR-003]: ./decisions.md
[ADR-004]: ./decisions.md
[ADR-005]: ./decisions.md
[ADR-006]: ./decisions.md
[ADR-008]: ./decisions.md
[ADR-009]: ./decisions.md
[ADR-010]: ./decisions.md
[ADR-013]: ./decisions.md
[ADR-014]: ./decisions.md
[ADR-015]: ./decisions.md
