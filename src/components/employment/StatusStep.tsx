import { useTranslation } from 'react-i18next'
import { useDossier } from '@/app/providers/DossierProvider'
import { Field } from '@/components/ui/field'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  OCCUPATIONAL_CATEGORIES_BY_STATUS,
  type EmploymentStatus,
  type OccupationalCategory,
} from '@/domain/types/common'
import { EmploymentStatusSelector } from './EmploymentStatusSelector'
import { OccupationalCategorySelector } from './OccupationalCategorySelector'

/**
 * Step 1 — employment status. The branch point for the whole flow. Changing the
 * status only writes `employmentStatus` (a shallow merge), so no other field is
 * ever silently cleared.
 *
 * Two questions now, and the second is deliberately not a second step. It is
 * optional, most applicants can ignore it, and a step of its own would put a
 * sixth stop in a rail that already reads as long — while an unanswered
 * optional step is exactly the shape the rail has no honest status for.
 */
export function StatusStep() {
  const { state, updateEmployment } = useDossier()
  const { t } = useTranslation('employment')
  const td = dynamicT(t)
  const employment = state.application?.employment
  const status = employment?.employmentStatus ?? ''

  /**
   * Only the categories that belong under the chosen status, and nothing at all
   * for the statuses that have none — a pensioner, a student and someone not
   * working are already the branch the checklist publishes, so asking them to
   * narrow it would be asking a question with no consequence.
   */
  const categories = status
    ? OCCUPATIONAL_CATEGORIES_BY_STATUS[status]
    : undefined

  /**
   * A category the current status does not offer is not rendered as a value.
   *
   * `updateEmployment` shallow-merges and clears nothing, which is the right
   * default everywhere else — someone who switches status by accident does not
   * lose their employer details. Here it means a stale pair can exist
   * (`employed` + `farmer`, after a change of mind). Showing it as the selected
   * value would present it as this dossier's answer; showing the placeholder
   * instead says the question is open, which is what it is.
   */
  const category = employment?.occupationalCategory
  const shownCategory =
    category && categories?.includes(category) ? category : ''

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

      {categories && (
        <Field
          label={t('category.label')}
          htmlFor="employment-category"
          description={t('category.description')}
        >
          <OccupationalCategorySelector
            id="employment-category"
            options={categories}
            value={shownCategory}
            ariaLabel={t('category.label')}
            onValueChange={(value: OccupationalCategory) =>
              updateEmployment({ occupationalCategory: value })
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
