import { useTranslation } from 'react-i18next'
import { ArrowRight, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { DataList, DataListItem } from '@/components/ui/data-list'
import { useFindingText } from '@/lib/finding-text'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import { EMPLOYMENT_STEP_IDS } from '@/features/employment/employment-wizard'
import type {
  EmploymentModel,
  EmploymentReviewStatus,
} from '@/features/employment/employment-model'
import type { Employment } from '@/domain/schemas/employment.schema'
import { EmploymentTenure } from './EmploymentTenure'

interface EmploymentReviewProps {
  model: EmploymentModel
  employment: Employment | undefined
  onEdit: (stepIndex: number) => void
}

const STATUS_TONE: Record<EmploymentReviewStatus, StatusTone> = {
  captured: 'success',
  incomplete: 'warning',
  needsReview: 'warning',
  notApplicable: 'neutral',
}

/**
 * The employment review — a true summary (never an editing screen). Each section
 * shows a plain-language status and jumps back to its step; a compact facts list
 * and any leave findings round it out. Status language is organizational
 * (captured / incomplete / needs review / not applicable) — never "approved" or
 * "strong profile" (ADR-016).
 */
export function EmploymentReview({
  model,
  employment,
  onEdit,
}: EmploymentReviewProps) {
  const { t } = useTranslation(['employment', 'visa-domain', 'common'])
  const td = dynamicT(t)
  const f = useFormatters()
  const findingText = useFindingText()

  return (
    <div className="flex flex-col gap-6">
      <ul className="divide-border divide-y">
        {model.review.map((section) => {
          const index = EMPLOYMENT_STEP_IDS.indexOf(section.id)
          return (
            <li
              key={section.id}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
            >
              <span className="text-body text-foreground">
                {td(`employment:steps.${section.id}.title`)}
              </span>
              <span className="flex items-center gap-2">
                <StatusBadge tone={STATUS_TONE[section.status]} dot>
                  {t(`employment:review.status.${section.status}`)}
                </StatusBadge>
                <Button variant="ghost" size="sm" onClick={() => onEdit(index)}>
                  <Pencil />
                  {t('employment:review.edit')}
                </Button>
              </span>
            </li>
          )
        })}
      </ul>

      <DataList>
        <DataListItem
          label={t('employment:status.label')}
          value={
            model.status
              ? td(`visa-domain:employmentStatus.${model.status}`)
              : undefined
          }
        />
        {model.isActive && (
          <>
            <DataListItem
              label={t('employment:fields.employerName')}
              value={employment?.employerName}
            />
            <DataListItem
              label={t('employment:fields.jobTitle')}
              value={employment?.jobTitle}
            />
            <DataListItem
              label={t('employment:tenure.label')}
              value={
                model.tenure.isMissing ? undefined : (
                  <EmploymentTenure tenure={model.tenure} />
                )
              }
            />
            <DataListItem
              label={t('employment:fields.monthlyNetIncome')}
              value={
                employment?.monthlyNetIncome != null
                  ? f.currency(employment.monthlyNetIncome, employment.currency)
                  : undefined
              }
            />
            <DataListItem
              label={t('employment:fields.salaryBank')}
              value={employment?.salaryBank}
            />
          </>
        )}
      </DataList>

      {model.leave.findings.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-body text-foreground font-medium">
            {t('employment:review.attention')}
          </h3>
          <ul className="flex flex-col gap-2">
            {model.leave.findings.map((finding) => (
              <li
                key={finding.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm text-muted-foreground">
                  {findingText(finding).title}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(EMPLOYMENT_STEP_IDS.indexOf('leave'))}
                >
                  {t('employment:review.goToFix')}
                  <ArrowRight />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
