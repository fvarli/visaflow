import { createDocumentId } from '@/domain/types/common'
import { isRequirementApplicable } from '@/config/types'
import type { DocumentRequirement, VisaTypeTemplate } from '@/config/types'
import type { Document } from '@/domain/schemas/document.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { DocumentCategory } from '@/domain/types/common'

/**
 * Template ↔ dossier reconciliation.
 *
 * A `Document` (applicant record) is created from a `DocumentRequirement`
 * (template) by copying the stable, language-independent `code` — never a
 * display name. Sync is deliberately additive: it proposes new applicable
 * requirements and flags ones no longer applicable, but never deletes
 * applicant data.
 */

const CUSTOM_CODE_PREFIX = 'CUSTOM-'

/** Build an applicant Document from a template requirement (seed + re-add). */
export function documentFromRequirement(
  req: DocumentRequirement,
  ownerId: string
): Document {
  return {
    id: createDocumentId(),
    code: req.code,
    category: req.category,
    ownerType: req.ownerType,
    ownerId,
    required: req.required,
    status: 'not_started',
    verified: false,
  }
}

/**
 * A user-added supporting document. `code` is a stable, generated identifier
 * (never a translated label); the user's title goes in `name` — legitimate
 * user data, so it stays identical across languages and 1.0.0-compatible.
 */
export function createCustomDocument(
  title: string,
  category: DocumentCategory,
  ownerId: string
): Document {
  return {
    id: createDocumentId(),
    code: `${CUSTOM_CODE_PREFIX}${createDocumentId()}`,
    name: title,
    category,
    ownerType: 'applicant',
    ownerId,
    required: false,
    status: 'not_started',
    verified: false,
  }
}

export function isCustomCode(code: string): boolean {
  return code.startsWith(CUSTOM_CODE_PREFIX)
}

/** Template requirements applicable given the current employment/financing. */
export function applicableRequirements(
  template: VisaTypeTemplate,
  application: Application | null
): DocumentRequirement[] {
  const context = {
    employment: application?.employment,
    financing: application?.financing,
  }
  return template.documentRequirements.filter((req) =>
    isRequirementApplicable(req, context)
  )
}

export interface TemplateSyncPlan {
  /** Applicable requirements not yet present in the dossier (by code). */
  toAdd: DocumentRequirement[]
  /** Template-derived documents whose requirement is no longer applicable. */
  noLongerApplicable: Document[]
}

/**
 * Reconcile the dossier against the template without mutating anything.
 * Additive: `toAdd` are missing applicable requirements; `noLongerApplicable`
 * are surfaced for the user to decide on — never auto-deleted.
 */
export function planTemplateSync(
  documents: Document[],
  application: Application | null,
  template: VisaTypeTemplate
): TemplateSyncPlan {
  const present = new Set(documents.map((d) => d.code))
  const applicable = applicableRequirements(template, application)
  const applicableCodes = new Set(applicable.map((r) => r.code))
  const templateCodes = new Set(
    template.documentRequirements.map((r) => r.code)
  )

  const toAdd = applicable.filter((req) => !present.has(req.code))
  const noLongerApplicable = documents.filter(
    (d) => templateCodes.has(d.code) && !applicableCodes.has(d.code)
  )
  return { toAdd, noLongerApplicable }
}

/** Requirements the user could re-add: applicable, present in template, absent. */
export function availableRequirementsToAdd(
  documents: Document[],
  application: Application | null,
  template: VisaTypeTemplate
): DocumentRequirement[] {
  return planTemplateSync(documents, application, template).toAdd
}
