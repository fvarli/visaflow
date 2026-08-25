import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { DataList, DataListItem } from '@/components/ui/data-list'
import { useFormatters } from '@/lib/format'
import { getCountryName, useCountryName } from '@/lib/countries'
import { useLocale } from '@/app/providers/LocaleProvider'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { ApplicationSummary as ApplicationSummaryModel } from '@/features/review/review-summary'

interface ApplicationSummaryProps {
  summary: ApplicationSummaryModel
}

/**
 * The cover sheet of the dossier — a compact, human-readable restatement of the
 * application, not another form.
 *
 * Every fact is either present or honestly absent: an unrecorded field renders
 * a localized "not recorded yet" rather than the primitive's English fallback,
 * and each row links to the workspace that owns it so the summary is never a
 * dead end.
 */
export function ApplicationSummary({ summary }: ApplicationSummaryProps) {
  const { t } = useTranslation(['review', 'visa-domain'])
  const td = dynamicT(t)
  const format = useFormatters()
  const destinationName = useCountryName(summary.destinationCountry.value)
  // A list needs a plain function, not a hook — same resolution as everywhere
  // else, applied per row.
  const { locale } = useLocale()
  const country = (code: string) => getCountryName(code, locale)

  const missing = t('review:summary.notRecorded')

  const dates =
    summary.entryDate && summary.exitDate
      ? t('review:summary.dateRange', {
          start: format.dateShort(summary.entryDate),
          end: format.dateShort(summary.exitDate),
        })
      : missing

  const appointmentValue = summary.appointment.date
    ? [format.dateShort(summary.appointment.date), summary.appointment.time]
        .filter(Boolean)
        .join(' · ')
    : missing

  return (
    <Card>
      <CardHeader className="space-y-1">
        <h2 className="text-heading text-foreground">
          {t('review:summary.title')}
        </h2>
        <p className="text-body text-muted-foreground">
          {t('review:summary.description')}
        </p>
      </CardHeader>
      <CardContent>
        <DataList>
          <DataListItem
            label={t('review:summary.applicant')}
            value={
              summary.applicantName ? (
                <SummaryLink to={summary.applicantTo}>
                  {summary.applicantName}
                </SummaryLink>
              ) : (
                missing
              )
            }
          />
          <DataListItem
            label={t('review:summary.passport')}
            value={summary.passportNumber ?? missing}
            mono={Boolean(summary.passportNumber)}
          />
          <DataListItem
            label={t('review:summary.destination')}
            value={
              summary.destinationCountry.value ? (
                <SummaryLink to={summary.destinationCountry.to}>
                  {destinationName}
                </SummaryLink>
              ) : (
                missing
              )
            }
          />
          <DataListItem
            label={t('review:summary.visaType')}
            value={
              summary.visaType.value
                ? td(`visa-domain:visaTypes.${summary.visaType.value}`)
                : missing
            }
          />
          <DataListItem
            label={t('review:summary.travelDates')}
            value={
              summary.entryDate && summary.exitDate ? (
                <SummaryLink to={summary.tripTo}>{dates}</SummaryLink>
              ) : (
                missing
              )
            }
          />
          <DataListItem
            label={t('review:summary.duration')}
            value={
              summary.nights !== null
                ? t('review:summary.nights', { count: summary.nights })
                : missing
            }
          />
          <DataListItem
            label={t('review:summary.appointment')}
            value={
              summary.appointment.date ? (
                <SummaryLink to={summary.appointment.to}>
                  {appointmentValue}
                </SummaryLink>
              ) : (
                missing
              )
            }
          />
          <DataListItem
            label={t('review:summary.funding')}
            value={
              summary.funding.value ? (
                <SummaryLink to={summary.funding.to}>
                  {td(`visa-domain:financingSource.${summary.funding.value}`)}
                </SummaryLink>
              ) : (
                missing
              )
            }
          />
          <DataListItem
            label={t('review:summary.employment')}
            value={
              summary.employmentStatus.value ? (
                <SummaryLink to={summary.employmentStatus.to}>
                  {td(
                    `visa-domain:employmentStatus.${summary.employmentStatus.value}`
                  )}
                </SummaryLink>
              ) : (
                missing
              )
            }
          />
          {summary.sponsorCount && (
            <DataListItem
              label={t('review:summary.sponsors')}
              value={
                <SummaryLink to={summary.sponsorCount.to}>
                  {t('review:summary.sponsorCount', {
                    count: summary.sponsorCount.value ?? 0,
                  })}
                </SummaryLink>
              }
            />
          )}
          {/* Shown only when recorded. "No refusals" is the overwhelming
              default and printing it would turn a neutral fact into something
              the applicant feels examined about — and VisaFlow judges none of
              it either way (ADR-016, ADR-043). */}
          {summary.refusals.length > 0 && (
            <DataListItem
              label={t('review:summary.refusals')}
              value={
                <SummaryLink to={summary.refusalsTo}>
                  {summary.refusals
                    .map((refusal) =>
                      [
                        country(refusal.country),
                        refusal.refusedOn
                          ? format.date(refusal.refusedOn)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    )
                    .join(' / ')}
                </SummaryLink>
              }
            />
          )}
        </DataList>
      </CardContent>
    </Card>
  )
}

function SummaryLink({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className="text-foreground hover:text-primary inline-flex items-center gap-1 rounded-sm underline-offset-4 hover:underline"
    >
      {children}
      <ArrowUpRight aria-hidden className="text-muted-foreground size-3.5" />
    </Link>
  )
}
