# Architectural Decisions

This document records key architectural decisions and their rationale.

## ADR-001: No Database

> **Amended by [ADR-036] (2026-08-23).** The "no backend, no third party" half of this decision
> stands unchanged and always will. The "browser memory only" half does not: dossiers are now
> saved in this browser's IndexedDB behind a repository port, with a session-only mode for the
> case this ADR originally assumed. The trade-off below — losing data on refresh — was the cost
> that eventually justified revisiting it. The text is kept as written.

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

> **Still in force, and narrower than it looks.** [ADR-013] fixed the exception at exactly two
> keys (`visaflow-theme`, `visaflow-locale`). [ADR-036] added durable storage for dossiers, but
> deliberately in **IndexedDB**, not here — every reason listed above is a reason about
> `localStorage`'s ergonomics as a personal-data store, and none of them was waved away.

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

> **Still a snapshot, deliberately ([ADR-036], 2026-08-23).** Persistence arrived, which is the
> condition this ADR named — and the snapshot stayed. A stored dossier is not an event log:
> VisaFlow records the dossier's *state*, not a history of edits, so there is still nothing
> truthful to source a feed from. Building one would mean starting to keep a record of what the
> user did and when, which is a privacy decision, not a dashboard one.

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

## ADR-028: Sponsors Is the Canonical Sponsor Workspace; `documentIds` Is the Sponsor↔Document Link

**Decision:** The Sponsors page becomes the canonical sponsor-management workspace — a grid of rich summary cards over pure adapters in `src/features/sponsors/`, with all editing in a progressive right-side **Sheet** (nine accordion sections, autosave, no Save button). Per-sponsor evidence is made real by using the **existing** `Sponsor.documentIds` field as the canonical sponsor↔document association: the workspace **links and unlinks** existing sponsor-evidence documents, while the Documents workspace stays the sole owner of document creation, status, verification, dates, notes, and deletion. Per-sponsor "readiness" is an organizational label (ready / needs attention / incomplete), never a financial-strength score, asset comparison, or approval likelihood. No schema change.

**Context:** The page was a flat list + a 5-field add/edit Dialog exposing a fraction of the ~22-field `SponsorSchema`, and `Sponsor.documentIds` — though defined — was never populated by any code path, so `documentCount` was always 0 and the `sponsor.hasDocuments` warning fired for every financed sponsor. Finance, Documents, Validation, and Dashboard all reference sponsors; the redesign makes Sponsors the hub they link into. The domain already modelled everything needed, so this is a UI + presentation-adapter + wiring sprint, not a schema one.

**Rationale:**
- **Reuse over reinvention.** Evidence eligibility/association (`sponsor-documents.ts`), the accordion section model (`sponsor-editor.ts`), and the workspace model (`sponsor-model.ts`) are pure and unit-tested. Document readiness reuses `applicableRequirements` + the dossier `Document` instances; findings come from `runValidation`'s `sponsor.*` output (tied to a sponsor by the `sponsors.<id>.*` relatedField). Nested collections (investments, owned assets) reuse `CollectionEditor`; removal reuses `AlertDialog`; the card/sheet reuse the shared primitives. No second document- or sponsor-status store; Finance/Documents/Validation are not duplicated.
- **Link, don't own.** Linking only writes `Sponsor.documentIds` via `updateSponsor`; it never creates, edits, or deletes a document. Unlinking never deletes; removing a sponsor never deletes linked documents. The linker distinguishes linked evidence, other eligible documents, missing applicable requirements (create in Documents), and **stale** references (removable without deleting anything) — unknown/ineligible ids are surfaced, never a crash. Only sponsor-category documents and the classified `RELATIONSHIP_PROOF` are eligible; arbitrary passport/trip/employment documents are not.
- **Correct data flow, not a rule change.** Once real associations populate `documentIds`, the existing `sponsor.hasDocuments` finding resolves for that sponsor — the rule and readiness algorithm are byte-for-byte unchanged; they finally receive data (ADR-003/ADR-016 preserved: no prediction, no financial scoring).
- **Progressive, non-destructive editing.** A Sheet (full-screen on mobile) opens on the first incomplete section; each section shows a calm completion indicator; every field autosaves (shallow merge), so switching sections or sponsors never loses edits. Radix provides focus trap / Escape / focus restoration. Removal is an explicit `AlertDialog` that names the sponsor, states that linked documents are kept and finance/validation may change, and on confirm closes the Sheet and clears `?sponsor=`.

**Known gaps (deliberate):** `application.sponsorIds` remains vestigial/unwired (single-app MVP) — the canonical list is `dossier.sponsors`; removing a sponsor cannot clean a `sponsorIds` reference because no reducer action manages it (surfaced, not silently corrupted). A sponsor document's `ownerId` is still the applicant's id (association is by `documentIds`, not owner). The Greece pack's sponsor-doc `conditionalOn` gap (ADR-027) is unchanged.

**Implementation:** `src/features/sponsors/*` (pure), `src/components/sponsors/*` (card, editor Sheet + sections, relationship selector, document linker, remove dialog), `src/pages/SponsorsPage.tsx` (workspace shell, `?sponsor=` reader, first-sponsor onboarding). Sanctioned cross-page touches (additive, "everything links here"): `finding-actions.ts` now deep-links per-sponsor findings to `/sponsors?sponsor=<id>`, and the Dashboard snapshot sponsor item + `dashboardFindingLink` link to `/sponsors`. No schema, import/export, or rule change.

## ADR-029: Timeline Is a Derived Preparation Plan — Recommendations, Not Deadlines; Priority Reused from the Dashboard

**Decision:** The Timeline page becomes a calm, actionable **visa-preparation plan** over pure adapters in `src/features/timeline/*`, with three modes (Preparation plan · Key dates · Document freshness). Preparation tasks are **derived from current dossier state + the timeline policy, never persisted**; their recommended target dates and proximity bands are computed from the appointment date; their status comes from real document/validation state. VisaFlow's timing is always **organisational recommendation language**, never an official deadline. The single highlighted "do this first" **reuses the Dashboard's exported `deriveNextActions`** so the two never disagree. No schema, validation-outcome, readiness-rule, import/export, or language-independence change; no persistence, notifications, or calendar integration.

**Context:** The old Timeline was a passive vertical date list, derived inline, with hardcoded status colours and an unused hook — the country templates' `preparationMilestones` (`daysBeforeAppointment`, `relatedDocuments`) were defined but consumed by no actionable derivation, and a parallel `buildTimeline` already lived in `dashboard-model.ts`. The domain already carried everything needed, so this is a presentation + derivation sprint.

**Rationale:**
- **Reuse over reinvention.** The plan reuses the templates' `preparationMilestones` as the policy (`timeline-policy.ts`), `applicableRequirements` for applicability, document status/`buildDocumentBuckets`, `runValidation` findings, `associateFindings` for freshness, `route-dates` for the trip, `useFormatters` (`relativeDays`/`dateShort`), and `finding-actions` semantics for deep-links. Adapters are pure and unit-tested; the model imports the pure `build*` functions (never hooks) to avoid cycles.
- **Recommendations, not deadlines (honest derivation).** Target dates and bands use plan language (Recommended / Plan to complete / Suggested window / Overdue based on your plan) — never "Legally required by / Embassy deadline". Overdue means the recommended date has passed *and* the task is still incomplete; a completed past task is never overdue. Without an appointment, the plan falls back to calm relative phases — no dates are invented.
- **Fixed events vs preparation tasks are separate.** Key dates state facts (dates); the plan states recommendations — separate views and models. No fabricated activity or timestamps.
- **Derived, never persisted.** There is no task/checkbox/activity store; the appointment-day view is a read-only readiness summary. No notifications, browser/email reminders, or calendar integration.
- **Factual freshness.** A document is flagged only when its own `validUntil`, status, or a validation finding says so — never invented expiry or a "must be < N days old" recency rule.
- **Priority compatibility, reuse-only.** The hero's primary action is `deriveNextActions(...)[0]` with the Dashboard's own wording/route; a test asserts equality. The Dashboard model is not modified. The remaining duplicate *date* derivation (`buildTimeline` vs `timeline-dates`) is accepted **technical debt**, with a roadmap item to consolidate later — no false claim of a single source of truth.

**Known limitations (deliberate):** duplicate date derivation (tech debt, above); the `appointmentDay`/`travel` bands are reachable but rarely populated by the current milestone set; freshness is factual-only until templates gain verified freshness metadata.

**Implementation:** `src/features/timeline/*` (policy, tasks, dates, freshness, links, model — pure), `src/components/timeline/*` (hero, mode selector, plan, task card, date-window badge, key-dates, freshness list, appointment-day summary), `src/pages/TimelinePage.tsx` (thin shell, `?mode=` reader). Reuses (does not modify) `dashboard-model.ts` (`deriveNextActions`, `buildDocumentBuckets`, `deriveReadinessState`). See `docs/timeline-architecture.md`. No schema, import/export, or rule change.

## ADR-030: Settings Is the Application Control Center (Two-Pane, Pure Presentation)

**Decision:** The Settings page becomes the application's **control center** — a responsive two-pane shell (a calm section rail on desktop, a horizontally-scrollable selector on mobile) over pure derivation in `src/features/settings/settings-model.ts`, with sections for Appearance, Language, Country packs, Privacy, Local data, Import & export, About, and Advanced. It is **pure presentation**: it reuses the existing import/export services and provider actions and changes no schema, import/export format, storage, or validation behaviour. The active section is an additive `?section=` deep-link.

**Context:** Settings was a read-mostly stack of shadcn Cards (a theme + language dropdown, an optional country `Select`, a reset dialog, a disclaimer, and an About block with a hardcoded version); import/export lived only in the AppLayout sidebar; the heading outline was broken (`CardTitle` is a `div`, so groups skipped `h2`); and theme labels were hardcoded English. The goal was desktop-quality polish (Linear/Notion), not new capability — everything needed already existed to compose.

**Rationale:**
- **Composition over new primitives.** There is no Switch in the system; theme (Light/Dark/System) and language (TR/EN) use `SegmentedControl`. The redesign reuses `SegmentedControl`, `CountryCombobox`, `AlertDialog`, `Accordion`, `DataList`, `GuidanceNote`, and — for the honest read-only packs list — the existing `ReviewStatusBadge`/`SourceNote`. Only two genuinely reusable primitives are added (`SettingsSection`, `SettingRow`), both demonstrated in `/playground`.
- **Reuse, don't duplicate.** Import/export/backup reuse `downloadDossier`/`importPartial`/`readFileAsText` + `loadDossier`/`markSaved`/`reset` (no format or storage change); the sidebar quick-actions are untouched. A pure `settings-model` derives the installed packs (honest `unverified` status, never an endorsement), the active pack, a factual "what lives on this device" summary, and the About facts.
- **Honesty preserved.** The load-bearing no-prediction disclaimer (ADR-016) is kept; the privacy section reinforces the in-memory model and the **only two** non-personal localStorage keys (ADR-006/013); the version is a documented constant (no `package.json` shipped to the client). Country packs are informational and scale-ready (package-manager mindset), and the active destination stays editable (reusing `updateApplication`, which touches only `application.destinationCountry`).
- **Accessibility fixed.** One `h1` (`PageHeader`) + a real `h2` per section (fixing the old `h1→h3` gap); the rail is keyboard-operable with `aria-current`; focus moves to the section heading on switch; destructive/replacing actions (Reset, import-replace) are isolated behind `AlertDialog`.

**Known limitations (deliberate):** one country pack (Greece, honestly unverified); the version constant must be kept in sync with `package.json` on release; "unsaved changes" is tracked in memory only (no route/beforeunload guard); Advanced is navigation, not a stored dev-mode flag (a flag would be a storage change).

> **Three of these have since moved ([ADR-036], [ADR-038], [ADR-041]).** The version is injected
> from `package.json` at build time rather than kept in sync by hand. "Unsaved changes" is gone as
> a concept — the dossier is autosaved, and what Settings reports is where it lives and how fresh
> its exported backup is, read from the stored record. The Privacy section's "in-memory model" is
> now the local-only model, and Import & export no longer confirms a replacement, because importing
> is additive and replaces nothing.

**Implementation:** `src/features/settings/settings-model.ts` (pure), `src/components/settings/*` (SettingsSection, SettingRow, SettingsNav + the eight section components), `src/pages/SettingsPage.tsx` (two-pane shell, `?section=` reader, focus-to-`h2`). No schema, import/export, storage, or rule change; no changes to the domain pages or validation.

## ADR-031: Onboarding Is a First-Run Product Surface (Dedicated `/welcome`, `hasData`-Derived, No Persistence)

