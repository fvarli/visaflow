import { useForm } from 'react-hook-form'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
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
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No application data loaded. Go to Dashboard to start a new
          application.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trip Details</h1>
        <p className="text-muted-foreground">
          Visa appointment and travel information
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Visa Appointment</CardTitle>
            <CardDescription>
              Your scheduled visa application appointment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="appointmentDate">Date</Label>
                <Input
                  id="appointmentDate"
                  type="date"
                  {...register('appointmentDate')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointmentTime">Time</Label>
                <Input
                  id="appointmentTime"
                  type="time"
                  {...register('appointmentTime')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointmentLocation">Location</Label>
                <Input
                  id="appointmentLocation"
                  {...register('appointmentLocation')}
                  placeholder="e.g., VFS Global Istanbul"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Travel Dates</CardTitle>
            <CardDescription>
              When you plan to enter and leave the Schengen area
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entryDate">Entry Date *</Label>
                <Input id="entryDate" type="date" {...register('entryDate')} />
                {errors.entryDate && (
                  <p className="text-sm text-red-500">
                    {errors.entryDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="exitDate">Exit Date *</Label>
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
            <CardTitle>Destinations</CardTitle>
            <CardDescription>
              Countries and cities you will visit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstEntryCountry">First Entry Country *</Label>
                <Input
                  id="firstEntryCountry"
                  {...register('firstEntryCountry')}
                  placeholder="e.g., GR"
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
                  Main Destination *
                </Label>
                <Input
                  id="mainDestinationCountry"
                  {...register('mainDestinationCountry')}
                  placeholder="e.g., GR"
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
                <Label htmlFor="entryCity">Entry City</Label>
                <Input
                  id="entryCity"
                  {...register('entryCity')}
                  placeholder="e.g., Athens"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exitCity">Exit City</Label>
                <Input
                  id="exitCity"
                  {...register('exitCity')}
                  placeholder="e.g., Athens"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tripPurpose">Trip Purpose</Label>
              <Textarea
                id="tripPurpose"
                {...register('tripPurpose')}
                placeholder="Describe the purpose of your trip..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  )
}
