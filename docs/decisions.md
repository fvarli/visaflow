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

**Implementation:** `src/features/settings/settings-model.ts` (pure), `src/components/settings/*` (SettingsSection, SettingRow, SettingsNav + the eight section components), `src/pages/SettingsPage.tsx` (two-pane shell, `?section=` reader, focus-to-`h2`). No schema, import/export, storage, or rule change; no changes to the domain pages or validation.

## ADR-031: Onboarding Is a First-Run Product Surface (Dedicated `/welcome`, `hasData`-Derived, No Persistence)

**Decision:** The first five minutes become a deliberate product surface: a dedicated `/welcome` route hosting a calm, ≤4-step guided setup (Welcome → Language & destination → Create or import → Ready) that gets a brand-new user to create (or import) their first dossier in about a minute, then hands off to the Dashboard. The index route (`/`) redirects to `/welcome` when there is no dossier and to `/dashboard` when there is, derived purely from `hasData` via `firstRunTarget`. The shared `NoDossierState` is upgraded into the one canonical empty-workspace component, so every empty page routes into the journey instead of dead-ending. It is **pure presentation**: it reuses the existing wizard architecture, the import/export services, and provider actions, and changes no schema, import/export format, storage, or validation behaviour.

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