**Decision:** The first five minutes become a deliberate product surface: a dedicated `/welcome` route hosting a calm, ≤4-step guided setup (Welcome → Language & destination → Create or import → Ready) that gets a brand-new user to create (or import) their first dossier in about a minute, then hands off to the Dashboard. The index route (`/`) redirects to `/welcome` when there is no dossier and to `/dashboard` when there is, derived purely from `hasData` via `firstRunTarget`. The shared `NoDossierState` is upgraded into the one canonical empty-workspace component, so every empty page routes into the journey instead of dead-ending. It is **pure presentation**: it reuses the existing wizard architecture, the import/export services, and provider actions, and changes no schema, import/export format, storage, or validation behaviour.

> **Superseded in part by [ADR-040] (2026-08-24).** The `/welcome` surface, its steps and the
> `NoDossierState` role all stand. What changed is the routing input: deriving entry from
> `hasData` was correct while a dossier could only live in memory, and became wrong the moment
> storage answered asynchronously — every returning user landed in onboarding. `firstRunTarget`
> now takes the workspace's state, not a boolean.

**Context:** First run was an accidental empty state — `/` → `/dashboard`, and an empty Dashboard showed a single hard-coded "Start Greece" button (`initializeEmpty('GR')`); every other page dead-ended to a back-to-dashboard `NoDossierState`. Nothing welcomed the user, explained the local-first/no-prediction model, or offered a language/country choice at creation.

**Rationale:**
- **Entry stays derived, never persisted.** There is no "onboarding completed" flag and no new localStorage key — still exactly `visaflow-theme` + `visaflow-locale` (ADR-006/013). A skipped, dossier-less user simply sees the welcome again after a refresh, which is consistent with the in-memory privacy model. Only the index route redirects; every workspace route stays directly reachable (no global hard redirect), and Back/Forward + an invalid-`?step=` safe fallback both work.
- **Reuse, don't reinvent.** The flow reuses the established wizard pattern (`Stepper`, `?step=` synced to the URL, focus-to-heading, a11y) and the `EmptyState`/`GuidanceNote`/`CountryCombobox`/`SegmentedControl`/`Button` primitives; create/import reuse `initializeEmpty` and `readFileAsText`→`importPartial`→`loadDossier` unchanged; the reassurance copy reuses the Settings `disclaimer.noPrediction`/`privacy.*` keys. A thin pure adapter (`onboarding-model.ts`) holds the step ids, the safe `resolveStep`, positional status derivation, and the `firstRunTarget` routing decision, so all of it unit-tests without React.
- **Honesty preserved.** The no-prediction promise (ADR-016) is surfaced on the welcome step; the setup step is honest that Greece is the only pack that ships today; arriving with a dossier already loaded never restarts onboarding (a calm "continue to dashboard" instead of overwriting).
- **One canonical empty state.** `NoDossierState` gains an injectable API (`title`/`description`/`icon`/`section`/`hint` + primary "start" / secondary "import" / tertiary "how it works"); changing the shared component upgrades all eight empty workspaces without editing the protected pages, and keeps a single design/guidance language as new workspaces are added.

**Known limitations (deliberate):** one country pack (Greece, honestly unverified); entry is `hasData`-only, so completion isn't remembered across a refresh (by design — no persistence); "unsaved changes" remains in-memory only.

**Implementation:** `src/features/onboarding/onboarding-model.ts` (pure), `src/components/onboarding/*` (Welcome/Setup/Create/Ready steps), `src/pages/WelcomePage.tsx` (Stepper two-pane shell, `?step=` reader synced to the URL, focus-to-`h2`, mount-time "already have a dossier" guard), `src/components/NoDossierState.tsx` (canonical empty state), and a small router integration (`FirstRunRedirect` + the `/welcome` route) with the Dashboard empty state repointed to `/welcome`. No schema, import/export, storage, or rule change; no changes to the domain workspace pages or validation.

## ADR-032: Final Review Is a Composition, Not a Second Authority; the Print Package Separates Generated Sheets from the Physical Dossier

**Decision:** The Final Review workspace (`/review`, "Final Review" / "Son Kontrol") is a thin composition over pure adapters in `src/features/review/`. It answers a **different question** from the Validation Center — *"what do I have, what am I still missing, what do I bring, and am I organised for the appointment?"* rather than *"what is inconsistent?"* — and it introduces **no new authority**: readiness is the Dashboard's, findings and their counts are the Validation Center's, appointment-day readiness is the Timeline's, and document applicability is the country pack's. The only derivations it adds are the **submission checklist grouping** and the **print-package split**. The Print Package models two deliberately separate concepts — **pages VisaFlow can generate** from dossier data it holds, and the applicant's **physical dossier** of external documents it never holds — and implements neither PDF generation nor a print action this sprint. No schema, import/export, storage, validation-outcome or readiness change.

**Context:** The dossier had a workspace for every input (applicant, trip, employment, finance, sponsors, documents), a plan (timeline), and a consistency review (Validation Center), but nothing that answered the question an applicant actually asks the night before: *am I organised, and what goes in the folder?* The Documents workspace lists documents by category but not as a submission package; the Validation Center lists findings but says nothing about what to bring. The risk in building this was obvious — a second readiness number, a second finding count, or a second document-status store would immediately contradict a page that already exists.

**Rationale:**
- **Composition over a new authority.** `review-model.ts` calls `buildValidationModel()` **whole** (not `runValidation` again), so Final Review's attention/note counts are *structurally incapable* of diverging from the Validation Center. Readiness reuses `buildDocumentBuckets` + `deriveReadinessState`, and the highlighted action is `deriveNextActions(...)[0]` — the same discipline the Timeline adopted in [ADR-029], with tests asserting equality against all three sources. The Timeline's `buildAppointmentDay` was **exported** and reused rather than reimplemented (its only change).
- **One checklist derivation, two views.** `buildSubmissionChecklist` is the single source behind both the item-level checklist and the physical-dossier plan, so they can never disagree. Rows come from the applicant's own `Document` records **and** the applicable template requirements (a requirement with no record is the thing most likely to be forgotten; a custom document still has to go in the folder), deduped by `code` with the dossier record winning. `status` is `Document.status` verbatim plus the `not_instantiated` case already established by [ADR-026]/[ADR-027]; the five-way `state` (ready / needsAttention / missing / optional / notApplicable) is a documented *presentation grouping* of those statuses, not a new status system — `received` and `needs_update` both mean "in hand but not confirmed", which is precisely what a final review should raise.
- **The print split is structural, not just wording.** `GeneratedSheet` is `{ id, state, itemCount? }` over a **closed** `GeneratedSheetId` union — it has no field capable of carrying a document code, id, or title, so an applicant's external document cannot appear as something VisaFlow generates even by mistake. A test asserts exactly that. The physical side is a **roll-up** (bundle + counts + readiness), because the item-level detail already lives in the checklist above; repeating it would have printed the same list three times on one page. Both sides are read-only, and there is **no Print button**, because a button that does nothing is worse than none. The next Print/PDF sprint implements against `PrintablePiece`-shaped data without redesigning this model.
- **Honesty where data runs out.** "Before leaving home" and "At the appointment" state only what the applicant recorded plus the pack's own `notesKeys` (Greece records three). There is deliberately **no fabricated "after submission" checklist** — the repository holds no factual basis for one — only an honest statement that VisaFlow's role ends at preparation: it does not submit, track, or receive a decision ([ADR-015], [ADR-016]).
- **Calm by default.** A missing document is `neutral`, not `danger`; status is never colour-alone (every state carries an icon); readiness is captioned as organisational and explicitly *not* a prediction.

**Known limitations (deliberate):** Readiness uses the Dashboard's `buildDocumentBuckets` (where `not_applicable` counts as ready) while the Validation Center's hero uses `buildDocumentBuckets5` — a **pre-existing divergence** between two shipped pages that this sprint deliberately does not resolve, because changing either would alter a shipped surface; Final Review sides with the Dashboard/Timeline so the journey's dominant number stays consistent. The physical bundles are roll-ups only (no per-item packing state — that would need persistence). `Document.fileReference` remains a text reference, so no bundle can ever be verified as physically present. The `DataList` primitive still carries a hardcoded English "Not provided" fallback; Final Review avoids it by always passing an explicit localized value, but the primitive itself is untouched.

**Implementation:** `src/features/review/{review-checklist,review-summary,review-print,review-model}.ts` (pure), `src/components/review/*` (`ReviewHero`, `ApplicationSummary`, `SubmissionChecklist`/`ChecklistGroup`, `AttentionSection`, `AppointmentPrep`, `PrintPackage`, `state-meta`), `src/pages/ReviewPage.tsx` (thin shell), a lazy `/review` route and a nav entry in the existing Review group. Reuses (does not modify) `dashboard-model`, `validation-model`, `finding-actions`, `documents-model`, `template-sync`, `document-freshness`, `route-dates`, `ReadinessSummary`, `FindingCard`, `ReadinessRing`, `StatusBadge`, `DataList`, `GuidanceNote`, `NoDossierState`. Sole cross-feature edit: `export` on `buildAppointmentDay` in `timeline-model.ts`. New `review` i18n namespace (tr/en parity). No schema, import/export, storage, or rule change.

## ADR-033: One Canonical Dossier Readiness (`features/readiness`); `received` Is Obtained, Not Ready; `not_applicable` Leaves the Denominator

**Supersedes** the readiness clause of [ADR-017] ("it only adds one documented definition of document readiness") and resolves the "Known limitations" paragraph of [ADR-032]. Those ADRs are left untouched — they are append-only — but their readiness claims are no longer true of the code.

**Decision:** VisaFlow has exactly **one** definition of dossier readiness, owned by `src/features/readiness/`. Every surface that shows readiness consumes it and renders it under the same label. Each `Document.status` has exactly one documented meaning. Readiness measures **document preparation only**; consistency health remains a separate, non-percentage signal.

**Context:** Six different derivations shipped simultaneously, producing four different arithmetics. For one realistic dossier the product displayed **45%** (Dashboard ring), **36%** (Documents hero and Validation Center ring), **"4 of 11 checklist items ready"** (Final Review, on the same card as its own 45% ring), **"Complete missing documents (5)"** (Dashboard next action) and a sidebar badge of **4** — three of them inside a single Dashboard viewport. Two of the errors were exact opposites: `buildDocumentBuckets` counted `not_applicable` as completed work (inflating to 100%), while `buildDocumentBuckets5` kept it in the denominator where it could never be satisfied (making 100% unreachable). A dossier whose required documents were all `not_applicable` rendered a **100% "Ready for your appointment"** ring directly above an empty bar reading **"0 of 3 ready"**. `buildDocumentBuckets5`'s five buckets did not sum to `requiredTotal`, so the two segmented progress bars that assumed they did left an unexplained grey gap, and the five hero quick-filters could not reach a `received` or `not_applicable` document at all.

### What readiness means

An **organizational** measure of how much of the applicable document preparation is *confirmed done*. It is never a prediction, and there is deliberately no validation score, quality score, confidence score, or approval likelihood ([ADR-016]).

```
numerator   = applicable documents with status 'ready'
denominator = required documents whose status is not 'not_applicable',
              plus applicable required requirements with no document record yet
percent     = round(numerator / denominator × 100)
```

`applicable === 0` yields `percent 0`, `complete false` and `hasApplicableWork false` — **never 100%**. A dossier where every requirement has been disclaimed is not a prepared dossier, and reporting 100% would restore the polarity inversion in mirror image. `deriveReadinessState` returns `not_started` for that case and can never return `ready_for_appointment`.

The denominator includes requirements the applicant has no record for, because a dossier is created with `documents: []` and only seeded when the Documents workspace is first opened. Without them, a brand-new dossier that has collected nothing would read 100%, and the Final Review checklist would contradict it by listing every requirement as missing.

### Treatment of every status

| Status | Class | Numerator | Denominator | Tone |
|---|---|---|---|---|
| `not_started` | `notStarted` | no | yes | neutral |
| `requested` | `inProgress` | no | yes | info |
| `received` | `obtained` | **no** | yes | **accent — never amber** |
| `needs_update` | `needsUpdate` | no | yes | warning |
| `ready` | `ready` | **yes** | yes | success |
| `not_applicable` | `notApplicable` | no | **no** | neutral |

Two invariants hold for every value the module produces, both asserted by test:

```
ready + obtained + inProgress + notStarted + needsUpdate === applicable
applicable + notApplicable                              === requiredTotal
```

The first is what makes a segmented bar honest: every applicable document sits in exactly one visible segment, with no unexplained remainder. Optional documents never enter either side.

### Why `not_applicable` is excluded from both sides

Marking a requirement not applicable is a **disclaimer, not progress**. Counting it as ready inflated the number; counting it in the denominator only made 100% unreachable and punished an applicant for correctly recording that a requirement does not apply to them. Removing it from both sides makes the act of marking something N/A leave the percentage **unchanged**, which is the only neutral treatment. The exclusion cannot be abused to fake completeness because the engine already guards it: `document.requiredNotSkipped` (`src/domain/rules/document.rules.ts`) raises a warning whenever a required document is marked `not_applicable` **without a justifying note**.

### The semantics of `received`

