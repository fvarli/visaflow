import { describe, it, expect } from 'vitest'
import {
  ONBOARDING_STEP_IDS,
  DEFAULT_DESTINATION_COUNTRY,
  deriveOnboardingStepStatuses,
  firstRunTarget,
  resolveStep,
  stepIndex,
} from '@/features/onboarding/onboarding-model'

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
  it('sends a brand-new visitor to the welcome flow', () => {
    expect(firstRunTarget(false)).toBe('/welcome')
  })

  it('sends a returning visitor with a dossier to the dashboard', () => {
    expect(firstRunTarget(true)).toBe('/dashboard')
  })
})

describe('onboarding-model — defaults', () => {
  it('starts a fresh dossier on the only configured pack', () => {
    expect(DEFAULT_DESTINATION_COUNTRY).toBe('GR')
  })
})
