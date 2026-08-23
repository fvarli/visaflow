import { generateId } from '@/domain/types/common'
import {
  STORAGE_FORMAT_VERSION,
  type DossierPayload,
  type SavedDossierRecord,
  type SavedDossierSummary,
  type UnreadableRecord,
} from '@/features/workspace/saved-dossier'

/**
 * Pure workspace derivations — no storage, no React, no clock beyond what is
 * passed in. Everything here is a function of a record, so the semantics of the
 * saved-dossier list are testable without a browser or a provider.
 */

/** A fresh local id. Deliberately generated, never taken from an imported file. */
export function createSavedDossierId(): string {
  return generateId()
}

/**
 * The label the switcher and `/dossiers` show.
 *
 * Privacy-conscious by construction: a given name and a destination, never a
 * surname, passport number or financial detail — this string appears in
 * navigation, which is the most over-the-shoulder-visible part of the app.
 * Falls back through what is actually known rather than inventing a name.
 */
export function deriveDisplayTitle(
  record: Pick<
    SavedDossierRecord,
    'applicantName' | 'destinationCountry' | 'title'
  >,
  fallback: string
): string {
  // An explicit name always wins, and is never quietly replaced when the
  // applicant or destination later changes — the user said what this dossier is
  // called, and edits to its contents are not a retraction of that.
  const explicit = record.title?.trim()
  if (explicit) return explicit

  const name = record.applicantName?.trim()
  if (name && record.destinationCountry)
    return `${name} · ${record.destinationCountry}`
  if (name) return name
  if (record.destinationCountry) return record.destinationCountry
  return fallback
}

/** The given name only — see `deriveDisplayTitle` for why the surname is dropped. */
function displayNameOf(payload: DossierPayload): string | null {
  const first = payload.applicant?.firstName?.trim()
  return first && first.length > 0 ? first : null
}

/**
 * Build the record to persist. Summary fields are derived here, at write time,
 * so listing dossiers never has to interpret a payload.
 */
export function toRecord(
  id: string,
  payload: DossierPayload,
  dossierSchemaVersion: string,
  now: string,
  previous?: SavedDossierRecord | null
): SavedDossierRecord {
  return {
    id,
    storageVersion: STORAGE_FORMAT_VERSION,
    // The adapter owns the increment — it is the only place that can compare
    // and write atomically. This is the revision being *asserted*, not claimed.
    revision: previous?.revision ?? 1,
    title: previous?.title ?? null,
    dossierSchemaVersion,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    lastOpenedAt: previous?.lastOpenedAt ?? now,
    lastExportedAt: previous?.lastExportedAt ?? null,
    destinationCountry: payload.application?.destinationCountry ?? null,
    visaType: payload.application?.visaType ?? null,
    applicantName: displayNameOf(payload),
    payload,
  }
}

export function toSummary(
  record: SavedDossierRecord,
  fallbackTitle: string
): SavedDossierSummary {
  return {
    id: record.id,
    title: deriveDisplayTitle(record, fallbackTitle),
    destinationCountry: record.destinationCountry,
    visaType: record.visaType,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastOpenedAt: record.lastOpenedAt,
    lastExportedAt: record.lastExportedAt,
    documentCount: record.payload.documents.length,
    revision: record.revision,
    named: Boolean(record.title?.trim()),
    unreadable: false,
  }
}

/**
 * Normalise a user-entered name. Whitespace-only clears back to `null` so the
 * derived title returns, rather than leaving a dossier with a blank name.
 */
export function normalizeTitle(input: string): string | null {
  const trimmed = input.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** An unreadable record still gets a row, so the user can see it and export it. */
export function unreadableSummary(
  record: UnreadableRecord,
  title: string
): SavedDossierSummary {
  return {
    id: record.id,
    title,
    destinationCountry: null,
    visaType: null,
    createdAt: '',
    updatedAt: '',
    lastOpenedAt: '',
    lastExportedAt: null,
    documentCount: 0,
    revision: 0,
    named: false,
    unreadable: true,
  }
}

/**
 * Most recently opened first — the workspace is a place you return to, so
 * recency of attention orders it better than creation date or name. Unreadable
 * records sort last: they are a problem to resolve, not work to continue.
 */
export function sortSummaries(
  summaries: SavedDossierSummary[]
): SavedDossierSummary[] {
  return [...summaries].sort((a, b) => {
    if (a.unreadable !== b.unreadable) return a.unreadable ? 1 : -1
    return b.lastOpenedAt.localeCompare(a.lastOpenedAt)
  })
}

/**
 * Which dossier to open after the active one is deleted: the most recent
 * remaining, or none. Returning `null` for an empty workspace is meaningful —
 * the caller shows the empty state rather than inventing a dossier.
 */
export function nextActiveAfterDelete(
  summaries: SavedDossierSummary[],
  deletedId: string
): string | null {
  const remaining = sortSummaries(summaries).filter(
    (summary) => summary.id !== deletedId && !summary.unreadable
  )
  return remaining[0]?.id ?? null
}
