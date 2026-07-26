import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/ui/page-header'
import { NoDossierState } from '@/components/NoDossierState'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { useValidationModel } from '@/features/validation/validation-model'
import { ValidationHero } from '@/components/validation/ValidationHero'
import { FindingGroup } from '@/components/validation/FindingGroup'
import { ReadinessSummary } from '@/components/validation/ReadinessSummary'
import { ReviewProgress } from '@/components/validation/ReviewProgress'

/**
 * The Validation Center — the dossier review workspace.
 *
 * A thin composition over `useValidationModel()`: a review hero, findings
 * grouped by domain (each with a calm health label and a direct "take me
 * there" link), the areas that already look good, and a section-by-section
 * summary. It consumes `runValidation` output only; it derives no new
 * judgement and never predicts an outcome (ADR-016, ADR-025).
 */
export default function ConsistencyChecksPage() {
  const { t } = useTranslation('validation')
  const model = useValidationModel()

  if (!model.hasData) {
    return <NoDossierState section={t('center.title')} />
  }

  const hasFindings = model.groups.length > 0

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('center.title')}
        description={t('center.subtitle')}
      />

      <ValidationHero hero={model.hero} />

      {hasFindings && (
        <div className="space-y-6">
          <GuidanceNote tone="neutral">
            {t('center.guidance.body')}
          </GuidanceNote>
          {model.groups.map((group) => (
            <FindingGroup key={group.id} group={group} />
          ))}
        </div>
      )}

      <ReadinessSummary ready={model.ready} />
      <ReviewProgress review={model.review} />

      <p className="text-caption text-muted-foreground">
        {t('center.disclaimer')}
      </p>
    </div>
  )
}
