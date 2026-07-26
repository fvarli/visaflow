import { useFinanceModel } from '@/features/finance/finance-model'
import { FinanceReview } from './FinanceReview'

/**
 * Step 6 — a true summary of the finance section with per-area status and
 * jump-to-edit actions. Editing happens in the earlier steps, never here.
 */
export function FinanceReviewStep({
  onEdit,
}: {
  onEdit: (stepIndex: number) => void
}) {
  const model = useFinanceModel()
  return <FinanceReview model={model} onEdit={onEdit} />
}
