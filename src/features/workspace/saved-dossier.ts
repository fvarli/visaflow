import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'

/**
 * The local persistence format version — VisaFlow's **fourth** version axis, and
 * deliberately independent of the other three.
 *
 * | axis | what it versions | where |
 * |---|---|---|
 * | application version | the app release | `package.json` |
 * | `SCHEMA_VERSION` | the portable dossier JSON | `dossier.schema.ts` |
 * | `templateVersion` | a country pack's requirements | `config/countries/*` |
 * | `STORAGE_FORMAT_VERSION` | how a record is laid out in this browser | here |
 *
 * They move for different reasons and must never be conflated: rearranging how a
 * record is stored locally is not a change to the file a user exports, and a new
 * app release is not by itself a storage migration.
 */
export const STORAGE_FORMAT_VERSION = 2

/** The four slices `DossierProvider` owns — the only dossier data ever stored. */
export interface DossierPayload {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
}

/**
 * A dossier as it exists **in this browser**.
 *
 * Everything outside `payload` is local workspace bookkeeping and never reaches
 * an export. The portable dossier JSON is defined by `DossierSchema` and is
 * unchanged by persistence: a v1.1 export is still a v1.0 dossier, not a dump of
 * application state.
 */
export interface SavedDossierRecord {
  /**
   * The local workspace id. Generated here, never read from an imported file —
   * an exported dossier is a portable document, not a claim on a slot in
   * someone else's browser.
   */
  id: string
  storageVersion: number
  /**
   * Bumped on every persisted write. This is what makes two tabs safe: a writer
   * says which revision it believed it was editing, and the repository refuses
   * the write if the stored record has moved on (ADR-037).
   */
  revision: number
  /**
   * The user's own name for this dossier, or `null` to use the derived one.
   *
   * Local workspace metadata — it never enters `payload`, never reaches an
   * export, and does not touch `schemaVersion`. Someone can call a dossier
   * "Greece September 2026" without that becoming part of the portable
   * document. Cleared back to `null` rather than stored as `''`, so clearing a
   * name restores the derived title instead of showing a blank.
   */
  title: string | null
  /** What the payload's dossier schema claimed, so migrations can reason later. */
  dossierSchemaVersion: string
  createdAt: string
  updatedAt: string
  lastOpenedAt: string
  /** Null until the user exports. Tracked apart from local save state. */
  lastExportedAt: string | null
  /** Derived on write so the list renders without interpreting the payload. */
  destinationCountry: string | null
  visaType: string | null
  applicantName: string | null
  payload: DossierPayload
}

/** What the switcher and `/dossiers` render. Never carries dossier contents. */
export interface SavedDossierSummary {
  id: string
  title: string
  destinationCountry: string | null
  visaType: string | null
  createdAt: string
  updatedAt: string
  lastOpenedAt: string
  lastExportedAt: string | null
  documentCount: number
  revision: number
  /** True when the user named this dossier, false when the title is derived. */
  named: boolean
  /** A record this build cannot read. Listed, never opened, never deleted. */
  unreadable: boolean
}

/**
 * A record that survived storage but not interpretation — typically written by a
 * newer build. Kept so the user can still export it rather than losing it.
 */
export interface UnreadableRecord {
  id: string
  storageVersion: number | null
  raw: unknown
}

export interface WorkspaceMeta {
  /**
   * The dossier a **fresh** tab should open — a "last opened" hint, not a live
   * pointer. Tabs choose independently once running: one tab switching dossier
   * must never yank another tab to a different one (ADR-037).
   */
  activeDossierId: string | null
}

/**
 * The outcome of a compare-and-swap write.
 *
 * `conflict` carries the revision actually stored so a caller can report it or
 * reload it; `deleted` means the record is gone and must **not** be recreated —
 * silently resurrecting a dossier another tab deleted is its own kind of data
 * loss.
 */
export type PutResult =
  | { ok: true; revision: number }
  | { ok: false; reason: 'conflict'; currentRevision: number }
  | { ok: false; reason: 'deleted' }

/** The persistence port. Adapters implement it; nothing above here knows IndexedDB. */
export interface DossierRepository {
  list(): Promise<SavedDossierRecord[]>
  listUnreadable(): Promise<UnreadableRecord[]>
  get(id: string): Promise<SavedDossierRecord | null>
  /**
   * Write a record, optionally asserting the revision the caller believed it
   * was updating.
   *
   * Omit `expectedRevision` for a first write. Supply it for every subsequent
   * write: the adapter compares and writes **inside one transaction**, so no
   * caller ever performs a read-compare-write of its own and no interleaving
   * tab can slip between the two halves.
   */
  put(record: SavedDossierRecord, expectedRevision?: number): Promise<PutResult>
  delete(id: string): Promise<void>
  readMeta(): Promise<WorkspaceMeta>
  writeMeta(meta: WorkspaceMeta): Promise<void>
}
