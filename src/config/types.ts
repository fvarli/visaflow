import type { DocumentCategory, OwnerType } from '@/domain/types/common'

export interface ConditionalRequirement {
  field: string
  operator: 'equals' | 'notEquals' | 'exists' | 'notExists' | 'includes'
  value?: string | boolean | number
}

export interface DocumentRequirement {
  code: string
  name: string
  category: DocumentCategory
  ownerType: OwnerType
  required: boolean
  conditionalOn?: ConditionalRequirement
  description?: string
  notes?: string
  validityPeriodDays?: number
  officialSource?: string
}

export interface PreparationMilestone {
  id: string
  name: string
  description: string
  daysBeforeAppointment: number
  relatedDocuments?: string[]
}

export interface CountryConfig {
  id: string
  name: string
  visaType: string
  schengenMember: boolean
  embassy?: {
    name: string
    website?: string
    appointmentUrl?: string
  }
  documentRequirements: DocumentRequirement[]
  preparationMilestones: PreparationMilestone[]
  notes?: string[]
  disclaimer: string
  lastUpdated: string
}

// Helper to check if a document requirement is applicable
export function isRequirementApplicable(
  requirement: DocumentRequirement,
  context: Record<string, unknown>
): boolean {
  if (!requirement.conditionalOn) return true

  const { field, operator, value } = requirement.conditionalOn
  const fieldValue = getNestedValue(context, field)

  switch (operator) {
    case 'equals':
      return fieldValue === value
    case 'notEquals':
      return fieldValue !== value
    case 'exists':
      return (
        fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
      )
    case 'notExists':
      return (
        fieldValue === undefined || fieldValue === null || fieldValue === ''
      )
    case 'includes':
      return Array.isArray(fieldValue) && fieldValue.includes(value)
    default:
      return true
  }
}

// Helper to get nested object value by dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}
