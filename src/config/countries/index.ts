import type {
  CountryConfig,
  RequirementSource,
  VisaTypeTemplate,
} from '../types'
import type { VisaType } from '@/domain/types/common'
import { greeceConfig } from './greece'

/**
 * Registry of country templates: country → visa type → requirements.
 *
 * Adding a country means adding one entry here plus its folder under
 * `countries/`. Nothing else in the app needs to change. Only templates
 * backed by real content belong here — an empty placeholder country would
 * imply support that does not exist.
 */
const countryRegistry: Record<string, CountryConfig> = {
  GR: greeceConfig,
}

export function getCountryConfig(
  countryCode: string
): CountryConfig | undefined {
  return countryRegistry[countryCode]
}

export function getAllCountryConfigs(): CountryConfig[] {
  return Object.values(countryRegistry)
}

export function getAvailableCountryCodes(): string[] {
  return Object.keys(countryRegistry)
}

export function hasCountryConfig(countryCode: string): boolean {
  return countryCode in countryRegistry
}

/**
 * Resolve the template for a dossier.
 *
 * The dossier persists a country code and the `visaType` enum (for example
 * `short_stay_tourism`); this maps that pair onto a template id such as
 * `schengen-short-stay-tourism`. The persisted enum is never changed — the
 * template id is a configuration-side identifier only.
 *
 * Falls back to the country's first template when the country is known but
 * the specific visa type has no template yet, so a dossier never renders an
 * empty checklist just because a visa type was switched.
 */
export function resolveVisaTemplate(
  countryCode: string | undefined,
  visaType?: VisaType
): VisaTypeTemplate | undefined {
  if (!countryCode) return undefined
  const country = countryRegistry[countryCode]
  if (!country || country.visaTypes.length === 0) return undefined

  if (visaType) {
    const exact = country.visaTypes.find((t) => t.visaType === visaType)
    if (exact) return exact
  }
  return country.visaTypes[0]
}

/** Look up a source record by id within a country template. */
export function getRequirementSource(
  countryCode: string | undefined,
  sourceId: string
): RequirementSource | undefined {
  if (!countryCode) return undefined
  return countryRegistry[countryCode]?.sources?.find((s) => s.id === sourceId)
}

/** All source records referenced by a requirement, in declaration order. */
export function getSourcesForRefs(
  countryCode: string | undefined,
  sourceRefs: string[] | undefined
): RequirementSource[] {
  if (!countryCode || !sourceRefs?.length) return []
  return sourceRefs
    .map((id) => getRequirementSource(countryCode, id))
    .filter((s): s is RequirementSource => s !== undefined)
}

export { greeceConfig } from './greece'
export {
  commonSchengenDocuments,
  commonPreparationMilestones,
} from './common/schengen-short-stay'
