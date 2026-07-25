import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Pencil,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DataList, DataListItem } from '@/components/ui/data-list'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { useFormatters } from '@/lib/format'
import { useLocale } from '@/app/providers/LocaleProvider'
import { getCountryName } from '@/lib/countries'
import { dynamicT } from '@/lib/i18n-dynamic'
import { useFindingText } from '@/lib/finding-text'
import type { ValidationFinding } from '@/domain/rules/types'
import { useTripModel } from '@/features/trip/trip-model'
import { JourneyTimeline, JourneyStop } from './JourneyTimeline'
import { DestinationCard } from './DestinationCard'
import { TravelSegmentCard } from './TravelSegmentCard'
import { CoverageCard } from './CoverageCard'
import { TRANSPORT_ICON } from './transport-meta'

interface TripReviewStepProps {
  /** dates=0, route=1, accommodation=2, transportation=3, insurance=4 */
  onEdit: (stepIndex: number) => void
}

interface SectionStatus {
  label: string
  tone: StatusTone
}

function ReviewSection({
  title,
  stepIndex,
  onEdit,
  editLabel,
  status,
  children,
}: {
  title: string
  stepIndex: number
  onEdit: (stepIndex: number) => void
  editLabel: string
  status?: SectionStatus
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-heading text-foreground">{title}</h3>
          {status && (
            <StatusBadge tone={status.tone} dot>
              {status.label}
            </StatusBadge>
          )}
        </div>
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

/** Map a trip finding to the wizard step that resolves it, for a jump action. */
function findingStepIndex(finding: ValidationFinding): number {
  const field = finding.relatedFields[0] ?? ''
  if (field.startsWith('trip.insurance')) return 4
  if (field.startsWith('trip.accommodation')) return 2
  if (field.startsWith('trip.transportReservations')) return 3
  if (
    field.startsWith('trip.route') ||
    field.startsWith('trip.mainDestinationCountry') ||
    field.startsWith('trip.firstEntryCountry')
  )
    return 1
  return 0
}

const SEVERITY_ICON: Record<
  ValidationFinding['severity'],
  React.ComponentType<{ className?: string }>
> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}
const SEVERITY_CLASS: Record<ValidationFinding['severity'], string> = {
  error: 'text-danger-foreground',
  warning: 'text-warning-foreground',
  info: 'text-info-foreground',
}

/**
 * Step 6 — a read-only pass over the whole journey with per-section Edit
 * shortcuts and the trip-consistency insights (sourced from the validation
 * engine, organizational only). Nothing is submitted here.
 */
export function TripReviewStep({ onEdit }: TripReviewStepProps) {
  const { state } = useDossier()
  const { t } = useTranslation(['trip', 'visa-domain'])
  const td = dynamicT(t)
  const f = useFormatters()
  const { locale } = useLocale()
  const model = useTripModel()
  const findingText = useFindingText()

  const trip = state.application?.trip
  const appointment = state.application?.appointment
  if (!trip) return null

  const editLabel = t('trip:review.edit')
  const none = t('trip:review.none')
  const notProvided = t('trip:review.notProvided')

  const captured: SectionStatus = {
    label: t('trip:review.status.captured'),
    tone: 'success',
  }
  const incomplete: SectionStatus = {
    label: t('trip:review.status.incomplete'),
    tone: 'neutral',
  }
  const attention: SectionStatus = {
    label: t('trip:review.status.attention'),
    tone: 'warning',
  }
  const hasFindingFor = (stepIndex: number) =>
    model.insights.findings.some(
      (finding) => findingStepIndex(finding) === stepIndex
    )

  const sectionStatus = (
    stepIndex: number,
    complete: boolean
  ): SectionStatus =>
    hasFindingFor(stepIndex) ? attention : complete ? captured : incomplete

  const datesStatus = sectionStatus(0, Boolean(trip.entryDate && trip.exitDate))
  const routeStatus = sectionStatus(1, model.route.length > 0)
  const accommodationStatus = sectionStatus(
    2,
    trip.accommodationReservations.length > 0
  )
  const transportStatus = sectionStatus(
    3,
    trip.transportReservations.length > 0
  )
  const insuranceStatus = sectionStatus(4, Boolean(trip.insurance))

  return (
    <div className="space-y-8">
      <Alert>
        <AlertDescription>{t('trip:review.intro')}</AlertDescription>
      </Alert>

      <ReviewSection
        title={t('trip:review.headings.dates')}
        stepIndex={0}
        onEdit={onEdit}
        editLabel={editLabel}
        status={datesStatus}
      >
        <DataList>
          <DataListItem
            label={t('trip:dates.entryDate')}
            value={trip.entryDate ? f.date(trip.entryDate) : notProvided}
          />
          <DataListItem
            label={t('trip:dates.exitDate')}
            value={trip.exitDate ? f.date(trip.exitDate) : notProvided}
          />
          <DataListItem
            label={t('trip:appointment.title')}
            value={
              appointment?.date
                ? [
                    f.date(appointment.date),
                    appointment.time,
                    appointment.location,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : notProvided
            }
          />
        </DataList>
      </ReviewSection>

      <ReviewSection
        title={t('trip:review.headings.route')}
        stepIndex={1}
        onEdit={onEdit}
        editLabel={editLabel}
        status={routeStatus}
      >
        {model.route.length === 0 ? (
          <p className="text-body text-muted-foreground">{none}</p>
        ) : (
          <JourneyTimeline>
            {model.route.map((stop, index) => (
              <JourneyStop
                key={index}
                isLast={index === model.route.length - 1}
                highlight={stop.isMain}
              >
                <DestinationCard
                  city={stop.city}
                  countryLabel={getCountryName(stop.country, locale)}
                  dateRangeLabel={`${f.dateShort(stop.arrivalDate)} – ${f.dateShort(
                    stop.departureDate
                  )}`}
                  nightsLabel={t('trip:nights', { count: stop.nights })}
                  ratio={stop.ratio}
                  isMain={stop.isMain}
                  mainLabel={t('trip:route.main')}
                />
              </JourneyStop>
            ))}
          </JourneyTimeline>
        )}
      </ReviewSection>

      <ReviewSection
        title={t('trip:review.headings.accommodation')}
        stepIndex={2}
        onEdit={onEdit}
        editLabel={editLabel}
        status={accommodationStatus}
      >
        {trip.accommodationReservations.length === 0 ? (
          <p className="text-body text-muted-foreground">{none}</p>
        ) : (
          <ul className="text-body text-foreground space-y-1">
            {trip.accommodationReservations.map((a, index) => (
              <li key={index}>
                {a.name}
                {a.city ? ` · ${a.city}` : ''}
                {` · ${f.dateShort(a.checkInDate)} → ${f.dateShort(a.checkOutDate)}`}
              </li>
            ))}
          </ul>
        )}
      </ReviewSection>

      <ReviewSection
        title={t('trip:review.headings.transportation')}
        stepIndex={3}
        onEdit={onEdit}
        editLabel={editLabel}
        status={transportStatus}
      >
        {trip.transportReservations.length === 0 ? (
          <p className="text-body text-muted-foreground">{none}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {trip.transportReservations.map((seg, index) => (
              <TravelSegmentCard
                key={index}
                typeLabel={td(`visa-domain:transportType.${seg.type}`)}
                icon={TRANSPORT_ICON[seg.type]}
                carrier={seg.carrier}
                fromLabel={seg.departureCity}
                toLabel={seg.arrivalCity}
                departLabel={[f.dateShort(seg.departureDate), seg.departureTime]
                  .filter(Boolean)
                  .join(' · ')}
                arriveLabel={
                  seg.arrivalDate
                    ? [f.dateShort(seg.arrivalDate), seg.arrivalTime]
                        .filter(Boolean)
                        .join(' · ')
                    : undefined
                }
                statusLabel={td(`visa-domain:transportStatus.${seg.status}`)}
              />
            ))}
          </div>
        )}
      </ReviewSection>

      <ReviewSection
        title={t('trip:review.headings.insurance')}
        stepIndex={4}
        onEdit={onEdit}
        editLabel={editLabel}
        status={insuranceStatus}
      >
        {trip.insurance ? (
          <CoverageCard
            provider={trip.insurance.provider}
            periodLabel={`${f.dateShort(trip.insurance.coverageStartDate)} – ${f.dateShort(
              trip.insurance.coverageEndDate
            )}`}
            amountLabel={
              trip.insurance.coverageAmount !== undefined
                ? f.currency(
                    trip.insurance.coverageAmount,
                    trip.insurance.currency
                  )
                : undefined
            }
            amountCaption={t('trip:insurance.coverageCaption')}
            spansTrip={model.insights.insuranceSpansTrip}
            spansFullLabel={t('trip:insurance.spansTrip.full')}
            spansGapLabel={t('trip:insurance.spansTrip.gap')}
          />
        ) : (
          <p className="text-body text-muted-foreground">{none}</p>
        )}
      </ReviewSection>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-heading text-foreground">
            {t('trip:review.insights.title')}
          </h3>
          <p className="text-caption text-muted-foreground">
            {t('trip:review.insights.description')}
          </p>
        </div>
        {model.insights.findings.length === 0 ? (
          <Alert>
            <ShieldCheck />
            <AlertDescription>
              {t('trip:review.insights.allClear')}
            </AlertDescription>
          </Alert>
        ) : (
          <ul className="flex flex-col gap-3">
            {model.insights.findings.map((finding, index) => {
              const text = findingText(finding)
              const Icon = SEVERITY_ICON[finding.severity]
              return (
                <li
                  key={`${finding.id}-${index}`}
                  className="flex gap-3 rounded-lg border p-3"
                >
                  <Icon
                    className={`mt-0.5 size-4 shrink-0 ${SEVERITY_CLASS[finding.severity]}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-body text-foreground font-medium">
                      {text.title}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {text.description}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={() => onEdit(findingStepIndex(finding))}
                    >
                      {t('trip:review.insights.goToFix')}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
