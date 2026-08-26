import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, BedDouble, Plane, Route } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getCountryName } from '@/lib/countries'
import { useLocale } from '@/app/providers/LocaleProvider'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import type {
  Itinerary,
  ItineraryLeg,
  ItineraryStay,
} from '@/features/review/review-itinerary'

interface JourneySummaryProps {
  itinerary: Itinerary
}

/**
 * The journey, on the page that reviews it.
 *
 * Trip data was always complete and always invisible here: Final Review showed
 * two dates and a night count while the dossier held the flights, the hotels
 * and the reason for going. This reads `buildItinerary` and renders it —
 * nothing is derived a second time and nothing is stored (ADR-044).
 *
 * Absent values are stated as absent. A leg with no date is grouped under "no
 * date recorded" rather than being placed in the journey on a guess, and a
 * missing carrier or reference is simply not printed.
 */
export function JourneySummary({ itinerary }: JourneySummaryProps) {
  const { t } = useTranslation(['review', 'visa-domain'])
  const td = dynamicT(t)
  const format = useFormatters()
  const { locale } = useLocale()
  const country = (code: string | null) =>
    code ? getCountryName(code, locale) : null

  if (itinerary.isEmpty) return null

  const legsByDirection = (
    ['outbound', 'internal', 'return', 'unscheduled'] as const
  )
    .map((direction) => ({
      direction,
      legs: itinerary.legs.filter((leg) => leg.direction === direction),
    }))
    .filter((group) => group.legs.length > 0)

  const legLabel = (leg: ItineraryLeg): string => {
    if (leg.departureCity && leg.arrivalCity) {
      return t('review:journey.leg', {
        from: leg.departureCity,
        to: leg.arrivalCity,
      })
    }
    if (leg.departureCity)
      return t('review:journey.legFrom', { from: leg.departureCity })
    if (leg.arrivalCity)
      return t('review:journey.legTo', { to: leg.arrivalCity })
    return td(`visa-domain:transportType.${leg.type}`, {
      defaultValue: leg.type,
    })
  }

  const legMeta = (leg: ItineraryLeg): string =>
    [
      leg.departureDate ? format.dateShort(leg.departureDate) : null,
      leg.departureTime,
      leg.carrier,
      leg.reservationNumber
        ? t('review:journey.reference', { value: leg.reservationNumber })
        : null,
    ]
      .filter(Boolean)
      .join(' · ')

  const stayMeta = (stay: ItineraryStay): string =>
    [
      stay.checkInDate && stay.checkOutDate
        ? t('review:summary.dateRange', {
            start: format.dateShort(stay.checkInDate),
            end: format.dateShort(stay.checkOutDate),
          })
        : null,
      stay.nights > 0
        ? t('review:journey.nights', { count: stay.nights })
        : t('review:journey.dayTrip'),
      stay.reservationNumber
        ? t('review:journey.reference', { value: stay.reservationNumber })
        : null,
    ]
      .filter(Boolean)
      .join(' · ')

  return (
    <Card>
      <CardHeader className="space-y-1">
        <h3 className="text-body text-foreground flex items-center gap-2 font-semibold">
          <Route aria-hidden className="text-muted-foreground size-4" />
          {t('review:journey.title')}
        </h3>
        <p className="text-caption text-muted-foreground text-pretty">
          {t('review:journey.description')}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {itinerary.purpose && (
          <div className="space-y-0.5">
            <p className="text-eyebrow text-muted-foreground uppercase">
              {t('review:journey.purpose')}
            </p>
            <p className="text-body text-foreground text-pretty">
              {itinerary.purpose}
            </p>
          </div>
        )}

        {legsByDirection.length > 0 && (
          <div className="space-y-2">
            <p className="text-eyebrow text-muted-foreground flex items-center gap-1.5 uppercase">
              <Plane aria-hidden className="size-3.5" />
              {t('review:journey.legs')}
            </p>
            {legsByDirection.map((group) => (
              <div key={group.direction} className="space-y-1">
                <p className="text-caption text-muted-foreground">
                  {td(`review:journey.direction.${group.direction}`)}
                </p>
                <ul className="divide-border divide-y">
                  {group.legs.map((leg) => (
                    <li
                      key={leg.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5"
                    >
                      <span className="text-body text-foreground">
                        {legLabel(leg)}
                      </span>
                      {legMeta(leg) && (
                        <span
                          className="text-caption text-muted-foreground"
                          data-numeric
                        >
                          {legMeta(leg)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {itinerary.stays.length > 0 && (
          <div className="space-y-2">
            <p className="text-eyebrow text-muted-foreground flex items-center gap-1.5 uppercase">
              <BedDouble aria-hidden className="size-3.5" />
              {t('review:journey.stays')}
            </p>
            <ul className="divide-border divide-y">
              {itinerary.stays.map((stay) => (
                <li
                  key={stay.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5"
                >
                  <span className="text-body text-foreground">
                    {[stay.name, stay.city ?? country(stay.country)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {stayMeta(stay) && (
                    <span
                      className="text-caption text-muted-foreground"
                      data-numeric
                    >
                      {stayMeta(stay)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          to="/trip"
          className="text-primary inline-flex items-center gap-1 self-start text-sm hover:underline"
        >
          {t('review:summary.openTrip')}
          <ArrowUpRight className="size-3.5" />
        </Link>
      </CardContent>
    </Card>
  )
}
