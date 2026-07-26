# Architectural Decisions

This document records key architectural decisions and their rationale.

## ADR-001: No Database

**Decision:** Store all data in browser memory with JSON export.

**Context:** Visa applications contain sensitive personal data. Users may not trust cloud services.

**Rationale:**
- Maximum privacy - data never leaves the device
- User has full control over storage location
- No backend infrastructure needed
- JSON files work anywhere

**Trade-off:** Data is lost on page refresh unless exported.

## ADR-002: Zod as Source of Truth

**Decision:** Use Zod schemas for both runtime validation and TypeScript types.

**Context:** We need to validate imported JSON and ensure type safety.

**Rationale:**
- Single source of truth for data shapes
- Runtime validation catches import errors
- `z.infer<>` generates TypeScript types automatically
- Self-documenting schemas

**Alternatives considered:**
- io-ts (more complex API)
- JSON Schema (separate from TypeScript)
- Manual validation (error-prone)

## ADR-003: Pure Function Validation Rules

**Decision:** All validation rules are pure functions returning findings arrays.

**Context:** We need composable, testable validation logic.

**Rationale:**
- Easy to test in isolation
- Easy to compose and extend
- No side effects
- Predictable behavior
- Rules can be added/removed without affecting others

**Example:**
```typescript
const passportValidAfterTrip = (dossier: Dossier): ValidationFinding[] => {
  // Pure logic, returns findings array
}
```

## ADR-004: Country Configuration, Not Code

**Decision:** Document requirements are configuration files, not hardcoded.

**Context:** Different countries have different requirements. Requirements change.

**Rationale:**
- Easy to add new countries
- Requirements can be updated without code changes
- Clear separation of rules from requirements
- Supports conditional requirements

**Location:** `src/config/countries/`

## ADR-005: React Context Over Redux

**Decision:** Use React Context with useReducer for state management.

**Context:** Application state is relatively simple (one dossier at a time).

**Rationale:**
- Sufficient for current needs
- Fewer dependencies
- Easier to understand
- No external library overhead

**When to reconsider:** If we add multi-application support with complex state relationships.

## ADR-006: No localStorage

**Decision:** Never use localStorage for personal data.

**Context:** Privacy-first design principle.

**Rationale:**
- localStorage persists after session ends
- Browser extensions may access localStorage
- Shared computers pose risk
- User may forget data is stored

**Exception:** Theme preference may use localStorage (non-personal).

## ADR-007: shadcn/ui Over Component Libraries

**Decision:** Use shadcn/ui (copy-paste components) instead of Chakra/MUI.

**Context:** Need consistent UI without heavy runtime.

**Rationale:**
- Components are owned, not dependencies
- Full customization control
- Smaller bundle size
- Based on Radix primitives (accessible)
- Tailwind CSS integration

## ADR-008: Lazy-Loaded Routes

**Decision:** Code-split pages using React.lazy().

**Context:** Reduce initial bundle size.

**Rationale:**
- Faster initial load
- Load only what user navigates to
- Simple to implement with React Router

**Implementation:** `src/app/router/routes.tsx`

## ADR-009: Branded Types for IDs

**Decision:** Use branded types (phantom types) for entity IDs.

**Context:** Prevent mixing up different ID types (ApplicantId vs DocumentId).

**Rationale:**
- Compile-time type safety
- Prevents `addDocument(applicantId)` mistakes
- Self-documenting code

**Implementation:** `src/domain/types/common.ts`

## ADR-010: JSON Schema Versioning

**Decision:** Include schema version in exported JSON.

**Context:** Schema may evolve; need migration path.

**Rationale:**
- Detect old exports
- Enable automatic migrations
- Clear compatibility signals

**Current version:** `1.0.0`

## ADR-011: Turkish-First Bilingual UI

**Decision:** Ship the UI in Turkish and English, with Turkish as the default for a first-time user.

**Context:** The initial audience applies for Schengen visas from within Türkiye. Browser language cannot be trusted to pick Turkish — many users run English-configured devices.

**Rationale:**
- Meets users in their language by default
- Language resolution is: stored preference → Turkish. The browser language is never consulted, so `i18next-browser-languagedetector` is intentionally *not* used.
- `i18next` + `react-i18next`, both locales bundled statically (no network request, no flash of untranslated text).

**Implementation:** `src/i18n/`, `src/app/providers/LocaleProvider.tsx`.

## ADR-012: Stable, Language-Independent Domain Values

