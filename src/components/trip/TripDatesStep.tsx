import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDossier } from '@/app/providers/DossierProvider'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { TripDateSummary } from '@/components/trip/TripDateSummary'

interface DatesFormData {
  entryDate: string
  exitDate: string
  appointmentDate?: string
  appointmentTime?: string
  appointmentLocation?: string
}

/**
 * Step 1 — travel dates plus, as a visually separate card, the consulate
 * appointment (framed as preparation tracking, not part of the itinerary).
 * Inline-validates and autosaves; no Save button.
 */
export function TripDatesStep() {
  const { state, updateTrip, updateAppointment } = useDossier()
  const { t } = useTranslation(['trip'])
  const trip = state.application?.trip
  const appointment = state.application?.appointment

  const schema = useMemo(
    () =>
      z.object({
        entryDate: z.string().min(1, t('trip:errors.entryDateRequired')),
        exitDate: z.string().min(1, t('trip:errors.exitDateRequired')),
        appointmentDate: z.string().optional(),
        appointmentTime: z.string().optional(),
        appointmentLocation: z.string().optional(),
      }),
    [t]
  )

  const {
    register,
    watch,
    formState: { errors },
  } = useForm<DatesFormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      entryDate: trip?.entryDate ?? '',
      exitDate: trip?.exitDate ?? '',
      appointmentDate: appointment?.date ?? '',
      appointmentTime: appointment?.time ?? '',
      appointmentLocation: appointment?.location ?? '',
    },
  })

  useEffect(() => {
    const sub = watch((values) => {
      updateTrip({
        entryDate: values.entryDate ?? '',
        exitDate: values.exitDate ?? '',
      })
      if (values.appointmentDate) {
        updateAppointment({
          date: values.appointmentDate,
          time: values.appointmentTime || undefined,
          location: values.appointmentLocation || undefined,
        })
      }
    })
    return () => sub.unsubscribe()
  }, [watch, updateTrip, updateAppointment])

  const entryDate = watch('entryDate')
  const exitDate = watch('exitDate')
  const appointmentDate = watch('appointmentDate')

  return (
    <div className="space-y-6">
      <TripDateSummary
        entryDate={entryDate || null}
        exitDate={exitDate || null}
        appointmentDate={appointmentDate || null}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('trip:dates.title')}</CardTitle>
          <CardDescription>{t('trip:dates.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('trip:dates.entryDate')}
              required
              error={errors.entryDate?.message}
            >
              <Input type="date" {...register('entryDate')} />
            </Field>
            <Field
              label={t('trip:dates.exitDate')}
              required
              error={errors.exitDate?.message}
            >
              <Input type="date" {...register('exitDate')} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('trip:appointment.title')}</CardTitle>
          <CardDescription>{t('trip:appointment.note')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('trip:appointment.date')}>
              <Input type="date" {...register('appointmentDate')} />
            </Field>
            <Field label={t('trip:appointment.time')}>
              <Input type="time" {...register('appointmentTime')} />
            </Field>
            <Field label={t('trip:appointment.location')}>
              <Input
                {...register('appointmentLocation')}
                placeholder={t('trip:appointment.locationPlaceholder')}
              />
            </Field>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
