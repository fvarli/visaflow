import { describe, it, expect } from 'vitest'
import {
  buildSettingsModel,
  resolveSection,
  SETTINGS_SECTION_IDS,
  STORAGE_KEYS,
  type SettingsInput,
} from '@/features/settings/settings-model'
import { greeceTourismTemplate } from '@/config/countries/greece'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'

const application = (destinationCountry?: string): Application => ({
  applicationId: 'app1',
  applicantId: 'a1',
  destinationCountry: destinationCountry ?? 'GR',
  visaType: 'short_stay_tourism',
  status: 'draft',
  createdAt: new Date().toISOString(),
  sponsorIds: [],
  documentIds: [],
  notes: [],
})

const input = (overrides: Partial<SettingsInput> = {}): SettingsInput => ({
  applicant: null,
  application: null,
  documents: [],
  sponsors: [],
  persistence: 'saved',
  backup: 'never',
  ...overrides,
})

const doc: Document = {
  id: 'd1',
  code: 'BANK_STATEMENTS',
  category: 'financial',
  ownerType: 'applicant',
  ownerId: 'a1',
  required: true,
  status: 'ready',
  verified: true,
}

describe('resolveSection', () => {
  it('accepts a valid section', () => {
    expect(resolveSection('privacy')).toBe('privacy')
    expect(resolveSection('about')).toBe('about')
  })
  it('falls back to appearance for unknown or missing', () => {
    expect(resolveSection('nope')).toBe('appearance')
    expect(resolveSection(null)).toBe('appearance')
  })
  it('exposes the eight sections in rail order', () => {
    expect(SETTINGS_SECTION_IDS).toHaveLength(8)
    expect(SETTINGS_SECTION_IDS[0]).toBe('appearance')
  })
})

describe('buildSettingsModel — packs', () => {
  it('lists installed packs with their honest review status', () => {
    const model = buildSettingsModel(input())
    expect(model.packs.length).toBeGreaterThan(0)
    const greece = model.packs.find((p) => p.countryCode === 'GR')
    expect(greece).toBeTruthy()
    // Read the status from the pack rather than pinning a literal: the point
    // is that the model reports what the pack declares, and a later
    // verification sprint must not have to edit this test (ADR-047).
    expect(greece?.templates[0]?.reviewStatus).toBe(
      greeceTourismTemplate.reviewStatus
    )
    expect(greece?.templates.length).toBeGreaterThan(0)
  })

  it('marks the active pack and derives the active review status', () => {
    const model = buildSettingsModel(input({ application: application('GR') }))
    expect(model.packs.find((p) => p.countryCode === 'GR')?.isActive).toBe(true)
    expect(model.active.countryCode).toBe('GR')
    expect(model.active.reviewStatus).toBe(greeceTourismTemplate.reviewStatus)
  })

  it('marks no pack active without a destination', () => {
    const model = buildSettingsModel(input())
    expect(model.packs.every((p) => !p.isActive)).toBe(true)
    expect(model.active.countryCode).toBeNull()
  })
})

describe('buildSettingsModel — local data & about', () => {
  it('summarizes what is loaded on the device', () => {
    const model = buildSettingsModel(
      input({
        application: application(),
        documents: [doc],
        backup: 'stale',
      })
    )
    expect(model.localData.hasData).toBe(true)
    expect(model.localData.documentCount).toBe(1)
    // Local save state and backup freshness are separate dimensions (ADR-038).
    expect(model.localData.persistence).toBe('saved')
    expect(model.localData.backup).toBe('stale')
    expect(model.localData.storageKeys).toEqual(STORAGE_KEYS)
    expect(model.localData.storageKeys).toEqual([
      'visaflow-theme',
      'visaflow-locale',
    ])
  })

  it('reports no data when nothing is loaded', () => {
    expect(buildSettingsModel(input()).localData.hasData).toBe(false)
  })

  it('exposes honest about facts (version + schema version)', () => {
    const model = buildSettingsModel(input())
    expect(model.about.name).toBe('VisaFlow')
    expect(model.about.schemaVersion).toBe(SCHEMA_VERSION)
    expect(model.about.version).toMatch(/^\d+\.\d+\.\d+/)
  })
})