`received` means **obtained and in hand, but not yet confirmed dossier-ready** — the workflow state between *Requested* and *Ready*. Before this ADR it had four conflicting treatments in shipped code: `timeline-tasks.ts` counted it as done, `finance-consistency.ts` as "have it", `review-checklist.ts` rendered it amber as a defect, `buildDocumentBuckets` folded it into *missing*, and `buildDocumentBuckets5` dropped it into no bucket at all — while the validation engine, correctly, never flagged it.

It is now: never *missing* (you have it), never *ready* (you have not confirmed it), never amber (it is progress, not a defect), and it generates **no validation finding** — which required no rule change, only a regression test. `DOCUMENT_STATUS_TONE.received` moved from `warning` to `accent`, and the Final Review checklist gained a distinct `obtained` state instead of folding it into `needsAttention`. `needs_update` moved from `danger` to `warning` in the same pass: a document needing renewal is work, not an emergency.

**Task completion ≠ dossier readiness.** This is the single sanctioned divergence and it must stay sanctioned in writing. A preparation task like *"obtain the bank statement"* **is** satisfied by `received` — `timeline-tasks.ts` keeps that behaviour deliberately. The question *"is the bank statement dossier-ready?"* is answered only by `ready`, so readiness, `buildAppointmentDay` and the submission checklist all require it. Both answers are correct because the questions differ. A dedicated invariant test asserts both at once; a future contributor "unifying" them would break the Timeline.

### Readiness vs consistency health

Two orthogonal axes, never blended into a weighted score. Readiness answers *how much is assembled*; the Validation Center answers *what is inconsistent*. Validation findings do **not** move the percentage — the builder takes documents only, so this is structural rather than a convention. The single point of contact is `deriveReadinessState`, where a blocking finding acts as a **gate** preventing a fully-collected dossier from reading "ready for your appointment"; it never alters the number. Tests prove both directions: a 100%-ready dossier carrying errors, and a finding-free dossier that is far from ready.

The Validation Center therefore shows the **same** percentage under the **same** label as everywhere else (its old "Dossier completeness" / "Dosya tamamlanma düzeyi" label is retired), and keeps its genuinely distinct signals — checks passed, attention count, note count, grouped findings — as non-percentage indicators.

### Ownership

`src/features/readiness/` owns the derivation: `readiness-types.ts` (the vocabulary and the status→class map), `document-readiness.ts` (the arithmetic and the `isDossierReady` / `isObtained` / `isApplicable` predicates), `requirement-readiness.ts` (the bridge to the country pack), and `readiness-model.ts` (`ReadinessState`, `deriveReadinessState`, `deriveNextActions`). The first three import only domain types; the module is a graph sink, so no consumer can create a cycle. `deriveReadinessState` and `deriveNextActions` moved here out of `dashboard-model.ts` because they are app-wide concepts the Timeline and Final Review already depended on — the Dashboard should not own logic three other surfaces consume.

A new `confirmDocuments` next action surfaces obtained-but-unconfirmed documents; it ranks below collecting and updating, because confirming is a minute's work and obtaining a document is not. The `dashboard:nextActions.*` i18n keys keep their namespace — renaming would be churn without benefit.

**Also recorded here (Final Review polish):** `/review` gains a `?mode=` toggle (`full` | `departure`) over the *same* `FinalReviewModel` — a compact, mobile-first departure check that never claims physical possession ("bundle to bring", never "packed"), adds no persistence and no packed-state; and the submission checklist gains an *All / Needs attention* filter that is view state only, filtering the canonical checklist rather than building a second model.

**Known limitations (deliberate):** the checklist's `actionable` counts optional rows and un-instantiated requirements, so it is **not** the readiness denominator — it answers "what goes in the folder", a different question ([ADR-032]); the Final Review hero therefore labels it explicitly rather than as a second readiness figure. `deriveNextDocument` still picks `not_started` then `needs_update`, skipping `requested` and `obtained` — a seventh, smaller opinion about "what's next" left for a follow-up. The example dossier is missing an `APPROVED_LEAVE` record its own employed applicant makes applicable, which is why its readiness reads 64% rather than 70%; that is the honest number and it is now stable whether or not the Documents workspace has been visited.

**Implementation:** `src/features/readiness/*` (pure), consumed by `dashboard-model`, `documents-model`, `validation-model`, `timeline-model`, `review-model`, `AppLayout` and the section-scoped employment/finance views. Canonical strings live in `common:readiness.*` so every surface shares one key. Deletions: `buildDocumentBuckets`, `buildDocumentBuckets5`, `DocumentBuckets`, `DocumentBuckets5`, the inline nav-badge filter, and the dead `sponsor-documents.readyCount`. No schema, import/export, storage, validation-severity or country-requirement change; still exactly two localStorage keys.

## ADR-034: Readiness Is a Ratio, the Submission Checklist Is an Inventory; `received` Shares the `info` Ramp; Recommendations Are Status-Aware

**Extends** [ADR-033], which established one canonical readiness definition. It does not change those semantics — it finishes applying them at the presentation layer and closes three gaps ADR-033 itself listed as follow-ups.

**Decision:** Three product-wide rules.

1. **Readiness is the one ratio; the submission checklist is an inventory.** Exactly one percentage is shown for a dossier. The checklist answers *"what belongs in my appointment package, and how many of those items still want action?"* — a **count**, never a second progress metric.
2. **`requested` and `received` share the low-chroma `info` tone**, and are told apart by icon, label and microcopy — never by hue.
3. **Every document recommendation is status-aware**, and considers applicable requirements that have no record yet.

### Context

ADR-033 unified the arithmetic but left the presentation contradictory. The audit for this sprint found that for the example dossier the numerator **7** appeared against denominators **19, 11, 10, 4, 3 and 2**, and "what is left" appeared simultaneously as **12, 4, 3, 2 and 1**. Worse, ADR-033's own claim that the sidebar badge is "one meaning of remaining app-wide" was **false in shipped code**: `buildDocumentReadiness` was called in five places *without* `requiredRequirementCodes`, so the badge showed **3** while every page body showed **4**.

### Readiness (ratio) vs the checklist (inventory)

| | Readiness | Submission checklist |
|---|---|---|
| Question | *How much of my required dossier is confirmed ready?* | *What belongs in my appointment package?* |
| Shape | a percentage + `N of M` | a count + *"M need attention"* |
| Population | applicable **required** work | everything the applicant actually carries |
| Owner | `src/features/readiness/` | `src/features/review/review-checklist.ts` |

The Final Review hero now reads *"64% · 7 of 11 required documents ready"* beside *"11 items in your appointment package · 4 need attention"*. Group headers read *"4 items · 2 need attention"* rather than *"2 of 4 ready"*, and the print bundles carry a labelled state badge plus an item count instead of a ratio. When nothing wants action the wording is calm completion ("All prepared"), never "0 need attention".

**Optional requirements with no record left the package.** `buildSubmissionChecklist` previously added a row for *every* applicable requirement, so the eight optional Greek requirements inflated the inventory and permanently depressed every ratio. An optional requirement nobody has added is a **suggestion**, not something you carry; discovery belongs to the Documents workspace's Sync action, not to a final pre-appointment check. Optional documents the applicant *did* create stay in the package.

### `received` presentation

`index.css` reserves cobalt for "primary actions · active navigation · focus rings · selected items · progress fill", yet `StatusTone="accent"` paints `--brand-subtle` with cobalt text and a `bg-primary` dot. `received: 'accent'` therefore violated the design system's own accent discipline on a passive state.

`requested` and `received` are both non-error workflow-progress states, so both now take `info` — the ramp deliberately engineered at chroma 0.06 so it "can never be mistaken for a clickable accent element". They are distinguished by icon (`Clock` vs `PackageCheck`), by label (Requested / Obtained · Talep edildi / Alındı) and by microcopy ("Received — confirm to mark ready" / "Belge alındı — hazır olarak işaretlemeden önce kontrol edin"). Tests assert the tone is never `warning`, `danger` or `accent`, and that the differentiation does not depend on colour. No token was retuned and no colour was added.

### Status-aware recommendations

`deriveNextDocument` returned only `not_started` then `needs_update` over instantiated records, so it told an applicant to *obtain* nothing while readiness said work remained, and it never mentioned a `requested` or `received` document at all. It now returns `{ code, document | null, action }` where `action` is `obtain | followUp | update | confirm`, and it accepts `requiredRequirementCodes` so a dossier that has never opened the Documents workspace still gets a recommendation.

Priority deliberately mirrors the app-wide `deriveNextActions` order (`completeMissingDocs` → `updateDocuments` → `confirmDocuments`) rather than any local intuition:

```
not_started → un-instantiated requirement → requested → needs_update → received
```

**Invariant, asserted per fixture:** a recommendation exists **iff** `readiness.outstanding > 0`. "All caught up" can no longer appear beside an incomplete bar.

### Chip counts must equal the rows they reveal

The Documents hero's "Not started" chip counted un-instantiated requirements but its filter could not surface them — 2 on the chip, "1 shown" in the list, contradicting the invariant `document-filters.ts` claims for itself. Chips now count `filterableReadiness` (documents that exist); the bar and percentage stay canonical; and the difference is stated honestly with a line pointing at the existing Sync action.

### Known limitations (deliberate)

The app shell now resolves the country pack to compute the nav badge, which moves ~12 kB raw (**+2.3 kB gzip**) onto the initial chunk — accepted as the price of a badge that is not wrong. `dashboard-model`'s snapshot still calls `buildDocumentReadiness` without requirement codes, which is correct because it reads only `ready`/`obtained`/`needsUpdate`, fields pending codes cannot affect. The checklist inventory remains a different population from the readiness denominator by design — it may include optional documents the applicant created — which is why it is presented as a count and never as a ratio.

**Implementation:** `documents-model.ts` (`NextDocumentRecommendation`, `BUCKET_STATUS`, `filterableReadiness`, `pendingRequirementCount`), `review-checklist.ts` (required-only expansion), `ReviewHero` / `SubmissionChecklist` / `PrintPackage` / `DepartureCheck` (inventory framing), `status-badge.tsx` + `state-meta.ts` + `DocumentsHero.tsx` (tone + icons, single tone source), `AppLayout.tsx` / `timeline-model.ts` / `employment-documents.ts` / `finance-documents.ts` (canonical denominators), `data-list.tsx` (`common:states.notProvided`). No schema, import/export, storage, validation-rule or validation-severity change; still exactly two localStorage keys; `schemaVersion` remains `1.0.0`.

---

## ADR-035: Overlays Return Focus to Their Opener, Not to a Radix Trigger

**Status:** Accepted · **Date:** 2026-08-16

**Context.** A real-browser pass found that closing any Dialog or Sheet dropped focus to `<body>`.
The overlays trapped focus correctly and closed on `Escape` correctly, but a keyboard user was
returned to the top of the document on every dismiss. `docs/principles.md` §8 names focus management
a requirement, not polish, so this is a release-gating defect under the severity ladder in
`docs/manual-qa.md`.

The cause is a genuine mismatch between Radix's assumption and this app's architecture, read from
`@radix-ui/react-dialog@1.1.19` on disk rather than inferred. Radix restores focus to
`context.triggerRef.current`, and that ref is written from exactly one place — `<Dialog.Trigger>`.
Its modal close handler is:

```js
onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
  event.preventDefault();
  context.triggerRef.current?.focus();
}),
```

`preventDefault()` runs unconditionally, which also suppresses `FocusScope`'s own correct fallback
(`focus(previouslyFocusedElement ?? document.body)`). With no trigger, `?.focus()` no-ops and nothing
is focused at all.

**VisaFlow opens 11 of its 16 overlays controlled, with no Radix trigger, and that is not an
oversight.** The thing that opens them is frequently not a sibling button: `MobileNav` is opened by
the header hamburger in a different component subtree; `DocumentDetailPanel` and `SponsorEditorSheet`
are opened by a **URL search param** so the view is deep-linkable; `ImportExportSection` is opened by
a **file-input change handler**. There is no element to hand to `<Dialog.Trigger>` in those cases.

**Decision.** Overlays restore focus to **whatever was focused when they opened**, implemented once in
`src/components/ui/use-restore-focus.ts` and wired into `dialog.tsx`, `sheet.tsx` and
`alert-dialog.tsx`. Consumers are unchanged.

The hook re-derives the value Radix already had rather than inventing bookkeeping: `onOpenAutoFocus`
is dispatched by `FocusScope`'s mount effect *before* focus moves into the container, so
`document.activeElement` at that moment **is** `previouslyFocusedElement`. On close it restores that
element and calls `preventDefault()`, which — because `composeEventHandlers` runs the caller's handler
first and skips its own once the event is claimed — means Radix's null-trigger branch never runs.

**Consequences.**

- Deterministic: no `setTimeout`, no polling, no trigger elements stored in application state, and no
  per-page `.focus()` calls. Restoration still happens on Radix's own schedule, after the exit
  animation and `FocusScope`'s `setTimeout(0)`.
