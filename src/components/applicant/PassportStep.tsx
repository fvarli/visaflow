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
import { GuidanceNote } from '@/components/ui/guidance-note'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  deriveApplicantGuidance,
  guidanceForStep,
} from '@/features/applicant/applicant-guidance'
import { PassportTypeSchema, type PassportType } from '@/domain/types/common'

const PASSPORT_TYPES: readonly PassportType[] = PassportTypeSchema.options

interface PassportFormData {
  number: string
  issuingCountry: string
  issueDate: string
  expiryDate: string
  passportType: string
}

/**
 * Step 2 — the travel passport. Same inline-validate + autosave contract as the
 * personal step; passport data is nested back under `applicant.passport`.
 */
export function PassportStep() {
  const { state, updateApplicant } = useDossier()
  const { t } = useTranslation(['applicant', 'visa-domain'])
  const td = dynamicT(t)
  const passport = state.applicant?.passport

  const schema = useMemo(
    () =>
      z.object({
        number: z.string().min(1, t('applicant:errors.passportNumberRequired')),
        issuingCountry: z
          .string()
          .min(2, t('applicant:errors.issuingCountryRequired')),
        issueDate: z.string().min(1, t('applicant:errors.issueDateRequired')),
        expiryDate: z.string().min(1, t('applicant:errors.expiryDateRequired')),
        passportType: z.string(),
      }),
    [t]
  )

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PassportFormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      number: passport?.number ?? '',
      issuingCountry: passport?.issuingCountry ?? '',
      issueDate: passport?.issueDate ?? '',
      expiryDate: passport?.expiryDate ?? '',
      passportType: passport?.passportType ?? 'ordinary',
    },
  })

  useEffect(() => {
    const sub = watch((values) => {
      updateApplicant({
        passport: {
          number: values.number ?? '',
          issuingCountry: (values.issuingCountry ?? '').toUpperCase(),
          issueDate: values.issueDate ?? '',
          expiryDate: values.expiryDate ?? '',
          passportType: (values.passportType || 'ordinary') as PassportType,
        },
      })
    })
    return () => sub.unsubscribe()
  }, [watch, updateApplicant])

  const passportTypeValue = watch('passportType')

  const hints = state.applicant
    ? guidanceForStep(deriveApplicantGuidance(state.applicant), 'passport')
    : []

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('applicant:fields.passportNumber')}
          required
          error={errors.number?.message}
        >
          <Input
            {...register('number')}
            placeholder="U12345678"
            className="font-mono"
          />
        </Field>

        <Field
          label={t('applicant:fields.passportIssuingCountry')}
          required
          description={t('applicant:hints.countryCode')}
          error={errors.issuingCountry?.message}
        >
          <Input
            {...register('issuingCountry')}
            maxLength={2}
            placeholder="TR"
            className="font-mono uppercase"
          />
        </Field>

        <Field
          label={t('applicant:fields.passportIssueDate')}
          required
          error={errors.issueDate?.message}
        >
          <Input type="date" {...register('issueDate')} />
        </Field>

        <Field
          label={t('applicant:fields.passportExpiry')}
          required
          error={errors.expiryDate?.message}
          help={
            <FieldHelp
              label={t('applicant:why.trigger', {
                field: t('applicant:fields.passportExpiry'),
              })}
              title={t('applicant:why.title')}
            >
              <p>{t('applicant:why.passportExpiry')}</p>
              <p>{t('applicant:why.disclaimer')}</p>
            </FieldHelp>
          }
        >
          <Input type="date" {...register('expiryDate')} />
        </Field>

        <Field
          label={t('applicant:fields.passportType')}
          htmlFor="applicant-passport-type"
          className="sm:col-span-2"
          help={
            <FieldHelp
              label={t('applicant:why.trigger', {
                field: t('applicant:fields.passportType'),
              })}
              title={t('applicant:why.title')}
            >
              <p>{t('applicant:why.passportType')}</p>
            </FieldHelp>
          }
        >
          <Select
            value={passportTypeValue || undefined}
            onValueChange={(value) =>
              setValue('passportType', value, { shouldDirty: true })
            }
          >
            <SelectTrigger
              id="applicant-passport-type"
              className="w-full sm:w-72"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PASSPORT_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {td(`visa-domain:passportType.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {hints.length > 0 && (
        <div className="space-y-2">
          {hints.map((hint) => (
            <GuidanceNote
              key={hint.id}
              tone={hint.tone}
              dismissLabel={t('applicant:guidance.dismiss')}
            >
              {td(hint.messageKey, hint.params)}
            </GuidanceNote>
          ))}
        </div>
      )}
    </div>
  )
}
