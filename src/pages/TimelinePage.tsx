import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDossier } from '@/app/providers/DossierProvider'
import { PageHeader } from '@/components/ui/page-header'
import { PageBody, Section, SectionHeader } from '@/components/ui/section'
import { NoDossierState } from '@/components/NoDossierState'
import { useTimelineModel } from '@/features/timeline/timeline-model'
import { TimelineHero } from '@/components/timeline/TimelineHero'
import {
  TimelineModeSelector,
  type TimelineMode,
} from '@/components/timeline/TimelineModeSelector'
import { PreparationPlan } from '@/components/timeline/PreparationPlan'
import { KeyDatesTimeline } from '@/components/timeline/KeyDatesTimeline'
import { DocumentFreshnessList } from '@/components/timeline/DocumentFreshnessList'
import { AppointmentDaySummary } from '@/components/timeline/AppointmentDaySummary'

const MODES: TimelineMode[] = ['plan', 'dates', 'freshness']

/**
 * The Timeline experience as a calm, actionable preparation plan — a hero
 * (countdown + recommended next step, reusing the Dashboard's priority), a
 * view switch, and the active view (Preparation plan / Key dates / Document
 * freshness). All derivation lives in the pure `src/features/timeline/*` model;
 * this page owns only orchestration. Recommendations are VisaFlow's, never
 * official deadlines.
 */
export default function TimelinePage() {
  const { hasData } = useDossier()
  const { t } = useTranslation('timeline')
  const model = useTimelineModel()

  const [searchParams, setSearchParams] = useSearchParams()
  const paramMode = searchParams.get('mode') as TimelineMode | null
  const mode: TimelineMode =
    paramMode && MODES.includes(paramMode) ? paramMode : 'plan'

  const setMode = (next: TimelineMode) =>
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set('mode', next)
      return params
    })

  if (!hasData) {
    return (
      <PageBody>
        <NoDossierState section={t('title')} />
      </PageBody>
    )
  }

  return (
    <PageBody>
      <PageHeader title={t('title')} description={t('description')} />

      <TimelineHero model={model} />

      <TimelineModeSelector value={mode} onValueChange={setMode} />

      {mode === 'plan' && (
        <div className="flex flex-col gap-10">
          {/* Wrapped in a Section like the other two modes: PreparationPlan
              emits `h3` band headings, so without an `h2` above it the page
              jumped h1 -> h3. */}
          <Section>
            <SectionHeader
              title={t('plan.title')}
              description={t('plan.description')}
            />
            <PreparationPlan model={model} />
          </Section>
          <Section>
            <SectionHeader
              title={t('appointmentDay.title')}
              description={t('appointmentDay.description')}
            />
            <AppointmentDaySummary summary={model.appointmentDay} />
          </Section>
        </div>
      )}

      {mode === 'dates' && (
        <Section>
          <SectionHeader
            title={t('keyDates.title')}
            description={t('keyDates.description')}
          />
          <KeyDatesTimeline events={model.keyDates} />
        </Section>
      )}

      {mode === 'freshness' && (
        <Section>
          <SectionHeader
            title={t('freshness.title')}
            description={t('freshness.description')}
          />
          <DocumentFreshnessList freshness={model.freshness} />
        </Section>
      )}
    </PageBody>
  )
}
