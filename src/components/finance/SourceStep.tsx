import { useTranslation } from 'react-i18next'
import { useDossier } from '@/app/providers/DossierProvider'
import { Field } from '@/components/ui/field'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { FinancingSource } from '@/domain/types/common'
import { FundingSourceSelector } from './FundingSourceSelector'

/**
 * Step 1 — funding source. The branch point for the whole flow. Changing the
 * source only writes `source` (a shallow merge), so no other field is ever
 * silently cleared, and an imported dossier's source stays fully editable.
 */
export function SourceStep() {
  const { state, updateFinancing } = useDossier()
  const { t } = useTranslation('finance')
  const td = dynamicT(t)
  const source = state.application?.financing?.source ?? ''

  return (
    <div className="flex flex-col gap-6">
      <Field
        label={t('source.label')}
        htmlFor="funding-source"
        description={t('source.description')}
      >
        <FundingSourceSelector
          id="funding-source"
          value={source}
          ariaLabel={t('source.label')}
          onValueChange={(value: FinancingSource) =>
            updateFinancing({ source: value })
          }
        />
      </Field>

      {source && (
        <GuidanceNote tone="neutral">
          {td(`source.context.${source}`)}
        </GuidanceNote>
      )}
    </div>
  )
}