- Composable: a caller's own `onOpenAutoFocus` / `onCloseAutoFocus` still runs, and still wins — a
  caller that calls `preventDefault()` takes the event over entirely. This is load-bearing for
  `AlertDialogContent`, which focuses its Cancel action on open.
- Safe when the opener is gone: if the recorded element is no longer `isConnected` the hook does not
  claim the event and Radix's behaviour is left exactly as it was. Restoring focus to a detached node
  lands on `<body>` anyway, and guessing a replacement target would be worse than doing nothing.
- One known path remains unrestored and is tracked as P2 in `docs/manual-qa.md`: Sponsors' empty-state
  button both creates a sponsor and opens the editor, so it unmounts itself in the same commit. That
  is the page's action design, not the focus system.
- Verified in Chrome 149 over CDP for Dialog (`/documents`) and Sheet (`/sponsors`), reaching the
  trigger by `Tab`, closing by both `Escape` and the visible close control, and sampling past the exit
  animation. Guarded in jsdom by `src/tests/ui/overlay-focus-restore.test.tsx`, which fails on 4 of 5
  cases if the restoration is removed. jsdom cannot prove the *visible* ring; Chrome confirmed
  `:focus-visible` with `outline: solid 2px` after an `Escape` close.

**Adjacent defects fixed with it,** both in the same primitives and both P1 under the severity ladder
in `docs/manual-qa.md`: the overlay close button had **no visible focus indicator** (it carried
`focus:outline-hidden` plus a `focus:ring-*` set that resolved to a fully transparent shadow —
measured `outline: NONE, boxShadow: rgba(0,0,0,0) 0 0 0 0` while keyboard-focused), and its label was
**hardcoded English** `Close` in a Turkish-default product. Both had survived the previous sweep
because the focus guard exempted `dialog.tsx` and `sheet.tsx` *as whole files*; the guard now exempts
the container element rather than the file, so a control rendered inside a container is still checked.

**Do not** reintroduce restoration by adding a hidden `<Dialog.Trigger>`, and do not "fix" a single
page with an ad-hoc `.focus()` — the contract belongs to the primitives so that every present and
future overlay inherits it.

### Amendment (2026-08-17): a caller may name a fallback destination

The consequence recorded above — "one known path remains unrestored … Sponsors' empty-state button
both creates a sponsor and opens the editor, so it unmounts itself" — is now closed, and closing it
sharpened the contract twice.

First, an `isConnected` check is not sufficient. On that path the opener is detached *before*
`onOpenAutoFocus` runs, so what gets recorded is `document.activeElement` — i.e. `<body>`. Body is
connected, so it passes the guard and gets focused, which is exactly the outcome this hook exists to
prevent. `document.body` is now treated as "no opener", never as a target.

Second, when there is genuinely no opener left, no amount of generic bookkeeping can invent one — the
destination has to come from the code that knows what was created. `useRestoreFocusOnClose` therefore
accepts an optional `restoreFocusFallback: () => HTMLElement | null`, consulted **only** when no
usable opener exists, and only if the returned element is itself connected. With no fallback
supplied, behaviour is byte-for-byte unchanged.

It is deliberately a **callback returning an element, never a selector string or an id**. The overlay
primitives must not learn how any page identifies its own content: the primitive knows only "the
opener is unavailable — caller, give me a target", and what that target *means* stays with the
caller. `SponsorsPage` supplies the new sponsor's card action from a ref map it owns; nothing about
sponsors appears in `src/components/ui/`.

No timers, no retained detached nodes, no page-specific knowledge in shared primitives. No schema, storage, import/export or validation change; still exactly two
localStorage keys; `schemaVersion` remains `1.0.0`.

---

## ADR-036: Dossiers Persist Locally in IndexedDB Behind a Repository Port; Session-Only Is the Escape Hatch

**Status:** Accepted · **Date:** 2026-08-23 · **Supersedes:** [ADR-006]

**Decision:** VisaFlow saves dossiers in the browser's IndexedDB, behind a `DossierRepository`
port, and supports several saved dossiers. Persistence is **on by default**, with a per-dossier
**Session only** mode that reproduces the v1.0 in-memory behaviour exactly.

**Context:** ADR-001 and ADR-006 chose in-memory-only state and accepted the trade-off "data is lost
on page refresh unless exported". In practice that was the product's biggest complaint: a visa
dossier is prepared over weeks, and losing it to a stray refresh is itself a harm.

ADR-006's rationale is not obsolete, though — *"localStorage persists after session ends… shared
computers pose risk… user may forget data is stored"* is exactly right, and applies to IndexedDB
too. That reasoning is why **Session only** exists rather than being dropped: the risk it names is
real, so it gets an answer instead of a silence.

**Why IndexedDB, and not localStorage.** Not capacity — a dossier is ~6 KB minified and fifty heavy
ones are ~1.1 MB, well inside localStorage's quota. The reasons are write behaviour and shape:
localStorage is synchronous and string-only, so every autosave would serialize and rewrite a blob on
the main thread with no per-record atomicity, and multiple dossiers would mean either one giant
value or a hand-rolled index. IndexedDB writes one record in one transaction, off the main thread,
storing structured clones.

**Why a port.** `jsdom` implements no IndexedDB, so an adapter cannot be unit-tested in this suite at
all. Rather than add a polyfill dependency to make the browser adapter convenient to test, the
*contract* is tested against an in-memory adapter and the production adapter is verified in real
Chrome. Everything that can be tested without a browser — migration, record assembly, summary
derivation, ordering — lives in pure modules, leaving the IndexedDB adapter as thin plumbing. The
port also keeps React components from ever touching storage APIs, and keeps `DossierProvider` a
synchronous reducer instead of a god object: `WorkspaceProvider` owns the async work.

**Rationale:**

- **A fourth version axis, kept separate.** `STORAGE_FORMAT_VERSION` versions how a record is laid
  out in *this browser*. It is not the app version, not the dossier `schemaVersion` (still `1.0.0`,
  unchanged by this ADR), and not a country pack's `templateVersion`. Rearranging local storage is
  not a change to the file a user exports.
- **A record we cannot read is never destroyed.** A record from a newer build is reported as
  unreadable, listed, and left alone — data loss is worse than a support question.
- **Import is additive.** A file becomes a *new* saved dossier with a locally generated id; an
  exported dossier is a portable document, never a claim on a slot in someone else's browser. Two
  imports of the same file are two dossiers, because duplicate detection from names or passport
  numbers would be brittle and wrong. This also removed the "replace what is open?" confirmation:
  nothing is destroyed, so there is nothing to warn about.
- **Local-save state and export state are different things.** v1.0 conflated them — `markSaved()`
  fired only on export, so "Saved 5 minutes ago" actually meant "exported". Now the header reports
  local persistence and export recency is tracked separately. Export is no longer disabled when
  nothing changed: re-exporting to a second location is legitimate.

**Trade-off:** the privacy promise changed and had to be rewritten honestly. "Nothing is ever
stored" became "stored on your device, never on a server" — and, explicitly, **local storage is not
encryption**: anyone who can use the browser profile can open the dossiers. Saying that plainly is
the price of storing anything at all.

**Consequences:** `docs/privacy.md`, `README.md`, `SECURITY.md`, `CLAUDE.md`, `CONTRIBUTING.md` and
the Settings/onboarding copy were updated in both locales. ADR-021's "until persistence" caveat and
ADR-031's "no persistence" note are now historical. `localStorage` still holds exactly the two
non-personal keys; dossiers live in IndexedDB, and the guard test that checks localStorage was kept
and re-pointed at that boundary rather than deleted.

**Implementation:** `src/features/workspace/` (`saved-dossier.ts`, `workspace-model.ts`,
`migrations.ts`, `adapters/{indexeddb,memory}-adapter.ts`), `src/app/providers/WorkspaceProvider.tsx`,
`src/pages/DossiersPage.tsx`, `src/components/layout/DossierSwitcher.tsx`, and a new
`REPLACE_DOSSIER` action in `DossierProvider` — switching must clear absent slices, which the
merging `LOAD_DOSSIER` deliberately does not. No schema, import/export-format, readiness or
validation change.

---

## ADR-037: Two Tabs Are Safe Because of Revisions, Not Because of Messages; Conflicts Are Surfaced, Never Merged

**Status:** Accepted · **Date:** 2026-08-23 · **Extends:** [ADR-036]

**Decision:** Every saved record carries a `revision` counter, and every write is a
**compare-and-swap**: the writer states the revision it believed it was editing, and the repository
refuses the write if the stored record has moved on. `BroadcastChannel` is added *on top* of that as
a courtesy notification, never as a correctness mechanism. When a write is refused, VisaFlow stops
autosaving that dossier and asks the user which version to keep. It never merges.

**Context:** ADR-036 shipped saved dossiers with one documented gap: *"no cross-tab coordination —
last write wins."* That is not a rough edge, it is silent data loss. `WorkspaceProvider.writeNow`
read the stored record and then wrote it back in **two separate IndexedDB transactions**; anything
another tab committed in between was overwritten with no error, no warning, and no trace. Two tabs is
not an exotic state — it is what happens when someone opens VisaFlow from a bookmark while already
having it open.

**Why revisions rather than locks or timestamps.** `navigator.locks` is unavailable in this
project's test environment and unnecessary once writes are conditional; a lock would also have to be
held across think-time, which is exactly when a tab gets closed. Timestamps are worse: two tabs on
the same machine can produce the same millisecond, and clock changes are real. A monotonic counter
per record needs no clock and no coordination — it only needs the compare and the write to happen
together, and IndexedDB gives that for free by serialising transactions per object store. The whole
mechanism is one `readwrite` transaction that reads, compares, and writes.

