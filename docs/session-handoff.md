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
| Country config | `src/config/countries/greece.ts` |
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

- `README.md` - User-facing documentation
- `CONTRIBUTING.md` - Contribution guidelines
- `SECURITY.md` - Security policy
- `docs/architecture.md` - System design
- `docs/privacy.md` - Privacy model
- `docs/json-schema.md` - JSON format
- `docs/adding-a-country.md` - Country config guide
- `docs/decisions.md` - Architectural decisions
- `docs/roadmap.md` - Future plans
- `docs/current-status.md` - Implementation status

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
