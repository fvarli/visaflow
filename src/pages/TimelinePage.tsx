import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { differenceInDays, parseISO, isBefore, addDays } from 'date-fns'
import { useDossier } from '@/app/providers/DossierProvider'
import { resolveVisaTemplate } from '@/config/countries'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle, Clock, Plane, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NoDossierState } from '@/components/NoDossierState'
import { useFormatters } from '@/lib/format'
import { documentLabel } from '@/lib/document-label'
import { dynamicT } from '@/lib/i18n-dynamic'

interface TimelineItem {
  id: string
  date: Date
  title: string
  description: string
  type: 'appointment' | 'milestone' | 'trip' | 'document'
  status: 'past' | 'upcoming' | 'today'
  icon: React.ComponentType<{ className?: string }>
}

export default function TimelinePage() {
  const { state, hasData } = useDossier()
  const { t } = useTranslation(['timeline', 'common'])
  const td = dynamicT(t)
  const format = useFormatters()

  const timelineItems = useMemo(() => {
    if (!hasData || !state.application) return []

    const items: TimelineItem[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Add appointment
    if (state.application.appointment?.date) {
      const date = parseISO(state.application.appointment.date)
      items.push({
        id: 'appointment',
        date,
        title: t('timeline:events.appointment'),
        description:
          state.application.appointment.location ??
          t('timeline:events.appointmentNoLocation'),
        type: 'appointment',
        status: getStatus(date, today),
        icon: Calendar,
      })

      // Add preparation milestones based on appointment
      const template = resolveVisaTemplate(
        state.application.destinationCountry,
        state.application.visaType
      )
      if (template) {
        template.preparationMilestones.forEach((milestone) => {
          const milestoneDate = addDays(date, -milestone.daysBeforeAppointment)
          items.push({
            id: milestone.id,
            date: milestoneDate,
            title: td(milestone.nameKey),
            description: td(milestone.descriptionKey),
            type: 'milestone',
            status: getStatus(milestoneDate, today),
            icon: FileText,
          })
        })
      }
    }

    // Add trip dates
    if (state.application.trip?.entryDate) {
      const entryDate = parseISO(state.application.trip.entryDate)
      items.push({
        id: 'trip-start',
        date: entryDate,
        title: t('timeline:events.tripBegins'),
        description: t('timeline:events.tripBeginsDescription', {
          country:
            state.application.trip.firstEntryCountry ||
            t('timeline:events.schengenArea'),
        }),
        type: 'trip',
        status: getStatus(entryDate, today),
        icon: Plane,
      })
    }

    if (state.application.trip?.exitDate) {
      const exitDate = parseISO(state.application.trip.exitDate)
      items.push({
        id: 'trip-end',
        date: exitDate,
        title: t('timeline:events.tripEnds'),
        description: t('timeline:events.tripEndsDescription'),
        type: 'trip',
        status: getStatus(exitDate, today),
        icon: Plane,
      })
    }

    // Add document expiry dates
    state.documents
      .filter((doc) => doc.validUntil && doc.status !== 'not_applicable')
      .forEach((doc) => {
        const expiryDate = parseISO(doc.validUntil!)
        if (
          differenceInDays(expiryDate, today) <= 90 &&
          differenceInDays(expiryDate, today) >= 0
        ) {
          items.push({
            id: `doc-expiry-${doc.id}`,
            date: expiryDate,
            title: t('timeline:events.documentExpires', {
              document: documentLabel(t, doc.code, doc.name),
            }),
            description: t('timeline:events.documentExpiresDescription'),
            type: 'document',
            status: getStatus(expiryDate, today),
            icon: FileText,
          })
        }
      })

    // Sort by date
    items.sort((a, b) => a.date.getTime() - b.date.getTime())

    return items
  }, [state, hasData, t, td])

  if (!hasData) {
    return <NoDossierState section={t('timeline:title')} />
  }

  if (timelineItems.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('timeline:title')}</h1>
          <p className="text-muted-foreground">
            {t('timeline:shortDescription')}
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('timeline:empty.title')}</p>
            <p className="text-sm text-muted-foreground">
              {t('timeline:empty.description')}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('timeline:title')}</h1>
        <p className="text-muted-foreground">{t('timeline:description')}</p>
      </div>

      <div className="space-y-4">
        {timelineItems.map((item, index) => {
          const Icon = item.icon
          const isLast = index === timelineItems.length - 1

          return (
            <div key={item.id} className="flex gap-4">
              {/* Timeline line and dot */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2',
                    item.status === 'past'
                      ? 'border-green-500 bg-green-50'
                      : item.status === 'today'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-white'
                  )}
                >
                  {item.status === 'past' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : item.status === 'today' ? (
                    <Clock className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Icon className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      'w-0.5 flex-1',
                      item.status === 'past' ? 'bg-green-500' : 'bg-gray-200'
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <Card className="flex-1 mb-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <Badge
                      variant={
                        item.status === 'past'
                          ? 'secondary'
                          : item.status === 'today'
                            ? 'default'
                            : 'outline'
                      }
                    >
                      {format.dateShort(item.date)}
                    </Badge>
                  </div>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {item.status === 'past'
                      ? t('common:time.daysAgo', {
                          count: Math.abs(
                            differenceInDays(item.date, new Date())
                          ),
                        })
                      : item.status === 'today'
                        ? t('common:time.today')
                        : t('common:time.inDays', {
                            count: differenceInDays(item.date, new Date()),
                          })}
                  </p>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getStatus(date: Date, today: Date): 'past' | 'upcoming' | 'today' {
  if (isBefore(date, today)) return 'past'
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return 'today'
  }
  return 'upcoming'
}
