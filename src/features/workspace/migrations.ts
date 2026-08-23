import {
  STORAGE_FORMAT_VERSION,
  type SavedDossierRecord,
} from '@/features/workspace/saved-dossier'

/**
 * Migration of locally stored records.
 *
 * The rule that shapes this file: **a record VisaFlow cannot understand is never
 * destroyed.** A user's dossier outliving the build that wrote it is a support
 * problem; a build silently deleting it is data loss. So every failure path here
 * ends in "return it as unreadable" and the workspace surfaces it with an export
 * route out.
 *
 * There are no migrations yet — `STORAGE_FORMAT_VERSION` is 1 and nothing has
 * shipped before it. This is the seam, not a speculative ladder: when the layout
 * genuinely changes, add a step to `STEPS` and a test beside it.
 */

/** One version hop. Pure, so a migration is testable without a browser. */
interface MigrationStep {
  from: number
  to: number
  migrate: (record: SavedDossierRecord) => SavedDossierRecord
}

const STEPS: MigrationStep[] = []

export type MigrationResult =
  | { ok: true; record: SavedDossierRecord; migrated: boolean }
  | { ok: false; reason: 'unknown-version' | 'newer-version' | 'malformed' }

/** Cheap structural check — enough to tell a record from arbitrary stored junk. */
function looksLikeRecord(value: unknown): value is SavedDossierRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Partial<SavedDossierRecord>
  return (
    typeof record.id === 'string' &&
    typeof record.storageVersion === 'number' &&
    typeof record.payload === 'object' &&
    record.payload !== null
  )
}

/**
 * Bring a stored record up to the current format, or explain why it cannot be.
 *
 * A record from a *newer* build is reported separately from a merely unknown one:
 * it is the case where the user has almost certainly used a later VisaFlow in
 * this browser, and telling them that is more useful than "corrupted".
 */
export function migrateRecord(stored: unknown): MigrationResult {
  if (!looksLikeRecord(stored)) return { ok: false, reason: 'malformed' }

  if (stored.storageVersion === STORAGE_FORMAT_VERSION) {
    return { ok: true, record: stored, migrated: false }
  }

  if (stored.storageVersion > STORAGE_FORMAT_VERSION) {
    return { ok: false, reason: 'newer-version' }
  }

  let record = stored
  let guard = STEPS.length + 1

  while (record.storageVersion < STORAGE_FORMAT_VERSION && guard-- > 0) {
    const step = STEPS.find(
      (candidate) => candidate.from === record.storageVersion
    )
    if (!step) return { ok: false, reason: 'unknown-version' }
    record = { ...step.migrate(record), storageVersion: step.to }
  }

  return record.storageVersion === STORAGE_FORMAT_VERSION
    ? { ok: true, record, migrated: true }
    : { ok: false, reason: 'unknown-version' }
}
