# Architecture

This is the canonical system map for VisaFlow. It describes the layers, their responsibilities,
and the dependency rules between them. Per-layer deep dives live in dedicated documents:
[validation-engine.md](./validation-engine.md), [dashboard-architecture.md](./dashboard-architecture.md),
[country-pack-guide.md](./country-pack-guide.md), [json-schema.md](./json-schema.md), and
[privacy.md](./privacy.md). The reasoning behind individual choices is in
[decisions.md](./decisions.md) (ADRs); the commitments they serve are in [principles.md](./principles.md).

## Shape of the system

VisaFlow is a **client-only** React/TypeScript application. There is no backend. Working state
lives in memory and is autosaved to this browser's IndexedDB (ADR-036); the portable artifact is
still a JSON file the user exports. The code is organized into
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
│   ├── applicant/          # applicant-wizard.ts + applicant-guidance.ts (pure)
│   ├── trip/               # trip-model.ts, route-dates.ts, trip-guidance.ts (pure)
│   ├── documents/          # documents-model.ts + filters + template-sync (pure)
│   ├── validation/         # validation-model + finding-presentation/actions (pure)
│   ├── review/             # review-checklist/summary/print/model — Final Review (pure)
│   ├── readiness/          # THE canonical dossier-readiness derivation (pure)
│   ├── employment/         # employment-model/wizard/tenure/guidance/documents (pure)
│   ├── onboarding/         # onboarding-model.ts — first-run steps + routing decision (pure)
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
(never `Intl` directly), and country names through `src/lib/countries.ts` (the sole
`Intl.DisplayNames` wrapper — codes persist, labels are resolved for display; see [ADR-023]);
finding prose is resolved via `src/lib/finding-text.ts`. Each guided experience has a pure
feature adapter (`src/features/{dashboard,applicant,trip,documents,validation,employment,finance,sponsors,timeline,settings,onboarding,review}/*`): trip nights/coverage math
lives in `route-dates.ts` (dates canonical, nights derived — [ADR-024]), and calm, non-validation
guidance in `applicant-guidance.ts` / `trip-guidance.ts` (info-only, never affects readiness).
The Validation Center is a thin composition over `src/features/validation/*` — a pure adapter that
*organizes* `runValidation` output (grouping by domain, per-area health, calm severity labels, deep
links) without re-encoding a rule or changing an outcome ([ADR-025]). The Employment workspace is a
guided six-step wizard over `src/features/employment/*` — derived current-employer tenure, info-only
guidance, an employment-document summary + HR-request checklist that reuse the Documents feature, and a
review that consumes `employment.leaveCoversTrip` findings; it stores no new data ([ADR-026]).
The Finance workspace is a guided six-step wizard over `src/features/finance/*` — funding-source-aware
applicability, a recorded (never judged) account balance, employment income *read* from the Employment
section, financial documents grouped from the Documents feature with a privacy-safe "evidence to gather"
copy list, a sponsor summary that defers all editing to `/sponsors`, and a consistency step that reuses
the `sponsor.*` findings plus net-new factual observations; it stores no new data ([ADR-027]).
The Sponsors workspace is the canonical sponsor hub over `src/features/sponsors/*` — rich summary cards
(readiness, participation, missing evidence, next action) with all editing in a progressive Sheet; it
uses the existing `Sponsor.documentIds` to link/unlink sponsor-evidence documents (Documents still owns
creation/status/deletion), so per-sponsor evidence is real without a schema or rule change ([ADR-028]).
The Timeline is an actionable preparation plan over `src/features/timeline/*` (policy · tasks · dates ·
freshness · links · model) with three modes (plan/dates/freshness); preparation tasks are derived (never
persisted) from the templates' `preparationMilestones` + document/validation state, recommendations are
VisaFlow's not official deadlines, and the highlighted next action reuses the Dashboard's
`deriveNextActions` (reuse-only — no dashboard change) ([ADR-029], [timeline-architecture.md](./timeline-architecture.md)).
Settings is the application control center — a responsive two-pane shell (section rail + content, `?section=`
deep-link) over pure `src/features/settings/settings-model.ts`, composing existing primitives + the
import/export services; it lists installed country packs with honest review status, reinforces the in-memory
privacy model, and changes no schema, storage, or validation ([ADR-030]).
The first-run experience is a dedicated `/welcome` surface over pure `src/features/onboarding/onboarding-model.ts`
— a calm ≤4-step guided setup (Welcome → Language & destination → Create or import → Ready) reusing the wizard
pattern (`Stepper`, `?step=`, focus-to-heading) and the import/export services + `initializeEmpty`. The index
route redirects on `hasData` alone (`firstRunTarget`) — no persisted "completed" flag, no new storage key — and
the shared `NoDossierState` is the one canonical empty-workspace surface routing every empty page into the
journey ([ADR-031]).
The Final Review workspace (`/review`) is a thin composition over `src/features/review/*` — the last look
before the appointment, answering a different question from the Validation Center ("what do I have, what am I
missing, what do I bring?" rather than "what is inconsistent?"). It introduces **no new authority**: readiness
comes from `src/features/readiness/`, findings and their counts from `buildValidationModel` used whole,
appointment-day readiness from the Timeline's exported `buildAppointmentDay`, and applicability from the
country pack. It adds only the submission-checklist grouping
and the print-package split, which separates **pages VisaFlow can generate** from the applicant's **physical
dossier** of external documents it never holds — a distinction enforced by the type shape, not just by wording
([ADR-032]).
**Dossier readiness has exactly one definition**, owned by `src/features/readiness/` and consumed by the
Dashboard, Documents, Validation Center, Timeline and Final Review alike — it imports only domain types, so
it is a graph sink no consumer can cycle through. Readiness measures document preparation only; consistency
health stays a separate non-percentage signal, and validation findings never move the number ([ADR-033],
[readiness.md](./readiness.md)).
Dashboard detail: [dashboard-architecture.md](./dashboard-architecture.md). Reusable UI is
demonstrated in the [Playground](./playground.md) before use. **Depends on:** all layers below.
**Must not:** be depended *on* by them.

### 6. Privacy (cross-cutting)

**Responsibility:** the invariant that nothing personal leaves the device. No server, no remote
database, no analytics, no third-party calls. Dossiers are stored locally in IndexedDB and never
uploaded ([ADR-036]); `localStorage` still holds only the non-personal `visaflow-theme` and
`visaflow-locale` ([ADR-013]). Local storage is not encryption, and the model says so. This is not a module but a constraint every layer respects. Model:
[privacy.md](./privacy.md).

## State management

A single `DossierProvider` (`src/app/providers/DossierProvider.tsx`) holds the working state
with React's `useReducer` ([ADR-005]), and stays synchronous and storage-unaware.
`WorkspaceProvider` sits above it and owns the saved-dossier workspace — which dossiers exist,
which is open, its local name, and autosaving the open one through a `DossierRepository` port
([ADR-036]). Every write is a **compare-and-swap on a per-record `revision`**, so a second tab can
never silently overwrite the first; when a write is refused, autosave stops and the user chooses
between the saved version and keeping theirs as a new dossier ([ADR-037]). A `BroadcastChannel`
carries ids and revisions between tabs as a hint only — the app is fully safe without it.
**Local saving and portable backup are separate dimensions**: what the browser holds is reported
from the workspace status, while backup freshness is derived per dossier by comparing the record's
`lastExportedAt` with its `updatedAt`, and recording an export deliberately moves neither `revision`
nor `updatedAt` ([ADR-038]). A session-only dossier is tab-local until the user promotes it, and is
never replaced without being asked ([ADR-039]). React components never call storage APIs directly — a flat shape (`applicant`, `application`, `documents`,
`sponsors`, plus dirty/saved flags), not a nested `Dossier`. Actions are explicit
(`LOAD_DOSSIER`, `UPDATE_APPLICANT`, `ADD_DOCUMENT`, …). Redux/Zustand would add dependencies and
concepts the app's simple state doesn't need. `LocaleProvider` and `ThemeProvider` follow the
same pattern for the two non-personal preferences.

### Workspace level vs active-dossier level

Two levels, one home each ([ADR-040]). `/dossiers` is the **workspace** — what you have, where
dossiers are opened, renamed, backed up and deleted. `/dashboard` is the **active dossier** — how the
one you are inside is doing. Every other content route is an active-dossier surface; Settings is
workspace-level. Navigation shows the hierarchy: *Your dossiers* sits above *Dashboard*.

The index route derives entry from the **workspace**, not from the in-memory editor: it waits for
hydration, then sends you to `/dashboard` if a dossier is open, `/dossiers` if you have saved work
but nothing open, and `/welcome` only if there is genuinely nothing. It never opens a dossier on your
behalf. The dashboard reads the workspace for **identity only** — the name it puts in its heading and
the browser tab — and still derives everything it displays from the active dossier alone. Nothing
anywhere aggregates across dossiers.

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
[ADR-023]: ./decisions.md
[ADR-024]: ./decisions.md
[ADR-025]: ./decisions.md
[ADR-029]: ./decisions.md
[ADR-032]: ./decisions.md
[ADR-033]: ./decisions.md
[ADR-036]: ./decisions.md
[ADR-037]: ./decisions.md
[ADR-038]: ./decisions.md
[ADR-039]: ./decisions.md
[ADR-040]: ./decisions.md
