import type { Application } from '@/domain/schemas/application.schema'
import type { VisaTypeTemplate } from '@/config/types'
import { applicableRequirements } from '@/features/documents/template-sync'

/**
 * The bridge from the country pack to readiness.
 *
 * A dossier is created with `documents: []` and is only seeded from the
 * template when the applicant first opens the Documents workspace. Without this,
 * readiness would read 100% for a brand-new dossier that has collected nothing,
 * and the Final Review checklist would contradict it by listing every
 * requirement as missing.
 *
 * Only **required** requirements are returned: optional ones are genuinely
 * optional and must never enter the readiness denominator.
 */
export function requiredRequirementCodes(
  template: VisaTypeTemplate | undefined,
  application: Application | null
): string[] {
  if (!template) return []
  return applicableRequirements(template, application)
    .filter((req) => req.required)
    .map((req) => req.code)
}
