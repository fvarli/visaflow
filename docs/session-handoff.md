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
