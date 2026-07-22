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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { NoDossierState } from '@/components/NoDossierState'
import { dynamicT } from '@/lib/i18n-dynamic'
import { useEffect } from 'react'

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  nationality: z.string().min(2, 'Nationality is required'),
  maritalStatus: z.string().optional(),
  occupation: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  passportNumber: z.string().min(1, 'Passport number is required'),
  passportIssueDate: z.string().min(1, 'Issue date is required'),
  passportExpiryDate: z.string().min(1, 'Expiry date is required'),
  passportIssuingCountry: z.string().min(2, 'Issuing country is required'),
})

type FormData = z.infer<typeof formSchema>

export default function ApplicantPage() {
  const { state, updateApplicant, hasData } = useDossier()
  const { t } = useTranslation(['applicant', 'common', 'visa-domain'])
  const td = dynamicT(t)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: state.applicant?.firstName ?? '',
      lastName: state.applicant?.lastName ?? '',
      dateOfBirth: state.applicant?.dateOfBirth ?? '',
      nationality: state.applicant?.nationality ?? '',
      maritalStatus: state.applicant?.maritalStatus ?? '',
      occupation: state.applicant?.occupation ?? '',
      email: state.applicant?.email ?? '',
      phone: state.applicant?.phone ?? '',
      passportNumber: state.applicant?.passport?.number ?? '',
      passportIssueDate: state.applicant?.passport?.issueDate ?? '',
      passportExpiryDate: state.applicant?.passport?.expiryDate ?? '',
      passportIssuingCountry: state.applicant?.passport?.issuingCountry ?? '',
    },
  })

  // Update form when state changes
  useEffect(() => {
    if (state.applicant) {
      setValue('firstName', state.applicant.firstName)
      setValue('lastName', state.applicant.lastName)
      setValue('dateOfBirth', state.applicant.dateOfBirth)
      setValue('nationality', state.applicant.nationality)
      setValue('maritalStatus', state.applicant.maritalStatus ?? '')
      setValue('occupation', state.applicant.occupation ?? '')
      setValue('email', state.applicant.email ?? '')
      setValue('phone', state.applicant.phone ?? '')
      setValue('passportNumber', state.applicant.passport?.number ?? '')
      setValue('passportIssueDate', state.applicant.passport?.issueDate ?? '')
      setValue('passportExpiryDate', state.applicant.passport?.expiryDate ?? '')
      setValue(
        'passportIssuingCountry',
        state.applicant.passport?.issuingCountry ?? ''
      )
    }
  }, [state.applicant, setValue])

  const onSubmit = (data: FormData) => {
    updateApplicant({
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      nationality: data.nationality,
      maritalStatus: data.maritalStatus as
        | 'single'
        | 'married'
        | 'divorced'
        | 'widowed'
        | 'separated'
        | 'civil_partnership'
        | undefined,
      occupation: data.occupation,
      email: data.email || undefined,
      phone: data.phone,
      passport: {
        number: data.passportNumber,
        issueDate: data.passportIssueDate,
        expiryDate: data.passportExpiryDate,
        issuingCountry: data.passportIssuingCountry,
        passportType: 'ordinary',
      },
    })
  }

  // Auto-save on blur
  const watchAllFields = watch()
  useEffect(() => {
    const subscription = watch(() => {
      if (isDirty) {
        void handleSubmit(onSubmit)()
      }
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, handleSubmit, isDirty])

  if (!hasData) {
    return <NoDossierState section={t('applicant:title')} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('applicant:title')}</h1>
        <p className="text-muted-foreground">
          {t('applicant:shortDescription')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('applicant:personal.title')}</CardTitle>
            <CardDescription>
              {t('applicant:personal.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  {t('applicant:fields.firstName')} *
                </Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  placeholder={t('applicant:hints.asOnPassport')}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  {t('applicant:fields.lastName')} *
                </Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  placeholder={t('applicant:hints.asOnPassport')}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">
                  {t('applicant:fields.dateOfBirth')} *
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth')}
                />
                {errors.dateOfBirth && (
                  <p className="text-sm text-red-500">
                    {errors.dateOfBirth.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">
                  {t('applicant:fields.nationality')} *
                </Label>
                <Input
                  id="nationality"
                  {...register('nationality')}
                  placeholder="e.g., TR"
                  maxLength={2}
                />
                {errors.nationality && (
                  <p className="text-sm text-red-500">
                    {errors.nationality.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maritalStatus">
                  {t('applicant:fields.maritalStatus')}
                </Label>
                <Select
                  value={watchAllFields.maritalStatus}
                  onValueChange={(value) => setValue('maritalStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t('applicant:hints.selectStatus')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">
                      {td('visa-domain:maritalStatus.single')}
                    </SelectItem>
                    <SelectItem value="married">
                      {td('visa-domain:maritalStatus.married')}
                    </SelectItem>
                    <SelectItem value="divorced">
                      {td('visa-domain:maritalStatus.divorced')}
                    </SelectItem>
                    <SelectItem value="widowed">
                      {td('visa-domain:maritalStatus.widowed')}
                    </SelectItem>
                    <SelectItem value="separated">
                      {td('visa-domain:maritalStatus.separated')}
                    </SelectItem>
                    <SelectItem value="civil_partnership">
                      {td('visa-domain:maritalStatus.civil_partnership')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupation">
                  {t('applicant:fields.occupation')}
                </Label>
                <Input
                  id="occupation"
                  {...register('occupation')}
                  placeholder="e.g., Software Engineer"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">{t('applicant:fields.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="your@email.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('applicant:fields.phone')}</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+90 XXX XXX XX XX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Passport Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('applicant:passport.title')}</CardTitle>
            <CardDescription>
              {t('applicant:passport.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="passportNumber">
                  {t('applicant:fields.passportNumber')} *
                </Label>
                <Input
                  id="passportNumber"
                  {...register('passportNumber')}
                  placeholder="e.g., U12345678"
                />
                {errors.passportNumber && (
                  <p className="text-sm text-red-500">
                    {errors.passportNumber.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="passportIssuingCountry">
                  {t('applicant:fields.passportIssuingCountry')} *
                </Label>
                <Input
                  id="passportIssuingCountry"
                  {...register('passportIssuingCountry')}
                  placeholder="e.g., TR"
                  maxLength={2}
                />
                {errors.passportIssuingCountry && (
                  <p className="text-sm text-red-500">
                    {errors.passportIssuingCountry.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="passportIssueDate">
                  {t('applicant:fields.passportIssueDate')} *
                </Label>
                <Input
                  id="passportIssueDate"
                  type="date"
                  {...register('passportIssueDate')}
                />
                {errors.passportIssueDate && (
                  <p className="text-sm text-red-500">
                    {errors.passportIssueDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="passportExpiryDate">
                  {t('applicant:fields.passportExpiry')} *
                </Label>
                <Input
                  id="passportExpiryDate"
                  type="date"
                  {...register('passportExpiryDate')}
                />
                {errors.passportExpiryDate && (
                  <p className="text-sm text-red-500">
                    {errors.passportExpiryDate.message}
                  </p>
                )}
              </div>
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
