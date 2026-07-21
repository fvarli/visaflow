import type { Dossier } from '../schemas/dossier.schema'
import type {
  ValidationRule,
  ValidationResult,
  ValidationFinding,
} from './types'
import { tripRules } from './trip.rules'
import { passportRules } from './passport.rules'
import { accommodationRules } from './accommodation.rules'
import { insuranceRules } from './insurance.rules'
import { employmentRules } from './employment.rules'
import { documentRules } from './document.rules'
import { sponsorRules } from './sponsor.rules'

// Combine all rules
const allRules: ValidationRule[] = [
  ...tripRules,
  ...passportRules,
  ...accommodationRules,
  ...insuranceRules,
  ...employmentRules,
  ...documentRules,
  ...sponsorRules,
]

/**
 * Run all validation rules against a dossier
 */
export function runValidation(dossier: Dossier): ValidationResult {
  const findings: ValidationFinding[] = []
  let passedRules = 0

  for (const rule of allRules) {
    try {
      const ruleFindings = rule(dossier)
      if (ruleFindings.length === 0) {
        passedRules++
      }
      findings.push(...ruleFindings)
    } catch (error) {
      // Log error but continue with other rules
      console.error('Validation rule error:', error)
    }
  }

  // Sort findings by severity: errors first, then warnings, then info
  const severityOrder = { error: 0, warning: 1, info: 2 }
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return {
    findings,
    errorCount: findings.filter((f) => f.severity === 'error').length,
    warningCount: findings.filter((f) => f.severity === 'warning').length,
    infoCount: findings.filter((f) => f.severity === 'info').length,
    passedRules,
    totalRules: allRules.length,
  }
}

/**
 * Run specific rules by their IDs
 */
export function runSpecificRules(
  dossier: Dossier,
  ruleIds: string[]
): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  for (const rule of allRules) {
    const ruleFindings = rule(dossier)
    const matchingFindings = ruleFindings.filter((f) => ruleIds.includes(f.id))
    findings.push(...matchingFindings)
  }

  return findings
}

/**
 * Get only errors from validation
 */
export function getValidationErrors(dossier: Dossier): ValidationFinding[] {
  const result = runValidation(dossier)
  return result.findings.filter((f) => f.severity === 'error')
}

/**
 * Check if dossier has any validation errors
 */
export function hasValidationErrors(dossier: Dossier): boolean {
  const result = runValidation(dossier)
  return result.errorCount > 0
}

/**
 * Get validation summary for display
 */
export function getValidationSummary(dossier: Dossier): {
  isValid: boolean
  errors: number
  warnings: number
  info: number
  totalFindings: number
} {
  const result = runValidation(dossier)
  return {
    isValid: result.errorCount === 0,
    errors: result.errorCount,
    warnings: result.warningCount,
    info: result.infoCount,
    totalFindings: result.findings.length,
  }
}
