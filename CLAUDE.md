# VisaFlow - Project Memory

This file provides context for AI assistants working on this codebase.

## Quick Commands

```bash
pnpm dev          # Start development server (http://localhost:5173)
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix auto-fixable lint issues
pnpm typecheck    # Run TypeScript type checking
pnpm test         # Run tests (Vitest)
pnpm test:watch   # Run tests in watch mode
pnpm build        # Production build
pnpm format       # Format code with Prettier
```

## Project Overview

VisaFlow is the open-source, privacy-first application workspace for international visa
preparation — a structured dossier, validation engine, timeline, and country-specific
requirements. Greece (Schengen short-stay tourism) is the first implemented country pack; the
architecture is built to add more. See `docs/vision.md`.

**Key principle:** All personal data stays in-memory. No localStorage for data, no external APIs,
no tracking. Users explicitly export/import JSON files.

## Technology Stack

- React 19 + TypeScript (strict mode)
- Vite 8 + Tailwind CSS v4
- shadcn/ui (new-york style, neutral theme)
- React Router v7 (lazy-loaded pages)
- React Hook Form + Zod v4
- date-fns for dates
- Vitest for testing

## Project Structure

```
src/
├── app/providers/         # DossierProvider (React Context + useReducer)
├── app/router/            # Route definitions
├── components/ui/         # shadcn/ui components
├── components/layout/     # AppLayout, Sidebar
├── domain/schemas/        # Zod schemas (source of truth)
├── domain/rules/          # Pure function validation rules
├── domain/types/          # Branded types (ApplicantId, DocumentId, etc.)
├── config/countries/      # Country-specific document requirements
├── features/import-export/# JSON import/export services
├── pages/                 # Page components
├── data/examples/         # Example dossier JSON
└── tests/                 # Unit tests
```

## Key Conventions

### TypeScript
- Strict mode enabled with `noUncheckedIndexedAccess`
- Use Zod schemas for runtime validation and type inference
- Use branded types for IDs (`ApplicantId`, `DocumentId`, etc.)
- Avoid `any`; prefer `unknown` when type is truly unknown

### Validation Rules
- All rules are pure functions: `(dossier: Dossier) => ValidationFinding[]`
- Rules live in `src/domain/rules/`
- Each rule returns an array of findings (may be empty)
- Rules are composed in `src/domain/rules/runner.ts`

### State Management
- Single `DossierContext` using React `useReducer`
- Actions: `LOAD_DOSSIER`, `UPDATE_APPLICANT`, `ADD_DOCUMENT`, etc.
- No external state library needed

### Privacy Constraints
- NEVER use localStorage for personal data
- NEVER make external API calls
- NEVER add analytics or tracking
- Data exists only in browser memory until exported
- The ONLY permitted localStorage keys are `visaflow-theme` and
  `visaflow-locale` — non-personal interface preferences (ADR-006/ADR-013)

### Internationalization
- Bilingual (Turkish default, English). Never hardcode user-visible text —
  add a key under `src/i18n/locales/{tr,en}/<namespace>.json` and render via
  `useTranslation()`. `tr` and `en` must carry identical keys (parity test).
- `t()` is strictly typed; for keys computed at runtime use
  `dynamicT()` from `src/lib/i18n-dynamic.ts`.
- Format dates/numbers/currency only through `src/lib/format.ts`
  (`useFormatters()`), never `Intl` directly. Stored values stay ISO/raw.
- Domain values (enums, `code`, `visaType`, finding `id`/`ruleId`) are
  language-independent; only presentation is translated. Exported JSON must
  not change with language.
- No visa approval/refusal prediction, ever (ADR-016).

### Forms
- Use React Hook Form with `@hookform/resolvers/zod`
- Form schemas should match or extend domain schemas

### Country Configurations
- `country → visa type → requirements`; requirements carry translation keys,
  not prose (`nameKey`/`descriptionKey`/`notesKey`)
- Located in `src/config/countries/<country>/`; resolve with
  `resolveVisaTemplate(countryCode, visaType)`
- Support conditional requirements (e.g., "required if employed")
- Source metadata is honest: no scraping, no invented dates; unverified stays
  `unverified` (ADR-015). Greece Schengen tourism is the first implemented pack;
  add more via `docs/country-pack-guide.md`.

## Testing

- Tests use Vitest + Testing Library
- Focus on validation rules and schema validation
- Test files: `src/tests/`
- Run: `pnpm test`

## Important Files

| File | Purpose |
|------|---------|
| `src/app/providers/DossierProvider.tsx` | Central state management |
| `src/domain/rules/runner.ts` | Validation rule composition |
| `src/domain/schemas/dossier.schema.ts` | Combined schema for import/export |
| `src/config/countries/greece/` | Greece country pack (first implemented) |
| `src/features/dashboard/dashboard-model.ts` | Dashboard presentation adapter |
| `src/data/examples/example-dossier.json` | Sample data for testing |

## Common Tasks

### Adding a validation rule
1. Create function in `src/domain/rules/`
2. Import and add to `allRules` array in `runner.ts`
3. Add tests in `src/tests/rules/`

### Adding a new country
1. Create the pack under `src/config/countries/<country>/`
2. Register it in `src/config/countries/index.ts`
3. See `docs/country-pack-guide.md` for details

### Adding a new page
1. Create page component in `src/pages/`
2. Add lazy import in `src/app/router/routes.tsx`
3. Add route in router configuration
4. Add navigation link in `AppSidebar`

## Warnings to Ignore

ESLint may show `react-refresh/only-export-components` warnings for route files and context providers. These are acceptable.

## Documentation

- `docs/vision.md` - Product vision, why it exists, Current/Next/Future
- `docs/principles.md` - Product & engineering principles (tied to ADRs)
- `docs/architecture.md` - System map + layer boundaries (canonical)
- `docs/validation-engine.md` - Rules, findings, the i18n boundary
- `docs/dashboard-architecture.md` - Widget-based dashboard + presentation adapter
- `docs/country-pack-guide.md` - Country pack concept + authoring guide
- `docs/playground.md` - The component workbench + demonstrate-before-use rule
- `docs/privacy.md` - Privacy model + data ownership (canonical)
- `docs/json-schema.md` - JSON import/export format
- `docs/roadmap.md` - Product phases
- `docs/decisions.md` - Architectural decision records (ADRs)
