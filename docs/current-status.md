# Current Implementation Status

Last updated: 2026-08-16 (checklist semantics)

## Completed Features

### Core Functionality
- [x] Document checklist with status tracking
- [x] Applicant information form
- [x] Trip details (dates, route, accommodations, insurance)
- [x] Employment information
- [x] Financial information
- [x] Sponsor management (add/edit/remove)
- [x] Notes system
- [x] Timeline view of important dates

### Validation Engine
- [x] 15+ validation rules implemented
- [x] Trip dates validation
- [x] Passport validity check
- [x] Appointment timing check
- [x] Insurance coverage check
- [x] Accommodation coverage check
- [x] Leave period coverage check
- [x] Required documents check
- [x] Severity levels (error, warning, info)

### Import/Export
- [x] JSON export with schema versioning
- [x] JSON import with Zod validation
- [x] Example dossier for testing

### Country Configuration
- [x] Country → visa type → requirement hierarchy
- [x] Greece Schengen tourism template (honestly marked `unverified`)
- [x] Conditional requirements support
- [x] Common Schengen documents
- [x] Official-source verification metadata (no scraping, no invented dates)

### Internationalization
- [x] Turkish + English UI, Turkish default (i18next / react-i18next)
- [x] Locale preference persisted (`visaflow-locale`), no browser detection
- [x] Locale-aware date / number / currency formatting (+ relative-day countdown)
- [x] Validation findings carry stable keys + params; prose resolved in the UI
- [x] Exported JSON is language-independent

### Dashboard command center
- [x] Widget-based dashboard over a pure presentation adapter
      (`src/features/dashboard/dashboard-model.ts`)
- [x] Command-center IA: given-name greeting, readiness as the single dominant
      indicator (ring + next milestone), one primary next action (reason +
      effort + CTA), upcoming timeline, consistency health with deep-links,
      five-bucket documents summary, trip summary — no KPI-card row (ADR-022)
- [x] Understated circular readiness ring (organizational, no prediction)
- [x] Live dossier snapshot — present-tense facts from current state, no
      fabricated history/timestamps, event-stream-shaped for a future timeline
      (ADR-021)
- [x] Reusable widgets + `ReadinessRing` / `Timeline` primitives, all in
      `/playground`
- [x] Small CSS motion vocabulary (fade / slide / scale / shimmer),
      reduced-motion respected

### Guided experiences (wizards & workspace)
- [x] Applicant profile — guided multi-step wizard (autosave, no Save button)
      with progressive disclosure (contact/additional groups, previous-Schengen
      Yes/No), per-field "why" popovers, a stronger review/completion step, and a
      calm **info-only guidance layer** (`applicant-guidance.ts`) that reminds —
      never warns, blocks, or affects readiness (ADR-016-safe)
- [x] Trip planner — guided itinerary workspace: derived date summary (nights vs
      days), overnight route builder with canonical date math (`route-dates.ts`,
      dates canonical / nights derived), coverage summaries that reuse validation
      findings, calm info-only `trip-guidance.ts`, and a review with per-section
      status + jump-to-fix
- [x] Documents workspace — overview hero, reusable filters + Cards/List/Table
      view switch, category-grouped cards, and a side panel (open without
      navigation) that surfaces requirement context + related findings
- [x] Employment workspace — a guided six-step wizard (status → employer →
      income → leave → documents → review): derived current-employer tenure
      (never stored), progressive status-aware disclosure (non-destructive),
      leave coverage read from validation findings against the canonical Trip
      dates, an employment-document summary + "what to request from HR" checklist
      (with accessible copy) that reuse the Documents feature, and a calm review.
      Pure adapters in `src/features/employment/*`; no schema/rule change (ADR-026)
