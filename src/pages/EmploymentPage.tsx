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
        <h1 className="text-2xl font-bold">Employment Information</h1>
        <p className="text-muted-foreground">
          Your current employment status and details
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Employment Status</CardTitle>
            <CardDescription>
              Select your current employment situation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employmentStatus">Status *</Label>
              <Select
                value={employmentStatus}
                onValueChange={(value) => setValue('employmentStatus', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="self_employed">Self-Employed</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="homemaker">Homemaker</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
                <CardTitle>Employer Details</CardTitle>
                <CardDescription>
                  Information about your current employer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="employerName">Employer Name</Label>
                    <Input
                      id="employerName"
                      {...register('employerName')}
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      {...register('jobTitle')}
                      placeholder="Your position"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...register('startDate')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyNetIncome">Monthly Net Income</Label>
                    <Input
                      id="monthlyNetIncome"
                      type="number"
                      {...register('monthlyNetIncome')}
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
                <CardTitle>Approved Leave</CardTitle>
                <CardDescription>
                  Leave period approved by your employer for this trip
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="approvedLeaveStart">Leave Start Date</Label>
                    <Input
                      id="approvedLeaveStart"
                      type="date"
                      {...register('approvedLeaveStart')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approvedLeaveEnd">Leave End Date</Label>
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
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  )
}
