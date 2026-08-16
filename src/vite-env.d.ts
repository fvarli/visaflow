/// <reference types="vite/client" />

/**
 * The application version, injected at build time from `package.json` by the
 * `define` block in `vite.config.ts` and `vitest.config.ts`. Keeping it a
 * build-time constant means `package.json` stays the single source of truth
 * without being imported into the client bundle.
 */
declare const __APP_VERSION__: string
