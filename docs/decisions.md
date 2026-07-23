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
