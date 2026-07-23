import type { resources, defaultNS } from './index'

/**
 * Types `t()` against the actual resource files, so a typo in a key or a
 * namespace is a compile error rather than a string rendered raw in the UI.
 *
 * English is used as the shape reference only — a parity test asserts the
 * Turkish files carry exactly the same keys.
 *
 * Note: components should call `useTranslation(<namespaces>)` with the
 * namespaces they use (never the no-argument form), so `t`'s key type is a
 * union over just those namespaces. Binding `t` to every namespace at once
 * makes the combined key union large enough to trip TypeScript's
 * instantiation-depth limit (TS2589); scoping keeps it cheap.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: (typeof resources)['en']
    returnNull: false
  }
}

export {}
