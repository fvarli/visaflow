import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/ui/page-header'
import { Section, SectionHeader } from '@/components/ui/section'
import { NoDossierState } from '@/components/NoDossierState'
import { ReadinessSummary } from '@/components/validation/ReadinessSummary'
import { useFinalReviewModel } from '@/features/review/review-model'
import { ReviewHero } from '@/components/review/ReviewHero'
import { ApplicationSummary } from '@/components/review/ApplicationSummary'
import { SubmissionChecklist } from '@/components/review/SubmissionChecklist'
import { AttentionSection } from '@/components/review/AttentionSection'
import { AppointmentPrep } from '@/components/review/AppointmentPrep'
import { PrintPackage } from '@/components/review/PrintPackage'

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
export default function ReviewPage() {
  const { t } = useTranslation(['review', 'validation'])
  const model = useFinalReviewModel()

  if (!model.hasData) {
    return <NoDossierState section={t('review:title')} />
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('review:title')}
        description={t('review:subtitle')}
      />

      <ReviewHero model={model} />

      <Section>
        <ApplicationSummary summary={model.summary} />
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

      <p className="text-caption text-muted-foreground">
        {t('review:disclaimer')}
      </p>
    </div>
  )
}
