import { useTranslation } from 'react-i18next'
import { CalendarCheck } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { Input } from '@/components/ui/input'
import { useEmploymentModel } from '@/features/employment/employment-model'
import { guidanceForStep } from '@/features/employment/employment-guidance'
import { dynamicT } from '@/lib/i18n-dynamic'
import { LeaveCoverageSummary } from './LeaveCoverageSummary'

/**
 * Step 4 — approved leave, compared against the canonical Trip dates. Coverage
 * is read from the existing validation findings (never re-derived). Only shown
 * for salaried applicants; others see a calm "not needed" state.
 */
export function LeaveStep() {
  const { state, updateEmployment } = useDossier()
  const { t } = useTranslation('employment')
  const td = dynamicT(t)
  const model = useEmploymentModel()
  const employment = state.application?.employment
  const hints = guidanceForStep(model.guidance, 'leave')

  if (!model.leave.applicable) {
    return (
      <EmptyState
        variant="inline"
        icon={CalendarCheck}
        title={t('notApplicable.leave.title')}
        description={t('notApplicable.leave.description')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('fields.leaveStart')}>
          <Input
            type="date"
            value={employment?.approvedLeaveStart ?? ''}
            onChange={(e) =>
              updateEmployment({
                approvedLeaveStart: e.target.value || undefined,
              })
            }
          />
        </Field>
        <Field label={t('fields.leaveEnd')}>
          <Input
            type="date"
            value={employment?.approvedLeaveEnd ?? ''}
            onChange={(e) =>
              updateEmployment({
                approvedLeaveEnd: e.target.value || undefined,
              })
            }
          />
        </Field>
      </div>

      <LeaveCoverageSummary leave={model.leave} />

      {hints.map((hint) => (
        <GuidanceNote key={hint.id} tone={hint.tone}>
          {td(hint.messageKey)}
        </GuidanceNote>
      ))}
    </div>
  )
}
