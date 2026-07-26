import { useDossier } from '@/app/providers/DossierProvider'
import { useEmploymentModel } from '@/features/employment/employment-model'
import { EmploymentReview } from './EmploymentReview'

/**
 * Step 6 — a true summary of the employment section with per-area status and
 * jump-to-edit actions. Editing happens in the earlier steps, never here.
 */
export function EmploymentReviewStep({
  onEdit,
}: {
  onEdit: (stepIndex: number) => void
}) {
  const { state } = useDossier()
  const model = useEmploymentModel()

  return (
    <EmploymentReview
      model={model}
      employment={state.application?.employment}
      onEdit={onEdit}
    />
  )
}
