# Current Implementation Status

Last updated: 2026-08-25 — post-v1.1.0 development

Application version **1.1.0** (Phase 1 — Foundation shipped; Phase 2 — the saved-dossier workspace
— shipped in v1.1.0). Four version numbers move independently. Since the release the dossier JSON
`schemaVersion` has moved to **1.1.0** (it adds `applicant.previousRefusals` and nothing else); the
local `STORAGE_FORMAT_VERSION` remains **2** and country-pack `templateVersion`s are untouched. This
build reads dossier schema 1.0.0 and 1.1.0 alike, so every existing export imports with no warning.

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
      Privacy (the local-only model + the two localStorage keys + the IndexedDB
      database + the no-prediction disclaimer) · Local data (where the dossier
      lives, how fresh its backup is, and closing it) · Import & export
      (export/import/example reusing the existing services; importing is additive,
      so there is nothing to confirm away) · About · Advanced. Pure presentation —
      no schema/storage/validation change, fixes the heading outline and hardcoded
      theme labels (ADR-030, amended by ADR-036/038/041)
- [x] First-run experience — a dedicated `/welcome` surface (not an accidental
      empty state): a calm ≤4-step guided setup (Welcome → Language & destination
      → Create or import → Ready) over a pure adapter
      (`src/features/onboarding/onboarding-model.ts`) that reuses the wizard
      pattern (`Stepper`, `?step=` synced to the URL, focus-to-heading) and the
      import/export services + `initializeEmpty`. The index route derives entry
      from the workspace (`firstRunTarget`, ADR-040 — originally `hasData` alone)
      — no persisted "completed" flag, no new storage key; a returning user with a
      dossier gets a calm "continue," never a restart. The shared
      `NoDossierState` is upgraded into the one canonical
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
      store, no fake Print button (ADR-032)
- [x] **Printable appointment package** — the four generated sheets ADR-032 modelled
      are now actually printable, from a `/review/print` route rendered **outside**
      the app shell so no navigation, sidebar or button can reach the paper.
      A4 `@media print` styling with real page breaks; the browser's own Print /
      Save as PDF does the rendering, so VisaFlow ships no PDF dependency. The
      sheets, their order and their availability come from `buildPrintPackage`
      unchanged; an `unavailable` sheet prints one honest line rather than a page
      of blanks and a `partial` one says so. Prints as ink on white in both
      application themes, and the tab title — the filename Chrome offers — names
      the dossier. The applicant's own documents are never rendered (ADR-042)
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
- [x] **Release-candidate hardening** — an application-wide QA pass. Fixed, all
      structurally provable: the modal scrim inverted in dark mode (`bg-foreground/25`
      *lightened* the page; now a `--overlay` token that darkens in both themes);
      `SegmentedControl` overflowed the mobile viewport (Timeline's 3 modes measure
      ~447px EN / ~496px TR against 350px) and now scrolls inside its own track;
      the Timeline's "2 of 4 ready" became an inventory (it collided with the hero's
      "Required documents remaining: 4" — the same numeral, two meanings); three
      Turkish requirement names carried `(English Gloss)` and truncated in ten
      containers; two contrast failures (~2.6:1 and ~2.95:1); five touch targets
      below WCAG 2.5.8 AA; deterministic mobile overflow in five components; and
      `/timeline` skipped from `h1` to `h3`
- [x] Notes adopted the shared page shell — it was the only route without
      `PageHeader` and the only one with no render test. `src/App.css` (dead Vite
      leftovers) deleted; `humanizeStatus` moved out of the shipped design system
      into the Playground, where its only callers live
- [x] `docs/manual-qa.md` — the route × viewport × locale × theme checklist for the
      judgements that need a real browser. **Browser automation was unavailable this
      sprint, so no visual verification was performed or claimed**
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

- [x] **The journey, readable end to end** — the trip was always modelled (route,
      transport and accommodation have been arrays with real editors since v1.0)
      and barely surfaced: Final Review and the printed package showed two dates
      and a night count. Both now carry the transport legs — grouped
      outbound / during the trip / return, derived from the dates rather than
      stored — the stays with their nights, the route, and the purpose of travel.
      Budget, the self/sponsor funding split, and each sponsor by name with the
      expenses they cover are shown where they were previously a bare count or
      nothing at all. `trip.estimatedBudget` gained the editor it never had
      despite being rendered on the dashboard. The split is proof-read against
      the budget as a calm observation — never against the account balance,
      never a sufficiency verdict (ADR-044). No schema change: `schemaVersion`
      stays `1.1.0`

### Technical
- [x] TypeScript strict mode
- [x] Zod schemas for all domain types
- [x] React Context state management
- [x] Lazy-loaded routes
- [x] Unit tests for validation rules

## Current scope

