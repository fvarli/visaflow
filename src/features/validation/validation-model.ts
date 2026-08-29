import { useMemo } from 'react'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import { runValidation } from '@/domain/rules/runner'
import type { ValidationFinding, ValidationResult } from '@/domain/rules/types'
import { buildDocumentReadiness } from '@/features/readiness/document-readiness'
import { requiredRequirementCodes } from '@/features/readiness/requirement-readiness'
import { resolveVisaTemplate } from '@/config/countries'
import type { StatusTone } from '@/components/ui/status-badge'
import type { DocumentReadiness } from '@/features/readiness/readiness-types'
import { useDossier } from '@/app/providers/DossierProvider'
import { findingAction, type FindingAction } from './finding-actions'
import {
  areaForFinding,
  categoryForFinding,
  CATEGORY_ORDER,
  healthFromSeverities,
  HEALTH_TONE,
  REVIEW_AREA_ORDER,
  SEVERITY_TONE,
  type FindingCategory,
  type Health,
  type ReviewAreaId,
} from './finding-presentation'

/**
 * The Validation Center's presentation model.
 *
 * This is the one place the review page derives its shape, so the page and its
 * widgets stay pure presentation. It re-encodes no rule: findings come straight
 * from `runValidation`, and completion from the Documents feature's canonical
 * buckets. What it adds is organization — grouping findings by domain, deriving
 * per-area health, and a single calm summary — never a new judgement about the
 * dossier (ADR-016, ADR-025).
 *
 * It is deliberately i18n- and Intl-free (returns stable keys, raw counts, and
 * findings) so it can be unit-tested without any React provider.
 */

/** The slice of dossier state the model reads. `DossierState` is a superset. */
export interface ValidationInput {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
}

/** One finding paired with its resolved "take me there" target. */
export interface ActionableFinding {
  finding: ValidationFinding
  action: FindingAction | null
}

/** A domain group of findings, with its worst-severity health. */
export interface CategoryGroup {
  id: FindingCategory
  health: Health
  tone: StatusTone
  errorCount: number
  warningCount: number
  infoCount: number
  findings: ActionableFinding[]
}

export type ReviewStatus = 'captured' | 'incomplete' | 'needsReview'

/** A dossier area's review state — powers the "looks good" and summary lists. */
export interface ReviewArea {
  id: ReviewAreaId
  status: ReviewStatus
  tone: StatusTone
  /** Worst-severity health when findings exist; `clear` when captured. */
  health: Health
  findingCount: number
}

export type HeroVerdict = 'clear' | 'notes' | 'review' | 'attention'

export interface ValidationHeroModel {
  /** The canonical dossier readiness — the same number every surface shows. */
  readinessPercent: number
  /** The full canonical figure, for the "N of M ready" caption. */
  readiness: DocumentReadiness
  checksPassed: number
  checksTotal: number
  /** Errors + warnings — the things worth acting on. */
  attentionCount: number
  /** Informational notes, counted separately so they never read as problems. */
  noteCount: number
  verdict: HeroVerdict
  tone: StatusTone
  /** The single highest-priority thing to look at next, if any. */
  nextRecommendation: ActionableFinding | null
}

export interface ValidationCenterModel {
  hasData: boolean
  hero: ValidationHeroModel
  totals: {
    errorCount: number
    warningCount: number
    infoCount: number
    findingCount: number
  }
  /** Only groups that actually have findings, in `CATEGORY_ORDER`. */
  groups: CategoryGroup[]
  /** Applicable areas that are free of findings — reinforce progress. */
  ready: ReviewArea[]
  /** Every relevant area with its status — the bottom-of-page dossier summary. */
  review: ReviewArea[]
  /** The raw engine result, for anything that needs counts/passed rules. */
  validation: ValidationResult
}

const EMPTY_VALIDATION: ValidationResult = {
  findings: [],
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  passedRules: 0,
  totalRules: 0,
}

function toDossier(
  applicant: Applicant,
  application: Application,
  documents: Document[],
  sponsors: Sponsor[]
): Dossier {
  return {
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    applicant,
    application,
    documents,
    sponsors,
  }
}

function verdictFromCounts(v: ValidationResult): HeroVerdict {
  if (v.errorCount > 0) return 'attention'
  if (v.warningCount > 0) return 'review'
  if (v.infoCount > 0) return 'notes'
  return 'clear'
}

/**
 * Hero tone stays calm on purpose. Even blocking findings use the amber
 * `warning` tone rather than an alarming red wall — the page reduces
 * uncertainty, it does not scold (see the sprint brief and ADR-025).
 */
const VERDICT_TONE: Record<HeroVerdict, StatusTone> = {
  clear: 'success',
  notes: 'info',
  review: 'warning',
  attention: 'warning',
}

function buildGroups(findings: ActionableFinding[]): CategoryGroup[] {
  const byCategory = new Map<FindingCategory, ActionableFinding[]>()
  for (const item of findings) {
    const category = categoryForFinding(item.finding)
    const list = byCategory.get(category)
    if (list) list.push(item)
    else byCategory.set(category, [item])
  }

  const groups: CategoryGroup[] = []
  for (const id of CATEGORY_ORDER) {
    const items = byCategory.get(id)
    if (!items || items.length === 0) continue
    const severities = items.map((i) => i.finding.severity)
    const health = healthFromSeverities(severities)
    groups.push({
      id,
      health,
      tone: HEALTH_TONE[health],
      errorCount: severities.filter((s) => s === 'error').length,
      warningCount: severities.filter((s) => s === 'warning').length,
      infoCount: severities.filter((s) => s === 'info').length,
      findings: items,
    })
  }
  return groups
}

