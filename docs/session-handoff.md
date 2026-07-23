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
