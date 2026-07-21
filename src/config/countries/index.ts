import type { CountryConfig } from '../types'
import { greeceConfig } from './greece'

// Registry of all available country configurations
const countryRegistry: Record<string, CountryConfig> = {
  GR: greeceConfig,
}

/**
 * Get a country configuration by its code
 */
export function getCountryConfig(
  countryCode: string
): CountryConfig | undefined {
  return countryRegistry[countryCode]
}

/**
 * Get all available country configurations
 */
export function getAllCountryConfigs(): CountryConfig[] {
  return Object.values(countryRegistry)
}

/**
 * Get list of available country codes
 */
export function getAvailableCountryCodes(): string[] {
  return Object.keys(countryRegistry)
}

/**
 * Check if a country configuration exists
 */
export function hasCountryConfig(countryCode: string): boolean {
  return countryCode in countryRegistry
}

// Re-export individual configs for direct access
export { greeceConfig } from './greece'
export {
  commonSchengenDocuments,
  commonPreparationMilestones,
} from './common-schengen'
