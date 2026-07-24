import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
  WIZARD_STEP_IDS,
  deriveStepStatuses,
  type WizardStepId,
} from '@/features/applicant/applicant-wizard'
import { PersonalInfoStep } from '@/components/applicant/PersonalInfoStep'
import { PassportStep } from '@/components/applicant/PassportStep'
import { PreviousVisasStep } from '@/components/applicant/PreviousVisasStep'
import { TravelHistoryStep } from '@/components/applicant/TravelHistoryStep'
import { ReviewStep } from '@/components/applicant/ReviewStep'

/**
 * The applicant experience as a guided, multi-step flow rather than one long
 * form. This page owns only orchestration — the active step index, the step
 * rail, the heading, and forward/back navigation. Each step reads and autosaves
 * the dossier itself, so there is no submit button; the shell never touches the
 * schema or validation logic.
 */
export default function ApplicantPage() {
  const { state, hasData } = useDossier()
  const { t } = useTranslation(['applicant', 'common'])
  const td = dynamicT(t)
  const [current, setCurrent] = useState(0)
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

  if (!hasData || !state.applicant) {
    return (
      <PageBody>
        <NoDossierState section={t('applicant:title')} />
      </PageBody>
    )
  }

  const total = WIZARD_STEP_IDS.length
  const statuses = deriveStepStatuses(state.applicant, current)
  const steps: StepperStep[] = WIZARD_STEP_IDS.map((id, index) => ({
    id,
    title: td(`applicant:steps.${id}.title`),
    status: statuses[index] ?? 'upcoming',
  }))
  const activeId: WizardStepId = WIZARD_STEP_IDS[current] ?? WIZARD_STEP_IDS[0]
  const isLast = current === total - 1

  return (
    <PageBody>
      <PageHeader
        title={t('applicant:wizard.title')}
        description={t('applicant:wizard.description')}
      />

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-12">
        <div className="lg:pt-1">
          <Stepper
            steps={steps}
            current={current}
            onSelect={setCurrent}
            ariaLabel={t('applicant:nav.rail')}
            progressLabel={t('applicant:nav.stepProgress', {
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
              {td(`applicant:steps.${activeId}.title`)}
            </h2>
            <p className="text-body text-muted-foreground text-pretty">
              {td(`applicant:steps.${activeId}.description`)}
            </p>
          </div>

          <div key={activeId} className="animate-fade-in">
            {activeId === 'personal' && <PersonalInfoStep />}
            {activeId === 'passport' && <PassportStep />}
            {activeId === 'previousVisas' && <PreviousVisasStep />}
            {activeId === 'travelHistory' && <TravelHistoryStep />}
            {activeId === 'review' && <ReviewStep onEdit={setCurrent} />}
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-6">
            <Button
              variant="ghost"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              <ArrowLeft />
              {t('applicant:nav.back')}
            </Button>

            {isLast ? (
              <Button asChild>
                <Link to="/dashboard">{t('common:actions.goToDashboard')}</Link>
              </Button>
            ) : (
              <Button
                onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
              >
                {t('applicant:nav.continue')}
                <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageBody>
  )
}