**Decision:** All identifiers persisted in a dossier — enum values, document `code`, `countryCode`, `visaType`, validation finding `id`/`ruleId` — remain language-independent. User-facing text is resolved from translation keys at the UI boundary.

**Context:** Exported JSON must be valid and identical regardless of the UI language, and old exports must keep importing.

**Rationale:**
- A dossier created in Turkish and one created in English produce identical JSON.
- Wording can change without altering data or breaking imports.
- Document instances stop storing a display `name`; `code` is the identity and the label is derived via `documentLabel()`. `Document.name` is retained as an optional, deprecated field so existing 1.0.0 exports still import (`schemaVersion` unchanged).

**Implementation:** `src/lib/document-label.ts`, `src/domain/rules/types.ts`, `src/domain/schemas/document.schema.ts`.

## ADR-013: Locale Preference May Persist (Non-Sensitive)

**Decision:** Persist the language choice in `localStorage` under `visaflow-locale`.

**Context:** ADR-006 forbids `localStorage` for personal data but carves out non-personal interface preferences (as already done for theme).

**Rationale:**
- A language choice reveals nothing about the applicant or their dossier.
- It is the only key the i18n layer writes; no dossier data ever passes through it.

**Implementation:** `src/app/providers/LocaleProvider.tsx`, pre-paint script in `index.html`.

## ADR-014: Country → Visa Type → Requirement Hierarchy

**Decision:** Restructure country templates from a flat country config into `country → visa type → requirements`.

**Context:** Requirements differ by visa type, not just by country. The previous model conflated the two.

**Rationale:**
- `CountryConfig` holds one or more `VisaTypeTemplate`s, each keyed by a stable `id` (e.g. `schengen-short-stay-tourism`).
- `resolveVisaTemplate(countryCode, visaType)` maps the persisted dossier enum onto a template without changing the enum.
- Conditional-requirement evaluation (`isRequirementApplicable`) is reused unchanged.
- The unused, duplicated `DocumentTemplateSchema` was removed; `DocumentRequirement` is the single template type.

**Implementation:** `src/config/types.ts`, `src/config/countries/`.

## ADR-015: Official-Source Verification Metadata

**Decision:** Templates and requirements may carry source citations and a content-maintenance review status.

**Context:** Visa requirements change. VisaFlow must not imply a requirement is official merely because it appears in the app.

**Rationale:**
- `RequirementSource` records a citation a maintainer actually consulted; `reviewStatus` is one of `unverified | partially_verified | verified | needs_review`.
- These are **content-maintenance** signals, not legal guarantees. VisaFlow is never represented as an embassy or authorized visa centre.
- No scraping, no external calls, no invented dates. Absent sources and absent verification dates are meaningful, not gaps to fill.
- The Greece template is honestly marked `unverified`: the only repository evidence is a prior `lastUpdated` date and a general ministry link, so no `lastVerifiedAt` is set.

**Implementation:** `src/config/types.ts`, `src/config/sources/`, `src/components/ui/source-note.tsx`.

## ADR-016: No Visa Approval or Refusal Prediction

**Decision:** VisaFlow will not compute a visa-approval probability or a rejection-risk score, in any form.

**Context:** Such a number would be misleading, unfalsifiable, and would misrepresent an organizational tool as a legal predictor.

**Rationale:**
- The product measures **organization and internal consistency** only: dossier readiness, application completeness, missing required documents, documents needing updates, consistency findings.
- Recorded here so future contributors do not introduce approval/refusal predictions.

**Implementation:** enforced by convention and by the Settings disclaimer (`settings:disclaimer.noPrediction`).

## ADR-017: Dashboard Presentation Adapter

**Decision:** The Dashboard derives everything it shows from a single pure presentation adapter (`src/features/dashboard/dashboard-model.ts`); the page and its widgets hold no data logic.

**Context:** The old dashboard computed readiness, countdowns and the validation `Dossier` inline, duplicating logic that already lived elsewhere and disagreeing with the Documents page on what "ready" means.

**Rationale:**
- `buildDashboardModel(state)` is i18n- and Intl-free — it returns raw numbers, ISO dates, tones and stable keys, so it is unit-testable without any React provider and cannot leak locale-formatted data.
- It re-encodes **no** business rule: validation comes from `runValidation`, requirement/source resolution from `resolveVisaTemplate`, applicability from the config layer. It only adds one documented definition of document readiness and a few derived view descriptors.
- Readiness is an **organizational** signal (how assembled the dossier is) — never a probability of approval or refusal (reaffirms [ADR-016]).
- The model wraps a list of per-application view models (`{ applications, active }`) so a future multi-application phase fits without reshaping any widget prop. The MVP always has exactly one; no multi-app UI, selection, or storage is built.
- Each dashboard section is a standalone, prop-driven widget (`src/components/dashboard/*`) demonstrated in `/playground`.

