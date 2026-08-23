# Session Handoff Guide

This guide helps continue work on VisaFlow across sessions or machines.

## Quick Resume

```bash
cd /path/to/visaflow
git pull                    # Get latest changes
pnpm install               # Install dependencies
pnpm typecheck && pnpm test && pnpm build  # Verify everything works
pnpm dev                   # Start development server
```

## Current Branch

Check the current state:
```bash
git branch                 # Should be 'main'
git status                 # Should be clean
git log --oneline -5       # Recent commits
```

## Key Files to Know

| Category | Files |
|----------|-------|
| State management | `src/app/providers/DossierProvider.tsx` |
| Validation | `src/domain/rules/*.ts`, `src/domain/rules/runner.ts` |
| Schemas | `src/domain/schemas/*.ts` |
| Country packs | `src/config/countries/<country>/`, `src/config/countries/index.ts` |
| Dashboard model | `src/features/dashboard/dashboard-model.ts` |
| Routes | `src/app/router/routes.tsx` |
| Pages | `src/pages/*.tsx` |
| Tests | `src/tests/` |

## Validation Commands

Run these to verify the codebase is healthy:

```bash
pnpm lint          # Check for lint issues
pnpm typecheck     # Verify TypeScript types
pnpm test          # Run unit tests
pnpm build         # Verify production build
```

All should pass. Lint may show warnings (acceptable).

## Common Tasks

### Making changes
1. Create a branch: `git checkout -b feature/my-feature`
2. Make changes
3. Run validation: `pnpm lint && pnpm typecheck && pnpm test`
4. Commit and push

### Testing locally
1. `pnpm dev` - starts dev server at http://localhost:5173
2. Click "Load Example Data" on Dashboard
3. Navigate through pages to test

### Adding validation rules
1. Create rule in `src/domain/rules/`
2. Add to `allRules` in `runner.ts`
3. Add tests in `src/tests/rules/`

## Project Memory

See `CLAUDE.md` in the project root for AI assistant context.

## Documentation Index

- `README.md` - User-facing product overview
- `CONTRIBUTING.md` - Contribution guidelines + philosophy
- `SECURITY.md` - Security policy
- `docs/vision.md` - Product vision, why it exists, Current/Next/Future
- `docs/principles.md` - Product & engineering principles (tied to ADRs)
- `docs/architecture.md` - System map + layer boundaries (canonical)
- `docs/validation-engine.md` - Rules, findings, i18n boundary
- `docs/dashboard-architecture.md` - Widget dashboard + presentation adapter
- `docs/country-pack-guide.md` - Country pack concept + authoring guide
- `docs/playground.md` - Component workbench + demonstrate-before-use rule
- `docs/privacy.md` - Privacy model + data ownership (canonical)
- `docs/json-schema.md` - JSON import/export format
- `docs/decisions.md` - Architectural decision records (ADRs)
- `docs/roadmap.md` - Product phases
- `docs/current-status.md` - Implementation status snapshot
- `docs/visa-domain-notes.md` - Schengen domain background + rule rationale
- `docs/fresh-machine-setup.md` - New-machine dev setup

## Environment

- Node.js 22+ (see `.nvmrc`)
- pnpm 11+ (see `package.json` packageManager field)
- Modern browser for testing

## Troubleshooting

### pnpm install fails
```bash
nvm use              # Switch to correct Node version
corepack enable      # Enable pnpm
pnpm install
```

### Tests fail
```bash
pnpm test -- --reporter=verbose  # Get detailed output
```

### Build fails
```bash
pnpm typecheck       # Check for type errors first
```

## Iteration 3 handoff (2026-07-23): i18n + config architecture

**Shipped:** Turkish/English UI (Turkish default), and a
`country → visa type → requirement` config with honest source metadata.

### Gates (all pass)
`pnpm format:check` · `pnpm lint` (0 errors, 48 acceptable warnings) ·
`pnpm typecheck` (`tsc -b`) · `pnpm test` (**88/88**) · `pnpm build`.

### Where things live now
- Translations: `src/i18n/locales/{tr,en}/*.json` (15 namespaces, key parity
  enforced by `src/tests/i18n/parity.test.ts`). Never hardcode UI text.
- Locale runtime: `src/app/providers/LocaleProvider.tsx`; picker
  `src/components/ui/language-select.tsx`.
- Formatting: `src/lib/format.ts` (`useFormatters()`), never `Intl` directly.
- Runtime keys: `src/lib/i18n-dynamic.ts` (`dynamicT`).
- Config: `src/config/types.ts`, `src/config/countries/<country>/`,
  `src/config/sources/`. Resolve with `resolveVisaTemplate()`.
- Findings: keys + params in `src/domain/rules/*.rules.ts`, rendered by
  `src/lib/finding-text.ts`.

### Invariants to preserve
- Exported JSON must stay language-independent (test:
  `json-language-independence.test.ts`). `Document.name` is deprecated/optional
  — never write it for template docs; `code` is the identity.
- Domain enums, codes, finding `id`/`ruleId`, `schemaVersion` are
  language-independent. Rule outcomes/severities unchanged.
- Only `visaflow-theme` and `visaflow-locale` may hit localStorage.
- No visa approval/refusal prediction (ADR-016).

### Known limitations / next
- Visual verification was done via render tests, not a browser — the Chrome
  extension was unavailable. Re-verify visually at 1440/390px, light/dark,
  tr/en when possible; watch long Turkish labels.
- `SourceNote` is wired in the playground but not yet in the Documents detail
  view — adopt it during the Documents redesign.
- Greece template is honestly `unverified`; verify against a real source and
  set real `lastVerifiedAt` before raising `reviewStatus`.

### ADRs added
011 Turkish-first · 012 stable domain values · 013 locale may persist ·
014 country→visa-type→requirement · 015 source metadata · 016 no prediction.

---

## Iteration 4 handoff (2026-07-23) — Dashboard command center

This iteration redesigned **only the Dashboard** into a widget-based command
center. No other page, the validation logic, the schemas, or import/export were
changed.

### What changed
- **Presentation adapter** `src/features/dashboard/dashboard-model.ts` —
  `buildDashboardModel(state)` derives readiness buckets, countdowns, next
  actions, a timeline and source status. Pure (no i18n/Intl), unit-tested. Wraps
  a per-application model in `{ applications, active }` for future multi-app
  (structure only). Re-encodes no rule — validation via `runValidation`,
  requirements via `resolveVisaTemplate`. See ADR-017.
- **New primitives** `src/components/ui/readiness-ring.tsx` (understated SVG
  ring, shows % + state, organizational only) and `src/components/ui/timeline.tsx`
  (generic vertical timeline). Both in `/playground`.
- **Widgets** `src/components/dashboard/*` — ReadinessHero, MetricsRow,
  NextActions, UpcomingTimeline, DocumentsSummary (segmented Ready/Missing/Needs
  update), ValidationSummary (leads with actionable findings), TripSummary,
  DashboardSkeleton. Each is prop-driven and shown in `/playground`.
- **DashboardPage** is now a thin composition over `useDashboardModel()`.
- **Formatter** `formatRelativeDays` / `relativeDays` added to
  `src/lib/format.ts` (Intl.RelativeTimeFormat).
- **Motion** a small keyframe set (`fade-in`, `fade-in-up`, `subtle-scale`,
  `shimmer`) in `src/index.css`, all covered by the existing reduced-motion
  rule. No framer-motion; no new dependency.
- **i18n** additive `dashboard` namespace keys (tr/en parity). All previously
  no-argument `useTranslation()` calls were scoped to `'common'` to avoid a
  TypeScript key-union depth blow-up (TS2589) — see ADR-018.

### Gates (this iteration)
`format:check` PASS · `lint` 0 errors / 48 warnings · `typecheck` PASS (`tsc -b`)
· `test` **110/110** · `build` SUCCESS. Bundle: dashboard widgets are a lazy
shared chunk (~7.4 kB gzip); main `index` ~109.3 kB gzip (≈ baseline). Not
committed, not pushed.

### Known limitations / next
- Visual verification was via bilingual render tests, not a browser (Chrome
  extension unavailable). Re-verify at 1440/834/390px × light/dark × tr/en.
- The timeline date math is duplicated between the dashboard adapter and the
  (off-limits this sprint) Timeline page — consolidate onto the adapter when the
  Timeline page is next touched.
- Multi-application is structural only; no switcher/list/storage is built.

### ADRs added
017 dashboard presentation adapter · 018 scope `useTranslation` to its namespaces.

---

## Iteration 5 handoff (2026-07-23) — Product vision & documentation alignment

Documentation-only sprint. **No code, schema, validation, page, or JSON changes.** The goal was
to align the repository with the product vision (an application workspace for international visa
preparation, not a Greece checklist), remove MVP/Greece-only framing and heavy duplication, and
establish a clean documentation taxonomy.

### What changed
- **README.md** rewritten as a serious open-source product (Vision · Why · Principles · Features ·
  Product architecture · Screenshots/Demo placeholders · Install · Development · Privacy model ·
  Data ownership · Country packs · Validation engine · JSON format · Roadmap Current/Next/Future ·
  Contributing · License). Duplicated `src/` tree and limitations list removed in favour of links.
- **New docs:** `vision.md`, `principles.md` (12 principles → ADRs), `validation-engine.md`,
  `dashboard-architecture.md`, `playground.md` (names the Playground a lightweight Storybook
  alternative + codifies demonstrate-before-use).
- **`architecture.md`** restructured around the six layer boundaries (Domain · Validation engine ·
  Country packs · Import/Export · Presentation · Privacy) and de-staled (current `ValidationFinding`
  shape, flat `DossierState`, lazy routes done, dashboard adapter added).
- **`roadmap.md`** rewritten as named product phases (Foundation → Core Workspace → Country
  Ecosystem → Productivity → Optional Self-Hosting → Collaboration → AI Assistance) with reasoning
  and Current/Next/Future tags; AI phase bounded to organizational help only (ADR-016).
- **Renamed** `adding-a-country.md` → `country-pack-guide.md` (expanded with the country-pack
  concept); all 5 references updated.
- **Deleted** orphaned `project-context.md` (content migrated into `vision.md`).
- **Improved** `privacy.md` (firm storage rule + Data Ownership section), `CONTRIBUTING.md`
  (philosophy + playground rule + layer boundaries), `CLAUDE.md` (vision framing, doc index, stale
  paths), `current-status.md` ("Known Limitations" → "Current scope" → roadmap),
  `fresh-machine-setup.md` (stale test count).
- **ADRs:** appended ADR-019 (product vision) and ADR-020 (Playground demonstrate-before-use).

### Single source of truth (deduped)
`src/` tree → architecture.md · privacy narrative → privacy.md · roadmap/limitations → roadmap.md +
current-status.md · domain vocabulary → vision.md. Other docs summarize + link.

### Gates
Docs-only; ran `pnpm test` / `lint` / `typecheck` / `build` once to confirm nothing was
accidentally touched — all green (110/110). Not committed, not pushed.

