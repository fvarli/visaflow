import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataList, DataListItem } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/empty-state'
import { MapPin } from 'lucide-react'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import type {
  CountdownModel,
  FinancingSummaryModel,
  TripSummaryModel,
} from '@/features/dashboard/dashboard-model'

interface TripSummaryProps {
  countryCode?: string
  trip: (CountdownModel & TripSummaryModel) | null
  financing: FinancingSummaryModel | null
  sponsorCount: number
}

/** Trip, funding and sponsor context in one read-only panel. */
export function TripSummary({
  countryCode,
  trip,
  financing,
  sponsorCount,
}: TripSummaryProps) {
  const { t } = useTranslation(['dashboard', 'common', 'visa-domain'])
  const td = dynamicT(t)
  const format = useFormatters()

  if (!trip && !financing && sponsorCount === 0) {
    return (
      <Card className="animate-fade-in-up h-full">
        <CardHeader>
          <CardTitle>{t('dashboard:tripSummary.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            variant="inline"
            icon={MapPin}
            title={t('dashboard:tripSummary.empty')}
          />
        </CardContent>
      </Card>
    )
  }

  const destination = trip?.destinationCountry ?? countryCode
  const dates =
    trip?.entryDate && trip.exitDate
      ? `${format.dateShort(trip.entryDate)} – ${format.dateShort(trip.exitDate)}`
      : null

  return (
    <Card className="animate-fade-in-up h-full">
      <CardHeader>
        <CardTitle>{t('dashboard:tripSummary.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataList>
          <DataListItem
            label={t('dashboard:tripSummary.destination')}
            value={
              destination
                ? td(`visa-domain:countries.${destination}`, {
                    defaultValue: destination,
                  })
                : null
            }
          />
          <DataListItem
            label={t('dashboard:tripSummary.dates')}
            value={dates}
          />
          <DataListItem
            label={t('dashboard:tripSummary.budget')}
            value={
              trip?.budget
                ? format.currency(trip.budget.amount, trip.budget.currency)
                : null
            }
          />
          <DataListItem
            label={t('dashboard:tripSummary.financingSource')}
            value={
              financing
                ? td(`visa-domain:financingSource.${financing.source}`, {
                    defaultValue: financing.source,
                  })
                : null
            }
          />
          <DataListItem
            label={t('dashboard:tripSummary.accountBalance')}
            value={
              financing?.accountBalance !== undefined
                ? format.currency(financing.accountBalance, financing.currency)
                : null
            }
          />
          <DataListItem
            label={t('dashboard:tripSummary.sponsors')}
            value={sponsorCount > 0 ? sponsorCount : null}
          />
          <DataListItem
            label={t('dashboard:tripSummary.insurance')}
            value={
              trip
                ? trip.hasInsurance
                  ? t('dashboard:tripSummary.insured')
                  : t('dashboard:tripSummary.notInsured')
                : null
            }
          />
        </DataList>
      </CardContent>
    </Card>
  )
}
