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
  FINANCE_STEP_IDS,
  deriveStepStatuses,
  type FinanceStepId,
} from '@/features/finance/finance-wizard'
import { SourceStep } from '@/components/finance/SourceStep'
import { PersonalFinancesStep } from '@/components/finance/PersonalFinancesStep'
import { SponsorsStep } from '@/components/finance/SponsorsStep'
import { FinancialDocumentsStep } from '@/components/finance/FinancialDocumentsStep'
import { ConsistencyStep } from '@/components/finance/ConsistencyStep'
import { FinanceReviewStep } from '@/components/finance/FinanceReviewStep'

/**
 * The finance experience as a guided, six-step "financial evidence" workspace
 * rather than one flat form. This page owns only orchestration — the active
 * step, the rail, the heading, and forward/back navigation. Each step reads and
 * autosaves the dossier itself (shallow-merge via `updateFinancing`, so source
 * changes never delete data), so there is no submit button; the shell never
 * touches the schema or validation logic.
 */
export default function FinancePage() {
  const { state, hasData } = useDossier()
  const { t } = useTranslation(['finance', 'common'])
  const td = dynamicT(t)
  const [searchParams] = useSearchParams()
  // Optional deep-link: /finance?step=<id> opens directly on that step (e.g. a
  // sponsor-funding finding in the Validation Center links to ?step=sponsors).
  // Existing /finance links (no param) start at the first step — nothing breaks.
  const initialStep = (() => {
    const id = searchParams.get('step')
    const index = id ? FINANCE_STEP_IDS.indexOf(id as FinanceStepId) : -1
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
        <NoDossierState section={t('finance:title')} />
      </PageBody>
    )
  }

  const total = FINANCE_STEP_IDS.length
  const statuses = deriveStepStatuses(
    state.application,
    current,
    state.sponsors.length
  )
  const steps: StepperStep[] = FINANCE_STEP_IDS.map((id, index) => ({
    id,
    title: td(`finance:steps.${id}.title`),
    status: statuses[index] ?? 'upcoming',
  }))
  const activeId: FinanceStepId =
    FINANCE_STEP_IDS[current] ?? FINANCE_STEP_IDS[0]
  const isLast = current === total - 1

  return (
    <PageBody>
      <PageHeader
        title={t('finance:wizard.title')}
        description={t('finance:wizard.description')}
      />

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-12">
        <div className="lg:pt-1">
          <Stepper
            steps={steps}
            current={current}
            onSelect={setCurrent}
            ariaLabel={t('finance:nav.rail')}
            progressLabel={t('finance:nav.stepProgress', {
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
              {td(`finance:steps.${activeId}.title`)}
            </h2>
            <p className="text-body text-muted-foreground text-pretty">
              {td(`finance:steps.${activeId}.description`)}
            </p>
          </div>

          <div key={activeId} className="animate-fade-in">
            {activeId === 'source' && <SourceStep />}
            {activeId === 'personal' && <PersonalFinancesStep />}
            {activeId === 'sponsors' && <SponsorsStep />}
            {activeId === 'documents' && <FinancialDocumentsStep />}
            {activeId === 'consistency' && <ConsistencyStep />}
            {activeId === 'review' && <FinanceReviewStep onEdit={setCurrent} />}
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-6">
            <Button
              variant="ghost"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              <ArrowLeft />
              {t('finance:nav.back')}
            </Button>

            {isLast ? (
              <Button asChild>
                <Link to="/dashboard">{t('common:actions.goToDashboard')}</Link>
              </Button>
            ) : (
              <Button
                onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
              >
                {t('finance:nav.continue')}
                <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageBody>
  )
}