**Implementation:** `src/features/dashboard/dashboard-model.ts`, `src/components/dashboard/*`, `src/components/ui/{readiness-ring,timeline}.tsx`, `src/pages/DashboardPage.tsx`.

## ADR-018: Scope `useTranslation` to Its Namespaces

**Decision:** Components call `useTranslation(<namespaces>)` with the namespaces they use; the no-argument form is not used.

**Context:** Binding `t` to every namespace at once makes its key type a union over all resources. As the resource set grew, resolving a plain `t('…')` call tripped TypeScript's instantiation-depth limit (TS2589) at an unrelated call site.

**Rationale:**
- Scoping each `t` to a few namespaces keeps its key union small and cheap to instantiate, and keeps full key/namespace type-checking.
- `dynamicT()` remains the escape hatch for runtime-computed keys and resolves any namespace at runtime via the `ns:key` syntax regardless of the TypeScript binding.

**Implementation:** all previously no-argument `useTranslation()` sites now pass `'common'` (or their specific namespaces); note added in `src/i18n/types.ts`.

## ADR-019: Product Vision — an Application Workspace, Not a Checklist

**Decision:** VisaFlow's product identity is "the open-source, privacy-first application workspace for international visa preparation" — a structured dossier, validation engine, timeline, country-specific requirements, and reusable workflows — not a Greece-specific checklist.

**Context:** The codebase matured (validation engine, widget dashboard, country-pack config, i18n) past its original "Greece Schengen checklist / MVP" framing. Documentation still described the smaller thing, and MVP/Greece-only language plus heavy duplication had accumulated across the docs.

**Rationale:**
- A single, explicit vision is the tie-breaker for future scope decisions and keeps the roadmap coherent (see `docs/vision.md`, `docs/roadmap.md`).
- Greece is positioned as the *first implemented country pack*, an example of the system — never the product's ceiling.
- The documentation was reorganized into a taxonomy with one canonical source per topic (vision, principles, architecture + per-layer deep dives, roadmap-as-phases) to remove duplication and drift.

**Implementation:** `docs/vision.md`, `docs/principles.md`, `docs/roadmap.md`, a restructured `docs/architecture.md`, and a rewritten `README.md`. Reaffirms [ADR-016] (no prediction) as the hard line of the vision.

## ADR-020: Playground as the Component Workbench (Demonstrate-Before-Use)

**Decision:** The in-app Playground (`/playground`) is VisaFlow's component workbench — a lightweight, zero-dependency alternative to Storybook — and every reusable UI primitive or dashboard widget must be demonstrated there before it is used across the app.

**Context:** The build-in-playground-then-adopt pattern was already practiced (design system, dashboard widgets) but was never named or codified as a rule, so it could quietly erode.

**Rationale:**
- The design system is small enough that a single in-app page delivers Storybook's core benefit — components in isolation, in every state — with no extra dependency, using the real providers, tokens, i18n and theme.
- A demonstrate-before-use rule keeps the design system honest: if a component is worth reusing, it is worth demonstrating, and the demo is where its API and its long-Turkish/empty/loading states get pressure-tested.
- It is code-split and not linked from the production sidebar, so it costs nothing in production.

**Implementation:** `docs/playground.md`; the rule is stated in `CONTRIBUTING.md`. Enforced in practice by the playground render test that mounts every section.

## ADR-021: Live Dossier Snapshot Instead of an Activity Feed (Until Persistence)

**Decision:** The dashboard's "recent activity" area is a **live dossier snapshot** — present-tense facts derived from the current state — not a chronological activity/history feed. It invents no history and no timestamps.

**Context:** A command-center dashboard wants a "what changed recently" surface, but VisaFlow keeps all data in memory (ADR-006) with no event log, so there is nothing to source a truthful history from. Faking timestamps or a change stream would be dishonest and would break on refresh.

**Rationale:**
- Everything shown is derived directly from current state (`buildDossierSnapshot`) — "applicant on file", "7 documents ready", "trip planned" — so it is always accurate and never fabricated.
- The item shape (`SnapshotItem { id, key, tone, count?, to? }`) is deliberately event-stream-shaped, so a future persistence/event-logging phase can replace the source with a real activity timeline **without changing the widget or the surrounding layout**.
- Each item deep-links to where that part of the dossier is edited, so the section is never a dead end.

