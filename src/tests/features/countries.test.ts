import { describe, it, expect } from 'vitest'
import {
  COUNTRY_CODES,
  getCountryName,
  getCountryOptions,
  normalizeForSearch,
  searchCountries,
} from '@/lib/countries'

/**
 * The country adapter is pure — names come from `Intl.DisplayNames` (full ICU in
 * Node), codes are the persisted value. These tests pin the localization, the
 * Turkish-aware search, and the unknown-code fallback.
 */

describe('getCountryName', () => {
  it('localizes by ISO code for tr and en', () => {
    expect(getCountryName('GR', 'en')).toBe('Greece')
    expect(getCountryName('GR', 'tr')).toBe('Yunanistan')
    expect(getCountryName('TR', 'tr')).toBe('Türkiye')
    expect(getCountryName('FR', 'tr')).toBe('Fransa')
  })

  it('falls back to the raw code for an unknown/invalid code', () => {
    expect(getCountryName('Z1', 'en')).toBe('Z1')
    expect(getCountryName('gr', 'en')).toBe('Greece') // case-insensitive input
  })
})

describe('getCountryOptions', () => {
  it('returns one localized option per bundled code, sorted by name', () => {
    const options = getCountryOptions('en')
    expect(options).toHaveLength(COUNTRY_CODES.length)
    const names = options.map((o) => o.name)
    expect([...names]).toEqual(
      [...names].sort((a, b) => a.localeCompare(b, 'en-GB'))
    )
    // The persisted value is always the ISO code.
    expect(options.find((o) => o.name === 'Greece')?.code).toBe('GR')
  })
})

describe('searchCountries', () => {
  it('matches by localized name and by ISO code', () => {
    expect(searchCountries('greece', 'en').some((o) => o.code === 'GR')).toBe(
      true
    )
    expect(searchCountries('yunan', 'tr').some((o) => o.code === 'GR')).toBe(
      true
    )
    expect(searchCountries('gr', 'en')[0]?.code).toBe('GR') // exact code ranks first
  })

  it('is Turkish-diacritic and case insensitive', () => {
    expect(searchCountries('türkiye', 'tr').some((o) => o.code === 'TR')).toBe(
      true
    )
    expect(searchCountries('turkiye', 'tr').some((o) => o.code === 'TR')).toBe(
      true
    )
    expect(searchCountries('FRAN', 'tr').some((o) => o.code === 'FR')).toBe(
      true
    )
  })

  it('returns all options for an empty query', () => {
    expect(searchCountries('', 'en')).toHaveLength(COUNTRY_CODES.length)
  })
})

describe('normalizeForSearch', () => {
  it('folds Turkish characters and diacritics to ASCII lowercase', () => {
    expect(normalizeForSearch('Türkiye')).toBe('turkiye')
    expect(normalizeForSearch('İSVEÇ')).toBe('isvec')
  })
})