What the workspace does and, just as deliberately, what it does not. Items 1–6 and 10–11 describe
behaviour that shipped in v1.1.0, including the limits it chose on purpose; items 7–9 are boundaries
of the current phase, not defects, and each maps to a later phase in [roadmap.md](./roadmap.md):

1. **Multiple saved dossiers** — create, switch, and delete several applications from `/dossiers`
   or the header switcher. One dossier is open at a time; the dashboard still renders the open
   one.
2. **Local persistence, no sync** — dossiers are saved in this browser (IndexedDB) and survive
   refresh; there is no cross-device sync and no encryption. Clearing browser data deletes them,
   so export remains the durable backup. A per-dossier "Session only" mode reproduces the v1.0
   in-memory behaviour for shared computers.
3. **The workspace and the open dossier are different places** — `/dossiers` is what you have,
   `/dashboard` is how the one you are inside is doing, and the navigation shows that order. Entry is
   derived from what is saved: a returning user reaches their dossier, someone who closed one reaches
   the list, and only a genuinely empty workspace sees onboarding. The dashboard is headed by the
   dossier's own name and nothing aggregates across dossiers (ADR-040).
4. **Saved is not backed up, and the app says which is which** — local persistence and portable
   backup are separate, per-dossier facts. Backup freshness comes from the stored record
   (`lastExportedAt` vs `updatedAt`), so it survives a reload and never follows the user from one
   dossier to another. Any dossier can be exported from `/dossiers` without opening it, and doing so
   moves neither its revision nor its `updatedAt` (ADR-038).
5. **Work that is not in storage is never silently discarded** — one guard covers every operation
   that replaces or empties the editor, including closing. It fires for three reasons and offers the
   way out each one allows: promote a session-only dossier, fork a conflicted one to a new id, or
   take a file when the browser refuses to store. Session-only can be promoted keeping the same
   identity; a refresh still discards it, and that limit is stated on screen rather than engineered
   around (ADR-039, ADR-041).
6. **Two tabs are safe, but not collaborative** — each dossier carries a `revision` and every write
   is a compare-and-swap, so a stale tab is refused rather than allowed to overwrite. The tab is
   told and offered the saved version or a fork under a new id. There is deliberately **no
   field-level merging**: divergence is surfaced, never guessed at (ADR-037). Tabs may hold
   different dossiers; the stored "active" id is only a hint for a freshly opened tab.
7. **Document references are text** — no file uploads yet.
8. **One country pack** — Greece (Schengen short-stay tourism); more via the country-pack
   system (Country Ecosystem).
9. **No offline PWA** — requires a browser session.
10. **Deleting a dossier is authoritative** — `delete` asserts no revision, so a tab whose list is
    a few seconds stale still deletes what the user named. This is the intended semantic for a
    single-user local product, recorded rather than left to be rediscovered (ADR-041).
11. **An import keeps what it can and says what it could not** — a file with one unreadable
    document imports the rest and reports the count, in the user's language, at every entry
    point. It never replaces the open dossier (ADR-041).

## Active Issues

### Dependency advisories (dev-only, tracked)

`pnpm audit` reports **9** advisories, all in dev/build chains that never reach the shipped bundle:
`undici` ×5 via `jsdom`, `brace-expansion` ×2 via `eslint`, and `postcss`/`nanoid` via
`@tailwindcss/vite > vite`. The one runtime advisory (`react-router` GHSA-qwww-vcr4-c8h2, high) was
patched to 7.18.2. Dependabot **vulnerability alerts** are enabled, so these stay visible;
Dependabot **security updates** are deliberately off, so no upgrade PR is opened automatically and
every bump is applied by hand. `SECURITY.md` is the canonical statement of this.

### Lint Warnings (Acceptable)
- `react-refresh/only-export-components` in route/provider files
- `react-hooks/incompatible-library` for React Hook Form watch
- `@typescript-eslint/no-deprecated` on `EmployerDetailsSchema` and the two identity-number fields.
  These are the deprecation markers working: the fields are kept so existing dossiers still import,
  and the warning is what stops anything new depending on them (ADR-043)
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
- Route smoke pass: all 14 shipped routes in both locales assert exactly one `h1`,
  no skipped heading level, and no raw translation key on screen (this found the
  `/timeline` h1→h3 defect)
- Cross-tab concurrency: the repository contract (revision increments, stale write refused
  with the current revision, a deleted record never recreated, a fresh identity written without
  an expectation) and the storage migration v1 → v2; then the same scenarios end-to-end through
  two `WorkspaceProvider`s sharing one repository — including one suite with `BroadcastChannel`
  stubbed out, because safety must not depend on a message arriving, and a StrictMode test that
  fails if the channel is closed by a remount
- Workspace entry: the index route waits for hydration and then routes from what is stored —
  nothing saved → `/welcome`, a restored dossier → `/dashboard`, saved dossiers with none open →
  `/dossiers` — with an explicit assertion that no onboarding flashes while storage is still
  answering, that an unreadable workspace creates nothing, and that a dossier is never reopened
  merely because one exists
