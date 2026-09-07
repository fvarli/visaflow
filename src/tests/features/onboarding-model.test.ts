import { describe, it, expect } from 'vitest'
import {
  ONBOARDING_STEP_IDS,
  DEFAULT_DESTINATION_COUNTRY,
  deriveOnboardingStepStatuses,
  firstRunTarget,
  resolveStep,
  stepIndex,
} from '@/features/onboarding/onboarding-model'
import { hasCountryConfig } from '@/config/countries'

describe('onboarding-model — resolveStep', () => {
  it('accepts every known step id', () => {
    for (const id of ONBOARDING_STEP_IDS) {
      expect(resolveStep(id)).toBe(id)
    }
  })

  it('falls back to welcome for unknown or missing params', () => {
    expect(resolveStep('zzz')).toBe('welcome')
    expect(resolveStep('')).toBe('welcome')
    expect(resolveStep(null)).toBe('welcome')
  })
})

describe('onboarding-model — stepIndex', () => {
  it('maps ids to their flow position', () => {
    expect(stepIndex('welcome')).toBe(0)
    expect(stepIndex('setup')).toBe(1)
    expect(stepIndex('create')).toBe(2)
    expect(stepIndex('ready')).toBe(3)
  })
})

describe('onboarding-model — deriveOnboardingStepStatuses', () => {
  it('marks passed steps complete, the active one current, the rest upcoming', () => {
    expect(deriveOnboardingStepStatuses(0)).toEqual([
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
    expect(deriveOnboardingStepStatuses(2)).toEqual([
      'complete',
      'complete',
      'current',
      'upcoming',
    ])
    expect(deriveOnboardingStepStatuses(3)).toEqual([
      'complete',
      'complete',
      'complete',
      'current',
    ])
  })
})

describe('onboarding-model — firstRunTarget', () => {
  it('sends a genuinely new visitor to the welcome flow', () => {
    expect(firstRunTarget({ hasData: false, savedCount: 0 })).toBe('/welcome')
  })

  it('sends a visitor with a dossier open to the dashboard', () => {
    expect(firstRunTarget({ hasData: true, savedCount: 1 })).toBe('/dashboard')
  })

  it('sends someone with saved work but nothing open to their dossiers', () => {
    // The case that used to dump a returning user into onboarding: they have a
    // workspace, they just are not inside any one dossier (ADR-040).
    expect(firstRunTarget({ hasData: false, savedCount: 3 })).toBe('/dossiers')
  })

  it('never chooses the welcome flow for someone who has saved work', () => {
    for (const savedCount of [1, 2, 10]) {
      expect(firstRunTarget({ hasData: false, savedCount })).not.toBe(
        '/welcome'
      )
    }
  })

  it('prefers the open dossier over the list, however many are saved', () => {
    expect(firstRunTarget({ hasData: true, savedCount: 7 })).toBe('/dashboard')
    // A session-only dossier has no saved record but is still open work.
    expect(firstRunTarget({ hasData: true, savedCount: 0 })).toBe('/dashboard')
  })
})

describe('onboarding-model — defaults', () => {
  it('starts a fresh dossier on a pack that is actually configured', () => {
    // Both halves matter. The constant is Greece by choice — the longest-
    // verified pack, and a default that reshuffled when a country was
    // registered would change what a new user starts with for no visible
    // reason. And whatever it is, a pack must exist for it, which is the part
    // that would have caught a default pointing at an unbuilt country.
    expect(DEFAULT_DESTINATION_COUNTRY).toBe('GR')
    expect(hasCountryConfig(DEFAULT_DESTINATION_COUNTRY)).toBe(true)
  })
})
