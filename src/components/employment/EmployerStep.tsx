import { useTranslation } from 'react-i18next'
import { Briefcase } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { FieldHelp } from '@/components/ui/field-help'
import { Input } from '@/components/ui/input'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { useEmploymentModel } from '@/features/employment/employment-model'
import { guidanceForStep } from '@/features/employment/employment-guidance'
import { dynamicT } from '@/lib/i18n-dynamic'
import { EmploymentTenure } from './EmploymentTenure'

/**
 * Step 2 — current employer, role and derived tenure. Optional records
 * (department, contact, social-security / tax ids) sit behind a non-destructive
 * disclosure, auto-opened when data is present. Applicants without an employer
 * see a calm "not needed" state — never a blank card, never an error.
 */
export function EmployerStep() {
  const { state, updateEmployment } = useDossier()
  const { t } = useTranslation('employment')
  const td = dynamicT(t)
  const model = useEmploymentModel()
  const employment = state.application?.employment
  const hints = guidanceForStep(model.guidance, 'employer')

  if (!model.isActive) {
    return (
      <div className="flex flex-col gap-4">
        {hints.map((hint) => (
          <GuidanceNote key={hint.id} tone={hint.tone}>
            {td(hint.messageKey)}
          </GuidanceNote>
        ))}
        <EmptyState
          variant="inline"
          icon={Briefcase}
          title={t('notApplicable.employer.title')}
          description={t('notApplicable.employer.description')}
        />
      </div>
    )
  }

  const hasAdditional = Boolean(
    employment?.department ||
    employment?.employerAddress ||
    employment?.employerPhone ||
    employment?.socialSecurityNumber ||
    employment?.taxId
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('fields.employerName')}
          className="sm:col-span-2"
          help={
            <FieldHelp
              label={t('why.trigger', { field: t('fields.employerName') })}
              title={t('why.title')}
            >
              <p>{t('why.employerName')}</p>
            </FieldHelp>
          }
        >
          <Input
            value={employment?.employerName ?? ''}
            placeholder={t('fields.employerNamePlaceholder')}
            onChange={(e) =>
              updateEmployment({ employerName: e.target.value || undefined })
            }
          />
        </Field>

        <Field label={t('fields.jobTitle')}>
          <Input
            value={employment?.jobTitle ?? ''}
            placeholder={t('fields.jobTitlePlaceholder')}
            onChange={(e) =>
              updateEmployment({ jobTitle: e.target.value || undefined })
            }
          />
        </Field>

        <Field
          label={t('fields.startDate')}
          help={
            <FieldHelp
              label={t('why.trigger', { field: t('fields.startDate') })}
              title={t('why.title')}
            >
              <p>{t('why.startDate')}</p>
            </FieldHelp>
          }
        >
          <Input
            type="date"
            value={employment?.startDate ?? ''}
            onChange={(e) =>
              updateEmployment({ startDate: e.target.value || undefined })
            }
          />
        </Field>
      </div>

      <EmploymentTenure tenure={model.tenure} />

      {hints.map((hint) => (
        <GuidanceNote key={hint.id} tone={hint.tone}>
          {td(hint.messageKey)}
        </GuidanceNote>
      ))}

      <Accordion
        type="single"
        collapsible
        defaultValue={hasAdditional ? 'additional' : undefined}
      >
        <AccordionItem value="additional">
          <AccordionTrigger>{t('employer.additionalDetails')}</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 pt-1 sm:grid-cols-2">
              <Field label={t('fields.department')}>
                <Input
                  value={employment?.department ?? ''}
                  onChange={(e) =>
                    updateEmployment({
                      department: e.target.value || undefined,
                    })
                  }
                />
              </Field>
              <Field label={t('fields.employerPhone')}>
                <Input
                  value={employment?.employerPhone ?? ''}
                  onChange={(e) =>
                    updateEmployment({
                      employerPhone: e.target.value || undefined,
                    })
                  }
                />
              </Field>
              <Field
                label={t('fields.employerAddress')}
                className="sm:col-span-2"
              >
                <Input
                  value={employment?.employerAddress ?? ''}
                  onChange={(e) =>
                    updateEmployment({
                      employerAddress: e.target.value || undefined,
                    })
                  }
                />
              </Field>
              <Field label={t('fields.socialSecurityNumber')}>
                <Input
                  value={employment?.socialSecurityNumber ?? ''}
                  onChange={(e) =>
                    updateEmployment({
                      socialSecurityNumber: e.target.value || undefined,
                    })
                  }
                />
              </Field>
              <Field label={t('fields.taxId')}>
                <Input
                  value={employment?.taxId ?? ''}
                  onChange={(e) =>
                    updateEmployment({ taxId: e.target.value || undefined })
                  }
                />
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
