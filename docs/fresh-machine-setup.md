# Fresh Machine Setup

This guide covers setting up VisaFlow development on a new machine.

## Prerequisites

### Node.js 22+

Using nvm (recommended):
```bash
# Install nvm (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Restart terminal, then:
nvm install 22
nvm use 22
node --version  # Should show v22.x.x or higher
```

Or download directly from https://nodejs.org/

### pnpm

Enable via Corepack (bundled with Node.js 16.13+):
```bash
corepack enable
corepack prepare pnpm@11.15.1 --activate
pnpm --version  # Should show 11.15.1
```

Or install standalone:
```bash
npm install -g pnpm
```

### Git

```bash
git --version  # Should show 2.x or higher
```

Install via your OS package manager if missing.

## Clone and Install

```bash
# Clone the repository
git clone https://github.com/fvarli/visaflow.git
cd visaflow

# Install dependencies
pnpm install

# Verify installation
pnpm typecheck && pnpm test && pnpm build
```

All commands should succeed.

## Development Server

```bash
pnpm dev
```

Open http://localhost:5173 in your browser.

## IDE Setup

### VS Code (Recommended)

Recommended extensions:
- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar) - for better TS support

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

### JetBrains (WebStorm/IntelliJ)

- Enable ESLint integration
- Enable Prettier integration
- Use project TypeScript version

## Verification Checklist

After setup, verify:

- [ ] `pnpm dev` starts server at http://localhost:5173
- [ ] `pnpm lint` runs (warnings OK, errors not OK)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (see `docs/current-status.md` for the current count)
- [ ] `pnpm build` completes successfully
- [ ] "Load Example Data" works in browser

## Troubleshooting

### `command not found: pnpm`

```bash
corepack enable
hash -r  # Refresh command cache
pnpm --version
```

### Wrong Node version

```bash
nvm use    # Uses version from .nvmrc
# or
nvm install 22 && nvm use 22
```

### Package install fails

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript errors in IDE

Restart TypeScript server:
- VS Code: Cmd/Ctrl+Shift+P > "TypeScript: Restart TS Server"
- WebStorm: File > Invalidate Caches > Restart

### Port 5173 in use

```bash
# Kill existing process
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill

# Or use different port
pnpm dev -- --port 3000
```

### Tests fail on fresh install

```bash
# Clear Vitest cache
pnpm test -- --clearCache
pnpm test
```

## Next Steps

After setup:
1. Read `CLAUDE.md` for project conventions
2. Read `docs/architecture.md` for system design
3. Explore the codebase starting from `src/app/`
4. Load example data and test the UI
