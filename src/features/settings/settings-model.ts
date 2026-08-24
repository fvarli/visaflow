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
import {
  useWorkspace,
  type PersistenceStatus,
} from '@/app/providers/WorkspaceProvider'
import type { BackupState } from '@/features/workspace/saved-dossier'

/**
 * The application version, shown in About.
 *
 * `package.json` is the single source of truth. Vite injects only this one
 * string at build time (`define` in `vite.config.ts` / `vitest.config.ts`), so
 * `package.json` is never imported into the client bundle and no other build
 * metadata ships to users. It previously had to be hand-synced on every
 * release, which nothing in the test suite could have caught.
 *
 * Distinct from `SCHEMA_VERSION` below: the release version and the dossier
 * JSON format version move independently, the Greece pack carries a third,
 * unrelated `templateVersion`, and `STORAGE_FORMAT_VERSION` is a fourth. v1.1.0
 * is the release where they visibly diverged — the app moved, the dossier schema
 * stayed at `1.0.0`, the storage format stayed at `2`. Never reconcile them with
 * a find-and-replace.
 */
const APP_VERSION = __APP_VERSION__

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
  /** What local saving is doing right now, straight from the workspace. */
  persistence: PersistenceStatus
  /**
   * How fresh the user's exported file is, or `null` when there is no saved
   * record to ask — a session-only dossier keeps no export history, and
   * claiming one would be the invention this panel used to be full of.
   */
  backup: BackupState | null
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
    persistence: PersistenceStatus
    backup: BackupState | null
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
  const { applicant, application, documents, sponsors, persistence, backup } =
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
      persistence,
      backup,
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
  const { status, sessionOnly, summaries, activeId } = useWorkspace()
  // Only a saved record has export history. Session-only has none by design.
  const backup =
    sessionOnly || !activeId
      ? null
      : (summaries.find((summary) => summary.id === activeId)?.backup ?? null)

  return useMemo(
    () =>
      buildSettingsModel({
        applicant: state.applicant,
        application: state.application,
        documents: state.documents,
        sponsors: state.sponsors,
        persistence: status,
        backup,
      }),
    [state, status, backup]
  )
}
