import type { resources, defaultNS } from './index'

/**
 * Types `t()` against the actual resource files, so a typo in a key or a
 * namespace is a compile error rather than a string rendered raw in the UI.
 *
 * English is used as the shape reference only — a parity test asserts the
 * Turkish files carry exactly the same keys.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: (typeof resources)['en']
    returnNull: false
  }
}

export {}
