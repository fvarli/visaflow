import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/page-header'
import { PageBody, Section, SectionHeader } from '@/components/ui/section'
import { NoDossierState } from '@/components/NoDossierState'
import { ReadinessSummary } from '@/components/validation/ReadinessSummary'
import { useFinalReviewModel } from '@/features/review/review-model'
import { ReviewHero } from '@/components/review/ReviewHero'
import { ApplicationSummary } from '@/components/review/ApplicationSummary'
import { JourneySummary } from '@/components/review/JourneySummary'
import { SubmissionChecklist } from '@/components/review/SubmissionChecklist'
import { AttentionSection } from '@/components/review/AttentionSection'
import { AppointmentPrep } from '@/components/review/AppointmentPrep'
import { PrintPackage } from '@/components/review/PrintPackage'
import {
  ReviewModeSelector,
  type ReviewMode,
} from '@/components/review/ReviewModeSelector'
import { DepartureCheck } from '@/components/review/DepartureCheck'

/**
 * Final Review — the last look before the appointment.
 *
 * Deliberately a different question from the Validation Center ("what is
 * inconsistent?"): this page answers "what do I have, what am I still missing,
 * what do I bring, and am I organised for the day?" It is a thin composition
 * over `useFinalReviewModel()`, which derives nothing of its own — readiness is
 * the Dashboard's, findings are the Validation Center's, appointment-day
 * readiness is the Timeline's. Nothing here predicts a visa outcome (ADR-016).
 */
const REVIEW_MODES: ReviewMode[] = ['full', 'departure']

export default function ReviewPage() {
  const { t } = useTranslation(['review', 'validation'])
  const model = useFinalReviewModel()

  // The mode is derived from the URL, so it is bookmarkable and Back/Forward
  // works; an unknown value falls back silently. Presentation state only —
  // nothing is persisted (the same pattern the Timeline's `?mode=` uses).
  const [searchParams, setSearchParams] = useSearchParams()
  const paramMode = searchParams.get('mode') as ReviewMode | null
  const mode: ReviewMode =
    paramMode && REVIEW_MODES.includes(paramMode) ? paramMode : 'full'

  const setMode = (next: ReviewMode) =>
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set('mode', next)
      return params
    })

  if (!model.hasData) {
    return (
      <PageBody>
        <NoDossierState section={t('review:title')} />
      </PageBody>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('review:title')}
        description={t('review:subtitle')}
      />

      <ReviewHero model={model} />

      <ReviewModeSelector value={mode} onValueChange={setMode} />

      {mode === 'departure' && <DepartureCheck model={model} />}

      {mode === 'full' && (
        <>
          <Section>
            <ApplicationSummary summary={model.summary} />
          </Section>

          {/* Directly after the cover sheet: the summary says *what* the
              application is, this says how the trip actually runs. Renders
              nothing at all when no trip detail is recorded. */}
          <Section>
            <JourneySummary itinerary={model.itinerary} />
          </Section>

          <Section>
            <SectionHeader
              title={t('review:checklist.title')}
              description={t('review:checklist.description')}
            />
            <SubmissionChecklist checklist={model.checklist} />
          </Section>

          <Section>
            <SectionHeader
              title={t('review:attention.title')}
              description={t('review:attention.description')}
            />
            <AttentionSection attention={model.attention} />
          </Section>

          <ReadinessSummary ready={model.looksGood} />

          <Section>
            <SectionHeader
              title={t('review:appointmentPrep.title')}
              description={t('review:appointmentPrep.description')}
            />
            <AppointmentPrep
              appointmentDay={model.appointmentDay}
              appointment={model.summary.appointment}
              templateNoteKeys={model.templateNoteKeys}
            />
          </Section>

          <Section>
            <SectionHeader
              title={t('review:print.title')}
              description={t('review:print.description')}
            />
            <PrintPackage print={model.print} />
          </Section>
        </>
      )}

      <p className="text-caption text-muted-foreground">
        {t('review:disclaimer')}
      </p>
    </div>
  )
}
