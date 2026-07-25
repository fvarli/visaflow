# Current Implementation Status

Last updated: 2026-07-26

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
- [x] Trip planner — guided flow with a connected-journey route builder
- [x] Documents workspace — overview hero, reusable filters + Cards/List/Table
      view switch, category-grouped cards, and a side panel (open without
      navigation) that surfaces requirement context + related findings
- [x] Reusable primitives: `Stepper`, `FieldHelp`, `GuidanceNote`, generic
      `CollectionEditor`, `SegmentedControl`, plus trip & document card families —
      all in `/playground`
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
- E2E tests: not yet implemented

## Build Status

All checks pass:
- `pnpm format:check` - PASS
- `pnpm lint` - 0 errors (warnings acceptable, see below)
- `pnpm typecheck` - PASS (`tsc -b`)
- `pnpm test` - 170/170 PASS
- `pnpm build` - SUCCESS

Note: an earlier version of this file claimed 23/23 tests and `tsc --noEmit`;
the script is now `tsc -b` and the suite has grown.
