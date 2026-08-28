import type { CountryConfig, ReviewStatus, VisaTypeTemplate } from '../types'

/**
 * How much of a template is actually backed by evidence.
 *
 * ADR-046 made a *requirement* earn its verified status from its own sources.
 * This is the same rule counted across the template, so `reviewStatus` can be
 * checked against reality instead of asserted (ADR-047).
 *
 * Pure and storage-free: nothing here is persisted, and the numbers are
 * recomputed wherever they are shown. A stored count would be a second source
 * of truth that could disagree with the pack the moment either changed.
 */
export interface VerificationCoverage {
  /** Effective requirements in the template. */
  total: number
  /** Those carrying their own resolvable, dated evidence. */
  verified: number
  /** True when every effective requirement is covered. */
  isComplete: boolean
}

/**
 * Every requirement in the template, regardless of `required` or
 * `conditionalOn`.
 *
 * Verification describes the **pack definition**, not one applicant's
 * situation, so `isRequirementApplicable` is deliberately not consulted: a
 * requirement that only appears for the self-employed is still a claim the
 * pack makes, and still needs evidence. Making coverage depend on the open
 * dossier would also mean the same pack reported different honesty to
 * different people.
 */
function effectiveRequirements(template: VisaTypeTemplate) {
  return template.documentRequirements
}

/**
 * A requirement counts only on its own evidence.
 *
 * Template-level `sourceIds` are excluded on purpose. That is where a general
 * ministry landing page lives, and letting it count would make one URL
 * "verify" 27 requirements it never mentions — the exact conflation ADR-046
 * closed in the UI, arriving instead through the arithmetic.
 */
function hasOwnVerifiedSource(
  pack: CountryConfig,
  sourceRefs: string[] | undefined
): boolean {
  if (!sourceRefs?.length) return false
  const sources = pack.sources ?? []
  return sourceRefs.some((id) =>
    sources.some((source) => source.id === id && Boolean(source.lastVerifiedAt))
  )
}

export function computeVerificationCoverage(
  pack: CountryConfig,
  template: VisaTypeTemplate
): VerificationCoverage {
  const requirements = effectiveRequirements(template)
  const verified = requirements.filter((requirement) =>
    hasOwnVerifiedSource(pack, requirement.sourceRefs)
  ).length

  return {
    total: requirements.length,
    verified,
    // An empty template is not "complete"; it has nothing to be complete
    // about, and calling it verified would be the emptiest claim of all.
    isComplete: requirements.length > 0 && verified === requirements.length,
  }
}

/**
 * The status the evidence actually supports.
 *
 * Deliberately not the status the pack *declares* — comparing the two is what
 * makes the declaration checkable. `needs_review` is a maintainer's signal
 * about staleness rather than a coverage claim, so it is never derived here;
 * a pack may set it at any coverage.
 */
export function deriveReviewStatus(
  coverage: VerificationCoverage
): Extract<ReviewStatus, 'unverified' | 'partially_verified' | 'verified'> {
  if (coverage.isComplete) return 'verified'
  return coverage.verified > 0 ? 'partially_verified' : 'unverified'
}

/**
 * Is a declared status honest given the evidence?
 *
 * `unverified` is always legal: a pack may hold verified requirements and
 * still decline to advertise itself, and understating is never the dishonesty
 * this guards against. `needs_review` is likewise always legal. Everything
 * else must match what the requirements can support.
 */
export function isReviewStatusSupported(
  declared: ReviewStatus,
  coverage: VerificationCoverage
): boolean {
  if (declared === 'unverified' || declared === 'needs_review') return true
  if (declared === 'verified') return coverage.isComplete
  return coverage.verified > 0 && !coverage.isComplete
}
