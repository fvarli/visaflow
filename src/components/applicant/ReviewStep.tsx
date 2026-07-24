import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DataList, DataListItem } from '@/components/ui/data-list'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'

interface ReviewStepProps {
  /** Jump back to a step (personal=0, passport=1, previousVisas=2, travelHistory=3). */
  onEdit: (stepIndex: number) => void
}

function ReviewSection({
  title,
  stepIndex,
  onEdit,
  editLabel,
  children,
}: {
  title: string
  stepIndex: number
  onEdit: (stepIndex: number) => void
  editLabel: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-heading text-foreground">{title}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(stepIndex)}
          aria-label={`${editLabel} — ${title}`}
        >
          <Pencil />
          {editLabel}
        </Button>
      </div>
      {children}
    </section>
  )
}

/**
 * Step 5 — a read-only pass over everything entered, with an Edit affordance on
 * each section that jumps back to the matching step. Nothing is submitted here;
 * data already lives in the dossier via each step's autosave.
 */
export function ReviewStep({ onEdit }: ReviewStepProps) {
  const { state } = useDossier()
  const { t } = useTranslation(['applicant', 'visa-domain'])
  const td = dynamicT(t)
  const f = useFormatters()
  const applicant = state.applicant

  if (!applicant) return null

  const none = t('applicant:review.none')
  const notProvided = t('applicant:review.notProvided')
  const editLabel = t('applicant:review.edit')
  const fullName =
    [applicant.firstName, applicant.lastName].filter(Boolean).join(' ') ||
    notProvided

  return (
    <div className="space-y-8">
      <Alert>
        <AlertDescription>{t('applicant:review.intro')}</AlertDescription>
      </Alert>

      <ReviewSection
        title={t('applicant:review.personalHeading')}
        stepIndex={0}
        onEdit={onEdit}
        editLabel={editLabel}
      >
        <DataList>
          <DataListItem
            label={t('applicant:fields.firstName')}
            value={fullName}
          />
          <DataListItem
            label={t('applicant:fields.dateOfBirth')}
            value={
              applicant.dateOfBirth
                ? f.date(applicant.dateOfBirth)
                : notProvided
            }
          />
          <DataListItem
            label={t('applicant:fields.nationality')}
            value={applicant.nationality || notProvided}
          />
          <DataListItem
            label={t('applicant:fields.countryOfResidence')}
            value={applicant.countryOfResidence || notProvided}
          />
          <DataListItem
            label={t('applicant:fields.maritalStatus')}
            value={
              applicant.maritalStatus
                ? td(`visa-domain:maritalStatus.${applicant.maritalStatus}`)
                : notProvided
            }
          />
          <DataListItem
            label={t('applicant:fields.occupation')}
            value={applicant.occupation || notProvided}
          />
          <DataListItem
            label={t('applicant:fields.email')}
            value={applicant.email || notProvided}
          />
          <DataListItem
            label={t('applicant:fields.phone')}
            value={applicant.phone || notProvided}
          />
        </DataList>
      </ReviewSection>

      <ReviewSection
        title={t('applicant:review.passportHeading')}
        stepIndex={1}
        onEdit={onEdit}
        editLabel={editLabel}
      >
        <DataList>
          <DataListItem
            label={t('applicant:fields.passportNumber')}
            value={applicant.passport?.number || notProvided}
            mono
          />
          <DataListItem
            label={t('applicant:fields.passportIssuingCountry')}
            value={applicant.passport?.issuingCountry || notProvided}
          />
          <DataListItem
            label={t('applicant:fields.passportIssueDate')}
            value={
              applicant.passport?.issueDate
                ? f.date(applicant.passport.issueDate)
                : notProvided
            }
          />
          <DataListItem
            label={t('applicant:fields.passportExpiry')}
            value={
              applicant.passport?.expiryDate
                ? f.date(applicant.passport.expiryDate)
                : notProvided
            }
          />
          <DataListItem
            label={t('applicant:fields.passportType')}
            value={
              applicant.passport?.passportType
                ? td(
                    `visa-domain:passportType.${applicant.passport.passportType}`
                  )
                : notProvided
            }
          />
        </DataList>
      </ReviewSection>

      <ReviewSection
        title={t('applicant:review.previousVisasHeading')}
        stepIndex={2}
        onEdit={onEdit}
        editLabel={editLabel}
      >
        {applicant.previousVisas.length === 0 ? (
          <p className="text-body text-muted-foreground">{none}</p>
        ) : (
          <ul className="text-body text-foreground space-y-1">
            {applicant.previousVisas.map((visa, index) => (
              <li key={index}>
                {visa.visaType || t('applicant:previousVisas.untitled')}
                {visa.country ? ` · ${visa.country}` : ''}
                {visa.status
                  ? ` · ${td(`visa-domain:previousVisaStatus.${visa.status}`)}`
                  : ''}
              </li>
            ))}
          </ul>
        )}
      </ReviewSection>

      <ReviewSection
        title={t('applicant:review.travelHistoryHeading')}
        stepIndex={3}
        onEdit={onEdit}
        editLabel={editLabel}
      >
        {applicant.travelHistory.length === 0 ? (
          <p className="text-body text-muted-foreground">{none}</p>
        ) : (
          <ul className="text-body text-foreground space-y-1">
            {applicant.travelHistory.map((trip, index) => (
              <li key={index}>
                {trip.country || t('applicant:travelHistory.untitled')}
                {trip.entryDate ? ` · ${f.dateShort(trip.entryDate)}` : ''}
                {trip.purpose ? ` · ${trip.purpose}` : ''}
              </li>
            ))}
          </ul>
        )}
      </ReviewSection>
    </div>
  )
}
