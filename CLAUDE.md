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

VisaFlow is a privacy-first visa application dossier and document checklist manager. It helps users organize documents required for Schengen visa applications.

**Key principle:** All data stays in-memory. No localStorage, no external APIs, no tracking. Users explicitly export/import JSON files.

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

### Forms
- Use React Hook Form with `@hookform/resolvers/zod`
- Form schemas should match or extend domain schemas

### Country Configurations
- Document requirements are configuration, not code
- Located in `src/config/countries/`
- Support conditional requirements (e.g., "required if employed")
- Currently only Greece Schengen tourism is implemented

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
| `src/config/countries/greece.ts` | Greece document requirements |
| `src/data/examples/example-dossier.json` | Sample data for testing |

## Common Tasks

### Adding a validation rule
1. Create function in `src/domain/rules/`
2. Import and add to `allRules` array in `runner.ts`
3. Add tests in `src/tests/rules/`

### Adding a new country
1. Create config in `src/config/countries/[country].ts`
2. Export from `src/config/countries/index.ts`
3. See `docs/adding-a-country.md` for details

### Adding a new page
1. Create page component in `src/pages/`
2. Add lazy import in `src/app/router/routes.tsx`
3. Add route in router configuration
4. Add navigation link in `AppSidebar`

## Warnings to Ignore

ESLint may show `react-refresh/only-export-components` warnings for route files and context providers. These are acceptable.

## Documentation

- `docs/architecture.md` - System design
- `docs/privacy.md` - Privacy model details
- `docs/json-schema.md` - JSON format documentation
- `docs/adding-a-country.md` - Country configuration guide
