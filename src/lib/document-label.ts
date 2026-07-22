/* eslint-disable @typescript-eslint/no-explicit-any */
import { dynamicT } from './i18n-dynamic'

/** Any `t`, regardless of the namespaces it was bound to. */
type AnyT = (...args: any[]) => any

/**
 * Resolve a document's display label from its stable code.
 *
 * `Document.code` is the identity; the label is presentation. Resolution
 * order:
 *
 *   1. the translated requirement name for this code
 *   2. a legacy `name` stored by an older export (pre-i18n dossiers)
 *   3. the raw code, so a custom document never renders as blank
 *
 * Step 2 is what keeps old files readable without letting the UI language
 * leak back into exported JSON — nothing here is ever written to state.
 */
export function documentLabel(
  t: AnyT,
  code: string,
  legacyName?: string
): string {
  const key = `visa-domain:requirements.${code}.name`
  const translated = dynamicT(t)(key, { defaultValue: '' })
  if (translated) return translated
  if (legacyName) return legacyName
  return code
}

/** Same resolution, for a list — used by findings that name several documents. */
export function documentLabels(
  t: AnyT,
  documents: { code: string; name?: string }[]
): string[] {
  return documents.map((doc) => documentLabel(t, doc.code, doc.name))
}