### Known follow-ups
- `package.json` has no `license` field though LICENSE (MIT) exists — metadata inconsistency
  (left as code/config, out of this docs sprint's scope).
- `SECURITY.md` still duplicates some of the privacy data-flow and pins "Supported Versions" to
  1.0.x — could be trimmed to link `privacy.md` in a later pass.

### ADRs added
019 product vision · 020 Playground demonstrate-before-use.

---

## Iteration 6 handoff (2026-07-24) — Applicant experience redesign

Redesigned **only the Applicant experience** from a flat two-Card form into a guided, five-step
wizard (Personal information → Passport → Previous visas → Travel history → Review). No other page,
the dossier schema, the validation rules, the provider actions, or the JSON format were changed —
existing exports stay byte-compatible.

### Key finding
The domain schema already modelled everything: `applicant.schema.ts` carries `passport` (nested),
`previousVisas[]`, `travelHistory[]`, and `countryOfResidence` (all defaulted). They were simply
never surfaced. So this was a **UI + i18n sprint** — no schema/provider/JSON change.

### New reusable primitives (all shown in `/playground` → "Onboarding")
- `src/components/ui/stepper.tsx` — `Stepper`: prop-driven step rail. Vertical numbered rail at `lg`,
  compact "Step X of N" + progress bar below. `aria-current="step"`; completed/current steps
  selectable, upcoming disabled. Presentational + navigational only.
- `src/components/ui/field-help.tsx` — `FieldHelp`: click/tap Popover "Why do we ask this?" with a
  translated trigger `aria-label`. Reserved for genuinely useful fields; disclaimer only where copy
  could read as legal advice. Consumed via a new **additive** optional `help` slot on `Field`
  (`src/components/ui/field.tsx`) — the only shared-primitive touch, backward-compatible.
- `src/components/ui/collection-editor.tsx` — generic `CollectionEditor<T>`: Add → card list → Dialog
  edit → remove, with an inviting empty state. Controlled; commits whole arrays via `onChange` (no
  reducer action needed). Drives both Previous visas and Travel history.

### Applicant feature files
- `src/features/applicant/applicant-wizard.ts` — **pure** step model: `WIZARD_STEP_IDS`,
  `deriveStepStatuses(applicant, current)`, `isPersonalComplete`/`isPassportComplete`. Unit-tested.
- `src/components/applicant/{PersonalInfoStep,PassportStep,PreviousVisasStep,TravelHistoryStep,ReviewStep}.tsx`.
  Personal/Passport keep their own RHF form (`mode:'onBlur'`, `reValidateMode:'onChange'`, translated
  messages) with `watch → updateApplicant` **autosave — no Save button**. Review reuses `DataList`
  and has per-section "Edit" that jumps back via `onEdit`.
- `src/pages/ApplicantPage.tsx` — rewritten as the thin shell: `PageHeader` (single `h1`) + `Stepper`
  in a responsive grid + active step + Back/Continue nav (Review → "Go to dashboard"). Focus moves to
  the step `h2` on change. Each step remounts on change (`key={activeId}`) so it re-seeds from state.

### i18n (additive, tr/en parity kept)
- Extended `applicant.json` (both locales): `wizard`, `steps.*`, `nav.*` (incl. `stepProgress`
  interpolation), `why.*` (+ `disclaimer`), new `fields.*`, `previousVisas.*`, `travelHistory.*`,
  `collection.*`, `review.*`, extra `errors.*`.
- Added enum labels `passportType.*` and `previousVisaStatus.*` to `visa-domain.json` (both locales;
  resolved with `dynamicT`). Added `playground.json` keys for the Onboarding section.

### Gates (this iteration)
`format:check` ✓ · `lint` 0 errors / 49 warnings (baseline 48; +1 accepted RHF `watch`
`incompatible-library`) · `typecheck` ✓ · `test` **124/124** (110 + 14 new) · `build` ✓
(index ~109.4 kB gzip ≈ baseline). Not committed, not pushed.

### Tests added
`src/tests/features/applicant-wizard.test.ts` (pure `deriveStepStatuses`) ·
`src/tests/ui/applicant-wizard.test.tsx` (both locales: single `h1`, stepper progress, continue nav,
FieldHelp popover, inline required-field error, collection add) ·
`src/tests/ui/collection-editor.test.tsx` (empty → add → edit → remove + validate-gated save).

### Known limitations / next
- Visual verification was via bilingual render tests, not a browser (no connected Chrome). Re-verify
  at 1440/834/390px × light/dark × tr/en; watch long Turkish labels and Popover placement on mobile.
- `address` (street/city/postal) is still deferred — planned as a dedicated **Residence & Contact**
  experience, not bolted onto onboarding.
- No validation rules cover `previousVisas`/`travelHistory` yet (they're optional records).
- Collection records use array-index list keys (schema has no `id`); editing is via dialog so this is
  safe, but adding an `id` would be needed for reorder/drag.

---

## Iteration 7 handoff (2026-07-24) — Trip planner experience

Redesigned **only the Trip experience** from a flat 3-Card form into a guided travel planner: a pinned
overview hero + a six-step flow (Travel dates → Destinations & route → Accommodation → Transportation →
Insurance → Review). No other page, the dossier schema, the provider actions, or the JSON format were
changed — existing exports stay byte-compatible.

### Key finding (same as the applicant/dashboard pattern)
`trip.schema.ts` already modelled everything: `route[]`, `transportReservations[]`,
`accommodationReservations[]`, `insurance`, dates, `mainDestinationCountry`, budget (arrays default
`[]`). `TripPage` only edited ~7 flat fields + appointment. So this was a **UI + i18n sprint** — no
schema/provider change. Sub-lists commit via the existing `updateTrip(Partial<Trip>)` whole-array
replacement, index-keyed (as the applicant collections did).

### New reusable trip components (all shown in `/playground` → "Travel")
- `src/components/trip/TripHero.tsx` — compact overview band (destination, dates, total nights, main
  destination, appointment proximity, unresolved-findings pill). Prop-driven facts; no KPI tiles, no
  approval language. Pinned `lg:sticky`, compact/non-sticky on mobile.
- `JourneyTimeline.tsx` (`JourneyTimeline` + `JourneyStop`) — connected vertical rail (`<ol>`, dot +
  connector, `highlight` for main destination). Travel-flavoured sibling of the dashboard `Timeline`.
- `DestinationCard.tsx` — itinerary-entry card: city/country, dates, a nights bar scaled to the longest
  stay, accommodation-status hint, "Main destination" badge, an `actions` slot.
- `TravelSegmentCard.tsx` — transport leg (type icon, carrier, from → to, times, status).
- `CoverageCard.tsx` — insurance safeguard; "covers the full trip / gap" indicator **derived from
  validation findings** (organizational, not legal).
- `RouteBuilder.tsx` — the signature piece: `JourneyTimeline` of `DestinationCard`s + add/edit dialog +
  Up/Down reorder isolated behind a pure `reorder(list, from, to)` so drag-and-drop can be layered on
  later. Nights auto-computed from arrival/departure. Commits the whole `route` array.
- `transport-meta.ts` — `TRANSPORT_ICON` map (kept out of the step file so it stays fast-refresh clean).

### Feature / step / shell files
- `src/features/trip/trip-model.ts` — **pure** `buildTripModel(state, now)`: overview + countdown, route
  stop views (nights ratio + `isMain`), and `insights` sourced from `runValidation` filtered to
  trip/insurance/accommodation/`passport.validAfterTrip` findings (coverage indicators derived from
  findings, never recomputed). `useTripModel()` hook. Unit-tested.
- `src/features/trip/trip-wizard.ts` — pure `TRIP_STEP_IDS` + `deriveStepStatuses(application, current)`.
- `src/components/trip/{TripDatesStep,RouteStep,AccommodationStep,TransportationStep,InsuranceStep,TripReviewStep}.tsx`
  — RHF steps (Dates, Route scalars) `mode:'onBlur'` + `watch → updateTrip`/`updateAppointment`
  **autosave, no Save button**. Accommodation/Transportation reuse the generic `CollectionEditor<T>`;
  Insurance is a single-object editor; Review reuses the cards read-only with per-section Edit +
  the consistency insights via `useFindingText`.
- `src/pages/TripPage.tsx` — rewritten as the thin shell (hero + stepper + step + Back/Continue, focus
  to the step `h2`, `key` remount per step). Appointment stays as a separate "Consulate appointment"
  card in the Dates step (preparation-tracking framing), summarized in the hero.

### i18n (additive, tr/en parity)
- Extended `trip.json` (both locales): `wizard`, `steps.*`, `nav.*`, `hero.*` (+ `toReview` plural),
  `nights` plural, `appointment.note`, `route.*`, `accommodation.*`, `transportation.*`, `insurance.*`
  (+ `spansTrip.{full,gap}`), `review.*` (+ insights), `why.*`, `collection.*`, extra `errors.*`.
  (Existing `dates.*`/`destinations.*`/`errors.*` kept — the Playground Forms demo still uses them.)
- Added `transportType.*`, `accommodationType.*`, `transportStatus.*`, `accommodationStatus.*` to
  `visa-domain.json`; `playground.json` "Travel" keys. Values stay ISO/raw → exported JSON unchanged.

### Gates (this iteration)
`format:check` ✓ · `lint` 0 errors / 51 warnings (baseline 49; +2 accepted RHF `watch`
`incompatible-library`) · `typecheck` ✓ · `test` **138/138** (124 + 14 new) · `build` ✓ (TripPage is a
lazy ~8.3 kB gzip chunk; main index ~109.5 kB gzip ≈ baseline). Not committed, not pushed.

### Tests added
`src/tests/features/trip-wizard.test.ts` (pure `deriveStepStatuses` + `buildTripModel` totals/ratios/
insights) · `src/tests/ui/trip-planner.test.tsx` (both locales: single `h1`, step heading, progress,
Continue nav, itinerary + reorder controls, empty state, no Save button) · `src/tests/ui/route-builder.test.tsx`
(empty→add with computed nights, move-down reorder, remove).

### Known limitations / next
- Visual verification was via bilingual render tests, not a browser (no connected Chrome). Re-verify at
  1440/834/390 × light/dark × tr/en; check hero sticky-desktop/compact-mobile, journey continuity, and
  the nights bars.
- One flaky test run was observed on a **cold** vitest cache (heavy first-run transform pushing a render
  past the default timeout); 6 subsequent full runs were green. Not a logic regression, but if it
  recurs in CI consider raising the test timeout for the heavy playground/page render tests.
- Route reorder is Up/Down; drag-and-drop can reuse the isolated `reorder()` helper (needs an `id` on
  `RouteStopSchema` for stable DnD keys — a future, backward-compatible schema addition).
- Trip-consistency insights read the whole validation set filtered by ruleId; a future `runSpecificRules`
  call could avoid running unrelated rules if it ever matters for performance.

---

## Iteration 8 handoff (2026-07-24) — Documents workspace redesign

Turned the Documents checklist into the **primary dossier workspace**: an overview hero that answers
"what's still missing?" above the fold, reusable filters + a Cards/List/Table view switch, category-grouped
document cards, and a side panel that opens a document **without navigation**. No dossier-schema change and
no rule duplication — existing exports stay 1.0.0-compatible.

### Key finding (same pattern as prior sprints)
No schema change. `Document` already carries every card field; the provider already exposes
`addDocument`/`updateDocument(id, partial)`/`removeDocument`/`setDocuments`; requirement context
(description, notes, sources) is **re-resolved by `code`** from `resolveVisaTemplate` (never persisted).
Template-vs-custom is derived (code in template ⇒ template-derived; custom docs use a `CUSTOM-<id>` code
with the user's title in the existing `name` field — legitimate user data, language-independent).

### Pure logic (`src/features/documents/`)
- **`documents-model.ts`** — `buildDocumentBuckets5` (Ready/Missing/Needs-update/Requested/Optional +
  completion), `groupByCategory` (+ `CATEGORY_ORDER`), `deriveNextDocument`, `classifyDoc`
  (required/conditional/optional/custom), `associateFindings` (by `documentCodes` + `relatedFields` doc-id
  + category for cross-entity findings) and `findingLink` (relatedFields prefix → `/trip`|`/applicant`).
  `buildDocumentsModel`/`useDocumentsModel` compose these over `runValidation` — **no rule re-encoding**.
- **`document-filters.ts`** — reusable `filterDocuments` + `DocumentFilters` + `useDocumentFilters`
  (search/status/category/owner/requirement) + `QUICK_FILTERS` / `matchQuickFilter` for the hero chips.
- **`template-sync.ts`** — `documentFromRequirement` (shared by seed + re-add), `createCustomDocument`,
  `applicableRequirements`, and `planTemplateSync` (additive: `toAdd` + `noLongerApplicable`, never deletes).

### New reusable primitive
- **`src/components/ui/segmented-control.tsx`** — accessible `role="radiogroup"` switcher (roving tabindex,
  arrow/Home/End keys). Drives the view switch; demoed in `/playground` → "Documents".

### Feature components (`src/components/documents/`, prop-driven, memoized cards)
`DocumentsHero` (readiness bar + 5 clickable bucket quick-filters + next document), `DocumentCard`
(`React.memo`) + `DocumentRow`, `DocumentGroup` (collapsible `aria-expanded` category section),
`DocumentFilters` (Toolbar + Selects + SegmentedControl; **view switch preserves filters**),
`DocumentDetailPanel` (`Sheet` side panel: 3 progressively-disclosed layers — read-only requirement context
via `SourceNote`, editable applicant state, related findings with "Go to Trip" deep-links; edits autosave
via `updateDocument`), `AddDocumentDialog` (custom or re-add template requirement), `TemplateSyncDialog`
(preview + apply, additive). `DocumentsPage.tsx` composes them over the model; keeps seed-on-empty.

### i18n
Extended `documents.json` (both locales): `hero.*`, `view.*`, expanded `filters.*`, `card.*`, `group.*`,
`panel.*` (3 layers + kinds + source states), `add.*`, `sync.*`. Reuses `visa-domain` enum labels +
`useFindingText` for finding prose. Playground "Documents" keys added. Values stay raw/ISO → JSON unchanged.

### Gates (this iteration)
`format:check` ✓ · `lint` 0 errors / 50 warnings (baseline 51) · `typecheck` ✓ · `test` **153/153**
(138 + 15 new) · `build` ✓ (DocumentsPage lazy ~7.7 kB gzip; main index ~108.3 kB gzip, **below** baseline).
Not committed, not pushed.

### Flaky-test fix
`vitest.config.ts` gained `testTimeout`/`hookTimeout: 15000`. The suite still flakes on the very first
**cold** transform of a large change set (heavy one-time compile); two consecutive warm runs are green.
`pnpm test` twice, or a warm cache, is reliable.

### Tests added
`src/tests/features/documents-model.test.ts` (buckets/grouping/next/classify/findings+link/filter/sync),
`src/tests/ui/documents-workspace.test.tsx` (both locales: single h1, groups, view switch **preserves the
search filter**, side panel opens without navigation + a cross-entity finding with a "Go to Trip" link),
`src/tests/ui/segmented-control.test.tsx` (selection + arrow-key roving focus + `aria-checked`).

### Known limitations / next
- Visual verification was via bilingual render tests, not a browser (no connected Chrome). Re-verify at
  1440/834/390 × light/dark × tr/en — hero above the fold, Sheet full-height on mobile, long TR labels.
- Card view-models are rebuilt on each dossier change; `DocumentCard`/`DocumentRow` are memoized but the
  per-render `dates`/`onOpen` props limit memo hits. For hundreds of documents, add row virtualization and
  stabilize per-doc callbacks (noted as future).
- Verification is a single `verified` boolean (no verifier/date); attachments are out of scope (text
  `fileReference` only). Template sync is additive; "no longer applicable" items are surfaced, not deleted.

## Iteration 9 handoff (2026-07-25) — Dashboard redesign (command center)

Reworked the dashboard from a widget grid that read like an analytics panel into a **command center**
that answers *what should I do next?* on sight. Architecture (pure adapter + prop-driven widgets,
ADR-017) was kept; the change is IA + a few pure-model additions. No schema/import-export change.

### Model (`src/features/dashboard/dashboard-model.ts`)
Added to `ApplicationDashboardModel`: `greetingName` (given name only, else null → neutral),
`documentsBreakdown: DocumentBuckets5` (**reuses** `buildDocumentBuckets5` from the Documents feature —
one-directional import, no cycle), `nextMilestone` (nearest upcoming timeline item), and `snapshot:
SnapshotItem[]` (live present-tense facts, no history/timestamps, event-stream-shaped — ADR-021). New
pure `dashboardFindingLink(finding)` (maps `documents.*`→/documents, `applicant.*`→/applicant,
`trip.*`/`appointment.*`→/trip; distinct from the Documents workspace's `findingLink`) and
`buildDossierSnapshot(input)`.

### Widgets (`src/components/dashboard/`)
- **Removed** `MetricsRow` (the 4-KPI strip — ADR-022), `NextActions` (list), `ValidationSummary`.
- **`ReadinessHero`** — now the single dominant indicator: large ring + verdict + next-milestone line
  (CTA moved out). **`NextAction`** (new) — one task + reason + effort + single CTA, calm "all done"
  state. **`ConsistencyHealth`** (replaces ValidationSummary) — counts + top findings each with a
  "Go to fix" deep-link. **`DocumentsSummary`** — five buckets (ready/needsUpdate/requested/missing/
  optional) from `documentsBreakdown`. **`DossierSnapshot`** (new) — live snapshot, populated + empty.
  **`TripSummary`** gains an "Open trip planner" link. Shared `timeline-labels.ts` holds the timeline
  title/icon/tone maps (used by hero + `UpcomingTimeline`). `DashboardSkeleton` reshaped to the new grid.

### Page (`src/pages/DashboardPage.tsx`)
Greeting `h1` + eyebrow (country · visa type · preparation status); hero row (`lg:grid-cols-5`:
readiness 3 / next action 2); content grid (`lg:grid-cols-3`: timeline + consistency health / documents
+ trip + snapshot); source note. Empty state is an inviting first-run (Start Greece + explore link +
privacy note + import guidance) rather than a blank page.

### i18n (`dashboard.json` both locales, tr/en parity kept)
Added `greeting.*`, `hero.nextMilestone*`, `nextAction.*` (reason/effort per ActionKind),
`consistencyHealth.*` (replaces `validationSummary.*`), `documentsSummary.{requested,optional,openWorkspace}`,
`snapshot.*`, `tripSummary.viewAll`, `getStarted.{explore,privacyNote}`. Removed the now-unused
`metrics.*` and stale `hero`/`nextActions` keys. Playground demos updated (no new row keys).

### Gates (this iteration)
`format:check` ✓ · `lint` 0 errors / 50 warnings (baseline) · `typecheck` ✓ · `test` **158/158**
(153 + 5 new) · `build` ✓ (DashboardPage lazy ~1.5 kB gzip; shared dashboard widget chunk ~6.6 kB gzip;
main index ~108.3 kB gzip, unchanged). Not committed, not pushed.

### Tests
`src/tests/dashboard/dashboard-model.test.ts` — `dashboardFindingLink`, `buildDossierSnapshot` (derives
facts / empty for bare dossier), `greetingName`, `documentsBreakdown`, `nextMilestone`.
`src/tests/ui/dashboard.test.tsx` — both locales: greeting is the single `h1`, readiness ring exposes the
percentage, one next-action CTA, five document buckets, snapshot facts; plus a GAP seed that surfaces a
consistency finding with a working "Go to fix" deep-link.

### Known limitations / next
- Visual verification was via bilingual render tests, not a browser (no connected Chrome). Re-verify at
  1440/834/390 × light/dark × tr/en — greeting + readiness above the fold, hero row wrapping on tablet.
- `DossierSnapshot` is a live snapshot, not a history; a real activity timeline needs persistence/event
  logging (ADR-021, ADR-006) — the item shape is ready for it.
- The empty-state "import" path is guidance to the header Import control (the import dialog lives in
  `AppLayout`); wiring a direct button would need shared state and was left out of scope.

## Iteration 10 handoff (2026-07-26) — Applicant experience redesign (guided onboarding)

Enriched the existing 5-step applicant wizard **in place** (kept the wizard; no restructure) so it feels
like premium onboarding: clearer step names, progressive disclosure, calm contextual guidance, a stronger
review/completion step, and Contact/Additional fields folded into the most relevant step. No schema,
import/export, or validation-logic change.

### Guidance layer (pure presentation, NOT validation)
`src/features/applicant/applicant-guidance.ts` — `deriveApplicantGuidance(applicant, now)` +
`guidanceForStep`. Info-only `GuidanceHint`s derived from current form state: passport expiring within
~6 months, passport issued ~9+ years ago, no previous Schengen (reassurance, ADR-016-safe), long travel
history. **Never a validation rule, never feeds `runValidation`/readiness, never a warning/error, never
blocks.** New reusable `src/components/ui/guidance-note.tsx` (`GuidanceNote`): calm, visually secondary,
dismissible, `role="note"` (not `alert`); demoed in `/playground`.

### Step changes (`src/components/applicant/*`)
- **PersonalInfoStep** → "Identity & contact": required identity always visible; **Contact** (email,
  phone, **address** — newly surfaced, autosaved as nested `address`, written only when non-empty) and
  **Additional** (residence, marital status, occupation) behind `Accordion` disclosure (auto-open when
  data exists).
- **PassportStep** → adds expiry/age `GuidanceNote`s (no field changes).
- **PreviousVisasStep / TravelHistoryStep** → Yes/No `SegmentedControl` disclosure. Non-destructive:
  `showEditor = declared === 'yes' || items.length > 0`, so existing entries can never be hidden/lost.
  "No" shows the reassurance/optional note.
- **ReviewStep** → completion header (identity/passport captured via `isPersonalComplete`/
  `isPassportComplete`), surfaces active guidance, adds an address line. Kept per-section jump-to-edit.
- **ApplicantPage** → clearer step titles via i18n only; shell, focus management, autosave unchanged.

### i18n (`applicant.json` both locales, parity kept)
Added `groups.*`, `disclosure.*`, `guidance.*` (+ `dismiss`), `fields.address*`, `review.complete*`/
`checkIdentity`/`checkPassport`/`address`; updated `steps.*` titles/descriptions; `playground.json` gains
`rows.guidanceNote`. Values stay raw/ISO → exported JSON unchanged & language-independent.

### Gates (this iteration)
`format:check` ✓ · `lint` 0 errors / 50 warnings (baseline) · `typecheck` ✓ · `test` **170/170**
(158 + 12 new) · `build` ✓ (ApplicantPage lazy ~5.6 kB gzip; `guidance-note` shared chunk ~0.8 kB gzip;
main index ~108.4 kB gzip, unchanged). Not committed, not pushed.

### Tests
`src/tests/features/applicant-guidance.test.ts` (pure: expiry/age/no-visa/long-history thresholds +
`guidanceForStep`). `src/tests/ui/applicant-wizard.test.tsx` extended: previous-Schengen Yes/No reveals
the editor (and "No" shows reassurance); a soon-expiring passport surfaces a dismissible note; the
add-a-visa flow now clicks "Yes" first (proves no data loss). Both locales; still one h1, no Save button.

### Known limitations / next
- Guidance is a live snapshot of current state (no persistence); dismissals are per-session only.
- Previous passports remain unsurfaced by design (future advanced-workflow iteration).
- Verified via bilingual render tests, not a browser — re-verify at 1440/834/390 × light/dark × tr/en
  (accordion disclosure, Yes/No gates, long Turkish guidance copy).

## Iteration 11 handoff (2026-07-27) — Trip planner redesign + CountryCombobox

Deepened the Trip wizard into a calm itinerary workspace and introduced a shared searchable country
selector, adopted in Trip AND Applicant. **No schema, import/export, or validation-outcome change.**

### Baseline recorded
`format:check` ✓ · `lint` 0/50 ✓ · `typecheck` ✓ · `test` **170/170 warm** (cold first-run flaked on 2
heavy-transform tests — known, passes warm) · build main index ~108.4 kB gzip.

### Country selection (ADR-023)
`src/lib/countries.ts` — persist ISO alpha-2 only; localize via cached `Intl.DisplayNames` (tr-TR/en-GB),
bundle only the ISO code list (no country names in i18n JSON, no new dependency). `getCountryName`,
`getCountryOptions`, `searchCountries` (name + code, Turkish-aware normalize, exact-code ranked first,
unknown/no-Intl → raw code), `useCountryName`. New `src/components/ui/country-combobox.tsx` (Popover +
filtered listbox, keyboard, clear, empty state; demoed in `/playground`). Adopted in Trip (firstEntry,
mainDestination, route-stop country) and Applicant (nationality, residence, address, issuing, prev-visa,
travel-history) — same stored codes, so imports/exports are unchanged.

### Route/date semantics (ADR-024)
`src/features/trip/route-dates.ts` — the date pair is canonical, `nights` derived (`computeNights`,
`stopNights`, `syncStopNights` on write, `tripNights`, `totalRouteNights`, `maxStopNights`,
`routeCoverage`). Consolidated math previously duplicated in `trip-model.ts` + `RouteBuilder`. Legacy
routes read, never mutated on load. Validation untouched (still sums stored `nights`); coverage UI is
presentation only.

### Trip step enrichment
`TripDateSummary` (derived "7 nights · 8 days", sr-announced), `CoverageSummary` (calm status row).
RouteStep + RouteBuilder use `CountryCombobox` + route-dates + a coverage indicator; TripDatesStep leads
with the date summary; AccommodationStep surfaces the accommodation coverage finding with a jump; the
review step gained per-section status badges (captured/incomplete/needs review) and finding jump-to-fix;
`trip-guidance.ts` adds calm info-only route/reservation hints. TripPage reads optional `?step=<id>`
(existing `/trip` links still work; Dashboard/Documents untouched).

### i18n
`common.json` `countryCombobox.*`; `trip.json` `dateSummary.*`, `guidance.*`, `route.coverage.*`,
`accommodation.coverage.full`, `review.status.*`, `review.insights.goToFix`, `why.firstEntry` (both
locales, parity kept); `playground.json` `rows.countryCombobox`. `visa-domain:countries` NOT expanded.

### Gates (this iteration)
`format:check` ✓ · `lint` 0 errors / 50 warnings ✓ · `typecheck` ✓ · `test` **199/199** (170 + 29 new)
· `build` ✓ (TripPage lazy ~10.0 kB gzip; main index ~108.7 kB gzip, +~0.34 kB, no new dep). `git diff
--check` clean. Not committed, not pushed.

### Tests
Pure: `route-dates` (nights/days, coverage match/under/over, legacy sync), `countries` (tr/en labels,
name+code + Turkish search, unknown→code, ISO persistence), `trip-guidance` (info-only, stage filter).
Render: `country-combobox` (localized label, stores ISO, keyboard select, empty state); `trip-planner`
extended (`?step=` deep-link, review status + finding jump-to-fix); `route-builder` + `applicant-wizard`
updated to drive the combobox. Existing suites green.

### Known limitations / next
- Transport/accommodation optional `country` fields are still not surfaced in their forms (combobox is
  wired only where a country input already existed); a future pass could add them.
- Cities remain free text (no city database, by design).
- No browser pass (no connected Chrome) — re-verify at 1440/390 × tr light/dark + en: combobox open/
  filter/keyboard, route editing, coverage states, long Turkish labels.

## Iteration 12 handoff (2026-07-27) — Validation Center redesign

Transformed the **Consistency Checks** page from a compiler-style error list (three count cards,
raw `Error`/`Warning`/`Info` badges, an accordion of findings with raw `relatedFields` chips) into
a calm **dossier review workspace**. No dossier-schema, import/export, or validation-outcome change —
findings, severities and counts come verbatim from `runValidation`.

### Baseline recorded (real, from code)
`format:check` ✓ · `lint` 0 errors / 50 warnings ✓ · `typecheck` ✓ · `test` **199/199** (24 files)
· build main index ~108.7 kB gzip. (`docs/project-context.md` referenced by the brief does not
exist — it was removed in Iteration 5 and merged into `vision.md`.)

### Architecture — pure adapter over the engine (ADR-025)
`src/features/validation/` (all pure, unit-tested, React-free):
- `finding-presentation.ts` — `categoryForRuleId`/`areaForRuleId` (classify by stable ruleId, not
  prose), `healthFromSeverities`, calm `SEVERITY_LABEL_KEY`/`HEALTH_LABEL_KEY`, tone maps.
- `finding-actions.ts` — `findingAction(finding)` deep-link; trip/insurance/accommodation →
  `/trip?step=<step>`, passport → `/applicant?step=passport`, plus `/documents`/`/employment`/
  `/sponsors`, with a relatedFields fallback so no rule is ever a dead end.
- `validation-model.ts` — `buildValidationModel`/`useValidationModel`: a review hero
  (completion% via the Documents feature's `buildDocumentBuckets5`, checks passed, attention count,
  one next recommendation), findings grouped by domain (`CategoryGroup` with worst-severity health),
  a per-area review summary (`captured`/`needsReview`/`incomplete`; core areas always shown,
  employment/sponsors only when relevant), and the ready subset. Re-encodes no rule.

### Components (`src/components/validation/`, prop-driven, in `/playground`)
`ValidationHero` (ReadinessRing + calm verdict + counts + next-step CTA), `FindingCard`
(what/why/how + "Take me there"), `FindingGroup` (collapsible domain section, `aria-expanded`,
category icon + health badge), `ReadinessSummary` ("what already looks good"), `ReviewProgress`
(section-by-section status). Severity/health render as calm labels; even blocking findings use the
amber tone, never a red wall. `ConsistencyChecksPage` is now a thin composition over the model.

### Sanctioned cross-page touch
`ApplicantPage` gained the same optional `?step=` deep-link reader `TripPage` already had, so a
passport finding lands on the passport step. Same pattern, ~12 lines, additive. `/consistency-checks`
route and all existing `/trip`, `/applicant` links still work; Dashboard/Documents/Trip unchanged.

### i18n (`validation.json` `center.*`, both locales, parity kept)
`center.{title,subtitle,disclaimer}`, `hero.*` (verdict/headline/counts/next), `categories.*`,
`areas.*`, `health.*`, `severity.*`, `finding.*`, `ready.*`, `review.status.*`, `guidance.*`,
`actions.goThere`. `playground.json` `sections.validation` + blurb. Values stay raw/ISO → exported
JSON unchanged.

### Gates (this iteration)
`format:check` ✓ · `lint` 0 errors / 50 warnings ✓ · `typecheck` ✓ · `test` **217/217** (199 + 18
new, 26 files) · `build` ✓ (ConsistencyChecksPage lazy ~0.49 kB gzip; main index ~109.2 kB gzip,
+~0.5 kB, **no new dependency**). `git diff --check` clean. Not committed, not pushed.

### Tests
`src/tests/features/validation-model.test.ts` — category/area mapping, health, deep links (incl.
`?step=`), empty/no-data, all-clear (captured areas), with-findings (grouping, hero verdict + next
recommendation, per-area needsReview/incomplete). `src/tests/ui/validation-center.test.tsx` — both
locales: no-dossier state, single h1 + review hero + section summary, and an insurance-gap seed that
surfaces a Trip group with a working `/trip?step=insurance` jump-to-fix.

### Known limitations / next
- No `finance`/`timeline` rules exist yet, so those two categories never render (the union is
  forward-compatible). Employment/sponsor rules are sparse.
- Guidance/health are a live snapshot; nothing persisted.
- No browser pass (no connected Chrome) — re-verify at 1440/390 × tr light/dark + en: hero wrap,
  group collapse, long Turkish health labels, ready chips, the section summary.

## Iteration 13 handoff (2026-07-27) — Employment experience redesign

Turned the flat Employment form (a Save-button CRUD screen that only revealed employer fields for the
`employed` status) into a calm, guided **employment-dossier workspace**. No dossier-schema,
import/export, or validation-outcome change — every field already existed on `EmploymentSchema`.

### Baseline recorded (real, from code)
`format:check` ✓ · `lint` 0 errors / 50 warnings ✓ · `typecheck` ✓ · `test` **217/217** (26 files) ·
`build` main index ~109.21 kB gzip. (`docs/project-context.md` referenced by the brief does not exist —
removed in Iteration 5, merged into `vision.md`.)

### Architecture — pure adapters (ADR-026), `src/features/employment/`
- `employment-wizard.ts` — `EMPLOYMENT_STEP_IDS` (status·employer·income·leave·documents·review) +
  status-aware `deriveStepStatuses` (non-employer statuses mark employer/income/leave/documents
  complete, so the rail never nags).
- `employment-tenure.ts` — `computeTenure(startDate, now?)` (derived, never stored; future/missing/
  <1-month/exact-year/partial).
- `employment-guidance.ts` — info-only `EmploymentGuidanceHint`s (employer-name match, net-vs-gross,
  salary consistency, company-docs-supporting, leave-dates-match-trip; reassurance for non-employers).
- `employment-documents.ts` — `buildEmploymentDocuments` (employment-only buckets via
  `buildDocumentBuckets5` + `applicableRequirements`, per-requirement rows with real doc ids or
  `not_instantiated`, `hrRequests` = applicable *missing* only) + `hrClipboardText` (names only).
- `employment-model.ts` — `buildEmploymentModel`/`useEmploymentModel`: tenure, leave coverage (from
  `employment.leaveCoversTrip` findings, never re-derived, vs canonical Trip dates), document view,
  per-section review (captured/incomplete/needsReview/notApplicable). Pure, unit-tested.

### Components (`src/components/employment/`, in `/playground`)
Reusable: `EmploymentStatusSelector`, `EmploymentTenure`, `LeaveCoverageSummary`,
`EmploymentDocumentsSummary`, `HrRequestChecklist` (accessible Copy — localized names only, inline
sr-announced feedback, focus preserved, hidden when nothing missing), `EmploymentReview`. Step
components (Status/Employer/Income/Leave/Documents/Review) use controlled inputs + `updateEmployment`
autosave (shallow merge → non-destructive on status change), no Save button. `EmploymentPage` is a thin
shell mirroring Trip/Applicant: `PageHeader` + `Stepper` + focus-to-h2 + `?step=` reader.

### Sanctioned cross-page deep-links (additive)
- `finding-actions.ts` — `employment.leaveCoversTrip` findings → `/employment?step=leave`.
- `DocumentsPage.tsx` — additive `useSearchParams`: `?category=` seeds the filter once, `?doc=` drives
  the detail Sheet (Back/Forward-safe; close removes only `doc`; unknown id renders normally, no crash;
  no params → byte-for-byte the old behavior). Employment links use `/documents?category=employment`
  (+ `&doc=<realId>` when instantiated; category-only + named requirement otherwise). Dashboard,
  Applicant, Trip, Validation untouched.

### Product guarantees
No schema change (net-only income kept honest, no gross field); employment fields vs employment
documents stay separate (Documents is the single status store); guidance never affects readiness or a
finding; non-employed applicants see calm not-applicable states, never employment errors; no approval
prediction, no "strength" score (ADR-016). `employerDetails`, `socialSecurityNumber`/`taxId` (beyond an
optional disclosure) and total career experience are intentionally out of scope / unmodeled.

### i18n
`employment.json` expanded in both locales (wizard/nav/steps/status.context/fields/tenure/why/guidance/
notApplicable/leave/documents+hr/review) with tr/en parity; `playground.json` `sections.employment` +
blurb + row labels. Enum labels reuse `visa-domain:employmentStatus.*`. Values stay raw/ISO → exported
JSON unchanged.

### Gates (this iteration)
`format:check` ✓ · `lint` 0 errors / 55 warnings (baseline 50; +5 acceptable — test `!` assertions +
new react-refresh component files) · `typecheck` ✓ · `test` **251/251** (217 + 34 new, 32 files) ·
`build` ✓ (EmploymentPage lazy ~2.66 kB gzip; DocumentsPage ~6.73 kB gzip; main index ~109.38 kB gzip,
+~0.17 kB, no new dependency). `git diff --check` clean. Not committed, not pushed.

### Tests
Pure: `employment-wizard` (steps, status-aware statuses, completeness), `employment-tenure` (all cases),
`employment-guidance` (info-only, step filter, reassurance), `employment-model` (employment-only
buckets, HR = missing applicable only / ready excluded, `hrClipboardText` tr+en names-only, leave
coverage full/starts-late/ends-early/no-trip, non-employed notApplicable). Render: `employment-page`
(both locales single h1 + no Save button, `?step=leave` deep-link, non-employed calm state, HR Copy
writes localized names + accessible feedback, no-dossier), `documents-deeplink` (`?category=` init,
`?doc=` opens panel, unknown id no crash, no-param backward-compat). `finding-actions` assertion updated.

### Known limitations / next
- `EmployerDetails` (company registry/tax/address) is unsurfaced — company records are tracked as
  Documents; a future pass could edit them (needs a provider action).
- Salary bank is free text (no bank dataset, by design); a future bank selector is possible.
- No browser pass (no connected Chrome) — re-verify at 1440/390 × tr light/dark + en: status disclosure,
  tenure wording, leave-vs-trip comparison, HR list + copy, review, long Turkish employer/document names.

## Iteration 14 handoff (2026-07-27) — Finance experience redesign (Financial Evidence Workspace)

Turned the flat Finance form (a Save-button CRUD screen that only revealed personal-finance fields for
`self`/`mixed`, hard-capped the currency list, and carried hardcoded English strings) into a calm,
guided **Financial Evidence Workspace**. No dossier-schema, import/export, or validation-outcome change —
every field already existed on `FinancingSchema` / `SponsorSchema`.

### Baseline recorded (real, from code)
`format:check` ✓ · `lint` 0 errors / 55 warnings ✓ · `typecheck` ✓ · `test` **251/251** (32 files) ·
`build` main index ~109.38 kB gzip.

### Architecture — pure adapters (ADR-027), `src/features/finance/`
- `finance-wizard.ts` — `FINANCE_STEP_IDS` (source·personal·sponsors·documents·consistency·review) +
  source-aware predicates (`personalApplies`/`sponsorApplies`/`employerApplies`) + `deriveStepStatuses`
  (non-applicable steps count complete; takes an explicit `sponsorCount` since sponsors live on the
  dossier, not the application).
- `finance-documents.ts` — `financeDocGroup` (Bank/Income/Sponsor/Employer/Other; income by code even
  when category is `financial`), `buildFinanceDocuments` (finance-only buckets via `buildDocumentBuckets5`
  + `applicableRequirements`; grouped rows; `gather` = applicable *missing* rolled into Personal/Sponsor/
  Employer), `financeClipboardText` (grouped, names only).
- `finance-guidance.ts` — info-only `FinanceGuidanceHint`s (what bank statement / sponsor letter /
  employer coverage / employment income demonstrate), source-gated.
- `finance-consistency.ts` — `deriveConsistency` → *factual* observations only (employment-income-supports,
  no-income-on-record, bank-statement-pending, mixed-who-covers, employer-covers); rule-based issues are
  surfaced from findings, never re-derived. No threshold/strength/prediction.
- `finance-model.ts` — `buildFinanceModel`/`useFinanceModel`: source, personal snapshot, read-only income
  overview, sponsors summary (per-sponsor `sponsor.*` findings), documents view, consistency (dossier-level
  findings + observations), per-section review. Filters `runValidation` to `sponsor.*`.

### Components (`src/components/finance/`, in `/playground`)
Reusable: `FundingSourceSelector` (Radix Select over all 4 sources — chosen over a segmented row for the
long bilingual labels), `IncomeOverview` (read-only, links to Employment), `SponsorSummaryCard` (read-only,
links to `/sponsors?sponsor=<id>` + `/documents?category=sponsor`), `FinanceDocumentsSummary` (grouped +
per-doc deep-links), `FinanceGatherChecklist` (grouped accessible Copy — localized names only, inline
sr-announced feedback, focus preserved, hidden when empty), `FinanceReview`. Step components
(Source/Personal/Sponsors/Documents/Consistency/Review) autosave via `updateFinancing` (shallow merge →
non-destructive on source change), no Save button. `FinancePage` is a thin shell mirroring
Employment/Trip: `PageHeader` + `Stepper` + focus-to-h2 + `?step=` reader.

### Sanctioned cross-page deep-links (additive)
- `finding-actions.ts` — `sponsor.requiredForSponsoredFunding` → `/finance?step=sponsors`; `financing.`
  field fallback → `/finance?step=source`; per-sponsor `sponsor.*` findings still → `/sponsors`.
- `SponsorsPage.tsx` — additive `useSearchParams`: `?sponsor=<id>` opens that sponsor's existing edit
  dialog pre-filled (seed-once ref; opening deferred via `queueMicrotask` to satisfy the
  set-state-in-effect rule; closing clears only `sponsor`; unknown id ignored; no param → byte-for-byte
  the old behavior). Dashboard, Applicant, Trip, Employment, Validation Center untouched.

### Product guarantees
No schema change; account balance is *recorded, never judged* (no threshold/sufficiency/strength/source
ranking / "more money helps"); employment income is *read* from Employment, never copied; financing fields
vs financial documents stay separate (Documents is the single status store); sponsors are summary +
deep-link only (editing owned by `/sponsors`, no second sponsor store); guidance/consistency never affect
readiness or predict an outcome (ADR-016). All four `source` values stay editable so imported
`employer`-funded dossiers are never stranded.

### i18n
`finance.json` expanded in both locales (wizard/nav/steps/source.context/personal/income/sponsors/
documents+groups+gather/consistency/guidance/why/notApplicable/review) with tr/en parity; `playground.json`
`sections.finance` + blurb + row labels. Enum labels reuse `visa-domain:financingSource.*`. Values stay
raw/ISO → exported JSON unchanged.

### Gates (this iteration)
`format:check` ✓ · `lint` 0 errors / 59 warnings (baseline 55; +4 acceptable — test `!` assertions) ·
`typecheck` ✓ · `test` **308/308** (251 + 57 new, 39 files) · `build` ✓ (FinancePage lazy ~2.64 kB gzip;
shared FinanceReview chunk ~4.98 kB gzip; SponsorsPage ~1.84 kB gzip; main index ~110.21 kB gzip,
+~0.83 kB, no new dependency). `git diff --check` clean. Not committed, not pushed.

### Tests
Pure: `finance-wizard` (steps, source-aware statuses, predicates), `finance-documents` (group mapping,
finance-only buckets, gather grouping, `financeClipboardText` grouped/privacy-safe/empty),
`finance-consistency` (per-source observations, no numeric params), `finance-guidance` (info-only, step
filter), `finance-model` (self/sponsor/employer review states, funding finding → consistency, per-sponsor
findings on the card, imported employer dossier editable). Render: `finance-page` (both locales single h1
+ no Save button, `?step=sponsors` deep-link, not-applicable personal for sponsor funding, grouped Copy
list accessible + privacy-safe, non-destructive source switching via a provider probe, no-dossier),
`sponsors-deeplink` (`?sponsor=` opens pre-filled editor, unknown id no crash, no-param backward-compat).
`validation-model` assertions updated for the new finance routes.

### Known limitations / next
- Greece pack keys sponsor documents on `financing.source == 'sponsor'` only, so `mixed` funding doesn't
  surface sponsor-document *requirements* via `applicableRequirements` (the funding rule still flags it,
  and the consistency step catches it). Fixing the pack would change readiness outcomes — out of scope.
- `application.sponsorIds` remains unwired (single-app MVP); Finance reads `dossier.sponsors` directly.
- No employer-coverage document requirement exists in the pack, so employer-funded evidence surfaces only
  as employer company records + bank statement; a dedicated "employer covers costs" requirement is future.
- No browser pass (no connected Chrome) — re-verify at 1440/390 × tr light/dark + en: source disclosure
  across all four sources, income overview, sponsor summary + deep-links, grouped documents + Copy list,
  consistency tones, review, long Turkish document/group labels.

## Iteration 15 handoff (2026-07-27) — Sponsors experience redesign (canonical sponsor workspace)

Turned the flat Sponsors list + 5-field CRUD dialog into the **canonical sponsor-management workspace**:
rich summary cards + a progressive editing Sheet + real per-sponsor evidence linking. No dossier-schema,
import/export, or validation-rule change — the only new "wiring" uses the existing (previously unpopulated)
`Sponsor.documentIds` field.

### Baseline recorded (real, from code)
`format:check` ✓ · `lint` 0 errors / 55 warnings ✓ · `typecheck` ✓ · `test` **308/308** (39 files) ·
`build` main index ~110.21 kB gzip. (Two-test flakiness appears only under heavy parallel load — clean
runs are green; verified again at the end.)

### Architecture — pure adapters (ADR-028), `src/features/sponsors/`
- `sponsor-documents.ts` — `isSponsorEvidence` (category `sponsor` or classified `RELATIONSHIP_PROOF`),
  `buildSponsorDocuments` → linked / eligibleUnlinked / **stale** / missingRequirements (from
  `applicableRequirements`) / counts. Resolves `Sponsor.documentIds` against `state.documents`.
- `sponsor-editor.ts` — `SPONSOR_SECTION_IDS` (9: basics·contact·employment·financial·assets·expenses·
  letters·documents·review), `isSectionComplete`, `firstIncompleteSection`, `isFamilyRelationship`.
- `sponsor-model.ts` — `buildSponsorsModel`/`useSponsorsModel`: per-sponsor readiness
  (ready/needsAttention/incomplete — a label, never a score), participation, documents view, `sponsor.*`
  findings (tied by `sponsors.<id>.*`), missing reasons, next action, stale flag; `needsSponsorButNone`.

### Components (`src/components/sponsors/`, in `/playground`)
Reusable: `SponsorRelationshipSelector` (all 13 relationships — old page had 8), `SponsorWorkspaceCard`
(rich summary + Edit/Remove), `SponsorDocumentLinker` (accessible link/unlink **checklist** + missing +
stale sections), `SponsorEditorSheet` (right-side Sheet, full-screen mobile; 9 autosave accordion sections
via `updateSponsor`, opens first-incomplete, per-section completion badge, in-header Remove; nested
investments/owned-assets reuse `CollectionEditor`), `RemoveSponsorDialog` (`AlertDialog`). `SponsorsPage`
is the workspace shell: header + first-sponsor onboarding empty state + card grid + editor Sheet
(controlled by `?sponsor=`) + remove dialog. No Save button anywhere.

### Per-sponsor evidence (the key decision, ADR-028)
`Sponsor.documentIds` was defined but **never populated** — so `documentCount` was always 0 and
`sponsor.hasDocuments` always fired. The workspace now **links/unlinks existing** sponsor-evidence
documents via `updateSponsor({documentIds})`: Documents stays the sole owner of creation/status/
verification/dates/notes/deletion; link never creates, unlink never deletes, removing a sponsor never
deletes docs; unknown/ineligible ids surface as **stale** (removable, no crash). `sponsor.hasDocuments`
resolving once real associations exist is correct data flow, not a rule change.

### Sanctioned cross-page deep-links (additive)
- `finding-actions.ts` — per-sponsor `sponsor.*` findings now → `/sponsors?sponsor=<id>` (parsed from
  `sponsors.<id>.*`); funding finding still → `/finance?step=sponsors`.
- `dashboard-model.ts` — sponsor snapshot item gains `to: '/sponsors'`; `dashboardFindingLink` maps
  `financing.` → `/finance`, `sponsors.` → `/sponsors`. Dashboard layout/outcomes unchanged.

### Product guarantees
No schema/import-export/rule change; readiness is an organizational label (no financial-strength score,
no asset comparison, no approval likelihood — ADR-016); balance/asset figures recorded, never judged;
Documents/Finance/Validation not duplicated; `application.sponsorIds` stays vestigial (surfaced as a
limitation, never corrupted).

### i18n
`sponsors.json` fully rewritten in both locales (header/empty-onboarding/fundingNudge/readiness/card/
missing/nextAction/editor.sections/fields/financial/assets+types/expenses/letters/documents-linking/
collection/remove) with tr/en parity; `playground.json` `sections.sponsors` + blurb + row labels. Enum
labels reuse `visa-domain:{sponsorRelationship,expenseType,employmentStatus,ownerType,documentStatus}.*`.

### Gates (this iteration)
`format:check` ✓ · `lint` 0 errors / 72 warnings (baseline 55; +17 acceptable — mostly test `!`
assertions) · `typecheck` ✓ · `test` **344/344** (308 + 36 new, 42 files) · `build` ✓ (SponsorsPage lazy
~4.09 kB gzip; main index ~110.29 kB gzip, +~0.08, no new dependency). Not committed, not pushed.

### Tests
Pure: `sponsor-documents` (eligibility, link/unlink, stale unknown+ineligible, missing requirements,
multi-sponsor + same-doc-multi-link, imported documentIds), `sponsor-editor` (section completeness,
first-incomplete), `sponsor-model` (readiness levels, **sponsor.hasDocuments resolves once linked**,
missing reasons, stale, needsSponsorButNone, multiple sponsors, label-not-score). Render
(`sponsors-deeplink.test.tsx`, 14): no-dossier, both-locales single-h1 + no-Save, first-sponsor
onboarding, card render, open from card + `?sponsor=`, unknown id no-crash, no-param, accordion nav,
**autosave**, Escape-closes, remove **cancel** keeps, remove **confirm** removes + **linked doc NOT
deleted** + **`?sponsor` cleared**. `validation-model` gains the per-sponsor `?sponsor=<id>` route.

### Known limitations / next
- `application.sponsorIds` is vestigial/unwired; removal can't clean it (no reducer action) — surfaced,
  not corrupted. A future pass could wire or drop it (drop = schema change → deferred).
- Sponsor documents keep `ownerId = applicant` (association is by `documentIds`, not owner); the
  `mixed` → sponsor-doc applicability gap (ADR-027) is unchanged; both are out of scope.
- No browser pass (no connected Chrome) — re-verify at 1440/390 × tr light/dark + en: card readiness/
  participation, the editor Sheet (focus trap, Escape, first-incomplete open, section switching, mobile
  full-screen drawer), the document linker (link/unlink/stale), safe removal, long Turkish labels.

## Iteration 16 handoff (2026-07-27) — Timeline experience redesign (actionable preparation plan)

Turned the passive Timeline (an inline-derived vertical date list with hardcoded status colours) into a
calm, actionable **visa-preparation plan** — a hero + three modes (Preparation plan · Key dates · Document
freshness). No dossier-schema, validation-outcome, readiness, import/export, or language-independence
change; no persistence, notifications, or calendar integration; **no Dashboard change**.

### Baseline recorded (real, from code)
`format:check` ✓ · `typecheck` ✓ · `build` ✓ (main index ~110.29 kB gzip) · `test` **344** (clean runs;
3 transient failures appear only under heavy parallel load) · `lint` 0 errors. Repo clean/committed.

### Architecture — pure adapters (ADR-029), `src/features/timeline/`
- `timeline-policy.ts` — normalizes the template's existing `preparationMilestones` (VisaFlow defaults,
  override-ready) into `TimelinePolicy`; shared-Schengen fallback; no invented source metadata.
- `timeline-tasks.ts` — `deriveTasks(input, now)`: target date = `appointment − leadDays`; status from
  real doc/validation state; **proximity bands** via exported `classifyBand` (Overdue/Today/ThisWeek/
  BeforeAppointment/AppointmentDay/BeforeTravel/Travel/Later; relative phases when no appointment). Two
  derived tasks (sponsor evidence; a pre-travel dossier-organisation task). Overdue = past + incomplete.
- `timeline-dates.ts` — `buildKeyDates`: fixed events (appointment/leave/trip/route/transport/
  accommodation/insurance/passport/doc-validity), sorted, ranges collapsed.
- `document-freshness.ts` — factual classes (needsUpdate/expiresBeforeAppointment/validThroughAppointment/
  issuedNoExpiry/noDates) + age (only when issued). No invented expiry/recency.
- `timeline-links.ts` — thin domain→route / type→route map (complements finding-actions).
- `timeline-model.ts` — composes hero/plan/keyDates/freshness/appointmentDay; **reuses the Dashboard's
  `deriveNextActions`/`buildDocumentBuckets`/`deriveReadinessState`** (imported, not modified).

### Components (`src/components/timeline/`, in `/playground`)
`TimelineHero` (countdown + prep-time + reused primary action + realism note), `TimelineModeSelector`
(`SegmentedControl`, `?mode=`), `PreparationPlan` (band groups), `PreparationTaskCard` (why-now + status +
`DateWindowBadge` + deep-link), `DateWindowBadge`, `KeyDatesTimeline` (past/upcoming), `DocumentFreshnessList`,
`AppointmentDaySummary` (read-only). `TimelinePage` is a thin shell (`?mode=` reader, default plan).

### Priority compatibility (reuse-only)
Hero primary action = `deriveNextActions(buildDocumentBuckets(documents), runValidation(dossier),
application)[0]`, with the Dashboard's own `dashboard:nextActions.*`/`nextAction.reason.*`/`hero.verdict.*`
wording + route. A test asserts equality with the Dashboard. Dashboard model/tests untouched. The
remaining duplicate *date* derivation (`buildTimeline` vs `timeline-dates`) is documented tech debt
(roadmap consolidation item).

### Product guarantees
Recommendations, not deadlines (VisaFlow-recommended language only); fixed events vs derived tasks are
separate models; tasks derived, never persisted (appointment-day is read-only, no checkbox state); factual
freshness (no invented expiry/recency); no notifications/calendar/email; no month/week/day calendar views;
no new dependency (date-fns v4 already present). Overdue is amber, never a red wall; status never by colour
alone.

### i18n
`timeline.json` fully rewritten both locales (hero/modes/plan bands+status/derived/keyDates/freshness/
appointmentDay/empty) with tr/en parity; `playground.json` `sections.timeline` + blurb + rows. Reuses
`visa-domain:milestones.*` (task titles/reasons), `visa-domain:{documentCategory,ownerType,documentStatus}.*`,
and `dashboard:nextActions.*`/`nextAction.*`/`hero.verdict.*` (hero). Stored values stay ISO.

### Gates (this iteration)
`format:check` ✓ · `lint` 0 errors / 71 warnings (baseline 72; all acceptable categories) · `typecheck` ✓ ·
`test` **378/378** (344 + 34 new, 48 files) · `build` ✓ (TimelinePage lazy ~1.91 kB gzip; main index
~110.33 kB gzip, +~0.04, no new dependency). Not committed, not pushed.

### Tests
Pure: `timeline-tasks` (target-date derivation; `classifyBand` for today/end-of-week/appointment-day/
overdue-incomplete/completed-past/before-travel/travel; no-appointment relative phases; status ready/
overdue/notApplicable), `timeline-dates` (chronological order, range collapse, past/upcoming),
`document-freshness` (every class, age only when issued, appointment-unknown, not-applicable skipped),
`timeline-links` (all domain/type routes + freshness link), `timeline-model` (**primary action ==
`deriveNextActions[0]`**, no-dossier / no-appointment / past-appointment, read-only appointment-day).
Render (`timeline-page`, both locales): single h1 + three modes; `?mode=dates`; mode switch → freshness;
no-dossier; appointment-day summary.

### Known limitations / next
- Duplicate timeline *date* derivation (Dashboard `buildTimeline` vs `timeline-dates`) — deliberate
  reuse-only this sprint; roadmap item to consolidate.
- The `appointmentDay`/`travel` bands are reachable but rarely populated by the current milestone set.
- Freshness is factual-only until templates gain verified freshness metadata (config + source).
- No browser pass (no connected Chrome) — re-verify at 1440/390 × tr light/dark + en: mode switching, long
  Turkish dates/labels, overdue treatment, task deep-links, empty/partial/complete states, freshness,
  appointment-day, focus.

## Iteration 17 handoff (2026-07-27) — Settings experience redesign (application control center)

Turned the read-mostly Settings page into the **application control center** — a responsive two-pane shell
(section rail + content) with sections for Appearance · Language · Country packs · Privacy · Local data ·
Import & export · About · Advanced. **Pure presentation**: no dossier-schema, import/export-format, storage,
or validation change; it reuses the existing services and provider actions. **No changes to any domain page
or the Dashboard.**

### Baseline recorded (real, from code)
`format:check` ✓ · `typecheck` ✓ · `lint` 0 errors · `test` **378/378** (48 files) · `build` ✓. Version
`0.1.0`; only two localStorage keys (`visaflow-theme`, `visaflow-locale`). Repo clean/committed.

### Architecture — pure adapter (ADR-030), `src/features/settings/`
- `settings-model.ts` — `SETTINGS_SECTION_IDS` (8) + `resolveSection` (invalid → `appearance`);
  `buildSettingsModel`/`useSettingsModel` deriving `packs` (from `getAllCountryConfigs`, honest
  `reviewStatus`, `isActive`), `active`, `localData` (hasData/counts/`isDirty`/`lastSaved`/two storage keys),
  and `about` (version constant + `SCHEMA_VERSION`). Pure, unit-tested.

### Components (`src/components/settings/`, in `/playground`)
Reusable: `SettingsSection` (flat `Section`+real-`h2` group, forwardRef for focus — no nested-card overload)
and `SettingRow` (label + description + control). Plus `SettingsNav` (rail on `lg:`, scrollable selector on
mobile; `aria-current`) and the eight section components. `SettingsPage` is a thin two-pane shell:
`PageHeader` (single `h1`) + `SettingsNav` + active section wrapped in `SettingsSection`; `?section=` reader;
focus-to-`h2` on section change.

### What stayed pure / reused
Theme (Light/Dark/System) + language (TR/EN) use `SegmentedControl` (there is no Switch); country packs
reuse `ReviewStatusBadge`/`SourceNote`; import/export reuse `downloadDossier`/`importPartial`/`readFileAsText`
+ `loadDossier`/`markSaved`/`reset` (no format/storage change); the active destination reuses
`updateApplication`. The load-bearing no-prediction disclaimer (ADR-016) is kept; the version is a documented
constant (no `package.json` shipped to the client). The AppLayout sidebar import/export quick-actions are
untouched.

### Product guarantees
No schema/storage/import-export/validation change; still exactly two localStorage keys; no new persisted
preference (Advanced is navigation, not a stored dev-mode flag); destructive/replacing actions (Reset,
import-replace) isolated behind `AlertDialog`; country packs informational + scale-ready, never implying
official endorsement. Fixes the old `h1→h3` heading gap (real `h2` per section) and the hardcoded English
theme labels.

### i18n
`settings.json` fully rewritten both locales (nav / appearance.theme.{light,dark,system} / language /
countryPacks / privacy / data / importExport / disclaimer / about / advanced) with tr/en parity;
`playground.json` `sections.settings` + blurb + rows. Reuses `common:sources.reviewStatus.*`, `visa-domain:`
country/visa names, `common:actions.cancel`.

### Gates (this iteration)
`format:check` ✓ · `lint` 0 errors / 71 warnings (baseline 71; all acceptable categories) · `typecheck` ✓ ·
`test` **396/396** (378 + 18 new, 50 files) · `build` ✓ (SettingsPage lazy ~3.93 kB gzip; no main-bundle
regression — the large `DossierProvider` shared chunk is pre-existing, not new; no new dependency). Not
committed, not pushed.

### Tests
Pure: `settings-model` (packs incl. Greece + honest `unverified` + `isActive`; `active`; `localData`
counts/two-keys; `about` version+schema; `resolveSection` valid/invalid). Render (`settings-page`, both
locales): single `h1` + the rail; works with no dossier; `?section=privacy` lands; invalid `?section=`
falls back; rail switching changes content; country packs show the honest review-status label; import/export
actions present; the isolated Reset confirm empties the dossier (via a probe).

### Known limitations / next
- One country pack (Greece, honestly unverified); the version is a constant to keep in sync with
  `package.json` on release; "unsaved changes" is in-memory only (no route/beforeunload guard).
- No browser pass (no connected Chrome) — re-verify at 1440/390 × tr light/dark + en: the rail vs mobile
  selector, section switching + focus, long Turkish labels, country packs, import/export + reset dialogs.

## Iteration 18 handoff (2026-07-28) — Onboarding & first-run experience (dedicated `/welcome` surface)

Turned first run from an accidental empty state into a deliberate **first-run product surface**: a dedicated
`/welcome` route hosting a calm **≤4-step guided setup** (Welcome → Language & destination → Create or import
→ Ready, ~1 min) that gets a brand-new user to create (or import) their first dossier, then hands off to the
Dashboard. **Pure presentation**: no dossier-schema, import/export-format, storage, or validation change; it
reuses the wizard architecture, the import/export services, and provider actions. **No persistence added** —
entry is derived from `hasData` alone.

### Baseline recorded (real, from code)
`format:check` ✓ · `typecheck` ✓ · `lint` 0 errors · `test` **396/396** (50 files) · `build` ✓. Only two
localStorage keys (`visaflow-theme`, `visaflow-locale`).

### Architecture — pure adapter (ADR-031), `src/features/onboarding/`
- `onboarding-model.ts` — `ONBOARDING_STEP_IDS` (welcome/setup/create/ready) + `resolveStep` (invalid →
  `welcome`); positional `deriveOnboardingStepStatuses(current)`; **`firstRunTarget(hasData)`** (`/welcome`
  vs `/dashboard` — the index-route decision); `DEFAULT_DESTINATION_COUNTRY = 'GR'` (single source, replaces
  the old page-local literal). Pure, unit-tested.

### Components (`src/components/onboarding/` + page)
`OnboardingWelcomeStep` (value prop + the three promises — privacy / no-prediction / autosave — reusing the
Settings `disclaimer.noPrediction`/`privacy.*` keys; get-started + **"Explore first"** escape),
`OnboardingSetupStep` (language `SegmentedControl` + `CountryCombobox`, honest "Greece is the available pack"
note), `OnboardingCreateStep` (create via `initializeEmpty` / import via `readFileAsText`→`importPartial`→
`loadDossier` / example), `OnboardingReadyStep` (Dashboard/Documents/Validation one-liners + continue).
`WelcomePage` is a thin Stepper two-pane shell: `PageHeader` (single `h1`) + rail + step body keyed by
`?step=` **synced to the URL** (Back/Forward), focus-to-`h2` on change, mount-time "already have a dossier"
guard (captured via `useState`, not a ref — read during render) that offers a calm "continue" instead of
restarting. The shared **`NoDossierState`** is upgraded into the one canonical empty-workspace surface
(injectable title/description/icon/section/hint + start→`/welcome` / import→`/welcome?step=create` /
how-it-works→`/settings?section=privacy`); a second variant is demoed in `/playground`.

### What stayed pure / reused
Reuses the wizard pattern (`Stepper`, `?step=`, focus) + `EmptyState`/`GuidanceNote`/`CountryCombobox`/
`SegmentedControl`/`Button`; create/import reuse `initializeEmpty` + the import/export services (no format
change); reassurance copy reuses the Settings disclaimer/privacy keys. Router integration is minimal:
`FirstRunRedirect` (index, on `hasData`) + the lazy `/welcome` route; the Dashboard empty state is repointed
to `/welcome` (its only change). No domain workspace page or validation file was touched — the eight empty
workspaces change only through the shared `NoDossierState`.

### Product guarantees
No schema/storage/import-export/validation change; still exactly two localStorage keys; **no
onboarding-completed flag / no new key** (a skipped, dossier-less user seeing `/welcome` again after a refresh
is by design, consistent with the in-memory model); the no-prediction disclaimer (ADR-016) is surfaced on the
welcome step; only the index route redirects (no global hard redirect — every workspace route stays reachable);
`?step=` is additive with a safe fallback and working Back/Forward.

### i18n
New `onboarding.json` namespace both locales (title/description · nav · stepper · actions · welcome · setup ·
create · ready · existing) with tr/en parity, registered in `src/i18n/index.ts`. Extends `common:noDossier.*`
with `startAction`/`importAction`/`learnAction`. Reuses `settings:disclaimer.noPrediction`/`privacy.*` and
`visa-domain:` country names. Stored values unchanged; exported JSON untouched.

### Gates (this iteration)
`format:check` ✓ · `lint` 0 errors / 58 warnings (all acceptable categories) · `typecheck` ✓ · `test`
**417/417** (396 + new; 53 files) · `build` ✓ (`/welcome` a lazy chunk; no new dependency). Not committed,
not pushed. Note: under heavy parallel load a few pre-existing tests can flake (design-system timeouts, and
occasional vitest "failed to start forks worker" for finance/employment); they pass on a clean/less-parallel
run.

### Tests
Pure: `onboarding-model` (resolveStep valid/invalid, stepIndex, positional statuses, `firstRunTarget` both
branches, default country). Render (`welcome-page`, both locales): single `h1` + the step rail; `?step=create`
deep-link lands; invalid `?step=` falls back to welcome; Get-started→Back navigation; **"Explore first"** →
`/dashboard`; **create** → Probe `has-applicant` yes + lands on Ready; import path present; **no new storage
keys** after the create flow; a dossier at mount → the calm "continue" panel (no rail). Routing
(`first-run-routing`): root `/` → `/welcome` (no dossier) / `/dashboard` (dossier) via the real
`FirstRunRedirect`; the shared `NoDossierState` primary CTA links to `/welcome`. Updated the Dashboard
empty-state test to the new `/welcome` link.

### Known limitations / next
- One country pack (Greece); entry is `hasData`-only, so onboarding completion is not remembered across a
  refresh (by design — no persistence); "unsaved changes" remains in-memory only.
- No browser pass (no connected Chrome) — re-verify at 1440/390 × tr light/dark + en: the 4-step flow, the
  language/country step, create/import/example, "Explore first", the "already have a dossier" panel, and
  focus movement on step change.

## Iteration 19 handoff (2026-08-15) — Final Review & submission experience (`/review`)

Added the workspace that turns the dossier into an understandable, submission-ready package: **Final Review**
("Son Kontrol"), the specialist's last look before the appointment. It answers a deliberately *different*
question from the Validation Center — *"what do I have, what am I still missing, what do I bring, and am I
organised for the day?"* rather than *"what is inconsistent?"* **Composition only**: no dossier-schema,
import/export, storage, validation-outcome or readiness change; no new persistence; no PDF; no fake Print
button. **No existing page was modified** except one `export` keyword in `timeline-model.ts`.

### Baseline recorded (real, from code, before any change)
`format:check` ✓ · `lint` 0 errors / 58 warnings · `typecheck` ✓ · `test` **417/417** (53 files, clean 32s run)
· `build` ✓ (`index` 259.75 kB / 80.08 kB gzip; `DossierProvider` shared chunk 423.58 kB / 131.61 kB gzip).
Repo clean on `main` at `ac0867a` (ADR-031).

### Two product forks resolved with the maintainer before implementation
1. **Print package scope** → *"Both, clearly separated."* Section G carries two explicitly different concepts,
   never blended: VisaFlow-generated sheets, and the applicant's physical dossier.
2. **Naming** → *Final Review / Son Kontrol* at `/review` (the Validation Center's page title is already
   "Dossier review" / "Dosya incelemesi"; nav order is Consistency Checks → Final Review → Notes).

### Architecture — pure adapters (ADR-032), `src/features/review/`
- `review-checklist.ts` — the **single** checklist derivation behind both the item-level list and the physical
  plan. Maps the 12 `DocumentCategory` values onto 9 hand-over groups; rows come from the applicant's own
  documents **and** the applicable template requirements (deduped by `code`, dossier record wins). `status` is
  `Document.status` verbatim + `not_instantiated`; the five-way `state` is a documented *presentation grouping*
  (`received`/`needs_update` → needsAttention), never a new status system. Expiry-before-appointment reuses
  `classifyFreshness`.
- `review-summary.ts` — the cover-sheet facts (applicant, passport, destination, visa type, dates, derived
  nights via `tripNights`, appointment, funding, employment, sponsors-when-relevant), each with the workspace
  that owns it. Honest `null`s; blank strings count as absent.
- `review-print.ts` — the honest split. `GeneratedSheet` is `{ id, state, itemCount? }` over a **closed** id
  union, so it has **no field capable of carrying a document code, id or title** — an external document cannot
  become a VisaFlow-generated sheet even by mistake (asserted by test). `physicalBundles` are a **roll-up** of
  the same checklist (bundle + counts + readiness), because the item-level detail already lives in section C.
- `review-model.ts` — composes it. Calls `buildValidationModel()` **whole** (not `runValidation` again), so
  counts cannot diverge from the Validation Center; readiness is `buildDocumentBuckets` + `deriveReadinessState`;
  the highlighted action is `deriveNextActions(...)[0]`; appointment-day readiness is the Timeline's
  `buildAppointmentDay` (exported for reuse — its only change).

### Components (`src/components/review/`, in `/playground`)
`ReviewHero`, `ApplicationSummary` (DataList cover sheet, always passes an explicit localized value so the
primitive's English "Not provided" fallback is never reached), `SubmissionChecklist` + exported `ChecklistGroup`,
`AttentionSection` (reuses the Validation Center's `FindingCard` and its localized prose), `AppointmentPrep`
(reuses `timeline:appointmentDay.*` labels), `PrintPackage`, `state-meta`. `ReadinessSummary` is reused as-is for
"what already looks good". `ReviewPage` is a thin shell. `/playground` gains a `review` section demoing the two
prop-driven widgets.

### Product guarantees
No schema/import-export/storage/validation change; still exactly two localStorage keys; **no new readiness
number, no new finding count, no second document-status store**; missing documents are `neutral`, never a red
wall; status is never colour-alone; readiness is captioned as organisational and explicitly not a prediction
(ADR-016). **No invented embassy procedure**: "at the appointment" shows only what the applicant recorded plus
the pack's own three `notesKeys`, and there is deliberately **no fabricated after-submission checklist** — just
an honest statement that VisaFlow does not submit, track, or receive a decision.

### i18n
New `review.json` namespace both locales (title/subtitle · hero · summary · checklist · attention ·
appointmentPrep · print.generated / print.physical / print.state · looksGood · disclaimer) with tr/en parity,
registered in `src/i18n/index.ts`. Adds `navigation:items.finalReview` and the `playground` review keys. Reuses
`visa-domain:requirements/documentStatus/visaTypes/financingSource/employmentStatus/templateNotes.*`,
`timeline:appointmentDay.*`, `dashboard:nextActions.*`/`nextAction.*`, `validation:center.*` (via `FindingCard`),
and `common:noDossier.*`. Stored values stay ISO/raw; exported JSON untouched.

### Gates (this iteration)
`format:check` ✓ · `lint` **0 errors / 59 warnings** (baseline 58; the one addition is the already-accepted
`no-deprecated` category — reading the legacy `Document.name` as a display fallback) · `typecheck` ✓ · `test`
**482/482** (417 + 65 new, 58 files) · `build` ✓ (`ReviewPage` lazy chunk 17.05 kB / **4.81 kB gzip**; `index`
80.08 → **80.43 kB gzip** +0.35; `DossierProvider` shared chunk 131.61 → **134.94 kB gzip** +3.33, entirely the
new i18n namespace; **no new dependency**). Not committed, not pushed.

### Tests (65 new)
Pure — `review-checklist` (16): category→group mapping incl. the identity/passport fold and the additional
tail, every state transition, requirement-only rows and their `?category=` link, dossier-record-wins dedup,
custom documents included, documented group order, expiry flagged only against a real appointment,
sponsor-funded vs self-funded applicability, not-applicable excluded from `actionable`, group/whole-checklist
count consistency. `review-summary` (8): empty dossier honest nulls, populated cover sheet, nights from the
canonical pair only, sponsors omitted/surfaced by funding and by count, blank strings as absent, deep-link
targets. `review-print` (13): **an applicant document never appears as a generated sheet** (closed id set +
no code/id/title reachable in the serialized generated side), the same document accounted for only in the
physical plan, group→bundle mapping, travel+accommodation merged, sponsor→`/sponsors`, every sheet's
availability state, checklist line count excluding not-applicable, bundle readiness. `review-model` (14):
**readiness identical to the Dashboard's**, **primary action identical to `deriveNextActions[0]`**, **counts
identical to `buildValidationModel`**, finding routes identical, actionable/notes split, empty dossier,
no-appointment, future and past appointment countdowns, Timeline appointment-day reuse, pack notes only (and
none for an unknown pack), one derivation behind checklist + print, sponsor-funded adaptation, well-prepared
dossier never claiming an outcome. Render (`review-page`, both locales, 13): single `h1`, every section
present, no heading level skipped, readiness ring + its not-a-prediction caption, `/documents` deep links,
the consistency-checks escape hatch, the generated/physical separation visible, "printing does not exist yet"
with **no Print button**, the honest after-submission note, and an empty dossier routing to `/welcome`.

### Known limitations / next
- **Pre-existing divergence, deliberately not resolved:** the Dashboard/Timeline/Final Review readiness percent
  (`buildDocumentBuckets`, where `not_applicable` counts as ready) differs from the Validation Center hero's
  (`buildDocumentBuckets5`). Final Review sides with the Dashboard so the journey's dominant number is
  consistent; reconciling the two is a follow-up that touches a shipped surface.
- Physical bundles are roll-ups only — there is no per-item "packed" state, which would require persistence.
- `Document.fileReference` is still a text reference, so no bundle can be verified as physically present.
- The `DataList` primitive still hardcodes an English "Not provided"; Final Review never reaches it (it always
  passes an explicit localized value), but the primitive is worth fixing in a future pass.
- The next Print/PDF sprint implements the generated-sheets side against `review-print.ts` without redesigning
  this model.
- No browser pass (no connected Chrome) — re-verify at 1440/390 × tr light/dark + en: the hero with and without
  an appointment, long Turkish document names in the checklist rows, the nine groups at mobile width, the
  generated/physical separation reading as clearly distinct, and focus/keyboard order through the deep links.

## Iteration 20 handoff (2026-08-15) — Readiness unification & Final Review polish

Closed the product's worst internal contradiction: **six** different document-readiness derivations,
four different arithmetics, and up to three conflicting numbers in a single Dashboard viewport. There
is now exactly one definition of readiness, owned by `src/features/readiness/`, consumed by every
surface and rendered under one shared label. No schema, import/export, storage, validation-severity or
country-requirement change; still exactly two localStorage keys.

### Baseline recorded (real, from this machine, before any change)
Clean tree on `main` at `79ce7e3`. `format:check` ✓ · `lint` 0 errors / 59 warnings · `typecheck` ✓ ·
`test` **482/482** (58 files) · `build` ✓ (`index` 260.69 kB / **80.43 kB gzip**; `DossierProvider`
436.39 kB / 134.94 kB gzip; `ReviewPage` 17.05 kB / 4.81 kB gzip; CSS 84.74 kB / 17.30 kB gzip).

### The audit (all verified in code, not inferred)
| # | Derivation | Percent | `received` | `not_applicable` |
|---|---|---|---|---|
| 1 | `buildDocumentBuckets` (dashboard) | `(ready+NA)/required` | → missing | **numerator** (inflates) |
| 2 | `buildDocumentBuckets5` (documents) | `ready/required` | **no bucket** | **no bucket, in denominator** (deflates) |
| 3 | checklist `tally` (review) | `ready/actionable` | → amber `needsAttention` | excluded |
| 4 | `buildAppointmentDay` (timeline) | `readyCount/4` | not ready | ready — except `formReady` demanded strict `ready` |
| 5 | `AppLayout.tsx:119` inline nav badge | — | not counted | not counted |
| 6 | `timeline-tasks` `READY_DOC_STATUSES` | — | **counts as done** | done |

Plus a 7th surface the first audit missed: `DOCUMENT_STATUS_TONE.received` rendered **amber**.
Consequences: `buckets5`'s five buckets did not sum to `requiredTotal`, so both segmented bars
(`DocumentsHero`, `DocumentsSummary`) left an unexplained grey gap and no quick-filter chip could
reach a `received` or `not_applicable` document. A dossier with all-`not_applicable` requirements
showed a **100% "Ready for your appointment"** ring above an empty bar reading "0 of 3 ready".

### Canonical definition (ADR-033, `docs/readiness.md`)
`percent = round(ready / applicable × 100)` where `applicable` = required documents that are not
`not_applicable`, **plus** applicable required requirements with no document record yet. Optional
documents never enter either side. `applicable === 0` → `percent 0`, `hasApplicableWork false`,
**never** `ready_for_appointment`. Two invariants, both tested:
`ready + obtained + inProgress + notStarted + needsUpdate === applicable` and
`applicable + notApplicable === requiredTotal`.

`received` = **obtained, in hand, not yet confirmed dossier-ready**. Never missing, never ready, never
amber (`accent` now), never a finding — which needed no rule change, only a regression test.
`needs_update` moved `danger` → `warning` in the same pass. The **task-completion ≠ dossier-readiness**
divergence is deliberately preserved and now documented + tested: a Timeline "obtain X" task *is*
satisfied by `received`; readiness, `buildAppointmentDay` and the checklist require `ready`.

### Architecture
`src/features/readiness/` — `readiness-types.ts` (vocabulary + status→class map), `document-readiness.ts`
(arithmetic + `isDossierReady`/`isObtained`/`isApplicable`), `requirement-readiness.ts` (bridge to the
country pack), `readiness-model.ts` (`ReadinessState`, `deriveReadinessState`, `deriveNextActions`,
moved out of `dashboard-model.ts` — the Dashboard should not own logic three other surfaces consume).
It is a **graph sink**: imports only domain types, so no consumer can cycle. Deleted:
`buildDocumentBuckets`, `buildDocumentBuckets5`, `DocumentBuckets`, `DocumentBuckets5`, the inline
nav-badge filter, and the dead never-rendered `sponsor-documents.readyCount`.

Canonical strings live in `common:readiness.*`, so surfaces share one *string* as well as one number;
`validation:center.hero.readinessLabel` ("Dossier completeness"), `dashboard:hero.readinessLabel`,
`dashboard:hero.subtitle`, `review:hero.readiness{,Hint}`, `documents:hero.{completion,ofRequired,buckets}`
and `dashboard:documentsSummary.{description,ready,needsUpdate,requested,missing,optional}` are retired.
New: `dashboard:nextActions.confirmDocuments` (+ reason/effort) and `snapshot.item.documentsObtained`.

### Final Review polish
`/review?mode=departure` — a compact, **mobile-first (390px)** departure check over the *same*
`FinalReviewModel`: appointment → what goes in the folder → pages VisaFlow can generate → what is
unresolved (incl. the obtained-but-unconfirmed count) → one action → calm footer. Never claims physical
possession ("bundle to bring", never "packed"); no persistence, no packed-state, no new storage key.
The submission checklist gained an **All / Needs attention** filter (view state only) that filters the
canonical checklist rather than building a second model; groups with no matches disappear, order is
preserved, counts are derived. `ReviewModeSelector` + the new `obtained` checklist state are demoed in
`/playground`.

### Two user-visible numbers moved, both deliberately
- **Dashboard ring 70% → 64%** on the example dossier. Its applicant is `employed`, so the Greece pack
  makes 11 required documents applicable while the dossier carries 10 records (no `APPROVED_LEAVE`).
  64% is the honest figure and it is now stable whether or not `/documents` has been visited — before,
  the Documents page silently changed from 70% to 64% the moment it seeded the 11th record.
- **Sidebar Documents badge 2 → 3**: the `received` payslip now counts as outstanding, because it is
  not yet dossier-ready. One meaning of "remaining" app-wide.

### Gates (this iteration)
`format:check` ✓ · `lint` **0 errors / 63 warnings** (baseline 59; all additions are the already-accepted
`no-deprecated` / `no-non-null-assertion` / `react-refresh` categories) · `typecheck` ✓ · `test`
**571/571** (482 + 89 new, 60 files) · `build` ✓ (`index` 80.43 → **80.88 kB gzip** +0.45;
`DossierProvider` 134.94 → **135.82 kB gzip** +0.88; `ReviewPage` 4.81 → **5.04 kB gzip** +0.23; **no new
dependency**). Not committed, not pushed.

### Tests (89 new)
New shared fixtures `src/tests/fixtures/dossiers.ts` — the first shared fixture module in the repo
(`emptyDossier`, `partiallyPrepared`, `receivedHeavy`, `manyNotApplicable`, `allApplicableReady`,
`readyButWithFindings`). Three are built **from the country pack**, because "complete" must mean a
record for every applicable requirement; a hand-picked subset would read 100% only if readiness ignored
uncollected requirements — the exact bug they guard. Dates are year-2099 so `trip.notInPast` (which reads
the wall clock) can never make the suite fail on a calendar boundary.

`readiness-invariants.test.ts` (46) asserts, per fixture: all five surfaces return the same percentage,
the same counts, the same state and the same primary action; `not_applicable` neutrality and no
polarity inversion; the four `received` clauses incl. task-completion-vs-readiness and "never a defect
tone"; the Validation Center cannot relabel a different metric; readiness ⟂ consistency health in both
directions; optional documents never move the number. `document-readiness.test.ts` (28) covers the
status map, both structural invariants and the pending-requirement behaviour. Render tests extended:
the heading-outline invariant now runs in **both** modes, plus `?mode=departure` deep-link, unknown-mode
fallback, the mode radiogroup, the filter radiogroup, filtered-rows-never-exceed-unfiltered, and a
guard that the departure view never says "packed" / "in your bag" / "çantan".

### Existing tests that legitimately changed
`dashboard-model.test.ts` (the "counts not_applicable as ready" case now asserts exclusion; the action
list gained `confirmDocuments`; `completeMissingDocs` 5 → 4 as `received` left it),
`documents-model.test.ts` (five buckets → the partitioning breakdown), `review-model.test.ts` (the hedged
`toBeGreaterThanOrEqual(0)` became a real assertion, plus a new "never 100% while the checklist lists
missing items" test), `review-checklist.test.ts` (`received` → `obtained`), `ui/dashboard.test.tsx`
(70 → 64, with the reason in a comment).

### Docs
New `docs/readiness.md` (canonical) and `docs/review-architecture.md` (did not exist). ADR-033 appended;
it explicitly supersedes ADR-017's readiness clause and ADR-032's known limitation. `dashboard-architecture.md`
corrected in place with a short *History* note naming the past error honestly (ADRs are append-only, so
ADR-017's text is untouched). `architecture.md`, `current-status.md`, `roadmap.md` updated.

### Known limitations / next
- The checklist's `actionable` counts optional rows and un-instantiated requirements, so it is **not**
  the readiness denominator — a different question, now labelled explicitly rather than reconciled.
- `deriveNextDocument` still picks `not_started` then `needs_update`, skipping `requested`/`obtained` — a
  seventh, smaller opinion about "what's next", left for a follow-up.
- The example dossier lacks an `APPROVED_LEAVE` record its own employed applicant makes applicable.
  Adding it would raise the example to 70%; left alone deliberately so the fixture exercises the
  uncollected-requirement path.
- `DataList` still hardcodes an English "Not provided" while `common:states.notProvided` exists.
- **No browser pass (no connected Chrome)** — re-verify at **390px** especially, plus 1440, × tr/en ×
  light/dark: the departure card, the checklist filter and its empty state, the six-segment readiness
  bars, the new `obtained` chips and tones, and keyboard/focus through both radiogroups.

## Iteration 21 handoff (2026-08-16) — Checklist semantics, next-document alignment & release UX hardening

Closed the presentation seams ADR-033 left open. The submission checklist stopped behaving like a
second progress metric, document recommendations became status-aware, and — the finding that made
this sprint bigger than planned — **five shipped call sites were still using a non-canonical
readiness denominator**, so ADR-033's own claim that the sidebar badge means "remaining app-wide" was
false in code. No schema, import/export, storage, validation-rule or validation-severity change;
still exactly two localStorage keys; `schemaVersion` unchanged.

### Baseline recorded (real, from this machine, before any change)
Clean tree on `main` at `3f16f27`. `format:check` ✓ · `lint` 0 errors / **63 warnings** ·
`typecheck` ✓ · `test` **571/571** (60 files) · `build` ✓ (`index` 261.95 kB / **80.88 kB gzip**;
`DossierProvider` 439.87 kB / 135.82 kB gzip; `ReviewPage` 20.33 kB / 5.04 kB gzip; CSS 84.77 kB /
17.30 kB gzip). The recorded numbers matched the Iteration 20 handoff exactly.

### The audit — the numerator 7 against six denominators
For the example dossier, **7** appeared against **19, 11, 10, 4, 3, 2**, and "what is left" appeared
as **12, 4, 3, 2, 1** simultaneously. Three ratios sat on Final Review alone (ring 7/11, hero badge
7/19 two centimetres away, group headers). Root cause of the 19: `buildSubmissionChecklist` expanded
un-instantiated requirements **without filtering `req.required`**, so eight optional Greek
requirements inflated the package and permanently blocked the "all ready" state.

Also found and fixed: the Documents "Not started" chip said **2** but revealed **1 row**
(contradicting the invariant `document-filters.ts` claims for itself); `dashboard:snapshot.item.*`
and `review:hero.checklistReady` had **no EN plurals** ("1 documents ready"); the Review and
Validation rings rendered a raw `64%` instead of the Turkish `%64`; `deriveNextDocument` said "all
caught up" beside a 0% bar on an unseeded dossier.

### What changed

**Readiness is genuinely canonical now.** `AppLayout` (nav badge), `buildAppointmentDay`,
`employment-documents` and `finance-documents` all pass `requiredRequirementCodes`; the last two use
**category-scoped** codes so their caption denominator matches the list beneath it (was "0 of 2
employer documents ready" above 7 rows). `dashboard-model`'s snapshot deliberately does not — it
reads only `ready`/`obtained`/`needsUpdate`, which pending codes cannot affect, and now says so.

**Checklist → inventory.** Hero: *"11 items in your appointment package · 4 need attention"*.
Groups: *"4 items · 2 need attention"*, or *"All prepared"* when nothing is outstanding — never
"0 need attention". Print bundles carry a labelled state badge plus an item count. `checklistReady`,
`groupSummary` and `bundleSummary` are retired. Exactly one percentage remains on the page.

**Recommendations are status-aware.** `deriveNextDocument` returns
`{ code, document | null, action }` with `action ∈ obtain | followUp | update | confirm`, accepts
`requiredRequirementCodes`, and orders work to match `deriveNextActions`
(`not_started → un-instantiated → requested → needs_update → received`) rather than any local
intuition. A bare requirement routes the hero CTA to the existing **Sync** dialog instead of a detail
panel that does not exist.

**`received` left the cobalt accent.** `index.css` reserves cobalt for interactive/selected/progress
surfaces, yet `StatusTone="accent"` paints brand-subtle with a `bg-primary` dot. `received` and
`requested` now share the low-chroma `info` ramp and are told apart by icon (`Clock` vs
`PackageCheck`), label and microcopy. `DocumentsHero`'s parallel tone map was folded onto
`DOCUMENT_STATUS_TONE`, and its chips gained icons so tone is never the only signal.

**Documents chips now match their rows.** Chips count `filterableReadiness` (records that exist);
the bar and percentage stay canonical; the gap is stated honestly with a line pointing at Sync.

**`DataList`** resolves `common:states.notProvided` (an optional `emptyLabel` prop overrides it).
The literal was reachable in 7 files / ~16 rows — most visibly `TripSummary` on the Dashboard, where
6 of 7 rows rendered raw English in a Turkish session.

### Gates (this iteration)
`format:check` ✓ · `lint` **0 errors / 64 warnings** (baseline 63; the addition is the already-
accepted `no-deprecated` category) · `typecheck` ✓ · `test` **620/620** (571 + 49 new, 61 files) ·
`build` ✓. **Not committed, not pushed.**

Bundle: `index` 80.88 → **83.19 kB gzip (+2.31)**. The cause is deliberate and worth knowing: the app
shell is now the only eager importer of `@/config/countries`, because computing a *correct* nav badge
requires resolving the country pack. A wrong badge was the alternative. `ReviewPage` 5.04 → 5.06;
`DossierProvider` 135.82 → 136.34. No new dependency.

### Tests (49 new, 620 total)
New `next-document.test.ts` (21): every status → its action, `requested` never called missing,
`received` never told to obtain again, priority matching `deriveNextActions`, un-instantiated
requirements participating, and the load-bearing invariant **a recommendation exists iff
`readiness.outstanding > 0`** across all six fixtures. `readiness-invariants.test.ts` grew to 65 with
INVARIANT 6 (sidebar badge and appointment-day agree with canonical readiness per fixture) and
INVARIANT 7 (the package never contains an optional requirement nobody added). `review-page.test.tsx`
grew to 34: the checklist section contains **no `%` and no `X of Y`**, at most one percentage on the
page, the package size renders as an inventory, and `received` uses obtained/confirmation language
with a tone that is never `warning`, `danger` or `accent` and is distinguished by more than colour.

### Existing assertions that changed, and why
`documents-model.test.ts` — `deriveNextDocument(...)?.id` became `?.document?.id`: the old return
type could not express *what to do*, only *which document*, which is exactly the defect.

### Docs
**ADR-034** appended (extends ADR-033; establishes ratio-vs-inventory, the `info`-shared workflow
tones, and status-aware recommendations). `docs/readiness.md` gained the ratio/inventory rule and a
warning that every consumer must pass `requiredRequirementCodes`. `docs/review-architecture.md`
replaced its now-obsolete `actionable` caveat. `docs/vision.md` domain vocabulary gained "Submission
checklist". `current-status.md`, `roadmap.md` updated.

### Known limitations / next
- **No browser pass.** Chrome is installed and `DISPLAY=:0`, but `list_connected_browsers` returns
  `[]` — the extension is not paired, so automation cannot drive it. The 390px/1440px × TR/EN ×
  light/dark pass in the brief **was not performed and is not claimed**. It was compensated with
  render/interaction tests only; wrapping, overflow, departure-card height and long-Turkish
  behaviour remain visually unverified.
- The +2.31 kB gzip on the initial chunk is the price of a correct nav badge. A future option is to
  derive the badge behind the router's lazy boundary or memoize it at the provider.
- The checklist inventory is still a different population from the readiness denominator (it may
  include optional documents the applicant created). That is intentional and is why it is a count,
  not a fraction — but a user comparing "11 items" with "11 required documents" on the same card is
  seeing two different 11s that happen to coincide for this dossier.
- `humanizeStatus` in `status-badge.tsx` is exported, un-i18n'd English, and called nowhere.

## Iteration 22 handoff (2026-08-16) — Release-candidate UX hardening

An application-wide QA pass, not a feature sprint. **Browser automation was unavailable**, so this
records exactly what was and was not verified.

### Browser availability — the sprint's first finding
`list_connected_browsers` → `[]`; `tabs_context_mcp` → *"Browser extension is not connected."* Chrome
is installed with `DISPLAY=:0`, but the extension is not paired. **No visual QA was performed and
none is claimed.** The sprint substituted static analysis where failure is provable from arithmetic,
stronger DOM tests, and `docs/manual-qa.md` for everything that needs eyes.

### Baseline recorded (real, from this machine, before any change)
Clean tree on `main` at `0394fa5`. `format:check` ✓ · `lint` 0 errors / **64 warnings** ·
`typecheck` ✓ · `test` **620/620** (61 files) · `build` ✓ (`index` 273.89 kB / **83.19 kB gzip**;
`DossierProvider` 441.99 / 136.34 gzip; `ReviewPage` 20.54 / 5.06 gzip; CSS 84.77 / 17.30 gzip).

**Layout budget established:** `max-w-[1120px]` + `px-5` → **350px usable at 390px** (310px in a
`Card`, 278px in a nested `p-4` panel). `<main>` computes `overflow-x: auto`, so overflow scrolls the
page rather than clipping. Every responsive finding was measured against that number.

### FIXED — structurally provable

| # | Defect | Evidence |
|---|---|---|
| 1 | **Modal scrim inverted in dark mode.** `bg-foreground/25` on dialog/sheet/alert-dialog. `--foreground` is L 0.193 light → **0.945 dark**, so over `--background` 0.145 the scrim composited to L≈**0.345** — it *lightened* the page. | Added one `--overlay` token (dark in both themes). A literal `bg-black/40` would have broken the codebase's zero-colour-literal property. |
| 2 | **`SegmentedControl` overflowed the viewport.** `inline-flex`, `whitespace-nowrap` segments, nothing shrinks. Timeline's 3 modes ≈**447px EN / 496px TR** vs 350px → ~100–145px of horizontal page scroll. Review's 2 modes fit in EN (283px) but **not TR (334px)**. | `max-w-full overflow-x-auto` on the track + `shrink-0` on segments. Roving-tabindex unaffected. |
| 3 | **Timeline's last competing ratio.** `TimelineHero` renders on *all* modes; `AppointmentDaySummary` on the default one. Screen showed "Required documents remaining: **4**" beside "**2 of 4** ready" — the same numeral, two meanings — and the TR was one word from `common:readiness.ofApplicable`. | Reframed as an inventory ("4 items to prepare · 2 need attention" / "Hazırlanacak 4 öğe · 2 öğe gözden geçirilmeli"). `buildAppointmentDay` untouched. |
| 4 | **`/timeline` skipped h1 → h3.** `PreparationPlan` emits `h3` band headings but, unlike the other two modes, was rendered with no `Section`/`SectionHeader` above it. | **Found by the new route smoke test**, not by reading. Wrapped it; added `timeline:plan.title/description`. |
| 5 | **Turkish glosses that also truncated.** `Banka Hesap Dökümü (Bank Statement)` etc. — 2.0–2.33× the EN length, English leakage, and truncating in **ten** `truncate` containers (the 288px Documents-hero panel allows ~32 chars; the string is 35). | Glosses dropped. |
| 6 | **Two contrast failures.** `data-list.tsx` `text-muted-foreground/70` ≈**2.6:1 light / 3.1:1 dark**; `NavList.tsx` `/80` on 11px uppercase ≈**2.95:1 light**. | Opacity modifiers removed. |
| 7 | **Five touch targets below WCAG 2.5.8 AA (24×24).** GuidanceNote dismiss and CountryCombobox clear at ≈20×20; three bare inline "Open" links ≈20px tall in dense lists. | Padding grown with negative margins — hit box up, visual unchanged. Targets in the 24–44px band were left alone and documented. |
| 8 | **Deterministic mobile overflow/stacking.** Unbreakable confirmation number with no `break-words` (`DepartureCheck`); two `justify-between` rows with no `flex-wrap`/`min-w-0` against a `shrink-0` nowrap badge; two bare `grid-cols-2` that never stack; `popover.tsx` bare `w-72` with no viewport clamp. | Fixed by copying patterns already correct elsewhere in the repo (`PrintPackage`, `field-help`). |
| 9 | **Four EN keys interpolated `{{count}}` with no plural** → "1 days ago", "1 sponsors added". TR was already correct (Turkish nouns don't pluralise after a numeral). | Plural forms added. |

### Also corrected
- **`src/App.css` deleted** — dead Vite-template leftovers with fixed pixel widths, never imported.
- **`humanizeStatus` moved** into `PlaygroundPage`. The Iteration 21 handoff claimed it was "called
  nowhere"; that was **false** — it had five callers, all in the Playground. It labels developer
  vocabulary (tone ids), so localizing it would be meaningless; removing it from `components/ui/`
  takes an un-i18n'd English function out of the shipped design system.
- **Notes adopted `PageHeader`/`PageBody`** — the only route that never did, hand-rolling
  `<h1 className="text-2xl font-bold">`. It also had **zero render tests**.

### NOT DONE — deliberately (see `docs/manual-qa.md`)
Vertical density (`DocumentsHero` ≈420–460px, `ReadinessHero` ≈420px, `DepartureCheck` ≈600–750px);
the `BAR_SEGMENTS` lightness **polarity inversion** between themes (`obtained` is lighter than
`requested` in light, darker in dark, only 14° apart in hue); the `SegmentedControl` selected chip
being *darker* than its track in dark with an imperceptible `shadow-xs`; borderless `bg-muted/40`
surfaces at ΔL≈0.02; `bg-primary/[0.02]` as a no-op tint; touch targets in the 24–44px band; whether
the Documents table view should be offered at 390px; the Settings mobile rail's lack of a scroll
affordance. **All are judgement calls that need pixels.**

### Bundle — investigated, no change
The Iteration 21 `+2.31 kB gzip` is confirmed as the country pack (`src/config/**` = 18,840 bytes)
pulled eagerly because `AppLayout` is its only eager importer, needed for a correct nav badge. Lazy
import turns a sync render async; `DossierProvider` is also eager; page-published counts leave the
shell blank on first paint. The pack loads with the next chunk on 7 of 11 workspace routes anyway.
The brief's bar — simple architecture, identical behaviour, measurable win — is not met.

### Gates (this iteration)
`format:check` ✓ · `lint` **0 errors / 63 warnings** (baseline 64 — one fewer, `humanizeStatus`
leaving `components/ui/`) · `typecheck` ✓ · `test` **716/716** (620 + 96 new, 62 files) · `build` ✓.
**Not committed, not pushed.**

### Tests (96 new)
`route-smoke.test.tsx` (84) — all 14 shipped routes × both locales assert exactly one `h1`, no
skipped heading level, and no raw translation key on screen. This is what caught defect #4, and it
gives Notes its first coverage. Plus the appointment-day inventory assertions (no `X of Y`, no `%`,
TR + EN) and the `{{count}}` plural regressions. No existing assertion was weakened; the readiness,
`received`, priority, parity, export and schema invariants are untouched.

### Known limitations / next
- **Nothing in this sprint was seen in a browser.** `docs/manual-qa.md` is the outstanding work.
- jsdom has no layout, so no test here can catch a visual regression — the route smoke test protects
  semantics and structure only.
- The `--overlay` token's exact opacity (0.45 light / 0.6 dark) was chosen from oklch arithmetic, not
  from looking at it.

---

# Iteration 23 — Pre-v1.0 visual QA: the first real-browser pass

**Not a feature sprint, not an architecture sprint.** The one job was to look at the running product
and decide honestly whether it is ready for v1.0. `HEAD` at start: `eab2c1d`, tree clean.

### Getting pixels at all

The Claude Chrome extension is **not paired** (`list_connected_browsers` → `[]`), which is what
blocked Iterations 20–22. Rather than run a fourth static sprint, the approved path drove the
already-installed **Chrome 149** over the DevTools Protocol using **Node 22 built-ins only** —
global `WebSocket` + `fetch`, no Playwright, no Puppeteer, no new dependency. All harness code is
throwaway and lives in the session scratchpad; nothing was committed, and no production code was
changed to make the harness easier.

Two methodology traps, both hit and both worth remembering (also recorded in `docs/manual-qa.md`):

1. **The dossier is in-memory (ADR-006), so `Page.navigate` wipes it** and every route silently
   renders its empty state. A sweep that reloads reports `h1: 0` on 12 of 14 routes and looks like a
   catastrophic regression. Navigate **client-side** (`history.pushState` + `popstate`).
2. **Two Chrome instances sharing one `--user-data-dir` corrupt each other** — identical `h1: 0`
   signature. Two matrix cells had to be discarded and re-run serially.

Example data was loaded through the app's own "Örnek veriyi yükle" button, never by injecting state.

### Coverage

14 routes × 7 cells: 390 × {TR,EN} × {light,dark}, 834 × TR × light, 1440 × TR × light,
1440 × EN × dark. **Every cell: zero horizontal page overflow, exactly one `h1`, on all 14 routes.**
Not run: 1440 × TR × dark, 1440 × EN × light, 834 × dark — desktop has 3.7× the content budget and
both themes and locales were covered there; 390px has full 2 × 2 coverage.

### The find that justified the sprint — P0, no keyboard focus ring anywhere

`index.css` defines one focus ring in `@layer base`. **Tailwind v4 orders utilities after base**, so
`outline-none` on `Button`, `Input`, `Textarea`, `Checkbox`, `Select` trigger and `Accordion` trigger
silently beat it. Measured over CDP the split was exact: every `data-slot` control reported
`:focus-visible` matching with `outline-style: none`, while hand-written `<button>`s on the same page
drew `solid 2px`. Keyboard users had no focus indicator on the export button, the language and theme
menus, "Belge ekle", the search field or any filter select — while the ad-hoc chips beside them
highlighted fine. WCAG 2.4.7 (AA).

`outline-none` removed from those six primitives; containers and menu items keep theirs (a focus trap
is not a control; menu items highlight via `focus:bg-accent`). Re-measured: **37/37 controls now draw
the ring.** `src/tests/ui/focus-visible.test.ts` guards it and was verified against a deliberately
reintroduced regression. Note that `button.tsx`'s own comment had asserted this worked — the code was
documented as correct and was not.

### Also fixed (each: evidence → change → re-measured at the same cell)

- **Dangling breadcrumb `/` below 640px** — separator rendered unconditionally, its crumb was
  `hidden sm:inline`.
- **Page title crushed to ~59px at 390px** — "Belgeler" rendered "Belg…"; the longest Turkish title
  needs ~165px. Export and language collapse to icon + `aria-label` below `sm`. The title is the only
  page indicator once the sidebar is hidden.
- **`ThemeToggle` shipped hardcoded English** in a Turkish-default product. The `theme.*` keys
  already existed in both locales, unused.
- **Settings rail hid 4 of 8 sections** on a phone with no fade or scrollbar — now wraps, absorbed by
  existing dead space (`docH` unchanged).
- **Timeline mode switcher** measured `clientW 350 / scrollW 511` in TR — the third mode entirely
  off-screen, cut mid-glyph. `SegmentedControl` wraps instead of scrolling; it was the **only**
  overflowing control in the app, so Review/Documents/Settings are visually unchanged.
- **`DocumentsHero` broke its own headline** — `"%64 hazır"` wrapped with "hazır" stranded.
- **The example dossier read as 547 days overdue.** Dated Feb–Apr 2025, the primary onboarding path
  presented a *failed* application: "Randevu tarihiniz geçti", overdue badges, and "Seyahat tarihi
  geçmişte" as the recommended next step. Trip/appointment dates +2y; already-obtained evidence dates
  +18mo so they stay in the recent past. Exactly one test asserted the old literals (`totalNights`,
  the real assertion, is unchanged by a rigid shift).

### Knowingly shipped — P1, dialogs do not restore focus

`Escape` drops focus to `<body>`, so a keyboard user lands at the top of the document. Sampled at
t+0 / t+400ms / t+1200ms — stable, not an animation race — and it reproduces on `/documents` where
the trigger **is still in the DOM**. Dialogs are fully controlled with no `DialogTrigger`, the likely
reason Radix's restore never fires. Not fixed: the correct fix is real focus-management work in the
shared `DialogContent`/`SheetContent`, and shipping an unverified focus hack at the end of a QA
sprint is worse than shipping a documented defect. Now on the roadmap.

### Gates

`format:check` ✓ · `lint` **0 errors / 63 warnings** (exactly the baseline) · `typecheck` ✓ ·
`test` **724/724, 63 files** (716 + 8) · `build` ✓. Bundle moved within noise: `index`
273.79 → 273.99 kB (gzip 83.14 → 83.16), CSS 85.40 → 85.50 (gzip 17.43 → 17.45). **Not committed,
not pushed.**

### Known limitations / next

- **`docs/manual-qa.md` is now a status register, not a wish list** — every one of the 24 former open
  questions is PASS, FIXED, or OPEN with a reason. Read it before the next UI sprint.
- Three P2s are documented and deliberately unfixed because they are product decisions, not CSS:
  `/review?mode=departure` is 2130px at 390px (it exists to be glanceable); the dashboard's
  recommended next action sits below the fold behind a fixed 188px ring; and the readiness verdict
  appears three times on one dashboard screen.
- CDP shows the product; it does **not** certify accessibility. No screen reader was run, and colour
  contrast was checked arithmetically, not with assistive technology.

---

# Iteration 24 — Pre-v1.0 accessibility closure: overlay focus restoration

**A deliberately small release-gate sprint.** One defect, fixed at the right layer, verified in a real
browser. `HEAD` at start: `dc91225`, tree clean, `724/724`.

### First: the severity labels were meaningless

Iteration 23 wrote "P1, shipped knowingly" into the docs — and the repository defined P0–P3
**nowhere**. The labels came from sprint briefs and were never given meaning, so a defect could be
called release-blocking and non-blocking in the same sentence without anything catching it.
`docs/manual-qa.md` now defines them, tied to what the project already claims about itself:

- **P0** broken/unusable/data-losing → blocks release
- **P1** violates a stated principle in `docs/principles.md` → blocks release
- **P2** real defect, no principle violated → ships, tracked
- **P3** polish → backlog

`principles.md` §8 already said *"focus management … are requirements, not polish"*, which makes this
defect P1 and makes "P1, shipped knowingly" unwriteable.

### Root cause — read from Radix on disk, not guessed

Radix restores focus to `context.triggerRef.current`, and `grep triggerRef` over
`@radix-ui/react-dialog@1.1.19` shows that ref is written from exactly **one** place: `<Dialog.Trigger>`.
The modal close handler (lines 148–151) is:

```js
onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
  event.preventDefault();
  context.triggerRef.current?.focus();
}),
```

`preventDefault()` runs **unconditionally**, which also suppresses `FocusScope`'s own correct fallback
`focus(previouslyFocusedElement ?? document.body)`. With no trigger, `?.focus()` no-ops, nothing is
focused, the content unmounts, and the browser resets to `<body>`.

**11 of this app's 16 overlays are controlled with no Radix trigger — by necessity, not sloppiness.**
`MobileNav` is opened by the header hamburger in another subtree; `DocumentDetailPanel` and
`SponsorEditorSheet` by a **URL search param** (so they deep-link); `ImportExportSection` by a
**file-input change handler**. There is no element to hand to `<Dialog.Trigger>`.

That is why the fix is *not* "add triggers": it would mean restructuring pages, and for the
URL-driven and file-input-driven cases it is not possible at all.

### The fix — one hook, three primitives, zero consumer changes

`src/components/ui/use-restore-focus.ts`, wired into `dialog.tsx`, `sheet.tsx`, `alert-dialog.tsx`
(ADR-035). It re-derives the value Radix already had rather than inventing bookkeeping:
`onOpenAutoFocus` fires *before* focus moves into the container, so `document.activeElement` there
**is** `FocusScope`'s `previouslyFocusedElement`. On close it restores that element and claims the
event, so Radix's null-trigger branch never runs.

No `setTimeout`, no per-page `.focus()`, no DOM nodes in application state, no API change. Caller
handlers still run and still win — load-bearing for `AlertDialogContent`, which focuses Cancel on
open. If the opener is no longer `isConnected` the hook does not claim the event and Radix's
behaviour is left untouched, because guessing a replacement target is worse than doing nothing.

### Verified in Chrome 149 (the authoritative evidence)

Nine steps per overlay, trigger reached by `Tab` rather than `.focus()`, sampled at t+900ms **and**
t+1500ms so a pass cannot be an exit-animation artifact:

| Path | Enters | Trap | Escape close | Visible close |
|---|---|---|---|---|
| Dialog `/documents` "Belge ekle" | ✅ | ✅ | ✅ trigger, `:focus-visible`, `outline solid 2px` | ✅ trigger |
| Sheet `/sponsors` "Sponsoru düzenle" | ✅ | ✅ | ✅ trigger, `:focus-visible`, `outline solid 2px` | ✅ trigger |

After a **mouse** close the trigger is restored but reports `focusVisible=false` and no ring — correct
browser behaviour for pointer interaction, not a defect. 390px regression sweep over all 14 routes:
byte-identical to Iteration 23 (`dashboard 3890`, `documents 3143`, `departure 2130`, zero overflow,
one `h1`).

### Known limitation, now P2 (see manual-qa.md)

Sponsors' empty-state button both creates a sponsor **and** opens the sheet, so it unmounts itself in
the same commit — measured `trigger still in DOM after open: false`, focus lands on `<body>`. Every
other sponsor path restores. Not P1: the focus contract is correct wherever the opener survives, and
no focus system can restore to a button that no longer exists (Radix's own fallback also lands on
`<body>` here). The defect is the page's action design; fixing it needs either a per-page focus hack
or a rework of the sponsor-draft model, both out of scope.

### Two more P1s, found while verifying the first

Both in the overlay primitives, both surfaced by looking at the close button the verification script
had to click:

1. **The close button had no visible focus indicator.** It carried `focus:outline-hidden` plus a
   `focus:ring-*` set that resolved to a **fully transparent** shadow — measured keyboard-focused:
   `focusVisible: true, outline: NONE, boxShadow: rgba(0,0,0,0) 0 0 0 0`. This is the *same defect
   class* as Iteration 23's P0, and it survived that sweep only because `focus-visible.test.ts`
   exempted `dialog.tsx`/`sheet.tsx` as "containers" — they are, but each renders a real control
   inside itself. Dead classes removed, re-measured `outline: solid 2px`. **The guard was the actual
   failure**, so it was tightened: exempt files may keep a plain `outline-none` on the content
   element, but may no longer suppress the ring *on focus*.
2. **The close button was hardcoded English** — `<span class="sr-only">Close</span>` in both files
   plus a latent third in `DialogFooter`. A Turkish screen-reader user heard "Close".
   `common:actions.close` already existed in both locales. Verified: "Kapat" / "Close".

Both are P1 under the ladder above (Principles 8 and 9), so neither could be deferred without
contradicting the answer this sprint exists to give. Both are two-line changes in files the sprint
was already editing.

### Tests

`733/733, 64 files` (+9). `src/tests/ui/overlay-focus-restore.test.tsx` covers Dialog, Sheet and
AlertDialog via `Escape` and via the visible close action, plus safe degradation when the opener
unmounted. **Verified non-vacuous:** with the restoration neutered, 4 of its 5 cases fail. jsdom
proves `document.activeElement`; it cannot prove a *visible* ring (no cascade layers, no
`:focus-visible` heuristic) — Chrome covers that half.

### Gates

`format:check` ✓ · `lint` **0 errors / 63 warnings** (exactly baseline) · `typecheck` ✓ ·
`test` **733/733** ✓ · `build` ✓. Bundle from a clean `rm -rf dist` rebuild: `index`
273.99 → **274.33 kB** (gzip 83.16 → 83.30, **+0.14 kB**) — the hook plus its wiring in three
primitives. CSS 85.50 → **85.47** and `DossierProvider` unchanged, i.e. flat. (An intermediate build
read 84.99 kB of CSS; it did not reproduce on a clean rebuild, so the flat number is the one to
trust — removing the close button's `focus:ring-*` classes did not measurably shrink the bundle,
because `ring-offset-background` is still used by `country-combobox.tsx`.) **Not committed, not
pushed.**

### Next

- The Sponsors P2 above is the only known focus gap.
- `sheet.tsx`'s close button has no `data-slot` while `dialog.tsx`'s does — harmless, but it makes the
  Sheet close control awkward to target in tests. Left alone deliberately this sprint.
- **Lesson worth keeping:** exempting a whole *file* from an a11y guard is too coarse. Both extra P1s
  lived inside files the previous sprint had marked exempt. Guards should exempt elements, not files.

---

# Iteration 25 — v1.1 maintenance & CI hygiene

The first post-v1.0 sprint. Baseline: `main` @ `427015d`, tree clean, `HEAD == v1.0.0^{commit} ==
origin/main` (main had not moved since the release). No version bump — nothing in the repo documents
a process requiring one during development.

### The act() diagnosis in the v1.0 report was wrong in the part that mattered

The **count** was right (360). The **cause** was not. It was recorded as "`i18n.changeLanguage()`
outside `act()`" as a general pattern — but 20 files call `changeLanguage` and **18 emit zero
warnings**. All 360 came from **two lines**: `i18n.test.tsx:53` and `app-shell.test.tsx:46` called it
inside an **`afterEach`**.

Vitest resolves `sequence.hooks` to `"stack"`, which **reverses** `afterEach`, so a file's hook runs
*before* Testing Library's auto-cleanup — i.e. into a still-mounted tree. And because both locales
are bundled, `changeLanguage` emits `languageChanged` **synchronously**, so `await` was never going
to help. Every mounted `useTranslation` consumer answered with a `setState`; the per-component counts
were a census of tree size, not a bug signature (130 for the Playground page, a flat 16 for all four
app-shell tests).

Both files already reset the locale in `beforeEach`, so the `afterEach` was dead weight. Deleting it:
**360 → 0**, and the verbose run now contains **zero stderr blocks of any kind**. No hook-ordering
config change, no `console.error` suppression.

### Sponsors first-create focus — closed, and it taught us something

The v1.0 note was directionally right and mechanically incomplete. Two findings only measurement
produced:

1. The CTA is detached **before `onOpenAutoFocus` runs**, so the shared hook never held a connected
   opener on that path — `document.activeElement` was already `<body>`.
2. **`<body>` is `isConnected`**, so the existing guard accepted it as a valid opener and focused it —
   precisely the outcome the hook exists to prevent. `body` is now treated as "no opener".

`useRestoreFocusOnClose` gained an optional `restoreFocusFallback: () => HTMLElement | null` —
**a callback, never a selector string**, so overlay primitives never learn what a sponsor is.
`SponsorsPage` owns the destination via a ref map of card edit buttons plus the last-opened id (the
URL param is cleared *before* Radix's close-autofocus step, so `selectedId` is already `null` by
then — that cost one debugging round). See the ADR-035 amendment.

Verified in Chrome 149: first-create lands on the new card's edit button with a visible ring; the
normal edit path is unchanged.

**Test-harness lesson worth keeping:** the first jsdom harness for this passed for the wrong reason.
Both arms of the conditional were `<button>`, so React **reused the DOM node** instead of unmounting
it — the opener survived and the bug was never exercised. The arms must be *different element types*,
as `EmptyState` vs the card grid are.

### Security and dependencies

Enabled after explicit approval, verified by API: Dependabot **vulnerability alerts** and
**automated security fixes**. Private vulnerability reporting remains on. Deliberately **not**
enabled: scheduled version-update PRs, and no `.github/dependabot.yml` — routine upgrades stay
deliberate rather than on a timer. `SECURITY.md`'s "not currently enabled" line was corrected.

`pnpm audit` found 10 advisories. One was runtime — `react-router` GHSA-qwww-vcr4-c8h2 (high) —
patched by an in-range 7.18.1 → 7.18.2 bump (7.18.2 is the newest 7.x, so no minor/major drift).
The remaining **9 are dev-only** and were deliberately left: `undici` ×5 via `jsdom`,
`brace-expansion` ×2 via `eslint`, `postcss`/`nanoid` via `@tailwindcss/vite > vite`. None reach the
shipped bundle; bundling them into this sprint would have put vitest and jsdom — which the whole
733-test suite rests on — under churn during the sprint meant to stabilise it.

### CI exists now

There was **none** — zero workflows, zero runs ever, no `.github/`, no branch protection.
`.github/workflows/ci.yml` runs the gates on push/PR to `main` (Ubuntu, Node 22, corepack honouring
`packageManager`, pnpm cache, `--frozen-lockfile`).

`scripts/check-act-warnings.mjs` (Node built-ins, no dependency) re-runs the suite with stderr
visible and fails on any React `act(...)` warning. It keys on **React's own message**
(`was not wrapped in act(`), not on Vitest's reporter layout, so a formatting change cannot make it
silently pass. Verified non-vacuous: reintroducing the `afterEach` made it exit 1 and report exactly
64 warnings. No branch protection this sprint — that is separate repository governance.

### Gates

`format:check` ✓ · `lint` **0 errors / 63 warnings** (exact baseline) · `typecheck` ✓ ·
`test` **737/737, 64 files** (733 + 4) · `build` ✓ · `git diff --check` clean. Bundle: `index`
274.33 → **274.42 kB** (gzip +0.05), CSS and `DossierProvider` unchanged.

v1.0 contract re-verified unchanged: dossier `schemaVersion` 1.0.0 · Greece `templateVersion` 1.0.0 ·
only the two permitted storage keys · `src/domain/`, `src/features/readiness/`,
`src/features/validation/`, `src/features/import-export/`, `src/config/`, `src/data/` **untouched** ·
`v1.0.0` tag still peels to `427015db`.

### Next

The maintenance baseline is clean; the next sprint can be a real feature. The only tracked debt is
the 9 dev-only advisories.

---

# Iteration 26 — v1.1: Saved Dossiers & local persistence

The first substantial v1.1 feature. Baseline `f5c0399`, clean, CI green, 737/737.

### What the map changed about the plan

Three findings reshaped the approach before any code was written:

1. **10 of 12 feature models were already pure** `build*(input)` + a 4-line hook. The domain, rules
   and readiness layers needed **no change at all** — those 10 hooks were the entire coupling to
   "one in-memory dossier". The 158 direct `state.*` reads look alarming and are almost all
   irrelevant.
2. **The state layer was 100% synchronous** — no `async`, no `useEffect` anywhere in
   `DossierProvider`. That is why `WorkspaceProvider` exists as a separate layer rather than
   persistence being bolted into the reducer.
3. **`isDirty`/`lastSaved` meant "unexported"** — `markSaved()` fired only on export, so
   "Saved 5 minutes ago" was a lie about local storage that had simply never mattered before.

### Storage: IndexedDB, and *not* because of size

Measured first: a dossier is ~6 KB minified, fifty heavy ones ~1.1 MB — comfortably inside
localStorage's quota. Capacity was never the argument. The argument is write behaviour:
localStorage is synchronous and string-only, so every autosave would serialize and rewrite a blob
on the main thread with no per-record atomicity.

`jsdom` has no IndexedDB, so the adapter cannot be unit-tested here. Rather than add a polyfill
dependency, the *contract* is tested against an in-memory adapter and the production adapter is
proven in real Chrome. Everything testable without a browser — migration, record assembly, summary
derivation, ordering — lives in pure modules, leaving the IndexedDB adapter as thin plumbing.

### Bugs the work surfaced (all fixed)

- **`LOAD_DOSSIER` merges** (`applicant ?? state.applicant`), which is right for importing a partial
  file and wrong for switching: dossier B lacking an applicant would leave dossier A's on screen.
  Added `REPLACE_DOSSIER`, which replaces wholesale including nulls.
- **`WelcomePage` blocked creating a second dossier.** `hadDataAtMount` short-circuited the whole
  flow, so the switcher's "New dossier" led to an "you already have one" dead end. Now an explicit
  `?step=` is honoured; the bare `/welcome` still shows the panel. **Found only by real-browser
  testing** — no unit test would have caught it.
- **An unguarded `writeMeta` produced an unhandled rejection** on a storage failure. Caught by a
  test that deliberately fails the next write.
- **The "replace what is open?" confirmation became a lie** once import turned additive, so it was
  removed rather than left to warn about something that no longer happens.

### Verified in real Chrome (jsdom cannot do this)

Typed `DURABILITY4711` into the applicant field → it appeared in IndexedDB → **full page reload** →
record intact and the field repopulated. Then: second dossier created and became active; active
dossier survived reload; `/dossiers` rendered both; deleting the active one fell back to the
survivor and the deletion persisted across another reload. Export keys unchanged.

### Privacy

The promise genuinely changed and ~20 bilingual strings plus six docs were rewritten. The line that
mattered most: **local storage is not encryption** — anyone who can use the browser profile can open
the dossiers. Saying that plainly is the price of storing anything. ADR-006's rationale (shared
computers, users forgetting data is stored) was not dismissed; it is why **Session only** exists.

### Gates

`format:check` ✓ · `lint` **0 errors / 68 warnings** (63 baseline + 5 new, all the accepted
`react-refresh/only-export-components` category) · `typecheck` ✓ · `test` **774/774, 67 files**
(737 + 37) · `build` ✓ · act guard **0** · `diff --check` clean. Bundle `index` 274.42 → **311.49 kB**
(gzip 83.35 → 96.59, **+13.2 kB**) — the workspace layer plus a new bilingual namespace, which is
bundled eagerly like every other locale file. `DossiersPage` is code-split (3.12 kB).

`schemaVersion` still `1.0.0`; `templateVersion` still `1.0.0`; export contract unchanged;
`localStorage` still exactly two non-personal keys.

### Next

Nothing in the workspace layer is half-built, but note: rename is not implemented (titles are
derived), there is no cross-tab sync (two tabs on the same dossier will last-write-wins), and
`STORAGE_FORMAT_VERSION` is 1 with an empty migration ladder — the seam exists and is tested, but
has never been exercised by a real migration.

---

# Iteration 27 — v1.1: Dossier identity, rename & cross-tab safety

Baseline `eca76e8`, clean, CI green, 774/774. Iteration 26 shipped saved dossiers with one line of
honest debt in its own handoff: *"there is no cross-tab sync (two tabs on the same dossier will
last-write-wins)"*. That is data loss, not a rough edge, and this iteration closes it — along with
the other gap it named, rename.

### The bug was exact, and so was its home

`writeNow` called `repo.get(id)` and then `repo.put(...)` in **two separate IndexedDB
transactions**. Anything another tab committed in between was overwritten with no error and no
trace. `openDossier` had the same shape for its `lastOpenedAt` touch — meaning merely *opening* a
dossier could destroy an edit.

The fix needed no new primitive: the adapter's existing `run()` helper already scopes a body to one
transaction, and IndexedDB serialises transactions per object store. Read, compare and write inside
one `readwrite` transaction is atomic. `put(record, expectedRevision?)` returns
`{ok:true, revision} | {ok:false, reason:'conflict', currentRevision} | {ok:false, reason:'deleted'}`.

### Revisions are the mechanism; messages are a courtesy

`BroadcastChannel` was measured to work in this repo's jsdom before it was designed in, so cross-tab
behaviour is deterministically testable with no abstraction port. But it is deliberately **not**
load-bearing: a whole test suite runs the same scenarios with `BroadcastChannel` stubbed to
`undefined` and expects identical protection. A design whose correctness depends on a message
arriving is a design that loses data the day it does not.

### Two real bugs that only a real browser could show

Both were found by the two-tab CDP run, not by 811 passing tests:

1. **The channel was dead in development.** It was built in a `useMemo` and closed by a separate
   cleanup effect — so React 19's StrictMode mount/cleanup/mount closed the only instance the memo
   would ever produce. Writes stayed safe (revisions do that), but every notification was silently
   lost. Now created and destroyed by the same effect. The regression test renders two tabs inside
   `<StrictMode>` and was confirmed to **fail against the old shape** before being kept.
2. **A replaced dossier left stale values in mounted forms.** `defaultValues` is read once, at
   mount, so "Open the saved version" changed the state without changing the screen. This also
   affected dossier *switching*, which shipped in Iteration 26. `DossierState` gained a `generation`
   counter that only wholesale swaps increment, and `<Outlet>` is keyed on it.

A third, quieter fix: autosave now compares the payload against what storage is known to hold, so a
freshly hydrated tab no longer writes back what it just read — which had also made a tab that merely
*looked* at a dossier announce a change to every other tab.

### The first real migration

`revision` and `title` change the stored shape, so `STORAGE_FORMAT_VERSION` went 1 → 2 with a
genuine step (`revision: 1`, `title: null`). Iteration 26 built that ladder and never used it; v1
records exist in a shipped build and in users' browsers, and they now upgrade in place rather than
being discarded.

### Rename is local, and stays local

`title` lives on the workspace record, never in `payload` and never in the exported file — asserted
against the exact exported key set, with `schemaVersion` still `1.0.0`. Empty or whitespace clears
back to `null` so the derived title returns, and an explicit title is never auto-overwritten when
applicant or destination data changes later. Inline on the card: Enter commits, Escape abandons,
focus returns to the pencil, and **blur does not commit** — clicking away from a half-typed name
must never rename someone's dossier.

### Harness lessons worth keeping

- `toHaveTextContent` is a **substring** match. `expect(active).not.toHaveTextContent('x')` passed
  ~90% of the time and failed whenever the generated id happened to contain an `x`. Compare ids
  exactly.
- An `afterEach` that calls `i18n.changeLanguage` runs **before** Testing Library's cleanup, so it
  re-renders a still-mounted tree and produces act warnings that have nothing to do with the code.
  Set the language in `beforeEach` only.
- In the CDP harness: `Page.addScriptToEvaluateOnNewDocument` persists across navigations (it needs
  `Page.removeScriptToEvaluateOnNewDocument`), a backgrounded tab does not paint so
  `Page.captureScreenshot` never resolves without `Page.bringToFront`, and a leftover profile
  silently satisfied a "does a dossier exist yet" poll — clear the origin's storage explicitly.

### Gates

`format:check` ✓ · `lint` **0 errors / 68 warnings** (unchanged from baseline) · `typecheck` ✓ ·
`test` **811/811, 69 files** (774 + 37) · `build` ✓ · act guard **0** · `diff --check` clean.
Bundle `index` 311.49 → **316.49 kB** (gzip 96.59 → 97.95, **+1.36 kB gzip**) — the conflict banner,
the rename editor, the channel, and their bilingual keys.

Verified in real Chrome across two tabs sharing one profile: 26 checks, all passing, including the
decisive one — a stale tab's write is refused and the newer data survives. Evidence in
`docs/manual-qa.md`.

`schemaVersion` still `1.0.0`; `templateVersion` still `1.0.0`; export contract unchanged;
`localStorage` still exactly two non-personal keys; the coordination channel carries ids and
revisions only.

### Next

Nothing here is half-built. Deliberately not done: field-level merging (ADR-037 argues against it),
any form of sync or collaboration, and encryption. The `generation` key remounts a whole page on a
dossier swap — correct, but if a page ever needs to preserve local UI state across a swap it will
need a finer-grained signal.
