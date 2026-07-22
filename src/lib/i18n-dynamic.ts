/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Escape hatch for translation keys that are computed at runtime.
 *
 * `t()` is strictly typed against the resource files, which is what we want
 * almost everywhere — a typo becomes a compile error. But some keys genuinely
 * are data: a requirement's `nameKey`, a finding's `messageKey`, an enum
 * value interpolated into a path. Those cannot be known statically.
 *
 * Rather than weaken the types globally, dynamic call sites opt out here.
 * Coverage for these keys comes from the i18n parity and rendering tests
 * instead of the compiler.
 */
export type DynamicTFunction = (
  key: string,
  options?: Record<string, unknown>
) => string

/**
 * Accepts any `t` regardless of which namespaces it was bound to — the whole
 * point is that the key is not statically known.
 */
export function dynamicT(t: (...args: any[]) => any): DynamicTFunction {
  return t
}