**Implementation:** `buildDossierSnapshot` in `src/features/dashboard/dashboard-model.ts`; `src/components/dashboard/DossierSnapshot.tsx`; demonstrated (populated + empty) in `/playground`. Reaffirms [ADR-006] (in-memory only) and [ADR-016] (no prediction).

## ADR-022: Dashboard Is a Command Center, Not a Metrics Panel

**Decision:** The dashboard communicates through purpose-driven product sections with **readiness as the single dominant progress indicator**. It carries no standalone KPI-card row.

**Context:** The first dashboard led with a four-card KPI metrics strip (documents / appointment / trip / findings). It read like an analytics/admin panel and diluted the one question the dashboard exists to answer — *what should I do next?*

**Rationale:**
- The redesign removed the KPI row outright (not replaced with smaller cards). No information was lost: each signal re-homed into a section that also says *why it matters* and *where to act* (readiness hero, single next action, documents summary, upcoming timeline, consistency health, trip, snapshot).
- Every visible number must help the user decide or act; a metric that cannot answer "what next?" is not promoted.
- The single next action surfaces exactly one task with its reason and an effort estimate — never a list — so priority is unambiguous.

**Implementation:** `src/pages/DashboardPage.tsx`; `src/components/dashboard/{ReadinessHero,NextAction,ConsistencyHealth,DocumentsSummary,DossierSnapshot}.tsx`. Reaffirms [ADR-017] (presentation adapter) and [ADR-016] (organizational, not predictive).

## ADR-023: Country Values Persist as ISO Codes; Labels via an Intl Adapter

**Decision:** Country fields store ISO 3166-1 alpha-2 codes only. Localized display names are resolved at the UI boundary through a single adapter (`src/lib/countries.ts`) that wraps `Intl.DisplayNames`; a searchable `CountryCombobox` replaces the free-text 2-letter inputs across Trip and Applicant.

**Context:** Country was entered as an uppercase 2-letter text box (users had to know "GR"), and the i18n `countries` map held exactly one entry (`GR`). A real selector needs localized names for search and display in tr/en without either a network call or hundreds of hand-maintained name strings.

**Rationale:**
- `Intl.DisplayNames` (full ICU, offline, zero new dependency) gives correct tr-TR/en-GB names for every region; we bundle only the ISO code list. No 200+ names in translation JSON, so tr/en parity stays trivial and exported JSON remains language-independent.
- The adapter caches one `DisplayNames` per locale, searches by localized name **and** code with Turkish-aware normalization, ranks exact code hits first, and falls back to the raw code for unknown/legacy codes or when `Intl.DisplayNames` is unavailable — so nothing ever renders blank.
- Components never call `Intl.DisplayNames` directly (mirrors the `format.ts` "no direct Intl" rule).

**Implementation:** `src/lib/countries.ts`, `src/components/ui/country-combobox.tsx`; adopted in `src/components/trip/*` and `src/components/applicant/*`. Persisted value is unchanged (still `CountryCodeSchema`), so schemaVersion 1.0.0 and import/export are untouched.

## ADR-024: Itinerary Stops Are Overnight Stays; the Date Pair Is Canonical

**Decision:** A route stop represents one overnight stay. Its `arrivalDate`/`departureDate` pair is the source of truth; the stored `nights` is a derived value kept in sync on write and always derived from the dates for display. Planned itinerary and reservation evidence remain separate concepts, and trip dates are the canonical boundary for dependent coverage checks.

**Context:** `RouteStopSchema` redundantly stores `arrivalDate`, `departureDate` **and** `nights`, and the nights math was duplicated between `trip-model.ts` and the route builder. Redundant stored values can drift.

**Rationale:**
- One canonical definition (`src/features/trip/route-dates.ts`) removes the duplication and the drift: `computeNights`/`stopNights` derive from dates; `syncStopNights` rewrites the stored `nights` on every edit; imported legacy routes are read, never silently mutated.
- Keeping the `nights` field (rather than dropping it) preserves schemaVersion 1.0.0 and import/export compatibility — no schema change.
- Validation is unchanged (`trip.routeNightsMatchTotal` still sums the stored value); the route-coverage indicator is presentation only, so no finding outcome changes.

