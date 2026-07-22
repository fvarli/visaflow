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
import { NoDossierState } from '@/components/NoDossierState'
import { dynamicT } from '@/lib/i18n-dynamic'
import { useEffect } from 'react'

const formSchema = z.object({
  employmentStatus: z.string().min(1, 'Employment status is required'),
  employerName: z.string().optional(),
  jobTitle: z.string().optional(),
  startDate: z.string().optional(),
  monthlyNetIncome: z.string().optional(),
  currency: z.string().optional(),
  approvedLeaveStart: z.string().optional(),
  approvedLeaveEnd: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export default function EmploymentPage() {
  const { state, updateEmployment, hasData } = useDossier()
  const { t } = useTranslation(['employment', 'common', 'visa-domain'])
  const td = dynamicT(t)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employmentStatus: state.application?.employment?.employmentStatus ?? '',
      employerName: state.application?.employment?.employerName ?? '',
      jobTitle: state.application?.employment?.jobTitle ?? '',
      startDate: state.application?.employment?.startDate ?? '',
      monthlyNetIncome:
        state.application?.employment?.monthlyNetIncome?.toString() ?? '',
      currency: state.application?.employment?.currency ?? 'EUR',
      approvedLeaveStart:
        state.application?.employment?.approvedLeaveStart ?? '',
      approvedLeaveEnd: state.application?.employment?.approvedLeaveEnd ?? '',
    },
  })

  const employmentStatus = watch('employmentStatus')

  useEffect(() => {
    if (state.application?.employment) {
      const emp = state.application.employment
      setValue('employmentStatus', emp.employmentStatus)
      setValue('employerName', emp.employerName ?? '')
      setValue('jobTitle', emp.jobTitle ?? '')
      setValue('startDate', emp.startDate ?? '')
      setValue('monthlyNetIncome', emp.monthlyNetIncome?.toString() ?? '')
      setValue('currency', emp.currency)
      setValue('approvedLeaveStart', emp.approvedLeaveStart ?? '')
      setValue('approvedLeaveEnd', emp.approvedLeaveEnd ?? '')
    }
  }, [state.application?.employment, setValue])

  const onSubmit = (data: FormData) => {
    updateEmployment({
      employmentStatus: data.employmentStatus as
        | 'employed'
        | 'self_employed'
        | 'unemployed'
        | 'retired'
        | 'student'
        | 'homemaker'
        | 'other',
      employerName: data.employerName,
      jobTitle: data.jobTitle,
      startDate: data.startDate,
      monthlyNetIncome: data.monthlyNetIncome
        ? parseFloat(data.monthlyNetIncome)
        : undefined,
      currency: data.currency as
        | 'EUR'
        | 'USD'
        | 'GBP'
        | 'TRY'
        | 'CHF'
        | 'JPY'
        | 'CAD'
        | 'AUD'
        | 'CNY'
        | 'INR'
        | 'OTHER',
      approvedLeaveStart: data.approvedLeaveStart,
      approvedLeaveEnd: data.approvedLeaveEnd,
    })
  }

  if (!hasData) {
    return <NoDossierState section={t('employment:title')} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('employment:title')}</h1>
        <p className="text-muted-foreground">
          {t('employment:shortDescription')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('employment:status.title')}</CardTitle>
            <CardDescription>
              {t('employment:status.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employmentStatus">
                {t('employment:status.label')} *
              </Label>
              <Select
                value={employmentStatus}
                onValueChange={(value) => setValue('employmentStatus', value)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('employment:status.placeholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">
                    {td('visa-domain:employmentStatus.employed')}
                  </SelectItem>
                  <SelectItem value="self_employed">
                    {td('visa-domain:employmentStatus.self_employed')}
                  </SelectItem>
                  <SelectItem value="unemployed">
                    {td('visa-domain:employmentStatus.unemployed')}
                  </SelectItem>
                  <SelectItem value="retired">
                    {td('visa-domain:employmentStatus.retired')}
                  </SelectItem>
                  <SelectItem value="student">
                    {td('visa-domain:employmentStatus.student')}
                  </SelectItem>
                  <SelectItem value="homemaker">
                    {td('visa-domain:employmentStatus.homemaker')}
                  </SelectItem>
                  <SelectItem value="other">
                    {td('visa-domain:employmentStatus.other')}
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.employmentStatus && (
                <p className="text-sm text-red-500">
                  {errors.employmentStatus.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {employmentStatus === 'employed' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t('employment:employer.title')}</CardTitle>
                <CardDescription>
                  {t('employment:employer.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="employerName">
                      {t('employment:employer.name')}
                    </Label>
                    <Input
                      id="employerName"
                      {...register('employerName')}
                      placeholder={t('employment:employer.namePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">
                      {t('employment:employer.jobTitle')}
                    </Label>
                    <Input
                      id="jobTitle"
                      {...register('jobTitle')}
                      placeholder={t('employment:employer.jobTitlePlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">
                      {t('employment:employer.startDate')}
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...register('startDate')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyNetIncome">
                      {t('employment:employer.monthlyNetIncome')}
                    </Label>
                    <Input
                      id="monthlyNetIncome"
                      type="number"
                      {...register('monthlyNetIncome')}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">
                      {t('employment:employer.currency')}
                    </Label>
                    <Select
                      value={watch('currency')}
                      onValueChange={(value) => setValue('currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="TRY">TRY</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('employment:leave.title')}</CardTitle>
                <CardDescription>
                  Leave period approved by your employer for this trip
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="approvedLeaveStart">
                      {t('employment:leave.startDate')}
                    </Label>
                    <Input
                      id="approvedLeaveStart"
                      type="date"
                      {...register('approvedLeaveStart')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approvedLeaveEnd">
                      {t('employment:leave.endDate')}
                    </Label>
                    <Input
                      id="approvedLeaveEnd"
                      type="date"
                      {...register('approvedLeaveEnd')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex justify-end">
          <Button type="submit">{t('common:actions.saveChanges')}</Button>
        </div>
      </form>
    </div>
  )
}
