import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { Separator } from '@/components/ui/separator'
import { useEmploymentModel } from '@/features/employment/employment-model'
import { guidanceForStep } from '@/features/employment/employment-guidance'
import { dynamicT } from '@/lib/i18n-dynamic'
import { EmploymentDocumentsSummary } from './EmploymentDocumentsSummary'
import { HrRequestChecklist } from './HrRequestChecklist'

/**
 * Step 5 — supporting employment documents (reusing the Documents workspace as
 * the single source of status) plus the "what to request from HR" checklist.
 * Non-employer statuses see a calm "no employer documents needed" state.
 */
export function DocumentsStep() {
  const { t } = useTranslation('employment')
  const td = dynamicT(t)
  const model = useEmploymentModel()
  const hints = guidanceForStep(model.guidance, 'documents')

  if (!model.isActive) {
    return (
      <EmptyState
        variant="inline"
        icon={FileText}
        title={t('notApplicable.documents.title')}
        description={t('notApplicable.documents.description')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {hints.map((hint) => (
        <GuidanceNote key={hint.id} tone={hint.tone}>
          {td(hint.messageKey)}
        </GuidanceNote>
      ))}

      <EmploymentDocumentsSummary documents={model.documents} />

      <Separator />

      <HrRequestChecklist requests={model.documents.hrRequests} />
    </div>
  )
}