/**
 * Areas expected of every Schengen dossier: they always appear in the review
 * summary, showing `incomplete` until data is entered. Conditional areas
 * (employment, sponsors) only appear once relevant, so the summary never lists
 * rows that don't apply to this applicant.
 */
const CORE_AREAS = new Set<ReviewAreaId>([
  'passport',
  'trip',
  'accommodation',
  'insurance',
  'appointment',
  'documents',
])

/**
 * Whether an area currently holds data. Combined with `CORE_AREAS`, this
 * decides `captured` vs `incomplete` and whether a conditional area is shown.
 */
function areaApplicability(
  input: ValidationInput,
  requiredTotal: number
): Record<ReviewAreaId, boolean> {
  const { applicant, application, sponsors } = input
  const trip = application?.trip
  const financing = application?.financing
  const sponsoredFunding =
    financing?.source === 'sponsor' || financing?.source === 'mixed'
  return {
    passport: Boolean(applicant?.passport?.number),
    trip: Boolean(trip?.entryDate && trip?.exitDate),
    accommodation: Boolean(trip),
    insurance: Boolean(trip),
    appointment: Boolean(application?.appointment),
    documents: requiredTotal > 0,
    employment: Boolean(application?.employment),
    sponsors: sponsors.length > 0 || sponsoredFunding,
  }
}

function buildReview(
  findings: ValidationFinding[],
  input: ValidationInput,
  requiredTotal: number
): ReviewArea[] {
  const byArea = new Map<ReviewAreaId, ValidationFinding[]>()
  for (const finding of findings) {
    const area = areaForFinding(finding)
    const list = byArea.get(area)
    if (list) list.push(finding)
    else byArea.set(area, [finding])
  }

  const applicable = areaApplicability(input, requiredTotal)
  const areas: ReviewArea[] = []
  for (const id of REVIEW_AREA_ORDER) {
    const areaFindings = byArea.get(id) ?? []
    const isApplicable = applicable[id]
    // A conditional area (employment, sponsors) only appears once it has data
    // or a finding. Core areas always appear — as `incomplete` until filled.
    if (!CORE_AREAS.has(id) && !isApplicable && areaFindings.length === 0)
      continue

    if (areaFindings.length > 0) {
      const health = healthFromSeverities(areaFindings.map((f) => f.severity))
      areas.push({
        id,
        status: 'needsReview',
        tone: HEALTH_TONE[health],
        health,
        findingCount: areaFindings.length,
      })
    } else if (isApplicable) {
      areas.push({
        id,
        status: 'captured',
        tone: 'success',
        health: 'clear',
        findingCount: 0,
      })
    } else {
      areas.push({
        id,
        status: 'incomplete',
        tone: 'neutral',
        health: 'clear',
        findingCount: 0,
      })
    }
  }
  return areas
}

export function buildValidationModel(
  input: ValidationInput
): ValidationCenterModel {
  const { applicant, application, documents, sponsors } = input
  const hasData = applicant !== null && application !== null

  const validation = hasData
    ? runValidation(toDossier(applicant, application, documents, sponsors))
    : EMPTY_VALIDATION

  // The canonical readiness — byte-identical to the Dashboard's, the Documents
  // workspace's, the Timeline's and Final Review's. The Validation Center used
  // to compute its own stricter variant under a near-synonymous label, which is
  // how one dossier could read 45% here and 36% there (ADR-033).
  const readiness = buildDocumentReadiness({
    documents,
    requiredRequirementCodes: requiredRequirementCodes(
      resolveVisaTemplate(
        application?.destinationCountry,
        application?.visaType
      ),
      application
    ),
    template: resolveVisaTemplate(
      application?.destinationCountry,
      application?.visaType
    ),
    application,
  })

  const actionable: ActionableFinding[] = validation.findings.map(
    (finding) => ({ finding, action: findingAction(finding) })
  )

  const review = buildReview(
    validation.findings,
    input,
    readiness.requiredTotal
  )

  const verdict = verdictFromCounts(validation)
  const hero: ValidationHeroModel = {
    readinessPercent: readiness.percent,
    readiness,
    checksPassed: validation.passedRules,
    checksTotal: validation.totalRules,
    attentionCount: validation.errorCount + validation.warningCount,
    noteCount: validation.infoCount,
    verdict,
    tone: VERDICT_TONE[verdict],
    nextRecommendation: actionable[0] ?? null,
  }

  return {
    hasData,
    hero,
    totals: {
      errorCount: validation.errorCount,
      warningCount: validation.warningCount,
      infoCount: validation.infoCount,
      findingCount: validation.findings.length,
    },
    groups: buildGroups(actionable),
    ready: review.filter((area) => area.status === 'captured'),
    review,
    validation,
  }
}

/** Component-facing hook: derives the model once per state change. */
export function useValidationModel(): ValidationCenterModel {
  const { state } = useDossier()
  return useMemo(
    () =>
      buildValidationModel({
        applicant: state.applicant,
        application: state.application,
        documents: state.documents,
        sponsors: state.sponsors,
      }),
    [state]
  )
}

// Re-export the presentation vocabulary so consumers import from one module.
export {
  SEVERITY_TONE,
  HEALTH_TONE,
  type FindingCategory,
  type Health,
  type ReviewAreaId,
}
