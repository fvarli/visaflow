import { useTranslation } from 'react-i18next'
import { useDossier } from '@/app/providers/DossierProvider'
import { Field } from '@/components/ui/field'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { EmploymentStatus } from '@/domain/types/common'
import { EmploymentStatusSelector } from './EmploymentStatusSelector'

/**
 * Step 1 — employment status. The branch point for the whole flow. Changing the
 * status only writes `employmentStatus` (a shallow merge), so no other field is
 * ever silently cleared.
 */
export function StatusStep() {
  const { state, updateEmployment } = useDossier()
  const { t } = useTranslation('employment')
  const td = dynamicT(t)
  const status = state.application?.employment?.employmentStatus ?? ''

  return (
    <div className="flex flex-col gap-6">
      <Field
        label={t('status.label')}
        htmlFor="employment-status"
        description={t('status.description')}
      >
        <EmploymentStatusSelector
          id="employment-status"
          value={status}
          ariaLabel={t('status.label')}
          onValueChange={(value: EmploymentStatus) =>
            updateEmployment({ employmentStatus: value })
          }
        />
      </Field>

      {status && (
        <GuidanceNote tone="neutral">
          {td(`status.context.${status}`)}
        </GuidanceNote>
      )}
    </div>
  )
}