- Workspace navigation: `/dossiers` is a primary nav entry above Dashboard, marked workspace-scoped,
  deliberately outside the group that means "inside one dossier", and named in both locales
- Dashboard identity: the heading is the active dossier's title, follows a rename, changes on a
  switch with nothing stale left over, stays a single `h1`; the browser tab carries route + dossier
  and is translated
- Dashboard scope: the model exposes the active dossier and nothing else — a guard against any
  future cross-dossier aggregate
- Backup semantics: `markExported` writes only `lastExportedAt` — revision and `updatedAt` are
  untouched, so exporting cannot hand a concurrent editor a false conflict — and refuses to
  recreate a deleted record; the three freshness states; per-dossier independence across switches;
  export history surviving a reload; and `hasMeaningfulContent`, which decides when leaving a
  session-only dossier is worth interrupting for
- Session-only lifecycle: nothing reaches storage before promotion, an untouched dossier leaves
  without a prompt, a switch away from real work is blocked until answered, promotion persists
  *before* the switch, a failed promotion discards nothing and keeps the dossier session-only, and
  discard really discards
- Storage failure: a failed write never renders "Saved", a browser refusing storage is reported as
  unavailable rather than as a failed save, and no storage at all degrades honestly
- Rename: an explicit title wins over the derived one, whitespace clears back to derived, an
  explicit title is never auto-overwritten, and the title never appears in exported JSON
  (asserted against the exact key set, with `schemaVersion` still `1.0.0`)
- The leave guard (ADR-041): every editor-replacing path — open, create, import and **close** —
  is blocked when the editor holds work that storage does not, with the reason carried so the
  offer matches it; the conflict branch forks to a new id and completes the switch, the
  storage-failure branch hands over a file without resolving anything, discard really discards, and
  a dossier that is genuinely saved passes through with no friction at all
- Import reporting (ADR-041): the production path (`importPartial`) had **zero** tests and now has
  eight, including the worked case — three documents, one unreadable, two imported, one counted —
  a collection that is not an array, a schema-version mismatch as a note rather than a refusal, and
  a file with nothing salvageable refused outright. Plus the entry points: the count is rendered
  above the page, so it survives the remount a successful import causes
- Backup ownership (ADR-041): a `markExported` that lands between an editor's read and its write is
  not reverted by that write — the regression test fails against the previous adapter
- Deletion semantics (ADR-041): a pinned test documents that `delete` is authoritative and asserts
  no revision, so the absence reads as a decision rather than an oversight
- Focus visibility: the control primitives may not carry `outline-none` /
  `outline-hidden`, which in Tailwind v4 silently overrides the single
  `:focus-visible` rule in `@layer base` and leaves a control with no keyboard
  focus indicator at all (`src/tests/ui/focus-visible.test.ts`)
- Overlay focus restoration: Dialog, Sheet and AlertDialog return focus to
  whatever opened them, via `Escape` and via the visible close action; when the
  opener no longer exists the caller may name a destination
  (`src/tests/ui/overlay-focus-restore.test.tsx`, ADR-035)
- Sponsors first-create focus: creating the first sponsor destroys the button
  that created it, so focus lands on the new sponsor's card; the normal edit
  path still restores its own trigger (`src/tests/ui/sponsors-deeplink.test.tsx`)
- E2E tests: not yet implemented

## Build Status

All checks pass:
- `pnpm format:check` - PASS
- `pnpm lint` - 0 errors (warnings acceptable, see *Active Issues* above)
- `pnpm typecheck` - PASS (`tsc -b`)
- `pnpm test` - 892/892 PASS (74 files)
- `pnpm build` - SUCCESS

Bundle: `index` 305.55 kB / 94.02 kB gzip plus the eagerly-preloaded shared chunk
(`WorkspaceProvider`) 479.23 / 147.24 gzip — 784.78 kB raw across the two, CSS 85.82 / 17.49 kB
gzip. The shared chunk carries every locale namespace; its name tracks whichever module Rollup
picks, so compare the eager *pair*, not either half.

**Verified in a real browser.** The v1.1.0 release scenarios were run against the production build
served by `vite preview`, on a fresh Chrome profile, with every storage assertion read straight out
of IndexedDB. The matrix and its results are in [manual-qa.md](./manual-qa.md).

**Continuous integration:** `.github/workflows/ci.yml` runs the gates above on every push and PR to
`main`, plus `scripts/check-act-warnings.mjs`, which fails the build on any React `act(...)` warning.
Vitest's default reporter hides console output from passing tests, so green tests alone are not
evidence of a quiet suite.

Note: an earlier version of this file claimed 23/23 tests and `tsc --noEmit`;
the script is now `tsc -b` and the suite has grown.
