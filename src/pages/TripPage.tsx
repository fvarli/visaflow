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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NoDossierState } from '@/components/NoDossierState'
import { useEffect } from 'react'

const formSchema = z.object({
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  appointmentLocation: z.string().optional(),
  entryDate: z.string().min(1, 'Entry date is required'),
  exitDate: z.string().min(1, 'Exit date is required'),
  firstEntryCountry: z.string().min(2, 'First entry country is required'),
  mainDestinationCountry: z.string().min(2, 'Main destination is required'),
  entryCity: z.string().optional(),
  exitCity: z.string().optional(),
  tripPurpose: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export default function TripPage() {
  const { state, updateTrip, updateAppointment, hasData } = useDossier()
  const { t } = useTranslation(['trip', 'common'])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appointmentDate: state.application?.appointment?.date ?? '',
      appointmentTime: state.application?.appointment?.time ?? '',
      appointmentLocation: state.application?.appointment?.location ?? '',
      entryDate: state.application?.trip?.entryDate ?? '',
      exitDate: state.application?.trip?.exitDate ?? '',
      firstEntryCountry: state.application?.trip?.firstEntryCountry ?? '',
      mainDestinationCountry:
        state.application?.trip?.mainDestinationCountry ?? '',
      entryCity: state.application?.trip?.entryCity ?? '',
      exitCity: state.application?.trip?.exitCity ?? '',
      tripPurpose: state.application?.trip?.tripPurpose ?? '',
    },
  })

  useEffect(() => {
    if (state.application) {
      setValue('appointmentDate', state.application.appointment?.date ?? '')
      setValue('appointmentTime', state.application.appointment?.time ?? '')
      setValue(
        'appointmentLocation',
        state.application.appointment?.location ?? ''
      )
      setValue('entryDate', state.application.trip?.entryDate ?? '')
      setValue('exitDate', state.application.trip?.exitDate ?? '')
      setValue(
        'firstEntryCountry',
        state.application.trip?.firstEntryCountry ?? ''
      )
      setValue(
        'mainDestinationCountry',
        state.application.trip?.mainDestinationCountry ?? ''
      )
      setValue('entryCity', state.application.trip?.entryCity ?? '')
      setValue('exitCity', state.application.trip?.exitCity ?? '')
      setValue('tripPurpose', state.application.trip?.tripPurpose ?? '')
    }
  }, [state.application, setValue])

  const onSubmit = (data: FormData) => {
    if (data.appointmentDate) {
      updateAppointment({
        date: data.appointmentDate,
        time: data.appointmentTime,
        location: data.appointmentLocation,
      })
    }

    updateTrip({
      entryDate: data.entryDate,
      exitDate: data.exitDate,
      firstEntryCountry: data.firstEntryCountry,
      mainDestinationCountry: data.mainDestinationCountry,
      entryCity: data.entryCity,
      exitCity: data.exitCity,
      tripPurpose: data.tripPurpose,
    })
  }

  if (!hasData) {
    return <NoDossierState section={t('trip:title')} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('trip:title')}</h1>
        <p className="text-muted-foreground">{t('trip:shortDescription')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('trip:appointment.title')}</CardTitle>
            <CardDescription>
              {t('trip:appointment.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="appointmentDate">
                  {t('trip:appointment.date')}
                </Label>
                <Input
                  id="appointmentDate"
                  type="date"
                  {...register('appointmentDate')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointmentTime">
                  {t('trip:appointment.time')}
                </Label>
                <Input
                  id="appointmentTime"
                  type="time"
                  {...register('appointmentTime')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointmentLocation">
                  {t('trip:appointment.location')}
                </Label>
                <Input
                  id="appointmentLocation"
                  {...register('appointmentLocation')}
                  placeholder={t('trip:appointment.locationPlaceholder')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('trip:dates.title')}</CardTitle>
            <CardDescription>{t('trip:dates.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entryDate">{t('trip:dates.entryDate')} *</Label>
                <Input id="entryDate" type="date" {...register('entryDate')} />
                {errors.entryDate && (
                  <p className="text-sm text-red-500">
                    {errors.entryDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="exitDate">{t('trip:dates.exitDate')} *</Label>
                <Input id="exitDate" type="date" {...register('exitDate')} />
                {errors.exitDate && (
                  <p className="text-sm text-red-500">
                    {errors.exitDate.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('trip:destinations.title')}</CardTitle>
            <CardDescription>
              {t('trip:destinations.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstEntryCountry">
                  {t('trip:destinations.firstEntryCountry')} *
                </Label>
                <Input
                  id="firstEntryCountry"
                  {...register('firstEntryCountry')}
                  placeholder={t('trip:destinations.countryPlaceholder')}
                  maxLength={2}
                />
                {errors.firstEntryCountry && (
                  <p className="text-sm text-red-500">
                    {errors.firstEntryCountry.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mainDestinationCountry">
                  {t('trip:destinations.mainDestination')} *
                </Label>
                <Input
                  id="mainDestinationCountry"
                  {...register('mainDestinationCountry')}
                  placeholder={t('trip:destinations.countryPlaceholder')}
                  maxLength={2}
                />
                {errors.mainDestinationCountry && (
                  <p className="text-sm text-red-500">
                    {errors.mainDestinationCountry.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entryCity">
                  {t('trip:destinations.entryCity')}
                </Label>
                <Input
                  id="entryCity"
                  {...register('entryCity')}
                  placeholder={t('trip:destinations.cityPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exitCity">
                  {t('trip:destinations.exitCity')}
                </Label>
                <Input
                  id="exitCity"
                  {...register('exitCity')}
                  placeholder={t('trip:destinations.cityPlaceholder')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tripPurpose">{t('trip:purpose.title')}</Label>
              <Textarea
                id="tripPurpose"
                {...register('tripPurpose')}
                placeholder={t('trip:purpose.placeholder')}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">{t('common:actions.saveChanges')}</Button>
        </div>
      </form>
    </div>
  )
}
