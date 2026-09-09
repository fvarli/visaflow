import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import { buildApplicabilityContext } from '@/features/documents/applicability'

/**
 * The applicability context for a fixture, built through the production builder
 * rather than as a literal.
 *
 * Tests used to hand an `Application` straight to anything that evaluated
 * applicability, which worked because the two shapes overlapped where it
 * mattered. Going through the real builder is what keeps a test honest about
 * what production actually projects — including which fields it does *not*.
 *
 * `applicant` defaults to absent because most fixtures predate nationality and
 * care only about employment or financing; a test about nationality passes one.
 */
export function ctxFor(
  application: Application | null | undefined,
  applicant: Applicant | null = null
) {
  return buildApplicabilityContext({ applicant, application })
}
