import { useTranslation } from 'react-i18next'
import { useDossier } from '@/app/providers/DossierProvider'
import { Field } from '@/components/ui/field'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  OCCUPATIONS_BY_STATUS,
  type EmploymentStatus,
  type KnownOccupationCode,
} from '@/domain/types/common'
import { occupationAfterStatusChange } from '@/features/documents/applicability'
import { EmploymentStatusSelector } from './EmploymentStatusSelector'
import { OccupationSelector } from './OccupationSelector'

/**
 * Step 1 — employment status, and the occupational branch it opens.
 *
 * Changing the status writes `employmentStatus` and, when it invalidates one,
 * clears the occupational code. Nothing else is ever touched, so no other field
 * is silently lost.
 *
 * The second question is not a second step. It is optional, most applicants can
 * ignore it, and a step of its own would add a stop to a rail that is already
 * six long — while an unanswered optional step is a shape the rail has no
 * honest status for.
 */
export function StatusStep() {
  const { state, updateEmployment } = useDossier()
  const { t } = useTranslation('employment')
  const td = dynamicT(t)
  const employment = state.application?.employment
  const status = employment?.employmentStatus ?? ''

  /**
   * The codes legal under this status, or nothing at all. A pensioner, a
   * student and someone not working are already the branch the checklists
   * publish, so they are asked no occupational question.
   */
  const options = status ? OCCUPATIONS_BY_STATUS[status] : undefined

  /**
   * Changing status can invalidate the occupational answer. The rule lives
   * beside the resolver rather than here, because it is a rule and not a
   * rendering concern — and because a Radix `Select` cannot be opened under
   * jsdom, so logic left inline in this component would be untestable except
   * through a browser.
   */
  const onStatusChange = (next: EmploymentStatus) => {
    updateEmployment({
      employmentStatus: next,
      occupationCode: occupationAfterStatusChange(employment, next),
    })
  }

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
          onValueChange={onStatusChange}
        />
      </Field>

      {options && (
        <Field
          label={t('occupation.label')}
          htmlFor="employment-occupation"
          description={t('occupation.description')}
        >
          <OccupationSelector
            id="employment-occupation"
            options={options}
            value={employment?.occupationCode}
            ariaLabel={t('occupation.label')}
            onValueChange={(value: KnownOccupationCode) =>
              updateEmployment({ occupationCode: value })
            }
          />
        </Field>
      )}

      {status && (
        <GuidanceNote tone="neutral">
          {td(`status.context.${status}`)}
        </GuidanceNote>
      )}
    </div>
  )
}