**Implementation:** `src/features/trip/route-dates.ts`, consumed by `trip-model.ts`, `RouteBuilder`, `TripDateSummary`, `CoverageSummary`. Trip guidance (`src/features/trip/trip-guidance.ts`) is a pure info-only presentation layer (like `applicant-guidance.ts`), never a validation rule — reaffirms [ADR-016].

## ADR-025: Validation Center Is a Presentation Layer over the Engine (Calm Severity Wording)

**Decision:** The Validation Center ("Consistency checks" page) is a thin presentation composition over `runValidation` and a pure adapter (`src/features/validation/`). It organizes findings by domain group and dossier area, derives a per-group/area *health*, and re-labels engine severities in calm, review-specialist language — "Needs attention" / "Review recommended" / "Good to know" — while the underlying `error`/`warning`/`info` severity is left completely unchanged.

**Context:** The page read like a compiler error list: three count cards, raw `Error`/`Warning`/`Info` badges in saturated red/amber/blue, an accordion of findings, and raw `relatedFields` chips. That increases anxiety and answers none of "how ready am I / what needs attention / what already looks good / what should I do next?".

**Rationale:**
- **No re-encoded logic, no new outcomes.** Grouping, health, and severity *labels* are presentation only; findings, severities, and counts come verbatim from the engine — so no validation outcome changes (a hard sprint constraint). The adapter is pure and unit-tested without React.
- **Coherence, never prediction.** Health and hero wording describe internal consistency and completeness, never approval odds — even a blocking finding uses the calm amber tone rather than an alarming red wall ([ADR-016]).
- **No dead ends.** Every actionable finding resolves to a deep link via `finding-actions.ts`, reusing the `?step=` deep-link the Trip (and now Applicant) wizards already read — trip findings land on the exact step, passport findings on the passport step.
- **Reuse.** Completion comes from the Documents feature's canonical `buildDocumentBuckets5`; the ring is the existing `ReadinessRing`; chips are `StatusBadge`. New reusable widgets (`ValidationHero`, `FindingCard`, `FindingGroup`, `ReadinessSummary`, `ReviewProgress`) are demonstrated in `/playground`.

**Implementation:** `src/features/validation/{finding-presentation,finding-actions,validation-model}.ts` (pure), `src/components/validation/*` (presentation), `src/pages/ConsistencyChecksPage.tsx` (thin shell). A small sanctioned deep-link addition gave `ApplicantPage` the same optional `?step=` reader `TripPage` already had. No schema, import/export, or rule change.

## ADR-026: Employment Is a Guided Workspace over Existing Layers (Derived Tenure, Docs Stay in Documents)

**Decision:** The Employment page becomes a thin six-step guided workspace (status · employer · income · leave · documents · review) over pure adapters in `src/features/employment/`. It re-encodes no rule and stores no new data: current-employer **tenure is derived** from `employment.startDate` (never stored), **employment fields and employment documents stay separate** (documents remain in the Documents workspace), **guidance is presentation-only**, the **HR-request list derives from applicable *missing* requirements**, and **approved leave is compared against the canonical Trip dates** via the existing `employment.leaveCoversTrip` findings. No schema change.

**Context:** The page was a flat CRUD form with a Save button that only revealed employer fields for the `employed` status and hard-coded a currency subset. The domain already modelled everything needed (`EmploymentSchema` has employer, role, `startDate`, `monthlyNetIncome`, `salaryBank`, approved-leave dates, and more), so this is a UI + presentation-adapter sprint, not a schema one.

**Rationale:**
- **Reuse over reinvention.** Tenure (`employment-tenure.ts`), guidance (`employment-guidance.ts`), the employment-document summary + HR checklist (`employment-documents.ts`), and the review model (`employment-model.ts`) are pure and unit-tested. Document readiness reuses `buildDocumentBuckets5` + `applicableRequirements` (filtered to `category==='employment'`); leave coverage reuses `runValidation` findings; currency/date use `useFormatters`. No second document-status store, no re-derived coverage, no re-encoded applicability.
- **Coherence, never prediction.** Guidance is `info`/`neutral` only and never affects readiness or a finding; the review speaks in captured / incomplete / needs-review / not-applicable — never "approved" or "strong profile" (ADR-016). Income is documented net pay, never a strength score.
- **Status-aware, non-destructive.** Progressive disclosure hides irrelevant employer/leave sections for non-employed statuses (calm "not needed" states, never errors), and `updateEmployment` shallow-merges so changing status never deletes stored data.
- **No dead ends.** Validation employment findings deep-link to `/employment?step=leave`; employment documents deep-link into the Documents workspace via a small **additive** `?category=`/`?doc=` param (Back/Forward-safe; no params → unchanged behavior). `EmployerDetails`, `socialSecurityNumber`/`taxId` beyond a disclosure, and total career experience are intentionally out of scope / unmodeled.

