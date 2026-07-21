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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
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
        <h1 className="text-2xl font-bold">Financial Information</h1>
        <p className="text-muted-foreground">How you will finance your trip</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Funding Source</CardTitle>
            <CardDescription>
              Who will cover the expenses for this trip?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source">Primary Funding Source *</Label>
              <Select
                value={source}
                onValueChange={(value) => setValue('source', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self-funded</SelectItem>
                  <SelectItem value="sponsor">Sponsor-funded</SelectItem>
                  <SelectItem value="employer">Employer-funded</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
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
              <CardTitle>Personal Finances</CardTitle>
              <CardDescription>
                Your personal financial information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    {...register('bankName')}
                    placeholder="Your primary bank"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statementDate">Statement Date</Label>
                  <Input
                    id="statementDate"
                    type="date"
                    {...register('statementDate')}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="accountBalance">Account Balance</Label>
                  <Input
                    id="accountBalance"
                    type="number"
                    {...register('accountBalance')}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
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
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  )
}
