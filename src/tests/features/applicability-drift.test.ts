import { describe, it, expect } from 'vitest'
import type { Application } from '@/domain/schemas/application.schema'
import { buildApplicabilityContext } from '@/features/documents/applicability'
import { applicableRequirements } from '@/features/documents/template-sync'
import { resolveVisaTemplate } from '@/config/countries'

/**
 * There is one applicability-context builder, and nothing else builds one.
 *
 * This is a guard on the *callee* rather than on the context's shape, and that
 * is the whole trick: a context is an object literal, and a scan for literals
 * is brittle in both directions — it misses a rename and fires on a comment.
 * You cannot build a context you have nothing to hand it to, so forbidding the
 * evaluator's name is both narrower and stricter.
 *
 * It exists because the failure it prevents already happened once. Three call
 * sites each assembled their own context; two projected `{ employment,
 * financing }` and the third cast the whole `Application`. Nothing broke,
 * because every condition in both packs read one of two fields all three
 * happened to agree on — so the divergence was undetectable until a pack
 * authored a condition on a third field, at which point one requirement would
 * have been applicable in the Documents workspace and inapplicable in
 * readiness, for the same dossier, with no error anywhere.
 *
 * Reading goes through Vite rather than `fs`, so the scan sees what actually
 * ships (`country-pack-provenance.test.ts` uses the same idiom).
 */
describe('applicability — one builder, and only one', () => {
  const SOURCES: Record<string, string> = import.meta.glob(
    '/src/**/*.{ts,tsx}',
    { query: '?raw', import: 'default', eager: true }
  )

  /** The module that owns the projection and the only legitimate importer. */
  const isBuilder = (path: string) =>
    path === '/src/features/documents/applicability.ts'

  /** Where the evaluator itself is declared. */
  const isDeclarationSite = (path: string) => path === '/src/config/types.ts'

  const isTest = (path: string) => path.startsWith('/src/tests/')

  /**
   * Several files discuss the evaluator in a comment explaining why they no
   * longer call it — including this one. The guard must read the code, not the
   * prose (`focus-visible.test.ts` learned the same lesson).
   */
  const code = (contents: string) =>
    contents.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

  it('scans a realistic number of production files', () => {
    // Without this, a glob that silently matched nothing would make the
    // tripwire below pass forever.
    const scanned = Object.keys(SOURCES).filter((p) => !isTest(p))
    expect(scanned.length).toBeGreaterThan(50)
  })

  it('no production code outside the builder calls the evaluator', () => {
    const offenders = Object.entries(SOURCES)
      .filter(
        ([path]) =>
          !isTest(path) && !isBuilder(path) && !isDeclarationSite(path)
      )
      .filter(([, contents]) =>
        code(contents).includes('isRequirementApplicable')
      )
      .map(([path]) => path)

    // A named list makes the failure actionable: it says which feature started
    // deciding applicability for itself.
    expect(offenders).toEqual([])
  })

  it('the builder does call it, so the scan is not passing on an absence', () => {
    const builder = Object.entries(SOURCES).find(([path]) => isBuilder(path))
    expect(builder?.[1] ?? '').toContain('isRequirementApplicable')
  })

  it('still refuses an Application at compile time', () => {
    /**
     * The scan above guards the evaluator's importers. This guards the other
     * half, which is what actually shipped a defect: `Application` satisfied
     * `ApplicabilityContext` structurally, so five validation rules passed one
     * and silently lost nationality. The `never` fields are what stop that, and
     * they look deletable to anyone tidying up — so their absence is a failure
     * rather than a silent regression.
     */
    const types = code(SOURCES['/src/config/types.ts'] ?? '')
    expect({
      rejectsApplication: /applicationId\?:\s*never/.test(types),
      rejectsWholeApplicant: /passport\?:\s*never/.test(types),
    }).toEqual({ rejectsApplication: true, rejectsWholeApplicant: true })
  })

  it('and the call still decides something', () => {
    // Guards the guard: if applicability stopped filtering anything, every
    // assertion above would hold while the capability was dead.
    const template = resolveVisaTemplate('GR', 'short_stay_tourism')
    if (!template) throw new Error('Greece tourism template missing')

    const employed = applicableRequirements(
      template,
      buildApplicabilityContext({
        applicant: null,
        application: {
          employment: { employmentStatus: 'employed' },
        } as Application,
      })
    )
    expect(employed.length).toBeLessThan(template.documentRequirements.length)
  })
})