**Implementation:** `src/features/employment/*` (pure), `src/components/employment/*` (presentation + steps), `src/pages/EmploymentPage.tsx` (thin shell, `?step=` reader). Sanctioned cross-page touches: `src/features/validation/finding-actions.ts` (`?step=leave`) and `src/pages/DocumentsPage.tsx` (additive `?category=`/`?doc=` reader). No schema, import/export, or rule change.

## ADR-027: Finance Is a Financial-Evidence Workspace over Existing Layers (Source-Aware, Balance Never Judged)

**Decision:** The Finance page becomes a thin six-step guided workspace (source · personal · sponsors · documents · consistency · review) over pure adapters in `src/features/finance/`. It re-encodes no rule and stores no new data: applicability is **funding-source-aware** (self / sponsor / employer / mixed), a recorded **account balance is shown but never judged** (no sufficiency/threshold/strength), **employment income is read from the Employment section** (never copied), **financial documents are derived from the Documents workspace** (grouped Bank / Employment income / Sponsor / Employer / Other), **sponsors are summarized in a funding context** while all editing stays owned by `/sponsors`, and **consistency reuses the engine's `sponsor.*` findings** plus a few net-new *factual* observations. No schema change.

**Context:** The page was a flat CRUD form with a Save button that only revealed personal-finance fields for `self`/`mixed`, hard-coded a currency subset, carried hardcoded English strings, and rendered only a subset of `FinancingSchema`. The domain already modelled everything needed (`FinancingSchema` + the rich `SponsorSchema` at `dossier.sponsors`), so this is a UI + presentation-adapter sprint, not a schema one. The user's mental model is "will my financial evidence satisfy the officer?", not "enter money".

**Rationale:**
- **Reuse over reinvention.** Documents grouping/gathering (`finance-documents.ts`), guidance (`finance-guidance.ts`), factual consistency (`finance-consistency.ts`), and the review model (`finance-model.ts`) are pure and unit-tested. Evidence readiness reuses `buildDocumentBuckets5` + `applicableRequirements`; funding-consistency reuses `runValidation`'s `sponsor.*` findings; currency uses `useFormatters`. No second document- or sponsor-status store; sponsor add/edit never moves into Finance.
- **Completeness & consistency, never a verdict.** Guidance is `info`/`neutral` only; consistency observations are factual (`ok`/`attention`/`neutral`) and never re-judge a finding's severity; the review speaks captured / incomplete / needs-review / not-applicable. No approval odds, no financial "strength" score, no minimum-balance implication, no source ranking — an employer-funded trip is never framed as stronger or weaker (ADR-016).
- **Source-aware, non-destructive.** All four `source` values stay selectable (an imported `employer` dossier is never left with an unreachable value), progressive disclosure gives non-applicable sections calm "not needed" states, and `updateFinancing` shallow-merges so changing the source never deletes stored data.
- **No dead ends.** The funding-strategy finding (`sponsor.requiredForSponsoredFunding`) deep-links to `/finance?step=sponsors` and financing-field findings to `/finance?step=source`; per-sponsor findings still land on `/sponsors`. Finance links into Documents via the existing additive `?category=`/`?doc=` params, and to a specific sponsor via a new **additive** `/sponsors?sponsor=<id>` (Back/Forward-safe; no param → unchanged behavior; unknown id ignored). The grouped "evidence to gather" Copy list copies localized document **names only** — never any dossier value.

**Known gap (deliberate):** the Greece pack keys sponsor documents on `financing.source == 'sponsor'` only, so `mixed` funding does not surface sponsor-document *requirements* via `applicableRequirements` — but the funding *rule* treats `mixed` as sponsored, so the consistency step still flags it. Fixing the pack would change readiness outcomes and is out of scope. `application.sponsorIds` remains unwired (single-app MVP); Finance reads `dossier.sponsors` directly.

**Implementation:** `src/features/finance/*` (pure), `src/components/finance/*` (presentation + steps), `src/pages/FinancePage.tsx` (thin shell, `?step=` reader). Sanctioned cross-page touches: `src/features/validation/finding-actions.ts` (`/finance?step=` routing for the funding-strategy finding + `financing.` fallback) and `src/pages/SponsorsPage.tsx` (additive `?sponsor=<id>` reader). No schema, import/export, or rule change.
