import { useTranslation } from 'react-i18next'
import { GuidanceNote } from '@/components/ui/guidance-note'
import type { TimelineModel } from '@/features/timeline/timeline-model'
import { PreparationTaskCard } from './PreparationTaskCard'

interface PreparationPlanProps {
  model: TimelineModel
}

/**
 * The preparation plan: recommended tasks grouped into proximity bands derived
 * from real target dates (Overdue · Today · This week · Before the appointment ·
 * Appointment day · Before travel · Travel · Later). Without an appointment it
 * falls back to calm relative phases and says so — no dates are invented.
 */
export function PreparationPlan({ model }: PreparationPlanProps) {
  const { t } = useTranslation('timeline')

  if (model.taskGroups.length === 0) {
    return <p className="text-body text-muted-foreground">{t('plan.empty')}</p>
  }

  return (
    <div className="flex flex-col gap-8">
      {!model.hasAppointment && (
        <GuidanceNote tone="info">{t('plan.noAppointmentNote')}</GuidanceNote>
      )}

      {model.taskGroups.map((group) => (
        <section key={group.band} className="flex flex-col gap-3">
          <h3
            className={
              group.band === 'overdue'
                ? 'text-warning text-eyebrow font-medium uppercase'
                : 'text-eyebrow text-muted-foreground uppercase'
            }
          >
            {t(`plan.bands.${group.band}`)}
          </h3>
          <div className="flex flex-col gap-3">
            {group.tasks.map((task) => (
              <PreparationTaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
