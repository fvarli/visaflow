import type { Dossier } from '../schemas/dossier.schema'
import type { ApplicabilityContext, VisaTypeTemplate } from '@/config/types'

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

/**
 * Everything a rule is allowed to read, resolved once by the caller.
 *
 * `template` is here because requiredness and completion standing are template
 * facts, not record facts. Two rules used to decide requiredness from
 * `Document.required` — the flag written when the record was seeded — so a pack
 * that later made a document mandatory left the readiness ring and the findings
 * list disagreeing about the same dossier.
 *
 * A rule must **not** resolve the template itself. One caller resolving it and
 * passing it down is what keeps every surface answering from the same
 * composition; a resolver call per rule is how the same semantics start drifting
 * between consumers.
 *
 * It is a context rather than a second positional argument so the next thing
 * validation genuinely needs does not widen every signature again. It is
 * deliberately *not* a general rule-engine context: it holds what the rules
 * read today and nothing speculative.
 */
export interface ValidationContext {
  dossier: Dossier
  /**
   * Required, and nullable. A dossier with no destination has no template, and
   * making the field optional would let a caller forget it and silently get the
   * old record-only semantics back.
   */
  template: VisaTypeTemplate | undefined
  /**
   * Applicability, built once by the caller rather than by each rule.
   *
   * Required for the same reason `template` is. The rules used to derive this
   * themselves from `dossier.application`, which is an `Application` and not a
   * context — so they saw employment and financing and never nationality, and
   * a nationality-conditional requirement was outstanding in readiness while
   * the consistency centre said nothing about it. Handing the built context
   * down is what keeps one dossier giving one answer; a rule that builds its
   * own is the failure this field exists to remove.
   */
  applicability: ApplicabilityContext
}

export type ValidationRule = (context: ValidationContext) => ValidationFinding[]

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
