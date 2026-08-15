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
