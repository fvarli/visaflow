import type { ApplicationSummary } from './review-summary'
import type {
  ChecklistCounts,
  SubmissionChecklist,
  SubmissionGroupId,
} from './review-checklist'

/**
 * The print package — deliberately **two different things**, never blended.
 *
 * 1. `generatedSheets` — pages VisaFlow can itself produce from the dossier
 *    data it holds (a cover sheet, the checklist, an appointment summary, an
 *    itinerary summary). Their readiness is the presence of that data.
 *
 * 2. `physicalBundles` — the applicant's own external documents: the passport,
 *    the bank statements, the employer letter. VisaFlow never holds, stores,
 *    embeds or prints these; it can only tell you which bundles you still have
 *    to put in the folder, from the status you recorded.
 *
 * The separation is structural, not just wording: `GeneratedSheet` has no field
 * capable of carrying a document code or id, so an external document cannot
 * appear as something VisaFlow generates even by mistake. Bundles are a
 * roll-up of the *same* `buildSubmissionChecklist` output the item-level
 * checklist renders, so the two can never disagree and there is no second
 * document-status store.
 *
 * This sprint is read-only: no PDF generation, no print action. The shape is
 * the boundary the next Print/PDF sprint implements against.
 */

/** Availability of a printable piece, from recorded data only. */
export type PrintableState = 'ready' | 'partial' | 'unavailable'

/**
 * The closed set of sheets VisaFlow can generate. Adding a sheet is a
 * deliberate act here — it can never be derived from an applicant's document.
 */
export type GeneratedSheetId =
  | 'coverSheet'
  | 'submissionChecklist'
  | 'appointmentSummary'
  | 'itinerarySummary'

export const GENERATED_SHEET_ORDER: GeneratedSheetId[] = [
  'coverSheet',
  'submissionChecklist',
  'appointmentSummary',
  'itinerarySummary',
]

/**
 * Note the shape: an id, an availability state, and an optional count. There is
 * deliberately no `code`, `docId` or free text field — an applicant's external
 * document is structurally unable to be represented as a generated sheet.
 */
export interface GeneratedSheet {
  id: GeneratedSheetId
  state: PrintableState
  /** How many lines the sheet would carry, when that is meaningful. */
  itemCount?: number
}

/** The physical bundles an applicant assembles from their own files. */
export type PhysicalBundleId =
  | 'applicationForm'
  | 'passport'
  | 'employer'
  | 'bankStatements'
  | 'sponsor'
  | 'insurance'
  | 'reservations'
  | 'supporting'

export const PHYSICAL_BUNDLE_ORDER: PhysicalBundleId[] = [
  'applicationForm',
  'passport',
  'employer',
  'bankStatements',
  'sponsor',
  'insurance',
  'reservations',
  'supporting',
]

const GROUP_TO_BUNDLE: Record<SubmissionGroupId, PhysicalBundleId> = {
  application: 'applicationForm',
  identity: 'passport',
  employment: 'employer',
  financial: 'bankStatements',
  sponsor: 'sponsor',
  insurance: 'insurance',
  travel: 'reservations',
  accommodation: 'reservations',
  additional: 'supporting',
}

export function bundleForGroup(group: SubmissionGroupId): PhysicalBundleId {
  return GROUP_TO_BUNDLE[group]
}

export type BundleState = 'ready' | 'partial' | 'missing' | 'notApplicable'

export interface PhysicalBundle {
  id: PhysicalBundleId
  state: BundleState
  counts: ChecklistCounts
  /** Deep-link into the workspace where these documents are managed. */
  to: string
}

export interface PrintPackage {
  generatedSheets: GeneratedSheet[]
  physicalBundles: PhysicalBundle[]
  /** Generated sheets with everything they need. */
  readySheetCount: number
  /** Bundles whose applicable documents are all ready. */
  readyBundleCount: number
}

function bundleState(counts: ChecklistCounts): BundleState {
  if (counts.actionable === 0) return 'notApplicable'
  if (counts.ready === counts.actionable) return 'ready'
  if (counts.ready > 0) return 'partial'
  return 'missing'
}

function mergeCounts(a: ChecklistCounts, b: ChecklistCounts): ChecklistCounts {
  return {
    ready: a.ready + b.ready,
    needsAttention: a.needsAttention + b.needsAttention,
    missing: a.missing + b.missing,
    optional: a.optional + b.optional,
    notApplicable: a.notApplicable + b.notApplicable,
    actionable: a.actionable + b.actionable,
    total: a.total + b.total,
  }
}

/** Availability of each generated sheet, from dossier data presence alone. */
function deriveGeneratedSheets(
  summary: ApplicationSummary,
  checklist: SubmissionChecklist,
  hasRoute: boolean
): GeneratedSheet[] {
  const sheets: GeneratedSheet[] = []

  // Cover sheet — who is applying, where, and what for.
  const coverFacts = [
    summary.applicantName,
    summary.destinationCountry.value,
    summary.visaType.value,
  ]
  const coverPresent = coverFacts.filter(Boolean).length
  sheets.push({
    id: 'coverSheet',
    state:
      coverPresent === coverFacts.length
        ? 'ready'
        : coverPresent > 0
          ? 'partial'
          : 'unavailable',
  })

  // Submission checklist — the list of what is handed over.
  sheets.push({
    id: 'submissionChecklist',
    state: checklist.counts.actionable > 0 ? 'ready' : 'unavailable',
    itemCount: checklist.counts.actionable,
  })

  // Appointment summary — only as complete as the appointment record.
  const { date, time, location } = summary.appointment
  sheets.push({
    id: 'appointmentSummary',
    state: !date ? 'unavailable' : time || location ? 'ready' : 'partial',
  })

  // Itinerary summary — the trip dates, and the route when one exists.
  const hasDates = Boolean(summary.entryDate && summary.exitDate)
  sheets.push({
    id: 'itinerarySummary',
    state: !hasDates ? 'unavailable' : hasRoute ? 'ready' : 'partial',
  })

  return sheets
}

export function buildPrintPackage(
  summary: ApplicationSummary,
  checklist: SubmissionChecklist,
  hasRoute: boolean
): PrintPackage {
  const generatedSheets = deriveGeneratedSheets(summary, checklist, hasRoute)

  const countsByBundle = new Map<PhysicalBundleId, ChecklistCounts>()
  for (const group of checklist.groups) {
    const id = bundleForGroup(group.id)
    const existing = countsByBundle.get(id)
    countsByBundle.set(
      id,
      existing ? mergeCounts(existing, group.counts) : group.counts
    )
  }

  const physicalBundles: PhysicalBundle[] = []
  for (const id of PHYSICAL_BUNDLE_ORDER) {
    const counts = countsByBundle.get(id)
    if (!counts) continue
    physicalBundles.push({
      id,
      state: bundleState(counts),
      counts,
      to: id === 'sponsor' ? '/sponsors' : '/documents',
    })
  }

  return {
    generatedSheets,
    physicalBundles,
    readySheetCount: generatedSheets.filter((s) => s.state === 'ready').length,
    readyBundleCount: physicalBundles.filter((b) => b.state === 'ready').length,
  }
}