- [x] Finance workspace — a guided six-step "financial evidence" wizard (source →
      personal → sponsors → documents → consistency → review): funding-source-aware
      progressive disclosure across all four sources (non-destructive), a recorded
      account balance that is never judged, a read-only employment-income overview,
      financial documents grouped (Bank / Employment income / Sponsor / Employer /
      Other) from the Documents feature with a privacy-safe "evidence to gather"
      copy list, a sponsor summary that defers editing to `/sponsors`, and a
      consistency step that reuses `sponsor.*` findings plus net-new factual notes.
      Pure adapters in `src/features/finance/*`; no schema/rule change (ADR-027)
- [x] Sponsors workspace — the canonical sponsor hub: rich summary cards (relationship,
      participation, calm readiness label, missing evidence, linked-document count,
      findings, one next action) with all editing in a progressive right-side Sheet
      (nine autosave accordion sections, opens on the first incomplete section, no Save
      button, full-screen on mobile). Per-sponsor evidence is real — the workspace links/
      unlinks existing sponsor-evidence documents via `Sponsor.documentIds` (Documents
      still owns creation/status/deletion; stale links surfaced, never crash). Safe
      removal via an `AlertDialog` that keeps linked documents. Pure adapters in
      `src/features/sponsors/*`; no schema/rule change (ADR-028)
- [x] Timeline — an actionable visa-preparation plan (not a passive date list): a hero
      (appointment countdown + prep-time-remaining + a recommended next step that reuses
      the Dashboard's `deriveNextActions[0]` + a calm realism note) and three modes —
      Preparation plan (tasks grouped into real-date proximity bands: Overdue / Today /
      This week / Before the appointment / Appointment day / Before travel / Travel;
      calm relative phases when no appointment), Key dates (fixed events, ranges
      collapsed), and factual Document freshness. Tasks are derived (never persisted)
      from the templates' `preparationMilestones` + document/validation state;
      recommendations are VisaFlow's, never official deadlines. Pure adapters in
      `src/features/timeline/*`; no schema/rule change, no dashboard change (ADR-029)
- [x] Settings control center — a responsive two-pane page (calm section rail +
      content on desktop, a scrollable selector on mobile; additive `?section=`
      deep-link with safe fallback) over a pure adapter
      (`src/features/settings/settings-model.ts`). Sections: Appearance (theme
      segmented control) · Language (TR/EN segmented control) · Country packs
      (informational, scale-ready list with honest review status via
      `ReviewStatusBadge`/`SourceNote`, plus the active-destination selector) ·
      Privacy (in-memory model + the two localStorage keys + the no-prediction
      disclaimer) · Local data (status + isolated Reset) · Import & export
      (export/import/example reusing the existing services, replace-confirm) ·
      About · Advanced. Pure presentation — no schema/storage/validation change,
      fixes the heading outline and hardcoded theme labels (ADR-030)
- [x] First-run experience — a dedicated `/welcome` surface (not an accidental
      empty state): a calm ≤4-step guided setup (Welcome → Language & destination
      → Create or import → Ready) over a pure adapter
      (`src/features/onboarding/onboarding-model.ts`) that reuses the wizard
      pattern (`Stepper`, `?step=` synced to the URL, focus-to-heading) and the
      import/export services + `initializeEmpty`. The index route redirects on
      `hasData` alone (`firstRunTarget`) — no persisted "completed" flag, no new
      storage key; a returning user with a dossier gets a calm "continue," never a
      restart. The shared `NoDossierState` is upgraded into the one canonical
      empty-workspace surface (injectable title/description/icon/hint + start /
      import / how-it-works) so every empty page routes into the journey. Pure
      presentation — no schema/storage/validation change (ADR-031)
- [x] Validation Center — the dossier review workspace: a review hero (readiness
      + checks passed + items needing attention + one suggested next step),
      findings grouped by domain with a calm health label and a direct
      "take me there" deep-link, a "what already looks good" list, and a
      section-by-section summary. A pure adapter (`src/features/validation/*`)
      over `runValidation` — no re-encoded rule, no changed outcome, calm
      severity wording only (ADR-025)
- [x] Final Review — the last look before the appointment (`/review`), answering a
      *different* question from the Validation Center: what you have, what is still
      missing, what you bring, and whether you are organised for the day. A review
      hero (readiness + appointment countdown + attention count + the Dashboard's
      own next action), an application summary "cover sheet" with deep links, the
      **submission checklist** (nine hand-over groups derived from the country pack's
      applicable requirements *and* the applicant's own documents, including custom
      ones), the open findings reusing the Validation Center's model whole, "what
      already looks good", appointment preparation (honest — no invented embassy
      procedure, no fabricated after-submission steps), and a **print package** that
      separates *pages VisaFlow can generate* from the applicant's *physical dossier*
      of external documents it never holds. Pure adapters in `src/features/review/*`;
      composition only — no new readiness, no new counts, no second document-status
      store, no PDF yet, no fake Print button (ADR-032)
