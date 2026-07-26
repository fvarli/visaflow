import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { PageHeader } from '@/components/ui/page-header'
import { PageBody } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { Stepper, type StepperStep } from '@/components/ui/stepper'
import { NoDossierState } from '@/components/NoDossierState'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  EMPLOYMENT_STEP_IDS,
  deriveStepStatuses,
  type EmploymentStepId,
} from '@/features/employment/employment-wizard'
import { StatusStep } from '@/components/employment/StatusStep'
import { EmployerStep } from '@/components/employment/EmployerStep'
import { IncomeStep } from '@/components/employment/IncomeStep'
import { LeaveStep } from '@/components/employment/LeaveStep'
import { DocumentsStep } from '@/components/employment/DocumentsStep'
import { EmploymentReviewStep } from '@/components/employment/EmploymentReviewStep'

/**
 * The employment experience as a guided, six-step workspace rather than one flat
 * form. This page owns only orchestration — the active step, the rail, the
 * heading, and forward/back navigation. Each step reads and autosaves the
 * dossier itself (shallow-merge via `updateEmployment`, so status changes never
 * delete data), so there is no submit button; the shell never touches the schema
 * or validation logic.
 */
export default function EmploymentPage() {
  const { state, hasData } = useDossier()
  const { t } = useTranslation(['employment', 'common'])
  const td = dynamicT(t)
  const [searchParams] = useSearchParams()
  // Optional deep-link: /employment?step=<id> opens directly on that step (e.g.
  // a leave finding in the Validation Center links to ?step=leave). Existing
  // /employment links (no param) start at the first step — nothing breaks.
  const initialStep = (() => {
    const id = searchParams.get('step')
    const index = id ? EMPLOYMENT_STEP_IDS.indexOf(id as EmploymentStepId) : -1
    return index >= 0 ? index : 0
  })()
  const [current, setCurrent] = useState(initialStep)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to the step heading on change so keyboard and screen-reader
  // users land at the top of the new step (skip the initial mount).
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    headingRef.current?.focus()
  }, [current])

  if (!hasData || !state.application) {
    return (
      <PageBody>
        <NoDossierState section={t('employment:title')} />
      </PageBody>
    )
  }

  const total = EMPLOYMENT_STEP_IDS.length
  const statuses = deriveStepStatuses(state.application, current)
  const steps: StepperStep[] = EMPLOYMENT_STEP_IDS.map((id, index) => ({
    id,
    title: td(`employment:steps.${id}.title`),
    status: statuses[index] ?? 'upcoming',
  }))
  const activeId: EmploymentStepId =
    EMPLOYMENT_STEP_IDS[current] ?? EMPLOYMENT_STEP_IDS[0]
  const isLast = current === total - 1

  return (
    <PageBody>
      <PageHeader
        title={t('employment:wizard.title')}
        description={t('employment:wizard.description')}
      />

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-12">
        <div className="lg:pt-1">
          <Stepper
            steps={steps}
            current={current}
            onSelect={setCurrent}
            ariaLabel={t('employment:nav.rail')}
            progressLabel={t('employment:nav.stepProgress', {
              current: current + 1,
              total,
            })}
          />
        </div>

        <div className="min-w-0 space-y-6">
          <div className="space-y-1">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-heading text-foreground outline-none"
            >
              {td(`employment:steps.${activeId}.title`)}
            </h2>
            <p className="text-body text-muted-foreground text-pretty">
              {td(`employment:steps.${activeId}.description`)}
            </p>
          </div>

          <div key={activeId} className="animate-fade-in">
            {activeId === 'status' && <StatusStep />}
            {activeId === 'employer' && <EmployerStep />}
            {activeId === 'income' && <IncomeStep />}
            {activeId === 'leave' && <LeaveStep />}
            {activeId === 'documents' && <DocumentsStep />}
            {activeId === 'review' && (
              <EmploymentReviewStep onEdit={setCurrent} />
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-6">
            <Button
              variant="ghost"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              <ArrowLeft />
              {t('employment:nav.back')}
            </Button>

            {isLast ? (
              <Button asChild>
                <Link to="/dashboard">{t('common:actions.goToDashboard')}</Link>
              </Button>
            ) : (
              <Button
                onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
              >
                {t('employment:nav.continue')}
                <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageBody>
  )
}
