import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, Pencil, Trash2 } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { FieldHelp } from '@/components/ui/field-help'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFormatters } from '@/lib/format'
import { CurrencySchema } from '@/domain/types/common'
import type { Insurance } from '@/domain/schemas/trip.schema'
import { useTripModel } from '@/features/trip/trip-model'
import { CoverageCard } from './CoverageCard'

const CURRENCIES = CurrencySchema.options

function emptyInsurance(): Insurance {
  return {
    provider: '',
    coverageStartDate: '',
    coverageEndDate: '',
    currency: 'EUR',
    medicalCoverage: true,
    repatriationCoverage: false,
  }
}

/**
 * Step 5 — travel insurance as a single safeguard card. Shows plainly whether
 * the policy covers the whole trip (derived from validation findings via the
 * trip model), with an empty state that invites adding coverage when ready.
 */
export function InsuranceStep() {
  const { state, updateTrip } = useDossier()
  const { t } = useTranslation(['trip'])
  const f = useFormatters()
  const { insights } = useTripModel()
  const insurance = state.application?.trip?.insurance ?? null

  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<Insurance | null>(null)

  const startEdit = () => {
    setDraft(insurance ?? emptyInsurance())
    setOpen(true)
  }

  const save = () => {
    if (!draft) return
    updateTrip({ insurance: draft })
    setOpen(false)
    setDraft(null)
  }

  const remove = () => updateTrip({ insurance: undefined })

  const canSave =
    draft !== null &&
    draft.provider.trim().length > 0 &&
    draft.coverageStartDate.length > 0 &&
    draft.coverageEndDate.length > 0

  return (
    <div className="flex flex-col gap-4">
      {insurance ? (
        <CoverageCard
          provider={insurance.provider}
          periodLabel={`${f.dateShort(insurance.coverageStartDate)} – ${f.dateShort(
            insurance.coverageEndDate
          )}`}
          amountLabel={
            insurance.coverageAmount !== undefined
              ? f.currency(insurance.coverageAmount, insurance.currency)
              : undefined
          }
          amountCaption={t('trip:insurance.coverageCaption')}
          spansTrip={insights.insuranceSpansTrip}
          spansFullLabel={t('trip:insurance.spansTrip.full')}
          spansGapLabel={t('trip:insurance.spansTrip.gap')}
          actions={
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('trip:collection.edit')}
                onClick={startEdit}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('trip:collection.remove')}
                onClick={remove}
              >
                <Trash2 />
              </Button>
            </>
          }
        />
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title={t('trip:insurance.empty.title')}
          description={t('trip:insurance.empty.description')}
          action={
            <Button size="sm" onClick={startEdit}>
              {t('trip:insurance.add')}
            </Button>
          }
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {insurance
                ? t('trip:insurance.editTitle')
                : t('trip:insurance.addTitle')}
            </DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t('trip:insurance.fields.provider')}
                required
                className="sm:col-span-2"
                help={
                  <FieldHelp
                    label={t('trip:why.trigger', {
                      field: t('trip:insurance.fields.provider'),
                    })}
                    title={t('trip:why.title')}
                  >
                    <p>{t('trip:why.insurance')}</p>
                    <p>{t('trip:why.disclaimer')}</p>
                  </FieldHelp>
                }
              >
                <Input
                  value={draft.provider}
                  onChange={(e) =>
                    setDraft({ ...draft, provider: e.target.value })
                  }
                />
              </Field>
              <Field label={t('trip:insurance.fields.policyNumber')}>
                <Input
                  value={draft.policyNumber ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      policyNumber: e.target.value || undefined,
                    })
                  }
                />
              </Field>
              <Field label={t('trip:insurance.fields.insured')}>
                <Input
                  value={draft.insuredName ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      insuredName: e.target.value || undefined,
                    })
                  }
                />
              </Field>
              <Field label={t('trip:insurance.fields.coverageStart')} required>
                <Input
                  type="date"
                  value={draft.coverageStartDate}
                  onChange={(e) =>
                    setDraft({ ...draft, coverageStartDate: e.target.value })
                  }
                />
              </Field>
              <Field label={t('trip:insurance.fields.coverageEnd')} required>
                <Input
                  type="date"
                  value={draft.coverageEndDate}
                  onChange={(e) =>
                    setDraft({ ...draft, coverageEndDate: e.target.value })
                  }
                />
              </Field>
              <Field label={t('trip:insurance.fields.amount')}>
                <Input
                  type="number"
                  min={0}
                  value={draft.coverageAmount ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      coverageAmount: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </Field>
              <Field
                label={t('trip:insurance.fields.currency')}
                htmlFor="ins-currency"
              >
                <Select
                  value={draft.currency}
                  onValueChange={(v) =>
                    setDraft({ ...draft, currency: v as Insurance['currency'] })
                  }
                >
                  <SelectTrigger id="ins-currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="ins-medical"
                  checked={draft.medicalCoverage}
                  onCheckedChange={(v) =>
                    setDraft({ ...draft, medicalCoverage: v === true })
                  }
                />
                <Label htmlFor="ins-medical" className="text-body">
                  {t('trip:insurance.fields.medical')}
                </Label>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="ins-repatriation"
                  checked={draft.repatriationCoverage}
                  onCheckedChange={(v) =>
                    setDraft({ ...draft, repatriationCoverage: v === true })
                  }
                />
                <Label htmlFor="ins-repatriation" className="text-body">
                  {t('trip:insurance.fields.repatriation')}
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('trip:collection.cancel')}
            </Button>
            <Button onClick={save} disabled={!canSave}>
              {t('trip:collection.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
