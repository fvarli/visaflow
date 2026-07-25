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
import { Section, SectionHeader } from '@/components/ui/section'
import { Field } from '@/components/ui/field'
import { FieldHelp } from '@/components/ui/field-help'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CountryCombobox } from '@/components/ui/country-combobox'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  deriveTripGuidance,
  tripGuidanceForStage,
} from '@/features/trip/trip-guidance'
import type { RouteStop } from '@/domain/schemas/trip.schema'
import { RouteBuilder } from './RouteBuilder'

interface RouteFormData {
  firstEntryCountry: string
  mainDestinationCountry: string
  entryCity?: string
  exitCity?: string
  tripPurpose?: string
}

/**
 * Step 2 — where the trip goes. Scalar destination fields autosave inline; the
 * itinerary itself is built with the connected-journey RouteBuilder.
 */
export function RouteStep() {
  const { state, updateTrip } = useDossier()
  const { t } = useTranslation(['trip'])
  const td = dynamicT(t)
  const trip = state.application?.trip

  const schema = useMemo(
    () =>
      z.object({
        firstEntryCountry: z
          .string()
          .min(2, t('trip:errors.firstEntryCountryRequired')),
        mainDestinationCountry: z
          .string()
          .min(2, t('trip:errors.mainDestinationRequired')),
        entryCity: z.string().optional(),
        exitCity: z.string().optional(),
        tripPurpose: z.string().optional(),
      }),
    [t]
  )

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RouteFormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      firstEntryCountry: trip?.firstEntryCountry ?? '',
      mainDestinationCountry: trip?.mainDestinationCountry ?? '',
      entryCity: trip?.entryCity ?? '',
      exitCity: trip?.exitCity ?? '',
      tripPurpose: trip?.tripPurpose ?? '',
    },
  })

  useEffect(() => {
    const sub = watch((values) => {
      updateTrip({
        firstEntryCountry: (values.firstEntryCountry ?? '').toUpperCase(),
        mainDestinationCountry: (
          values.mainDestinationCountry ?? ''
        ).toUpperCase(),
        entryCity: values.entryCity || undefined,
        exitCity: values.exitCity || undefined,
        tripPurpose: values.tripPurpose || undefined,
      })
    })
    return () => sub.unsubscribe()
  }, [watch, updateTrip])

  const bookedCities = (trip?.accommodationReservations ?? []).map((a) =>
    a.city.trim().toLowerCase()
  )

  const handleRouteChange = (route: RouteStop[]) => updateTrip({ route })

  const firstEntryCountry = watch('firstEntryCountry')
  const mainDestinationCountry = watch('mainDestinationCountry')
  const guidance = tripGuidanceForStage(deriveTripGuidance(trip), 'route')

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('trip:destinations.title')}</CardTitle>
          <CardDescription>
            {t('trip:destinations.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('trip:destinations.firstEntryCountry')}
              required
              htmlFor="trip-first-entry"
              error={errors.firstEntryCountry?.message}
              help={
                <FieldHelp
                  label={t('trip:why.trigger', {
                    field: t('trip:destinations.firstEntryCountry'),
                  })}
                  title={t('trip:why.title')}
                >
                  <p>{t('trip:why.firstEntry')}</p>
                </FieldHelp>
              }
            >
              <CountryCombobox
                id="trip-first-entry"
                ariaLabel={t('trip:destinations.firstEntryCountry')}
                value={firstEntryCountry || ''}
                onValueChange={(code) =>
                  setValue('firstEntryCountry', code, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            </Field>
            <Field
              label={t('trip:destinations.mainDestination')}
              required
              htmlFor="trip-main-destination"
              error={errors.mainDestinationCountry?.message}
              help={
                <FieldHelp
                  label={t('trip:why.trigger', {
                    field: t('trip:destinations.mainDestination'),
                  })}
                  title={t('trip:why.title')}
                >
                  <p>{t('trip:why.mainDestination')}</p>
                </FieldHelp>
              }
            >
              <CountryCombobox
                id="trip-main-destination"
                ariaLabel={t('trip:destinations.mainDestination')}
                value={mainDestinationCountry || ''}
                onValueChange={(code) =>
                  setValue('mainDestinationCountry', code, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            </Field>
            <Field label={t('trip:destinations.entryCity')}>
              <Input
                {...register('entryCity')}
                placeholder={t('trip:destinations.cityPlaceholder')}
              />
            </Field>
            <Field label={t('trip:destinations.exitCity')}>
              <Input
                {...register('exitCity')}
                placeholder={t('trip:destinations.cityPlaceholder')}
              />
            </Field>
            <Field label={t('trip:purpose.title')} className="sm:col-span-2">
              <Textarea
                {...register('tripPurpose')}
                placeholder={t('trip:purpose.placeholder')}
                rows={2}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Section>
        <SectionHeader title={t('trip:route.title')} />
        <RouteBuilder
          stops={trip?.route ?? []}
          mainDestinationCountry={trip?.mainDestinationCountry}
          bookedCities={bookedCities}
          entryDate={trip?.entryDate}
          exitDate={trip?.exitDate}
          onChange={handleRouteChange}
        />
        {guidance.map((hint) => (
          <GuidanceNote
            key={hint.id}
            tone={hint.tone}
            dismissLabel={t('trip:guidance.dismiss')}
          >
            {td(hint.messageKey)}
          </GuidanceNote>
        ))}
      </Section>
    </div>
  )
}
