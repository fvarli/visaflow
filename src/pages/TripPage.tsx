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
import { useFormatters } from '@/lib/format'
import { useLocale } from '@/app/providers/LocaleProvider'
import { getCountryName } from '@/lib/countries'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  TRIP_STEP_IDS,
  deriveStepStatuses,
  type TripStepId,
} from '@/features/trip/trip-wizard'
import { useTripModel } from '@/features/trip/trip-model'
import { TripHero, type TripHeroFact } from '@/components/trip/TripHero'
import { TripDatesStep } from '@/components/trip/TripDatesStep'
import { RouteStep } from '@/components/trip/RouteStep'
import { AccommodationStep } from '@/components/trip/AccommodationStep'
import { TransportationStep } from '@/components/trip/TransportationStep'
import { InsuranceStep } from '@/components/trip/InsuranceStep'
import { TripReviewStep } from '@/components/trip/TripReviewStep'

/**
 * The trip experience as a guided planner: a pinned overview hero plus a
 * six-step flow. This page owns only orchestration — the step index, the rail,
 * the hero facts and navigation. Each step reads and autosaves the dossier
 * itself (no Save button); the shell never touches the schema or validation.
 */
export default function TripPage() {
  const { state, hasData } = useDossier()
  const { t } = useTranslation(['trip', 'common', 'visa-domain'])
  const td = dynamicT(t)
  const f = useFormatters()
  const { locale } = useLocale()
  const model = useTripModel()
  const [searchParams] = useSearchParams()
  // Optional deep-link: /trip?step=<id> opens directly on that step. Existing
  // /trip links (no param) simply start at the first step — nothing breaks.
  const initialStep = (() => {
    const id = searchParams.get('step')
    const index = id ? TRIP_STEP_IDS.indexOf(id as TripStepId) : -1
    return index >= 0 ? index : 0
  })()
  const [current, setCurrent] = useState(initialStep)
  const headingRef = useRef<HTMLHeadingElement>(null)

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
        <NoDossierState section={t('trip:title')} />
      </PageBody>
    )
  }

  const total = TRIP_STEP_IDS.length
  const statuses = deriveStepStatuses(state.application, current)
  const steps: StepperStep[] = TRIP_STEP_IDS.map((id, index) => ({
    id,
    title: td(`trip:steps.${id}.title`),
    status: statuses[index] ?? 'upcoming',
  }))
  const activeId: TripStepId = TRIP_STEP_IDS[current] ?? TRIP_STEP_IDS[0]
  const isLast = current === total - 1

  const { overview, insights } = model
  const countryLabel = (code: string | null) =>
    code ? getCountryName(code, locale) : null

  const facts: TripHeroFact[] = []
  const destinationLabel = countryLabel(overview.destinationCountry)
  if (destinationLabel)
    facts.push({ label: t('trip:hero.destination'), value: destinationLabel })
  const mainLabel = countryLabel(overview.mainDestinationCountry)
  if (mainLabel)
    facts.push({ label: t('trip:hero.mainDestination'), value: mainLabel })
  if (overview.entryDate && overview.exitDate)
    facts.push({
      label: t('trip:hero.dates'),
      value: `${f.dateShort(overview.entryDate)} – ${f.dateShort(overview.exitDate)}`,
    })
  if (overview.totalNights !== null)
    facts.push({
      label: t('trip:hero.nights'),
      value: t('trip:nights', { count: overview.totalNights }),
    })
  if (overview.appointmentDate)
    facts.push({
      label: t('trip:hero.appointment'),
      value: f.relativeDays(overview.appointmentDate),
    })

  return (
    <PageBody>
      <PageHeader
        title={t('trip:wizard.title')}
        description={t('trip:wizard.description')}
      />

      {facts.length > 0 && (
        <TripHero
          className="lg:sticky lg:top-4 lg:z-10"
          facts={facts}
          findingsLabel={
            insights.total > 0
              ? t('trip:hero.toReview', { count: insights.total })
              : undefined
          }
          findingsTone={insights.errorCount > 0 ? 'danger' : 'warning'}
        />
      )}

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-12">
        <div className="lg:pt-1">
          <Stepper
            steps={steps}
            current={current}
            onSelect={setCurrent}
            ariaLabel={t('trip:nav.rail')}
            progressLabel={t('trip:nav.stepProgress', {
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
              {td(`trip:steps.${activeId}.title`)}
            </h2>
            <p className="text-body text-muted-foreground text-pretty">
              {td(`trip:steps.${activeId}.description`)}
            </p>
          </div>

          <div key={activeId} className="animate-fade-in">
            {activeId === 'dates' && <TripDatesStep />}
            {activeId === 'route' && <RouteStep />}
            {activeId === 'accommodation' && <AccommodationStep />}
            {activeId === 'transportation' && <TransportationStep />}
            {activeId === 'insurance' && <InsuranceStep />}
            {activeId === 'review' && <TripReviewStep onEdit={setCurrent} />}
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-6">
            <Button
              variant="ghost"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              <ArrowLeft />
              {t('trip:nav.back')}
            </Button>

            {isLast ? (
              <Button asChild>
                <Link to="/dashboard">{t('common:actions.goToDashboard')}</Link>
              </Button>
            ) : (
              <Button
                onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
              >
                {t('trip:nav.continue')}
                <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageBody>
  )
}
