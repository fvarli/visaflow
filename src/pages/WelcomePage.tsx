import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { PageHeader } from '@/components/ui/page-header'
import { PageBody } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Stepper, type StepperStep } from '@/components/ui/stepper'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  ONBOARDING_STEP_IDS,
  DEFAULT_DESTINATION_COUNTRY,
  deriveOnboardingStepStatuses,
  resolveStep,
  stepIndex,
  type OnboardingStepId,
} from '@/features/onboarding/onboarding-model'
import { OnboardingWelcomeStep } from '@/components/onboarding/OnboardingWelcomeStep'
import { OnboardingSetupStep } from '@/components/onboarding/OnboardingSetupStep'
import { OnboardingCreateStep } from '@/components/onboarding/OnboardingCreateStep'
import { OnboardingReadyStep } from '@/components/onboarding/OnboardingReadyStep'

/**
 * The first-run surface: a calm, ≤4-step guided setup that gets a brand-new user
 * to create (or import) their first dossier in about a minute, then hands off to
 * the Dashboard. It owns only orchestration — the active step (an additive
 * `?step=` deep-link synced to the URL so Back/Forward works), focus, and the
 * step rail. It stores nothing new: entry is derived from `hasData`, there is no
 * "completed" flag, and it changes no schema, storage, or validation (ADR-031).
 *
 * Arriving with a dossier already loaded never restarts onboarding — it offers a
 * calm "continue to dashboard" instead. Captured once at mount so creating a
 * dossier mid-flow (which flips `hasData`) doesn't swap the UI out from under it.
 */
export default function WelcomePage() {
  const { hasData } = useDossier()
  const { t } = useTranslation(['onboarding', 'common'])
  const td = dynamicT(t)
  const [searchParams, setSearchParams] = useSearchParams()
  const current = resolveStep(searchParams.get('step'))
  const currentIndex = stepIndex(current)
  const [country, setCountry] = useState(DEFAULT_DESTINATION_COUNTRY)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Whether a dossier already existed when the user arrived. Captured once via
  // state (read during render, unlike a ref) so creating a dossier mid-flow —
  // which flips `hasData` true — doesn't swap the guided flow out for the
  // "already have a dossier" panel.
  const [hadDataAtMount] = useState(hasData)

  // Move focus to the step heading on change (skip the initial mount) so
  // keyboard and screen-reader users land at the top of the new step.
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    headingRef.current?.focus()
  }, [current])

  const setStep = (id: OnboardingStepId) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('step', id)
      return next
    })

  const goToStepIndex = (index: number) => {
    const id = ONBOARDING_STEP_IDS[index]
    if (id) setStep(id)
  }

  // A dossier already exists and the visitor did not ask for a specific step:
  // don't restart the flow underneath them.
  //
  // An explicit `?step=` *is* a request, and since v1.1 a returning user has a
  // real reason to make it — creating a second dossier. Blocking that would
  // leave "New dossier" in the switcher pointing at a dead end.
  const askedForStep = searchParams.get('step') !== null

  if (hadDataAtMount && !askedForStep) {
    return (
      <PageBody>
        <PageHeader
          title={t('onboarding:title')}
          description={t('onboarding:description')}
        />
        <EmptyState
          icon={CheckCircle2}
          title={t('onboarding:existing.heading')}
          description={t('onboarding:existing.lead')}
          action={
            <Button asChild>
              <Link to="/dashboard">{t('onboarding:existing.continue')}</Link>
            </Button>
          }
        />
      </PageBody>
    )
  }

  const total = ONBOARDING_STEP_IDS.length
  const statuses = deriveOnboardingStepStatuses(currentIndex)
  const steps: StepperStep[] = ONBOARDING_STEP_IDS.map((id, index) => ({
    id,
    title: td(`onboarding:nav.${id}`),
    status: statuses[index] ?? 'upcoming',
  }))

  return (
    <PageBody>
      <PageHeader
        title={t('onboarding:title')}
        description={t('onboarding:description')}
      />

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-12">
        <div className="lg:pt-1">
          <Stepper
            steps={steps}
            current={currentIndex}
            onSelect={goToStepIndex}
            ariaLabel={t('onboarding:nav.rail')}
            progressLabel={t('onboarding:stepper.progress', {
              current: currentIndex + 1,
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
              {td(`onboarding:${current}.heading`)}
            </h2>
            <p className="text-body text-muted-foreground text-pretty">
              {td(`onboarding:${current}.lead`)}
            </p>
          </div>

          <div key={current} className="animate-fade-in">
            {current === 'welcome' && (
              <OnboardingWelcomeStep onGetStarted={() => setStep('setup')} />
            )}
            {current === 'setup' && (
              <OnboardingSetupStep
                country={country}
                onCountryChange={setCountry}
                onContinue={() => setStep('create')}
              />
            )}
            {current === 'create' && (
              <OnboardingCreateStep
                country={country}
                onCreated={() => setStep('ready')}
              />
            )}
            {current === 'ready' && <OnboardingReadyStep />}
          </div>

          {currentIndex > 0 && (
            <div className="flex items-center gap-3 border-t pt-6">
              <Button
                variant="ghost"
                onClick={() => goToStepIndex(Math.max(0, currentIndex - 1))}
              >
                <ArrowLeft />
                {t('onboarding:actions.back')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageBody>
  )
}
