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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { NoDossierState } from '@/components/NoDossierState'
import { dynamicT } from '@/lib/i18n-dynamic'
import { useEffect } from 'react'

const formSchema = z.object({
  source: z.string().min(1, 'Funding source is required'),
  selfFundedAmount: z.string().optional(),
  bankName: z.string().optional(),
  accountBalance: z.string().optional(),
  statementDate: z.string().optional(),
  currency: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export default function FinancePage() {
  const { state, updateFinancing, hasData } = useDossier()
  const { t } = useTranslation(['finance', 'common', 'visa-domain'])
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
      source: state.application?.financing?.source ?? '',
      selfFundedAmount:
        state.application?.financing?.selfFundedAmount?.toString() ?? '',
      bankName: state.application?.financing?.bankName ?? '',
      accountBalance:
        state.application?.financing?.accountBalance?.toString() ?? '',
      statementDate: state.application?.financing?.statementDate ?? '',
      currency: state.application?.financing?.currency ?? 'EUR',
    },
  })

  const source = watch('source')

  useEffect(() => {
    if (state.application?.financing) {
      const fin = state.application.financing
      setValue('source', fin.source)
      setValue('selfFundedAmount', fin.selfFundedAmount?.toString() ?? '')
      setValue('bankName', fin.bankName ?? '')
      setValue('accountBalance', fin.accountBalance?.toString() ?? '')
      setValue('statementDate', fin.statementDate ?? '')
      setValue('currency', fin.currency)
    }
  }, [state.application?.financing, setValue])

  const onSubmit = (data: FormData) => {
    updateFinancing({
      source: data.source as 'self' | 'sponsor' | 'employer' | 'mixed',
      selfFundedAmount: data.selfFundedAmount
        ? parseFloat(data.selfFundedAmount)
        : undefined,
      bankName: data.bankName,
      accountBalance: data.accountBalance
        ? parseFloat(data.accountBalance)
        : undefined,
      statementDate: data.statementDate,
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
    })
  }

  if (!hasData) {
    return <NoDossierState section={t('finance:title')} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('finance:title')}</h1>
        <p className="text-muted-foreground">{t('finance:shortDescription')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('finance:source.title')}</CardTitle>
            <CardDescription>{t('finance:source.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source">{t('finance:source.label')} *</Label>
              <Select
                value={source}
                onValueChange={(value) => setValue('source', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('finance:source.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">
                    {td('visa-domain:financingSource.self')}
                  </SelectItem>
                  <SelectItem value="sponsor">
                    {td('visa-domain:financingSource.sponsor')}
                  </SelectItem>
                  <SelectItem value="employer">
                    {td('visa-domain:financingSource.employer')}
                  </SelectItem>
                  <SelectItem value="mixed">
                    {td('visa-domain:financingSource.mixed')}
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.source && (
                <p className="text-sm text-red-500">{errors.source.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {(source === 'self' || source === 'mixed') && (
          <Card>
            <CardHeader>
              <CardTitle>{t('finance:personal.title')}</CardTitle>
              <CardDescription>
                Your personal financial information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankName">
                    {t('finance:personal.bankName')}
                  </Label>
                  <Input
                    id="bankName"
                    {...register('bankName')}
                    placeholder={t('finance:personal.bankNamePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statementDate">
                    {t('finance:personal.statementDate')}
                  </Label>
                  <Input
                    id="statementDate"
                    type="date"
                    {...register('statementDate')}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="accountBalance">
                    {t('finance:personal.accountBalance')}
                  </Label>
                  <Input
                    id="accountBalance"
                    type="number"
                    {...register('accountBalance')}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">
                    {t('finance:personal.currency')}
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
                      <SelectItem value="TRY">TRY</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(source === 'sponsor' || source === 'mixed') && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              For sponsor-funded trips, add sponsor details in the Sponsors
              section.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button type="submit">{t('common:actions.saveChanges')}</Button>
        </div>
      </form>
    </div>
  )
}