**Why messages cannot be the mechanism.** A `BroadcastChannel` message can be missed (the tab was
loading), duplicated, delivered out of order, or unavailable entirely — Safari's private mode and
older browsers have shipped without it. Any design where correctness depends on a message arriving
is a design that loses data on the day it does not. So the channel is demoted to a hint: it makes
the *good* case pleasant (a tab with no unsaved edits quietly catches up; a rename appears in the
other tab's list) and it is provably unnecessary for safety — there is a test suite that runs the
same scenarios with `BroadcastChannel` stubbed out and expects identical protection.

**Rationale:**

- **Detection over merging.** Field-level merging of two dossiers is a research problem with a
  wrong answer for every heuristic — silently combining one tab's passport number with another
  tab's travel dates would be far worse than saying "these diverged". Both versions are kept and
  the user decides.
- **A refused write pauses autosave.** Continuing to retry would either hammer the repository or,
  worse, eventually succeed and overwrite. While a dossier is conflicted, nothing is written until
  the user picks an exit.
- **Neither exit destroys anything without being asked.** *Open the saved version* discards this
  tab's edits, but only on an explicit click. *Keep my version as a new dossier* writes to a
  **fresh id** — never the conflicted one (that would overwrite the other tab) and never a deleted
  one (that would resurrect something deleted on purpose).
- **The active dossier is tab-local.** `meta.activeDossierId` is demoted to an explicit "last
  opened" hint, read only when a *fresh* tab hydrates. Two tabs may sit on different dossiers, and
  switching in one never yanks the other. This was already almost true — the value was written on
  every switch but only ever read at startup — so the change is mostly a matter of saying so.
- **Coordination carries no personal data.** Messages contain an id, a revision and a sender tab
  id. No payload, no names, no numbers. Nothing is written to `localStorage` for coordination
  either — the two permitted keys (ADR-013) are unchanged.
- **The title is local, not part of the dossier.** A user-chosen name lives in the workspace record
  as `title`, never in `payload` and never in the exported file: a name typed in this browser is not
  part of the document the user hands to a consulate, and exports must not vary by browser. An empty
  or whitespace-only name clears back to `null` so the derived title returns, and an explicit title
  is never auto-overwritten when applicant or destination data later changes.

**Trade-off:** `STORAGE_FORMAT_VERSION` moves 1 → 2, because `revision` and `title` change the
stored shape. This is the first real use of ADR-036's migration ladder — v1 records exist in a
shipped build and in users' browsers, and they upgrade in place with `revision: 1` and `title: null`
rather than being discarded.

**Consequences:** `put` gained an `expectedRevision` argument and a `PutResult` union, so callers
must handle refusal; both adapters implement identical semantics. `openDossier`'s `lastOpenedAt`
touch became a compare-and-swap too — opening a dossier must never overwrite an edit — and it yields
rather than fighting for a timestamp. Autosave now skips writes whose payload matches what storage
already holds, which also stops a freshly hydrated tab from announcing a change it did not make.

**Implementation:** `src/features/workspace/saved-dossier.ts` (`revision`, `title`, `PutResult`),
`workspace-channel.ts` (guarded `BroadcastChannel`), `migrations.ts` (v1 → v2),
`adapters/{indexeddb,memory}-adapter.ts`, `src/app/providers/WorkspaceProvider.tsx` (conflict state,
`renameDossier`, `reloadLatest`, `saveAsNew`), `src/components/layout/ConflictBanner.tsx`, and
inline rename on `src/pages/DossiersPage.tsx`. No schema, import/export-format, readiness or
validation change; `schemaVersion` remains `1.0.0`.

---

## ADR-038: Export Is the Backup Contract; Backup Freshness Is Derived, and Marking It Stays Outside Compare-and-Swap

**Status:** Accepted · **Date:** 2026-08-24 · **Extends:** [ADR-036], [ADR-037]

**Decision:** The exported JSON file is the user's backup; the copy in the browser is not one. The
two are tracked as **separate dimensions** — local persistence (`saved` / `saving` / `error` /
`sessionOnly` / `unavailable`) and backup freshness (`never` / `fresh` / `stale`) — and backup
freshness is **derived from the stored record**, never from in-memory flags. Recording an export
writes `lastExportedAt` through a dedicated repository method that deliberately does **not**
participate in the compare-and-swap.

**Context:** ADR-036 added `lastExportedAt` to `SavedDossierRecord`. It was stored, migrated,
summarised and rendered — and **never once assigned**. `/dossiers` therefore reported "Never
exported" for every dossier forever, including one exported five seconds earlier. Export was
`downloadDossier()` followed by `markSaved()`, which set two fields inside `DossierProvider`'s
reducer and touched no storage at all; a refresh erased any memory that an export had happened.

Worse, those two fields were the *only* export signal, and they were cleared by `LOAD_DOSSIER` and
`REPLACE_DOSSIER` — which fire on creating, importing, switching, hydrating and conflict-reloading.
So creating a brand-new dossier made Settings claim **"No changes since your last export"** *and*
**"Last exported today"**, while `/dossiers` said **"Never exported"**: three surfaces, three
different export facts about the same dossier, none of them true.

**Why freshness is derived rather than stored.** `updatedAt` already moves only on a content write —
`openDossier` and `renameDossier` spread the record and leave it alone — so comparing it with
`lastExportedAt` answers exactly the right question: *has the dossier changed since the user last
took a copy?* No new stored field is needed, which is why **`STORAGE_FORMAT_VERSION` stays at 2**. A
separate "dirty since export" flag would be a second source of truth to keep in sync, and the bug
above is what happens when that drifts.

**Why marking an export is not a compare-and-swap.** Every accepted `put` increments `revision`
(ADR-037). If exporting went through that path, backing up a dossier would bump its revision — and a
tab that happened to be editing that dossier would be handed a conflict banner for something the
user did not do. Exporting is not a change to the dossier, so it must move neither `revision` nor
`updatedAt`. `markExported` therefore reads and writes **inside a single transaction** but asserts no
revision: it only ever sets one field that no content writer touches, so there is nothing to lose.

**Rationale:**

- **A browser copy is not a backup, and the words must not blur.** Export is never called "Save",
  IndexedDB is never called "backup", and the app never implies the local copy survives clearing
  site data. A user can be safely saved and months overdue for a backup; both facts are shown.
- **Backup is per dossier, because dossiers are.** The old in-memory flags lived above the
  workspace, so exporting dossier A and switching to B made B claim A's export time. Reading the
  record keeps each history where it belongs.
- **Backing up must not cost you your place.** `/dossiers` can export any dossier by reading that
  record directly — no opening it, no switching, no last-opened change, no form remount, no
  broadcast. Requiring a user to abandon the dossier they are working in to back up a different one
  would be a strange price for a safety action.
- **An unreadable record gets a raw copy, not a backup.** A record this build cannot decode cannot
  honestly be exported as a dossier, so it offers a clearly-labelled raw download instead and is
  never marked as backed up. This makes the "export it from a version that can read it" advice
  actionable for the first time.
- **`lastExportedAt` is workspace metadata.** Like `title` (ADR-037), it never enters `payload`,
  never reaches the exported file, and does not touch `schemaVersion`.

**Trade-off:** the repository port grew a method that is not compare-and-swap, which looks like an
inconsistency until you notice that consistency here would mean *manufacturing conflicts*. The
narrower contract — one field, one transaction, no revision — is what keeps exporting invisible to
concurrent editors.

**Consequences:** `isDirty`, `lastSaved`, `MARK_SAVED` and `markSaved()` are **deleted** rather than
repaired; they had exactly one reader and it was rendering fiction. `SettingsInput`/`SettingsModel`
now carry `persistence` and `backup` instead. The dead `workspace:export.*` keys were removed in
favour of one shared `workspace:backup.*` vocabulary used by both `/dossiers` and Settings.

**Implementation:** `DossierRepository.markExported` + both adapters, `backupStateOf` in
`workspace-model.ts`, `BackupState` and `SavedDossierSummary.backup` in `saved-dossier.ts`,
`noteExported`/`exportDossier`/`exportRawRecord` in `WorkspaceProvider`, `downloadJson` extracted in
`export.service.ts`, and the card/Settings surfaces. No schema, import/export-format, readiness or
validation change; `schemaVersion` remains `1.0.0` and `STORAGE_FORMAT_VERSION` remains `2`.

---

## ADR-039: Session-Only Is a Promotable State, and Is Never Discarded Without Being Asked

**Status:** Accepted · **Date:** 2026-08-24 · **Extends:** [ADR-036]

**Decision:** A session-only dossier can be **promoted** to a saved one at any time, keeping the
identity it already has. Until it is, it stays entirely in its tab — nothing written, nothing
broadcast. Replacing unsaved session-only work requires an explicit choice from the user: stay, save
it on this device, or discard it.

**Context:** ADR-036 introduced session-only as the shared-computer escape hatch and left it as a
one-way door. `openDossier` had no session-only check at all, so a single click in the header
switcher overwrote the reducer and the work was gone — no warning, no dirty check, nothing to undo.
`/dossiers` never received `sessionOnly` either, so with one session-only dossier open the page
rendered *"No saved dossiers yet — start a dossier and it will be saved here automatically"*,
denying the existence of the dossier the user was editing.

**Rationale:**

- **"Do not save this yet" is not "throw this away without asking".** Choosing session-only says
  something about *storage*, not about how much the work matters. The two are different questions
  and the app was answering the second one on the user's behalf.
- **Promotion needs no new identity.** The id is minted when the dossier is created, before the
  decision about persistence is taken, so promoting is a first write under an id that already
  exists. Nothing is duplicated and nothing is re-created.
- **Promotion must commit before anything else happens.** If the user chooses "Save on this device"
  on the way out and the write fails, the switch does **not** proceed — continuing would discard
  exactly the work we just failed to save. The dossier stays session-only, the failure is surfaced,
  and autosave does not quietly start writing.
- **The order is record first, pointer second.** A record with no "last opened" pointer still
  appears in the dossiers list; a pointer to a record that was never written restores nothing.
- **Emptiness is asked of the payload, not of a dirty flag.** Creating a dossier writes a
  destination country before the user types anything, so a flag would interrupt everyone who merely
  changed their mind. `hasMeaningfulContent` asks whether there is something worth losing.
- **No `beforeunload` theatre.** A browser cannot host an asynchronous save during unload, and a
  dialog that pretends otherwise would promise a rescue it cannot perform. The honest answer to
  refresh-and-close is prominence: the state is stated plainly, and both escape routes — save it,
  or export it — are on screen the whole time, at every width.
- **Tab-local until it is real.** Nothing about a session-only dossier is broadcast; there is no
  record for another tab to coordinate over. Cross-tab coordination begins at promotion, with a
  `created` event, exactly as if it had been saved from the start.

**Trade-off:** a refresh still discards session-only work, and that limit is now stated rather than
engineered around. Making refresh survivable would mean writing the dossier somewhere — which is the
one thing session-only exists to avoid.

**Consequences:** `openDossier`, `createDossier` and `adoptImported` route through a guard in the
provider rather than each caller remembering to ask, so the header switcher, the dossiers page and
the import flow are covered by one implementation and one dialog. Settings' "Reset all data" became
**Close the open dossier** — it clears the editor *and* the last-opened pointer, leaves saved records
untouched, and no longer claims a permanence it never had. Permanent deletion remains exactly one
thing in exactly one place.

**Implementation:** `hasMeaningfulContent` in `workspace-model.ts`; `PendingLeave`,
`promoteToDevice`, `saveAndLeave`, `discardAndLeave`, `cancelLeave` and `closeDossier` in
`WorkspaceProvider`; `SessionLeaveDialog` and `WorkspaceNotice` in `components/layout`. No schema or
storage-format change.

---

## ADR-040: Workspace Level and Active-Dossier Level Are Different Surfaces; Entry Is Derived from the Workspace, Not the Editor

**Status:** Accepted · **Date:** 2026-08-24 · **Supersedes (in part):** [ADR-031] · **Extends:** [ADR-036]

**Decision:** VisaFlow has two levels and each has exactly one home. `/dossiers` is the **workspace**
level: what you have. `/dashboard` is the **active dossier** level: how the one you are inside is
doing. Every other content route is an active-dossier surface; Settings is workspace-level. The index
route waits for the workspace to hydrate and then routes from what is actually stored:

| Situation | Destination |
|---|---|
| a dossier is open (saved or session-only) | `/dashboard` |
| dossiers are saved but none is open | `/dossiers` |
| nothing saved and nothing open | `/welcome` |

**Context:** ADR-031 derived entry "purely from `hasData` via `firstRunTarget`", which was correct
when a dossier could only ever live in memory. Durable storage (ADR-036) made `hasData` answer a
narrower question than the router was asking: *is a dossier open in this tab right now*, not *does
this person have work here*. Two consequences shipped:

1. **Every returning user landed in onboarding.** `FirstRunRedirect` decided on the first commit,
   before `repo.readMeta()` had resolved, so `hasData` was always false at that moment. Verified in
   real Chrome with three saved dossiers: reload `/` → `/welcome`, headed *"Let's prepare your visa
   application"*. `WorkspaceProvider` had exposed `ready` since ADR-036 and **nothing consumed it**.
2. **Closing a dossier stranded the user.** "Close the open dossier" (ADR-038) clears the editor and
   the last-opened pointer by design. With entry derived from the editor, that returned the whole app
   to its brand-new state: `/` → `/welcome`, all eleven pages showing "No application loaded", and
   the header switcher — the *only* route to `/dossiers` — unmounted, while the action's own
   confirmation promised "you can open it again from the Dossiers page".

**Rationale:**

- **Waiting is the fix, not a nicer spinner.** A router that decides before storage answers is not
  slow, it is wrong. The index renders the existing `PageLoader` until `ready`, chooses nothing, and
  above all creates nothing.
- **Having saved work is not consent to reopen it.** The router never picks a dossier. `/dossiers`
  exists precisely so "you have work, none of it is open" has an honest destination, and so a
  deliberate close survives the reload that follows it. The last-opened pointer stays a tab-local
  hint (ADR-037); no global active pointer is introduced.
- **The workspace needs a door.** `/dossiers` had no navigation entry at all — its single affordance
  was a menu item *inside* the switcher, itself gated on `hasData`. It is now the first nav item,
  above Dashboard, so the hierarchy is visible rather than inferred. Deliberately **not** filed
  under the existing "Dossier" group: that group means the contents of one dossier, and using the
  word for both levels is the confusion this ADR removes.
- **A surface must say what it is about.** The dashboard's heading was a greeting — identical across
  every dossier belonging to the same applicant, and useless on a phone where the switcher's label is
  hidden. The active dossier's name is now the `h1` and the greeting is the subtitle. The dashboard
  reads the workspace for **identity only**; it still derives everything it *shows* from the active
  dossier alone.
- **Tabs are distinguishable.** Every tab was titled "VisaFlow" in an app that explicitly supports a
  dossier per tab. The title now carries route and dossier, from the same resolved title everything
  else uses, so a rename reaches the tab strip for the same reason it reaches the switcher.
- **Still no aggregates.** Nothing sums, ranks, scores or compares dossiers. `/dossiers` lists;
  `/dashboard` reports on one. `DashboardModel` lost its `applications: [active]` array — shape-only
  scaffolding for a multi-application future that arrived at the *workspace* level instead — and a
  test now guards that the model exposes the active dossier and nothing else.

**Trade-off:** the dashboard now imports `useWorkspace`, which the previous sprint's audit had noted
it pointedly did not. That is deliberate and narrow — one string, no data — and stating the exception
plainly is better than a second title derivation drifting out of sync with `/dossiers`.

**Consequences:** `firstRunTarget` takes an `EntryState` rather than a boolean. `NoDossierState` — the
canonical empty state on eleven pages — now offers the saved dossiers when any exist, and gained a
`PageHeader`, fixing a real regression where switching to an empty dossier left the document with no
`h1`. The switcher marks the open dossier with radio semantics instead of an `aria-hidden` check
icon, and renders whenever there is something to switch between rather than only when a dossier is
open (which also stopped it unmounting its own trigger mid-switch and dropping focus to `<body>`).
`useWorkspaceOptional` exists so shared components can render outside a workspace — the component
gallery, a page test harness — where "no provider" and "no saved dossiers" are the same answer.

**Implementation:** `src/app/router/routes.tsx`, `src/features/onboarding/onboarding-model.ts`,
`src/config/navigation.ts`, `src/components/layout/use-document-title.ts`,
`src/components/layout/{Header,DossierSwitcher,AppLayout}.tsx`, `src/pages/DashboardPage.tsx`,
`src/components/NoDossierState.tsx`, `src/features/dashboard/dashboard-model.ts`, and
`src/app/providers/WorkspaceProvider.tsx` (`activeTitle`, `useWorkspaceOptional`). No schema,
storage-format, import/export, readiness or validation change; `schemaVersion` remains `1.0.0` and
`STORAGE_FORMAT_VERSION` remains `2`.

## ADR-041: Leaving an Editor That Cannot Be Saved Is One Guarded Decision; Deleting a Dossier Is Authoritative; an Import Must Report What It Dropped

**Status:** Accepted · **Date:** 2026-08-25 · **Extends:** [ADR-036], [ADR-037], [ADR-038],
[ADR-039]

**Decision:** Three rules about the moments where local-first work can quietly disappear.

1. **One guard, three reasons.** Any operation that replaces or empties the editor — open another
   dossier, create one, adopt an import, **close** — first asks whether what is on screen is in
   storage. If it is not, the operation is refused and the user is asked, once, in one dialog. The
   *reason* chooses the way out:

   | Why it cannot be left | The offer |
   |---|---|
   | session-only (ADR-039) | Save on this device |
   | conflict — autosave stopped (ADR-037) | Keep my version as a new dossier |
   | storage failed or is unavailable | Export a backup |

   The rescue must commit before the operation proceeds. Exporting deliberately resolves nothing:
   it makes discarding safe, it does not make it chosen.

2. **Deletion is authoritative.** `DossierRepository.delete` takes no revision and never will.

3. **`lastExportedAt` is owned by the store, not the caller** — and an import that drops data says
   how much, everywhere, in the user's language.

**Context:** The v1.1 release-candidate audit found three remaining ways for personal data to vanish
without a word, each of them a seam between two changes that were individually correct.

- `guardLeave` only ever asked about session-only work, because that is the case ADR-039 was written
  for. But `flush()` is a no-op in two other states — a set conflict, and a repository that is
  failing or absent — and every switch calls `flush()` and then `replaceDossier()`. So a tab holding
  the only copy of an edit lost it to a click in the switcher, silently, exactly as ADR-039 had set
  out to prevent. `closeDossier` did not consult the guard at all.
- `writeNow` read the previous record in one transaction and wrote in another, and `toRecord`
  copied `lastExportedAt` from that earlier read. An export committing in between was reverted by
  the next keystroke — and compare-and-swap could not catch it, because `markExported` deliberately
  does not move `revision` (ADR-038). "Never exported" reappeared on a dossier exported a minute ago.
- `importPartial` returns `success` when *anything* survived, which is right. Five of the six
  production entry points then reported that as an unqualified success: Settings said "Dossier
  loaded.", onboarding said nothing and advanced to "Ready". A `documents` key that was not an array
  was dropped with no error recorded at all. The one caller that did report anything printed raw
  English Zod paths into a Turkish-default interface.

**Rationale:**

- **The reason to stop is one idea, not three.** "What is on screen is not in storage" is the whole
  predicate; session-only, conflicted and unstorable are just how it came about. Modelling them as
  one guard with a reason keeps every entry point covered by construction — the alternative, a
  second conflict-specific modal, would have left the third case to be discovered by a third audit.
- **Closing is an editor-replacing operation.** It empties the editor exactly as opening another
  dossier replaces it. Exempting it made it the one-click way to lose work that every other path
  asked about.
- **Persisted → session-only is not offered.** ADR-039 records that the transition is not symmetric;
  faking it here would widen the architecture to make a dialog look tidier.
- **Delete targets an identity, not a version.** The user picked the dossier by name, in a
  confirmation that says the action cannot be undone. A revision assertion would leave a tab whose
  list is a few seconds stale unable to delete at all — worse for a single-user local product, and
  no safety gain, because the same person made both changes. Stated here so the absence reads as a
  decision rather than an oversight.
- **A field that moves without moving `revision` cannot be caller-owned.** Compare-and-swap is blind
  to it by design, so the only place where the caller's copy and the stored value are known at the
  same instant is inside the write transaction. Making `lastExportedAt` adapter-owned fixes the
  autosave race, the open path and the rename path with one change and no new stored field.
- **Forgiving parsing and honest reporting are different jobs.** Rescuing four of five documents
  from a file the user can no longer edit is the right behaviour; saying "Dossier loaded" afterwards
  is not. The count is in units a person recognises — an applicant, a trip, one document, one
  sponsor — not Zod issues, of which one bad document produces several.
- **The import report belongs to the workspace, not to the importing screen.** The first fix put a
  translated count in each entry point's own state, which unit-tested green and did nothing in a
  real browser: a successful import swaps the dossier, `AppLayout` remounts the page on
  `state.generation`, and the message went with it. Verified in Chrome — the *pre-existing*
  "Dossier loaded." was never visible either. So the count is held by `WorkspaceProvider`, above the
  remount, and rendered once by `WorkspaceNotice`. A caller cannot forget to report, and a partial
  restore stays on screen across the route change that follows it.

**Trade-off:** closing a dossier can now open a dialog, which is friction on an action that was
instant. It only appears when the alternative is silent loss, and never for a dossier that is saved.

**Consequences:** `PendingLeave` carries a `reason` alongside the intent, and `LeaveIntent` gained
`close`. `adoptImported` and `saveAsNew` return whether they actually happened, so no caller can
announce an outcome that was refused. `ImportResult` gained `omitted`. The conflict banner no longer
claims "Nothing has been thrown away" above a button that throws this tab's edits away; that button
now says what it does. Settings' close confirmation is **not** styled destructive: closing a saved
dossier is reversible from `/dossiers`, and the irreversible case belongs to the guard.

**Implementation:** `src/app/providers/WorkspaceProvider.tsx` (`leaveReason`, `guardLeave`,
`performClose`, `exportPending`, `importReport`), `src/components/layout/SessionLeaveDialog.tsx`
and `src/components/layout/WorkspaceNotice.tsx`,
`src/features/workspace/adapters/{indexeddb,memory}-adapter.ts`,
`src/features/import-export/services/import.service.ts` (`omitted`), and the three import entry
points in
`src/components/{layout/AppLayout,settings/ImportExportSection,onboarding/OnboardingCreateStep}.tsx`.
No schema, storage-format or export-format change: `schemaVersion` remains `1.0.0` and
`STORAGE_FORMAT_VERSION` remains `2`.

## ADR-042: The Printable Package Is a Route Outside the App Shell, Printed by the Browser, Carrying Only What the Print Model Already Decided

**Status:** Accepted · **Date:** 2026-08-25 · **Extends:** [ADR-032], [ADR-034]

**Decision:** VisaFlow generates its appointment package as a **separate route rendered outside
`AppLayout`** (`/review/print`), styled for A4 with `@media print`, and printed by the **browser's
own** print dialog. Three consequences follow deliberately:

1. **No PDF library.** Chrome's Save as PDF already produces the file. Shipping a renderer to
   duplicate it would add weight every visitor downloads to serve one page.
2. **No new content model.** The four sheets, their order and their availability come from
   `buildPrintPackage` unchanged ([ADR-032]); their *content* comes from `ApplicationSummary` and
   `SubmissionChecklist`, which already existed. No dossier field exists solely for printing, and
   `schemaVersion` stays `1.0.0`.
3. **Paper is not a theme.** The print stylesheet uses literal ink-on-white values rather than the
   app's semantic tokens.

**Context:** [ADR-032] modelled what *would* be printable — a closed set of generated sheets, held
apart from the applicant's own physical documents — and shipped a read-only preview that said so:
*"There is no Print button, because printing does not exist yet and a button that does nothing is
worse than none."* The model, its availability states and its boundary were decided and tested; only
the output existed nowhere. A grep for `window.print`, `@media print` and any PDF dependency returned
nothing at all.

**Rationale:**

- **Outside the shell, not hidden by CSS.** The requirement is that no navigation, sidebar, workspace
  notice or button reaches the paper. `display: none` in a print stylesheet would satisfy that until
  the first rule that stops matching; a route that never renders the shell cannot regress. The
  providers wrap the router, so the open dossier is still in scope — the isolation costs nothing.
- **The browser is the print engine.** A bundled PDF renderer would need its own fonts, its own
  layout, and its own Turkish text shaping — a second rendering path to keep in sync with the first,
  paid for by every page load. The browser already has all of it. If browser printing ever cannot
  meet the requirement, that is a finding to report, not a dependency to add quietly.
- **The theme must not reach the paper.** The app's tokens flip wholesale in dark mode, so printing
  through them would send a near-black page to the printer — or, when the browser is told not to
  print backgrounds, drop the ink and leave nothing. Literal values make the light/dark question
  disappear instead of answering it twice.
- **Absence is printed, not skipped.** A sheet the model calls `unavailable` prints one honest line
  and its hint; a `partial` sheet says so and leaves the gaps empty. A blank line on paper reads as
  an omission the applicant made, which is the opposite of the truth.
- **The tab title is the filename.** Chrome offers `document.title` as the Save-as-PDF name, so the
  page sets it from the dossier. A folder of files all called `VisaFlow.pdf` helps nobody. It is
  restored on unmount so navigating back does not leave the tab lying.
- **Preparation material, never a form.** Every sheet carries the disclaimer, not just the first —
  a page separated from the others still has to say what it is. VisaFlow generates no official form
  and claims no embassy requires this ([ADR-016] unaffected: nothing here predicts an outcome).

**Trade-off:** page breaks, widow control and margins are the browser's, so output differs slightly
between engines and cannot be pixel-guaranteed. That is the cost of not shipping a renderer, and it
is the right side of the trade for a document the applicant prints once.

**Consequences:** `PrintPackage.tsx` loses the comment that documented printing's absence and gains
the action; `review.print.notYet` and the old `print.description` are deleted, and the test that
asserted *"printing does not exist yet"* is inverted rather than removed — it now asserts the action
is real. Verified in real Chrome against the production build via `Page.printToPDF` at A4, in both
locales and both application themes.

**Implementation:** `src/pages/ReviewPrintPage.tsx` (new), the `/review/print` entry in
`src/app/router/routes.tsx` (deliberately a sibling of `AppLayout`, not a child), the print layer at
the end of `src/index.css`, the action in `src/components/review/PrintPackage.tsx`, and
`src/i18n/locales/{tr,en}/review.json`. `review-print.ts` is **unchanged**. No schema, storage-format
or export-format change: `schemaVersion` remains `1.0.0` and `STORAGE_FORMAT_VERSION` remains `2`.

## ADR-043: A Canonical Dossier Field Must Have a Named Consumer; a Refusal Is Its Own Fact, Not a Visa Status; Absence Is a Timeline Outcome

**Status:** Accepted · **Date:** 2026-08-25 · **Extends:** [ADR-012], [ADR-015], [ADR-016],
[ADR-024], [ADR-029]

**Decision:** Four rules, from one audit.

1. **A field may not exist in the canonical dossier without a named consumer** — editing, validation,
   readiness, review, timeline, print, or a country-pack requirement. Speculative fields are debt with
   a privacy cost.
2. **A visa refusal is modelled as its own list** (`applicant.previousRefusals`), never as a `status`
   on `PreviousVisa`.
3. **The dossier `schemaVersion` moves to 1.1.0** — because an *older* build cannot round-trip the new
   representation without silent loss, not because the parser objects.
4. **An unrecorded date is a timeline result**, rendered as itself, not an entry left out of the list.

**Context:** This sprint was opened to make the dossier *richer*. The audit found the opposite
problem. Ten fields were declared and referenced by no production code; `EmployerDetails` had never
been written by any build and appears in no export VisaFlow has ever produced; `application.status`
carries a seven-value lifecycle no interface writes. Most sharply, `employment.socialSecurityNumber`
and `employment.taxId` were **collected in the employment wizard, stored, and exported** — and never
displayed, validated, reviewed, printed, or required by any country pack. A privacy-first product was
asking for a national identity number it had no use for.

Meanwhile the country packs read exactly two dossier paths (`employment.employmentStatus`,
`financing.source`), and the timeline — the other half of the sprint's title — silently omitted every
date the dossier had not answered, so an empty dossier and a not-applicable one looked identical.

**Rationale:**

- **The audit is the deliverable.** Adding fields to a schema already wider than the product would
  have produced exactly the debt this decision now forbids. "A visa form somewhere contains it" is not
  a product use.
- **Refusal is genuinely missing, and genuinely bounded.** `previousVisas` exists to help with the
  form's previous-travel section, and the answer to *"have you ever been refused?"* could not be
  recorded at all. Modelling it as `status: 'refused'` was the obvious move and is the wrong one on
  two counts. Semantically nothing was issued, so `issueDate`, `expiryDate` and `entryCount` are all
  inapplicable. Mechanically, `previousVisas` is nested inside `ApplicantSchema`, which
  `importPartial` parses as a single unit — a value outside a `z.enum` fails the whole applicant, so
  an older build reading a newer file would lose the applicant's **name, passport and travel
  history**, not just the refusal. An unknown *key* is stripped harmlessly; an unknown *enum value* is
  fatal. Both behaviours are pinned by test.
- **The bump is about meaning, not parsing.** Unknown keys are stripped and a version mismatch only
  warns — which is precisely what makes the loss invisible: import a 1.1.0 file into an older build,
  re-export, and the refusals are gone with nothing said. The version is the signal that fires first.
  It buys announcement, not protection; no bump can make an old build understand a new field.
  `SUPPORTED_SCHEMA_VERSIONS` keeps 1.0.0 a first-class readable version, so the bump costs existing
  users no warning and no migration — a 1.0.0 document *is* a 1.1.0 document with an empty list.
- **Deprecate, do not delete.** Removing `EmployerDetails`, `applicationName` or the identity numbers
  would silently drop whatever a hand-authored or previously-saved file carries. The fields stay,
  marked `@deprecated`, so existing documents round-trip byte-for-byte — the linter now flags anyone
  who reaches for them. **Collection** stops; **data** is never destroyed on the user's behalf.
- **Refusal never becomes a signal.** It does not reach readiness, is not counted, is not compared,
  and produces no finding ([ADR-016]). Final Review and the printed cover sheet show it only when
  recorded — an empty "Previous refusals" line on a sheet handed across a counter reads as an
  accusation, and having none is both the default and nobody's business.
- **No Greece requirement was invented.** A refusal letter is a plausible thing to bring, and the
  Greece tourism pack carries `reviewStatus: 'unverified'` with **no source citation at all**.
  [ADR-015] forbids implying a requirement is official merely because it appears in the app, so the
  conditional was not added. The evidence, not the plausibility, decided it.
- **A blank line in a timeline should look like a question.** `buildKeyDates` now emits the anchors a
  short-stay application always has — appointment, trip entry and exit, insurance window, passport
  expiry — with `date: null` when the dossier has not answered them, appended after the chronology
  rather than interleaved, because a dateless event has no place in one. Optional things a trip may
  genuinely not involve are deliberately excluded: "no second hotel" is not a gap.

**Trade-off:** the bump means a *future* build reading these files sees 1.1.0 where it might have
seen 1.0.0, and the two identity-number fields remain in the schema as dead weight rather than being
cleaned away. Both are the cost of never destroying a user's data to tidy our own model.

**Consequences:** `SCHEMA_VERSION` is `1.1.0`, `SUPPORTED_SCHEMA_VERSIONS` is new, and
`DossierSchema.schemaVersion` accepts any supported version rather than `z.literal`. The import
warning is keyed on *readable*, not on *identical*, so an existing 1.0.0 export imports with no
warning at all. `STORAGE_FORMAT_VERSION` remains `2` — the IndexedDB record wraps the payload opaquely
and gained nothing ([ADR-036]); a test asserts it. `KeyDateEvent.date` is now nullable and its status
gains `missing`. A frozen copy of the v1.1.0 example dossier lives at
`src/tests/fixtures/dossier-schema-1.0.0.json` as a real legacy artifact rather than a trimmed
imitation.

**Implementation:** `src/domain/schemas/{passport,applicant,dossier,employment}.schema.ts`,
`src/features/import-export/services/import.service.ts`,
`src/features/timeline/{timeline-dates,timeline-links}.ts`,
`src/components/timeline/KeyDatesTimeline.tsx`,
`src/components/applicant/PreviousVisasStep.tsx`,
`src/components/employment/EmployerStep.tsx`, `src/features/review/review-summary.ts`,
`src/components/review/ApplicationSummary.tsx`, `src/pages/ReviewPrintPage.tsx`, and
`src/i18n/locales/{tr,en}/*`. No storage-format change; no validation rule added or changed; no
readiness input added.

## ADR-044: The Trip Was Already Modelled; What Was Missing Was Reading It Back

**Status:** Accepted · **Date:** 2026-08-26 · **Extends:** [ADR-016], [ADR-024], [ADR-032],
[ADR-043]

**Decision:** Phase 2's "deeper trip, finance and sponsor structure" adds **no dossier field**. It
adds one pure read model (`buildItinerary`), three editors for fields that already existed, and the
surfaces that were missing. Four rules follow:

1. **Journey direction is derived, never stored.** A leg is outbound, internal, return or
   `unscheduled` by comparing its departure date to the trip's own dates.
2. **A declared amount is a statement, not a score.** The funding split is added up against the trip
   budget as a proof-read; it is never compared against the account balance and never called
   sufficient.
3. **Sponsors are named, with what they cover.** A count is not an answer to "who is paying for what".
4. **A field that is displayed must be editable.** The reverse is the defect this ADR closes.

**Context:** The audit expected to find the trip under-modelled. It found the opposite. `route`,
`transportReservations` and `accommodationReservations` are genuine arrays edited through genuine
`CollectionEditor`s; the example dossier has carried two route stops, two flights and two hotels since
v1.0. Main-destination reasoning already exists as a rule against the longest stay; a day trip is
already `nights === 0`; reservation references already exist on both sides.

None of it reached Final Review or the printed package, which showed the trip as two dates and a night
count. `sponsor.coveredExpenses` — the literal answer to "who pays for what" — reached neither.
`trip.tripPurpose` was collected and displayed nowhere. And `trip.estimatedBudget` was **rendered on
the dashboard** (`TripSummary.tsx`) while having no editor anywhere: a Budget row that could only ever
be filled by importing a file, permanently empty for every user who typed their dossier in.
`selfFundedAmount` and `sponsoredAmount` were carried into the dashboard model and rendered by
nothing, while the finance flow printed a `mixedWhoCovers` prompt asking a question the model could
not answer.

**Rationale:**

- **Integration beats addition, and the audit is what proves which is which.** ADR-043 established
  that a field needs a named consumer. The corollary discovered here is the mirror image: a field
  that *has* a consumer but no editor is just as broken, and far easier to miss — the dashboard row
  looked like a feature.
- **Direction from dates, not from a flag.** A stored `direction` would be a second source of truth
  that disagrees with the dates the moment either is edited. The dates already answer it, so
  `classifyLeg` reads them. A leg with no date, or a trip with no dates to compare against, is
  `unscheduled` — its own answer, kept and shown last, because filing it under "outbound" and being
  wrong is worse than admitting the journey is incomplete.
- **The one piece of arithmetic is bounded deliberately.** `selfFundedAmount + sponsoredAmount`
  against `estimatedBudget` compares two numbers the applicant typed *against each other*. It refuses
  to run across mismatched currencies rather than inventing a rate, stays silent when either side is
  absent, and never reads `accountBalance` — a test asserts the balance never appears in the output.
  "Your parts add up to €1 700 of a €2 000 budget" is proof-reading; "you do not have enough money"
  is a prediction, and VisaFlow does not make those ([ADR-016]). Tone caps at `attention`; nothing
  reaches readiness.
- **No schema, therefore no version move.** Applying [ADR-043]'s semantic test: an older build
  importing and re-exporting a file written here sees exactly what it saw before, because the format
  is untouched. Bumping would warn users about a change that cannot affect them. A test asserts the
  exported top-level key set and that no journey/itinerary key leaked into `trip`.
- **`exitCountry` was not added.** It is the obvious symmetry to `firstEntryCountry` and has no
  consumer — no rule reads it, no surface shows it. Adding it would break the rule this sprint is
  built on.

**Trade-off:** the printed itinerary can show the same city twice — once as a hotel booking, once as
a route stop. They are genuinely different facts the applicant recorded separately, and collapsing
them would mean guessing that a stay and a stop are the same thing.

**Consequences:** `FinalReviewModel` gains `itinerary`; `ApplicationSummary` gains `sponsors` and
`fundingDetail`. `ConsistencyStep` now passes `observation.params` through to `t()` — the field had
been on the interface since the module was written and no observation had ever used it, so the first
one to try would have rendered its placeholders raw. Amounts arrive as numbers plus a currency code
and are formatted at the UI boundary, never in the domain.

**Implementation:** `src/features/review/review-itinerary.ts` (new, pure),
`src/features/review/{review-model,review-summary}.ts`,
`src/components/review/{JourneySummary,ApplicationSummary}.tsx`, `src/pages/{ReviewPage,ReviewPrintPage}.tsx`,
`src/features/finance/finance-consistency.ts`,
`src/components/finance/{PersonalFinancesStep,ConsistencyStep}.tsx`, and
`src/i18n/locales/{tr,en}/{review,finance}.json`. No schema, storage-format or export-format change:
`schemaVersion` remains `1.1.0` and `STORAGE_FORMAT_VERSION` remains `2`.

## ADR-045: Key Dates Are Read as Days; One Fact Is One Row; a Validity Date Opens Its Own Document

**Status:** Accepted · **Date:** 2026-08-28 · **Extends:** [ADR-012], [ADR-029], [ADR-043]

**Decision:** Three changes to how the timeline is *read*, none to what it derives.

1. **Dated key-date events are grouped by day** at the read-model layer. `buildKeyDates` keeps its
   signature and still returns a flat list; a separate pure `groupKeyDatesByDay()` groups it.
2. **`today` becomes a visible group.** `dayStatus()` has always returned it; the view discarded it.
3. **The current passport's document validity is not emitted** when it equals
   `applicant.passport.expiryDate` — and **is** emitted when it does not. A `documentExpiry` event
   carries the document's id so it opens *that* document.

**Context:** An audit of every date-bearing field in the dossier and the country pack found almost
nothing silently missing — [ADR-043] had already closed that — and no wrong step links except one.
What it found instead was density and a duplicate.

The example dossier produces fourteen key-date events, and **six of them fall on 1 April 2027**:
the trip begins, the approved leave starts, the first route stop begins, the outbound flight departs,
the first stay checks in, and the insurance takes effect. Each rendered as its own row repeating
"1 Apr 2027". On 9 March 2030 the passport expiry appeared **twice** — once from
`applicant.passport.expiryDate`, once from the `PASSPORT_CURRENT` document's `validUntil`. And a
`documentExpiry` row linked to `/documents`, while the freshness view *on the same page, one tab
across* has always linked to `/documents?category=…&doc=<id>`.

**Rationale:**

- **A day is the unit a person reads a chronology in.** Six rows repeating one date is a checklist
  wearing a timeline's clothes. Grouping removes the repetition and nothing else: every event
  survives, in its own group, and the caller still receives the flat list if it wants one.
- **Grouping is presentation, so it lives outside the derivation.** `buildKeyDates` is unchanged.
  `groupKeyDatesByDay` mirrors the existing `groupTasksByBand` precedent — a pure function beside
  the model, not a new source of truth, and nothing about it is persisted.
- **Intra-day order is a decision, not an accident.** Several events share a date, so a fixed type
  precedence orders them outward from the trip itself to the paperwork around it, with the event id
  as a total-order tiebreak. JavaScript's sort is stable, so *without* this the order would silently
  inherit whatever sequence `buildKeyDates` happened to push in — deterministic-looking and
  arbitrary. A test pins the actual reading order, because a test that only asserts "two runs match"
  passes against that bug.
- **De-duplication is structural, never heuristic.** The suppression is keyed on the stable
  requirement code `PASSPORT_CURRENT` ([ADR-012]), not on a label, a category, or dates looking
  close. It applies only when the two values genuinely agree. **When they disagree, both rows stay** —
  a divergence between two separately-edited fields is a real inconsistency the applicant should see,
  and hiding it would be the worse bug. No other document is ever suppressed: an insurance policy or
  a bank statement with a real validity date remains its own event.
- **Freshness and key dates keep different jobs.** Key dates answer *when does this happen*;
  document freshness answers *how old is this relative to the appointment*. The suppressed row is the
  only overlap, and it is removed from key dates alone — the freshness view is untouched and still
  lists the passport.
- **Nothing new is invented.** No urgency score, no "recommended submission date", no embassy
  procedure, no deadline that is not already the country pack's own recommendation ([ADR-029]).
  Preparation tasks remain entirely derived — no completion state is persisted anywhere, and this
  ADR adds none.

**Trade-off:** a range now shows only its end date on the row ("until 10 Apr"), because the day
heading above it already gave the start. That is one fewer place the start date appears, which is
the point, but it does mean a range read in isolation is less self-contained.

**Consequences:** `KeyDateEvent` gains `documentId`; `eventLink` takes the event rather than the bare
type, so it can use the id. `KeyDateDayGroup` and `groupKeyDatesByDay` are new exports. No schema,
storage-format or export change: `schemaVersion` remains `1.1.0` and `STORAGE_FORMAT_VERSION`
remains `2`.

**Implementation:** `src/features/timeline/{timeline-dates,timeline-links}.ts`,
`src/components/timeline/KeyDatesTimeline.tsx`, `src/i18n/locales/{tr,en}/timeline.json`.

## ADR-046: Provenance Is Enforced, Not Just Expressible; Verification Is Earned Per Requirement

**Status:** Accepted · **Date:** 2026-08-28 · **Extends:** [ADR-012], [ADR-015]

**Decision:** The country-pack provenance model is **kept as it is** — no new fields, pack-level or
requirement-level. What is added is enforcement, plus one behavioural correction:

1. **A requirement claims verification only on its own evidence.** `SourceNote` shows a verified
   status only when the requirement's own sources carry a `lastVerifiedAt`. The template's
   `reviewStatus` supplies the *label*, never the *claim*.
2. **Registry-wide honesty invariants** run against every pack in `countryRegistry`, so a second
   pack inherits them the day it is registered.
3. **Unsourced normative values stay inert.** `validityPeriodDays` is deprecated in place: a
   validity or freshness number must carry a verified source *before* any consumer reads it.

**Context:** Two questions opened this audit — is Phase 2 finished, and can the provenance model
carry a second country pack.

Phase 2 is finished; the roadmap simply had not caught up, listing "richer dossier & timeline" as
*in progress* two bullets below the item that completed it.

The provenance model turned out to be better than expected. `RequirementSource` already carries
authority, `sourceType` (embassy / consulate / authorized visa centre / government / regulation /
other), title, url, jurisdiction, language, `lastVerifiedAt`, `retrievedAt` and notes; `sourceRefs`
is per requirement; `getSourcesForRefs` is shared, so no pack carries its own provenance logic; and
the UI is already progressively disclosed — a status badge in Settings, full citations in the
document detail panel. Every question this audit was asked to answer was already answerable.

What was missing was anything preventing a pack from lying. Nothing stopped `reviewStatus: 'verified'`
with no source, a `sourceRefs` entry pointing at an id that does not exist (silently dropped by the
resolver's `.filter`), or a verification dated in the future. And one condition was actively wrong:

```ts
if (!sources.length || (!isVerified && !hasVerifiedSource))
```

A requirement whose source carried **no** `lastVerifiedAt`, inside a template marked `verified`, took
the `isVerified` branch and rendered a green check — over a source nobody had verified. The comment
directly beneath that line read *"A source record with no verification date does not upgrade the
status."* The code contradicted its own comment. Unreachable today, because no pack is verified and
no requirement cites a source — and exactly the trap laid for the pack that changes either.

**Rationale:**

- **`reviewStatus` is template-scoped; a displayed claim is requirement-scoped.** These are different
  questions — *how well maintained is this template* versus *what backs this particular requirement* —
  and conflating them is how a general ministry URL ends up appearing to substantiate a payslip rule.
  Separating them lets a template be `partially_verified` with some requirements still unsourced, and
  each one says so honestly. No per-requirement `reviewStatus` field is needed: the evidence is the
  status.
- **Invariants beat instructions.** A `CONTRIBUTING` note asking pack authors to be honest is a note.
  A test that walks the registry is a gate. It also generalises for free: pack #2 is held to the
  contract without anyone remembering to write its tests.
- **The replaced guard was backwards.** The old test asserted Greece *is* `unverified` — it would have
  failed the day someone honestly verified it, punishing the outcome it existed to encourage. The
  invariants pass for any truthful pack at any status and fail only for an unsupportable claim.
- **Greece stays unverified, deliberately.** Twenty-seven requirements, zero recorded per-requirement
  sources. The repository holds no evidence to verify any of them, and general knowledge is not
  evidence ([ADR-015]). The single source record is a ministry entry point with `lastVerifiedAt`
  deliberately absent, referenced at template level and correctly **not** shown per requirement.
- **An inert unsourced rule is debt, not safety.** `validityPeriodDays` holds ten document-age
  numbers no code reads. Harmless only while unread; the moment a consumer appears VisaFlow asserts
  a deadline on nobody's authority. Deprecating in place quarantines it without touching the shared
  pack contract, and a test pins the absence of consumers so wiring one up is a deliberate act.

**Trade-off:** the invariants make a dishonest pack fail the build, which means an author who wants
to record a partially-checked source must either supply a date or accept `unverified`. That friction
is the point, but it is friction.

**Consequences:** `SourceNote` no longer reads `reviewStatus` when deciding *whether* anything is
verified, only when labelling it. No schema, storage or export change: dossier `schemaVersion`
remains `1.1.0` and `STORAGE_FORMAT_VERSION` remains `2`; country-pack `templateVersion` stays
independent of both, and provenance remains pack metadata that never enters an applicant's dossier.

**Phase 3 entry:** VisaFlow is ready for a second production pack. The recommended next step is not
that pack but **verifying Greece** — exercising the whole provenance path on real evidence, against
a contract that is now enforced, before a second author depends on it.

**Implementation:** `src/components/ui/source-note.tsx`, `src/config/types.ts`,
`src/tests/features/country-pack-provenance.test.ts` (new), `src/tests/i18n/i18n.test.tsx`.

---

## ADR-047: Greece Is Partially Verified, and `reviewStatus` Must Match Its Evidence

**Status:** Accepted · 2026-08-28 · extends [ADR-015](#adr-015), [ADR-046](#adr-046)

**Decision:**

1. **`reviewStatus` is checked against coverage, not asserted.** `verified` requires *every*
   effective requirement to carry its own resolvable source with a `lastVerifiedAt`;
   `partially_verified` requires at least one that does and at least one that does not;
   `unverified` and `needs_review` remain legal at any coverage. One shared helper,
   `computeVerificationCoverage`, defines this for the tests and both UI surfaces.
2. **Greece is `partially_verified` — 4 of 27.** Derived from the evidence, not chosen.
3. **Pack-level surfaces state their coverage**, and the success tone is reserved for `verified`.
4. **`validityPeriodDays` stays deprecated and inert**, with its tripwire re-expressed as a real
   consumer scan.

**Context:**

ADR-046 claimed provenance was now enforced. It was not, quite. The invariant it introduced read
`template.sourceIds` — *template*-level — asked `.some()` whether any resolved source carried a
date, and put `verified` and `partially_verified` in one list. **A pack could be marked `verified`
with all 27 requirements unsourced and a single dated ministry link, and pass the build.** It never
consulted `requirement.sourceRefs` at all. The audit that opened this sprint was checking a claim
made in the previous one and found it overstated.

The research then ran into a harder wall. Of the source priorities this project set for itself,
**every Greek-jurisdiction source was unreachable**: `mfa.gr` and `gov.gr` both refuse this network
at the Akamai edge — plain HTTP *and* real Chrome — the appointed visa centre returns `403201`, and
Global Visa Center World presents an invalid TLS certificate, which disqualifies it as provenance
whatever it says. What remained reachable was EU primary law, which is legitimate evidence exactly
where a rule is genuinely Schengen-wide, and worthless for anything specific to Greece.

**Rationale:**

- **Coverage describes the pack, not the applicant.** Every requirement counts, including optional
  and conditional ones: a requirement that appears only for the self-employed is still a claim the
  pack makes. Deriving coverage from the open dossier would also make the same pack report
  different honesty to different people.
- **A citation vouches for everything the requirement says.** `sourceRefs` attaches to a
  requirement, but a requirement asserts a name, a description *and* notes. So a source that
  supports the main idea and not the notes does not earn the citation. This is why only 4 of 27
  count: Annex II names bank statements, accommodation and itineraries almost verbatim, yet
  `BANK_STATEMENTS` adds "last 3-6 months", `ACCOMMODATION` adds "for entire stay" and `ITINERARY`
  adds "day-by-day" — none of which the Visa Code states. The practical guidance is useful and
  stays; the citation does not.
- **Two wording corrections, both source-driven.** `PASSPORT_CURRENT` gained Article 12(c) — the
  passport must have been issued within the previous 10 years — which VisaFlow simply omitted and
  applicants can fail on. `TRANSPORT_RESERVATION` lost the claim that paid tickets are *not*
  required, which no source supports and Article 14(3) undercuts by making Annex II non-exhaustive.
- **Two conflicts recorded, neither resolved.** Article 14(4) contemplates proof of sponsorship on
  *a form drawn up by the Member State*, not VisaFlow's free-form sponsor letter; and Annex II C.2
  is about family ties with the *host or inviting person*, while `RELATIONSHIP_PROOF` is keyed to
  the financial *sponsor*. Both stay unsourced. Answering either needs the Greek ministry.
- **The green check was overclaiming.** Below `verified` the badge wording carries the nuance and a
  success-toned icon overrides it, so the tone is now muted and the count says what the status
  means. `unverified` shows no `0 of 27`, which would read as a progress bar for work nobody
  promised.
- **Two pack-level surfaces must answer identically.** Browser QA caught the Dashboard reporting the
  pack as unevidenced while Settings, looking at the same pack, showed 4 of 27: the Dashboard fed
  only `template.sourceIds` — a single undated ministry link — into `SourceNote`, so it fell to the
  unverified branch and the coverage it had computed was never rendered. Both now read the pack's
  sources and the one shared helper. A count that two screens can disagree about is worse than no
  count at all.
- **The old tripwire guarded the wrong thing.** Coupling `validityPeriodDays` to `sourceRefs` has no
  semantic basis — a requirement can cite Article 12 *and* carry an inert legacy number, which
  `PASSPORT_CURRENT` now does — and it would have missed a real consumer wired to an unsourced
  requirement. The scan asserts what ADR-046 meant: nothing in production reads the field.
- **The numbers are not the rule they resemble.** `90` on `PASSPORT_CURRENT` encodes "three months
  past departure" and `180` on `PHOTOS` encodes "taken within six months" — a validity *margin* and
  a *recency* window. Neither is the 90/180 stay rule they look exactly like, and one field cannot
  represent three different kinds of rule. It stays deprecated even though the requirement it sits
  on is now cited.

**Trade-off:** 4 of 27 is a thin result, and a reader may take the number as a judgement on the pack
rather than on the evidence available for it. The alternative was a higher number bought with
citations that vouch for wording the sources never contain, which is the failure this whole line of
work exists to prevent. Understating is recoverable; overstating is not.

**Consequences:** No dossier schema, storage or export change — `schemaVersion` stays `1.1.0`,
`STORAGE_FORMAT_VERSION` stays `2`. `gr-mfa-general` deliberately still carries no `lastVerifiedAt`,
because nobody could open it. The EU records live in a shared `eu.sources.ts` beside the shared
Schengen requirements they support, so the next Schengen pack inherits the evidence with them — and
must carry those records or its citations dangle, which the invariants catch.

**Second evidence pass (2026-08-29).** A re-audit against the specific claims most likely to be
wrong produced one correction and three useful negative results.

- **Article 15(3) was cited but half-stated.** The rule sets *three* criteria: the EUR 30 000
  minimum, validity **throughout the territory of the Member States**, and cover for the **entire
  period of the intended stay**. `TRAVEL_INSURANCE` cited Article 15 while naming only the amount.
  That is the same class of omission as the passport's 10-year rule, and it understated the rule to
  exactly the applicant most likely to buy the wrong policy — one that is cheap, compliant on paper,
  and expires mid-trip or excludes half of Schengen. The wording is now complete in both locales and
  a test pins all three criteria per locale, because half a rule is where a translation quietly
  loses something. Coverage did not move: the requirement never made an *unsupported* claim, only an
  *incomplete* one, so it was correctly counted before.
- **"Signed in two places" is not supported, and nearly passed anyway.** A grep found two
  `Signature` fields in the Visa Code and it looked like Annex I carried both. Reading the context
  showed the second sits in **Annex VI, the standard form for notifying refusal** — Annex I has one
  applicant signature plus a guardian signature for minors. `APPLICATION_FORM` stays unsourced. The
  near-miss is recorded because it is precisely the shape of rounding a partial up to verified: a
  string match that agrees with the answer you wanted.
- **The photo specifications cannot be cited at all from this Regulation.** Article 13(4) delegates
  the technical requirements to ICAO Doc 9303 Part 1, and a search for any millimetre dimension
  across the whole Visa Code returns nothing. ICAO 9303 was not opened, so "35x45mm", "white
  background" and "within last 6 months" remain useful practical guidance with no citation behind
  them.
- **Greek sources were retried and remain unreachable** — five `mfa.gr` paths including plain HTTP,
  plus `gov.gr`, `visa.gov.gr` and `greece.gov.gr`. Nothing changed, and nothing was inferred to
  compensate.

**Next:** Greece-specific verification, from a network that can reach `mfa.gr` or by a maintainer
entering the ministry's published list by hand. Every requirement above marked partial or
conflicting is waiting on precisely that.

**Implementation:** `src/config/sources/eu.sources.ts`,
`src/config/countries/verification-coverage.ts`, `src/config/countries/common/schengen-short-stay.ts`,
`src/config/countries/greece/`, `src/components/ui/source-note.tsx`, the settings and dashboard
models, `src/tests/features/country-pack-provenance.test.ts`,
`src/tests/features/verification-coverage.test.ts` (new).
