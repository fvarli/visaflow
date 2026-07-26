import { useTranslation } from 'react-i18next'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { Separator } from '@/components/ui/separator'
import { useFinanceModel } from '@/features/finance/finance-model'
import { guidanceForStep } from '@/features/finance/finance-guidance'
import { dynamicT } from '@/lib/i18n-dynamic'
import { FinanceDocumentsSummary } from './FinanceDocumentsSummary'
import { FinanceGatherChecklist } from './FinanceGatherChecklist'

/**
 * Step 4 — financial documents, derived entirely from the Documents workspace
 * (the single source of status) and grouped Bank / Employment income / Sponsor /
 * Employer / Other, plus the "evidence to gather" checklist with an accessible
 * copy list.
 */
export function FinancialDocumentsStep() {
  const { t } = useTranslation('finance')
  const td = dynamicT(t)
  const model = useFinanceModel()
  const hints = guidanceForStep(model.guidance, 'documents')

  return (
    <div className="flex flex-col gap-6">
      {hints.map((hint) => (
        <GuidanceNote key={hint.id} tone={hint.tone}>
          {td(hint.messageKey)}
        </GuidanceNote>
      ))}

      <FinanceDocumentsSummary documents={model.documents} />

      <Separator />

      <FinanceGatherChecklist gather={model.documents.gather} />
    </div>
  )
}
