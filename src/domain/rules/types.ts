import type { Dossier } from '../schemas/dossier.schema'

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationFinding {
  id: string
  severity: ValidationSeverity
  title: string
  description: string
  relatedFields: string[]
  suggestedAction: string
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