- [x] **One canonical dossier readiness** — `src/features/readiness/` owns the single
      definition; Dashboard, Documents, Validation Center, Timeline and Final Review all
      consume it and render it under one shared label (`common:readiness.*`). Six divergent
      derivations were replaced (the same dossier used to read 45% and 36% simultaneously).
      `not_applicable` now leaves **both** sides of the fraction, so marking work irrelevant
      never moves the number and 100% stays reachable; `received` became **"obtained"** —
      never missing, never ready, never amber, and never a finding. The five applicable
      classes provably partition the denominator, fixing two segmented bars that left an
      unexplained gap and quick-filter chips that could not reach `received`/`not_applicable`
      documents at all. Readiness and consistency health are distinct axes, proven independent
      by test (ADR-033, `docs/readiness.md`)
- [x] Final Review polish — a `?mode=departure` **departure check**: a compact, mobile-first
      final folder check over the *same* review model (appointment → bundles to bring →
      VisaFlow-generated sheets → what is unresolved → one action) that never claims physical
      possession and persists nothing; plus an *All / Needs attention* checklist filter that
      isolates the unresolved items among 20+ rows without becoming a second Documents
      workspace (ADR-033)
- [x] **Checklist semantics** — the submission checklist is now an **inventory**, not a
      second progress metric: "11 items in your appointment package · 4 need attention"
      beside the one readiness ratio. Group headers and print bundles lost their
      `X of Y ready` ratios; optional requirements with no record left the package
      (a suggestion nobody added is not something you carry). Five call sites that
      omitted `requiredRequirementCodes` were fixed — the sidebar badge showed 3
      while every page body showed 4 (ADR-034)
- [x] **Status-aware recommendations** — `deriveNextDocument` returns
      `{ code, document, action }` (`obtain` / `followUp` / `update` / `confirm`) and
      sees requirements with no record at all, so "all caught up" can no longer appear
      beside an incomplete readiness bar. Priority mirrors the app-wide
      `deriveNextActions` order (ADR-034)
- [x] **Calmer `received`** — `received`/`obtained` left the cobalt accent (which the
      design system reserves for interactive surfaces) for the low-chroma `info` ramp
      it shares with `requested`, distinguished by icon, label and microcopy rather
      than hue. `DataList`'s hardcoded English "Not provided" now resolves from
      `common:states.notProvided` (ADR-034)
