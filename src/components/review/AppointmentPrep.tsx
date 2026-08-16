import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Check, CircleDashed } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { DataList, DataListItem } from '@/components/ui/data-list'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { StatusBadge } from '@/components/ui/status-badge'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { AppointmentFacts } from '@/features/review/review-summary'
import type { AppointmentDaySummaryModel } from '@/features/timeline/timeline-model'

interface AppointmentPrepProps {
  appointmentDay: AppointmentDaySummaryModel
  appointment: AppointmentFacts
  templateNoteKeys: string[]
}

/**
 * Appointment preparation — organisational only.
 *
 * "Before leaving home" reuses the Timeline's `buildAppointmentDay` derivation
 * and its labels, so the two surfaces never disagree about what is ready. "At
 * the appointment" states only what the applicant themselves recorded, plus the
 * country pack's own honestly-maintained notes. Nothing about an office's
 * procedure is invented, and there is deliberately no fabricated "after
 * submission" checklist — VisaFlow does not know what happens next (ADR-015).
 */
export function AppointmentPrep({
  appointmentDay,
  appointment,
  templateNoteKeys,
}: AppointmentPrepProps) {
  const { t } = useTranslation(['review', 'timeline', 'visa-domain'])
  const td = dynamicT(t)
  const format = useFormatters()

  const missing = t('review:summary.notRecorded')
  const hasDetails = Boolean(
    appointment.time || appointment.location || appointment.confirmationNumber
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="space-y-1">
          <h3 className="text-body text-foreground font-semibold">
            {t('review:appointmentPrep.beforeLeaving.title')}
          </h3>
          <p className="text-caption text-muted-foreground">
            {t('review:appointmentPrep.beforeLeaving.description')}
          </p>
        </CardHeader>
        <CardContent>
          <ul className="divide-border divide-y">
            {appointmentDay.items.map((item) => {
              const Icon = item.ready ? Check : CircleDashed
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5"
                >
                  <span className="text-body text-foreground flex min-w-0 items-center gap-2.5">
                    <Icon
                      aria-hidden
                      className="text-muted-foreground size-4 shrink-0"
                    />
                    {td(`timeline:appointmentDay.items.${item.id}`)}
                  </span>
                  <StatusBadge tone={item.ready ? 'success' : 'neutral'}>
                    {item.ready
                      ? t('timeline:appointmentDay.ready')
                      : t('timeline:appointmentDay.notReady')}
                  </StatusBadge>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <h3 className="text-body text-foreground font-semibold">
            {t('review:appointmentPrep.atAppointment.title')}
          </h3>
          <p className="text-caption text-muted-foreground">
            {t('review:appointmentPrep.atAppointment.description')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {appointment.date ? (
            <>
              <DataList>
                <DataListItem
                  label={t('review:summary.appointment')}
                  value={
                    [format.dateShort(appointment.date), appointment.time]
                      .filter(Boolean)
                      .join(' · ') || missing
                  }
                />
                <DataListItem
                  label={t('review:summary.appointmentLocation')}
                  value={appointment.location ?? missing}
                />
                <DataListItem
                  label={t('review:summary.confirmation')}
                  value={appointment.confirmationNumber ?? missing}
                  mono={Boolean(appointment.confirmationNumber)}
                />
              </DataList>
              {!hasDetails && (
                <p className="text-caption text-muted-foreground text-pretty">
                  {t('review:appointmentPrep.noAppointmentDetails')}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-body text-muted-foreground text-pretty">
                {t('review:appointmentPrep.noAppointment')}
              </p>
              <Link
                to={appointment.to}
                className="text-primary inline-flex w-fit items-center gap-1 rounded-sm text-sm font-medium hover:underline"
              >
                {t('review:appointmentPrep.openTrip')}
                <ArrowUpRight aria-hidden className="size-3.5" />
              </Link>
            </div>
          )}

          {templateNoteKeys.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-eyebrow text-muted-foreground uppercase">
                {t('review:appointmentPrep.notesTitle')}
              </p>
              <ul className="text-caption text-muted-foreground list-disc space-y-1 pl-4">
                {templateNoteKeys.map((key) => (
                  <li key={key}>{td(key)}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <GuidanceNote tone="neutral">
          <span className="text-foreground block font-medium">
            {t('review:appointmentPrep.afterSubmission.title')}
          </span>
          {t('review:appointmentPrep.afterSubmission.body')}
        </GuidanceNote>
      </div>
    </div>
  )
}
