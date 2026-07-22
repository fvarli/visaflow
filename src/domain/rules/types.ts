import type { Dossier } from '../schemas/dossier.schema'

export type ValidationSeverity = 'error' | 'warning' | 'info'

/**
 * Values a finding message interpolates.
 *
 * Deliberately split by kind so the UI knows how to render each one without
 * guessing. The domain layer stores raw, language-independent data — ISO
 * dates, numeric amounts, document codes — and the presentation layer formats
 * them for the active locale. Nothing here is ever pre-formatted prose.
 */
export interface FindingParams {
  /** Interpolated as-is: names, country codes, counts. */
  values?: Record<string, string | number>
  /** ISO dates the UI formats for the active locale. */
  dates?: Record<string, string>
  /** Document codes the UI resolves to translated labels and joins. */
  documentCodes?: Record<string, string[]>
  /** Amounts the UI formats with the active locale's currency rules. */
  money?: Record<string, { amount: number; currency: string }>
  /**
   * Full translation keys for enum values (e.g. a sponsor relationship). The
   * key itself is language-independent, so the domain stays free of prose.
   */
  enumKeys?: Record<string, string>
}

/**
 * A validation finding.
 *
 * Findings are computed at render time and are NEVER persisted to exported
 * JSON, so this shape is free to evolve. It carries stable, machine-readable
 * identity only — translated prose is resolved at the UI boundary from
 * `messageKey`, so wording can change without altering finding identity.
 */
export interface ValidationFinding {
  /** Stable identity, unique per occurrence. Used for keys and tests. */
  id: string
  /** Stable identity of the rule that produced this finding. */
  ruleId: string
  severity: ValidationSeverity
  /**
   * Base translation key within the `validation` namespace, e.g.
   * `findings.passportValidityInsufficient`. The UI resolves `.title`,
   * `.description` and the suggested action from it.
   */
  messageKey: string
  messageParams?: FindingParams
  /** Defaults to `${messageKey}.action` when omitted. */
  suggestedActionKey?: string
  relatedFields: string[]
}

export type ValidationRule = (dossier: Dossier) => ValidationFinding[]

export interface ValidationRuleDefinition {
  id: string
  name: string
  description: string
  rule: ValidationRule
  enabled: boolean
}

export interface ValidationResult {
  findings: ValidationFinding[]
  errorCount: number
  warningCount: number
  infoCount: number
  passedRules: number
  totalRules: number
}