- [x] Reusable primitives: `Stepper`, `FieldHelp`, `GuidanceNote`,
      `CountryCombobox` (searchable, ISO-code + `Intl.DisplayNames` labels),
      generic `CollectionEditor`, `SegmentedControl`, plus trip, document and
      validation (`ValidationHero`, `FindingCard`, `FindingGroup`,
      `ReadinessSummary`, `ReviewProgress`) and employment
      (`EmploymentStatusSelector`, `EmploymentTenure`, `LeaveCoverageSummary`,
      `EmploymentDocumentsSummary`, `HrRequestChecklist`, `EmploymentReview`) and
      finance (`FundingSourceSelector`, `IncomeOverview`, `SponsorSummaryCard`,
      `FinanceDocumentsSummary`, `FinanceGatherChecklist`, `FinanceReview`) and
      sponsors (`SponsorRelationshipSelector`, `SponsorWorkspaceCard`,
      `SponsorDocumentLinker`, `SponsorEditorSheet`, `RemoveSponsorDialog`) and
      timeline (`TimelineHero`, `TimelineModeSelector`, `PreparationPlan`,
      `PreparationTaskCard`, `DateWindowBadge`, `KeyDatesTimeline`,
      `DocumentFreshnessList`, `AppointmentDaySummary`) and settings
      (`SettingsSection`, `SettingRow`) and onboarding (the canonical, injectable
      `NoDossierState` empty-workspace surface + the `/welcome` step components)
      families — all in `/playground`
- [x] Add custom documents / re-add template requirements / additive template
      sync (never deletes applicant data); custom docs use a stable `CUSTOM-` code

### Technical
- [x] TypeScript strict mode
- [x] Zod schemas for all domain types
- [x] React Context state management
- [x] Lazy-loaded routes
- [x] Unit tests for validation rules

## Current scope

These are deliberate boundaries of the current (Foundation) phase, not defects. Each maps to a
later phase in [roadmap.md](./roadmap.md):

1. **Single application** — one dossier at a time (multiple saved dossiers → Core Workspace).
   The dashboard model is already shaped for multi-application.
2. **In-memory only** — data is lost on refresh unless exported (optional persistence →
   Optional Self-Hosting; kept opt-in by design).
3. **Document references are text** — no file uploads yet.
4. **One country pack** — Greece (Schengen short-stay tourism); more via the country-pack
   system (Country Ecosystem).
5. **No offline PWA** — requires a browser session.

## Active Issues

### Lint Warnings (Acceptable)
- `react-refresh/only-export-components` in route/provider files
- `react-hooks/incompatible-library` for React Hook Form watch
- `@typescript-eslint/no-deprecated` where the UI reads the deprecated
  `Document.name` as a legacy fallback (intentional), plus a pre-existing
  Zod `z.email()` deprecation

These warnings don't affect functionality.

## Test Coverage

- Validation rules: covered
- Schema validation: covered
- Dashboard model (pure adapter): covered
- Component/render tests: dashboard + app shell (bilingual)
- Onboarding: pure model (steps, `resolveStep`, `firstRunTarget`) + first-run
  routing + the `/welcome` flow (bilingual), incl. a no-new-storage-keys check
- Final Review: pure models (checklist grouping/state/dedup/expiry, cover-sheet
  facts, print-package availability + the "an external document is never a
  VisaFlow-generated sheet" invariant, and reuse equality against the Dashboard,
  Timeline and Validation Center) + a bilingual render test of every section
- Readiness invariants: one shared fixture set (`src/tests/fixtures/dossiers.ts`) asserted
  across all five surfaces — same number, same state, same priority; plus `not_applicable`
  neutrality, the `received` semantics incl. task-completion-vs-readiness, and
  readiness/consistency independence
- Checklist semantics: the checklist renders no percentage and no `X of Y` ratio;
  `received` uses obtained/confirmation language with a non-warning, non-accent tone
  and is distinguished by more than colour; `deriveNextDocument` has a recommendation
  iff canonical readiness reports outstanding work
- E2E tests: not yet implemented

## Build Status

All checks pass:
- `pnpm format:check` - PASS
- `pnpm lint` - 0 errors (warnings acceptable, see below)
- `pnpm typecheck` - PASS (`tsc -b`)
- `pnpm test` - 620/620 PASS (61 files)
- `pnpm build` - SUCCESS

Note: an earlier version of this file claimed 23/23 tests and `tsc --noEmit`;
the script is now `tsc -b` and the suite has grown.
