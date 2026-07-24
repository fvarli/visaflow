import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDossier } from '@/app/providers/DossierProvider'
import { Field } from '@/components/ui/field'
import { FieldHelp } from '@/components/ui/field-help'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { MaritalStatus } from '@/domain/types/common'

const MARITAL_OPTIONS: MaritalStatus[] = [
  'single',
  'married',
  'divorced',
  'widowed',
  'separated',
  'civil_partnership',
]

interface PersonalFormData {
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  countryOfResidence?: string
  maritalStatus?: string
  occupation?: string
  email?: string
  phone?: string
}

/**
 * Step 1 — who the applicant is. Its own React Hook Form instance validates
 * inline (on blur, then live once touched) and autosaves every change into the
 * dossier, so there is no submit button. Reads its defaults from the applicant
 * on mount; navigating back re-seeds from state.
 */
export function PersonalInfoStep() {
  const { state, updateApplicant } = useDossier()
  const { t } = useTranslation(['applicant', 'visa-domain'])
  const td = dynamicT(t)
  const applicant = state.applicant

  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(1, t('applicant:errors.firstNameRequired')),
        lastName: z.string().min(1, t('applicant:errors.lastNameRequired')),
        dateOfBirth: z
          .string()
          .min(1, t('applicant:errors.dateOfBirthRequired')),
        nationality: z
          .string()
          .min(2, t('applicant:errors.nationalityRequired')),
        countryOfResidence: z.string().optional(),
        maritalStatus: z.string().optional(),
        occupation: z.string().optional(),
        email: z
          .string()
          .email(t('applicant:errors.invalidEmail'))
          .optional()
          .or(z.literal('')),
        phone: z.string().optional(),
      }),
    [t]
  )

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PersonalFormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: applicant?.firstName ?? '',
      lastName: applicant?.lastName ?? '',
      dateOfBirth: applicant?.dateOfBirth ?? '',
      nationality: applicant?.nationality ?? '',
      countryOfResidence: applicant?.countryOfResidence ?? '',
      maritalStatus: applicant?.maritalStatus ?? '',
      occupation: applicant?.occupation ?? '',
      email: applicant?.email ?? '',
      phone: applicant?.phone ?? '',
    },
  })

  // Autosave: mirror every change into the in-memory dossier.
  useEffect(() => {
    const sub = watch((values) => {
      updateApplicant({
        firstName: values.firstName ?? '',
        lastName: values.lastName ?? '',
        dateOfBirth: values.dateOfBirth ?? '',
        nationality: (values.nationality ?? '').toUpperCase(),
        countryOfResidence: values.countryOfResidence
          ? values.countryOfResidence.toUpperCase()
          : undefined,
        maritalStatus: (values.maritalStatus || undefined) as
          MaritalStatus | undefined,
        occupation: values.occupation || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
      })
    })
    return () => sub.unsubscribe()
  }, [watch, updateApplicant])

  const maritalValue = watch('maritalStatus')

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label={t('applicant:fields.firstName')}
        required
        error={errors.firstName?.message}
      >
        <Input
          {...register('firstName')}
          placeholder={t('applicant:hints.asOnPassport')}
        />
      </Field>

      <Field
        label={t('applicant:fields.lastName')}
        required
        error={errors.lastName?.message}
      >
        <Input
          {...register('lastName')}
          placeholder={t('applicant:hints.asOnPassport')}
        />
      </Field>

      <Field
        label={t('applicant:fields.dateOfBirth')}
        required
        error={errors.dateOfBirth?.message}
        help={
          <FieldHelp
            label={t('applicant:why.trigger', {
              field: t('applicant:fields.dateOfBirth'),
            })}
            title={t('applicant:why.title')}
          >
            <p>{t('applicant:why.dateOfBirth')}</p>
          </FieldHelp>
        }
      >
        <Input type="date" {...register('dateOfBirth')} />
      </Field>

      <Field
        label={t('applicant:fields.nationality')}
        required
        description={t('applicant:hints.countryCode')}
        error={errors.nationality?.message}
        help={
          <FieldHelp
            label={t('applicant:why.trigger', {
              field: t('applicant:fields.nationality'),
            })}
            title={t('applicant:why.title')}
          >
            <p>{t('applicant:why.nationality')}</p>
          </FieldHelp>
        }
      >
        <Input
          {...register('nationality')}
          maxLength={2}
          placeholder="TR"
          className="font-mono uppercase"
        />
      </Field>

      <Field
        label={t('applicant:fields.countryOfResidence')}
        description={t('applicant:hints.countryCode')}
        help={
          <FieldHelp
            label={t('applicant:why.trigger', {
              field: t('applicant:fields.countryOfResidence'),
            })}
            title={t('applicant:why.title')}
          >
            <p>{t('applicant:why.countryOfResidence')}</p>
          </FieldHelp>
        }
      >
        <Input
          {...register('countryOfResidence')}
          maxLength={2}
          placeholder="TR"
          className="font-mono uppercase"
        />
      </Field>

      <Field
        label={t('applicant:fields.maritalStatus')}
        htmlFor="applicant-marital"
      >
        <Select
          value={maritalValue || undefined}
          onValueChange={(value) =>
            setValue('maritalStatus', value, { shouldDirty: true })
          }
        >
          <SelectTrigger id="applicant-marital" className="w-full">
            <SelectValue placeholder={t('applicant:hints.selectStatus')} />
          </SelectTrigger>
          <SelectContent>
            {MARITAL_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {td(`visa-domain:maritalStatus.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={t('applicant:fields.occupation')}>
        <Input {...register('occupation')} />
      </Field>

      <Field label={t('applicant:fields.email')} error={errors.email?.message}>
        <Input
          type="email"
          {...register('email')}
          placeholder="you@example.com"
        />
      </Field>

      <Field label={t('applicant:fields.phone')} className="sm:col-span-2">
        <Input {...register('phone')} placeholder="+90 5XX XXX XX XX" />
      </Field>
    </div>
  )
}
