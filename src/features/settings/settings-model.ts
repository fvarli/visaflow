import { useMemo } from 'react'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { VisaType } from '@/domain/types/common'
import type { RequirementSource, ReviewStatus } from '@/config/types'
import { getAllCountryConfigs } from '@/config/countries'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
import { useDossier } from '@/app/providers/DossierProvider'

/**
 * The application version, shown in About. Kept as a constant here (rather than
 * importing `package.json` into the client bundle) so no build metadata ships to
 * users; keep it in sync with `package.json` on release.
 */
const APP_VERSION = '0.1.0'

/**
 * The Settings control-center presentation model.
 *
 * The one place the page derives its shape: the installed country packs (with
 * their honest review status — never an official endorsement), which pack is
 * active, a factual "what lives on this device" summary, and the About facts.
 * It re-encodes no rule and changes no data — pure presentation over
 * configuration + provider state, so it unit-tests without React.
 */

/** The Settings sections, in rail order. Used for `?section=` deep-linking. */
export const SETTINGS_SECTION_IDS = [
  'appearance',
  'language',
  'countryPacks',
  'privacy',
  'data',
  'importExport',
  'about',
  'advanced',
] as const

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number]

/** The only two localStorage keys VisaFlow ever writes (both non-personal). */
export const STORAGE_KEYS = ['visaflow-theme', 'visaflow-locale'] as const

/** Resolve a `?section=` param to a valid section; unknown falls back safely. */
export function resolveSection(param: string | null): SettingsSectionId {
  return SETTINGS_SECTION_IDS.includes(param as SettingsSectionId)
    ? (param as SettingsSectionId)
    : 'appearance'
}

export interface CountryPackTemplateView {
  id: string
  visaType: VisaType
  nameKey: string
  reviewStatus: ReviewStatus
  lastReviewedAt?: string
  templateVersion: string
}

export interface CountryPackView {
  countryCode: string
  nameKey: string
  schengenMember: boolean
  templates: CountryPackTemplateView[]
  sources: RequirementSource[]
  /** Whether this pack is the current application's destination. */
  isActive: boolean
}

export interface SettingsInput {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
  isDirty: boolean
  lastSaved: Date | null
}

export interface SettingsModel {
  packs: CountryPackView[]
  active: {
    countryCode: string | null
    visaType: VisaType | null
    reviewStatus: ReviewStatus | null
  }
  localData: {
    hasData: boolean
    isDirty: boolean
    lastSaved: Date | null
    documentCount: number
    sponsorCount: number
    storageKeys: readonly string[]
  }
  about: {
    name: string
    version: string
    schemaVersion: string
  }
}

export function buildSettingsModel(input: SettingsInput): SettingsModel {
  const { applicant, application, documents, sponsors, isDirty, lastSaved } =
    input
  const activeCountry = application?.destinationCountry ?? null
  const activeVisaType = application?.visaType ?? null

  const packs: CountryPackView[] = getAllCountryConfigs().map((config) => ({
    countryCode: config.countryCode,
    nameKey: config.nameKey,
    schengenMember: config.schengenMember,
    templates: config.visaTypes.map((template) => ({
      id: template.id,
      visaType: template.visaType,
      nameKey: template.nameKey,
      reviewStatus: template.reviewStatus,
      lastReviewedAt: template.lastReviewedAt,
      templateVersion: template.templateVersion,
    })),
    sources: config.sources ?? [],
    isActive: config.countryCode === activeCountry,
  }))

  const activePack = packs.find((p) => p.isActive)
  const activeReviewStatus =
    activePack?.templates.find((t) => t.visaType === activeVisaType)
      ?.reviewStatus ??
    activePack?.templates[0]?.reviewStatus ??
    null

  return {
    packs,
    active: {
      countryCode: activeCountry,
      visaType: activeVisaType,
      reviewStatus: activeReviewStatus,
    },
    localData: {
      hasData: applicant !== null || application !== null,
      isDirty,
      lastSaved,
      documentCount: documents.length,
      sponsorCount: sponsors.length,
      storageKeys: STORAGE_KEYS,
    },
    about: {
      name: 'VisaFlow',
      version: APP_VERSION,
      schemaVersion: SCHEMA_VERSION,
    },
  }
}

/** Component-facing hook: derives the model once per state change. */
export function useSettingsModel(): SettingsModel {
  const { state } = useDossier()
  return useMemo(
    () =>
      buildSettingsModel({
        applicant: state.applicant,
        application: state.application,
        documents: state.documents,
        sponsors: state.sponsors,
        isDirty: state.isDirty,
        lastSaved: state.lastSaved,
      }),
    [state]
  )
}
