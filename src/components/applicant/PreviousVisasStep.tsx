import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Stamp, FileX } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { CollectionEditor } from '@/components/ui/collection-editor'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { CountryCombobox } from '@/components/ui/country-combobox'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import type {
  PreviousRefusal,
  PreviousVisa,
} from '@/domain/schemas/passport.schema'

const VISA_STATUSES: NonNullable<PreviousVisa['status']>[] = [
  'used',
  'unused',
  'expired',
  'cancelled',
]

/**
 * Step 3 — previous visas **and refusals**, two optional lists edited through
 * the generic CollectionEditor. Records are committed to the dossier as whole
 * arrays, so no dedicated reducer action is needed.
 *
 * Refusals are a separate list, not a `status` on a visa: nothing was issued, so
 * a refusal has no issue or expiry date, and modelling it as a visa outcome
 * would have made older builds drop the whole applicant on import (ADR-043).
 *
 * Nothing here scores anything. A recorded refusal is a fact the applicant must
 * declare on the form and may want evidence for — it never reaches readiness and
 * never becomes a prediction (ADR-016).
 */
export function PreviousVisasStep() {
  const { state, updateApplicant } = useDossier()
  const { t } = useTranslation(['applicant', 'visa-domain'])
  const td = dynamicT(t)
  const f = useFormatters()
  const items = state.applicant?.previousVisas ?? []
  const refusals = state.applicant?.previousRefusals ?? []

  // Non-destructive disclosure: existing entries always keep the editor open,
  // so choosing "No" can never hide (or lose) data the applicant already added.
  const [declared, setDeclared] = useState<'yes' | 'no'>(
    items.length > 0 ? 'yes' : 'no'
  )
  const showEditor = declared === 'yes' || items.length > 0
  const [refusalsDeclared, setRefusalsDeclared] = useState<'yes' | 'no'>(
    refusals.length > 0 ? 'yes' : 'no'
  )
  const showRefusals = refusalsDeclared === 'yes' || refusals.length > 0

  return (
    <div className="space-y-6">
      <Field label={t('applicant:disclosure.previousVisasQuestion')}>
        <SegmentedControl<'no' | 'yes'>
          ariaLabel={t('applicant:disclosure.previousVisasQuestion')}
          value={declared}
          onValueChange={setDeclared}
          options={[
            { value: 'no', label: t('applicant:disclosure.no') },
            { value: 'yes', label: t('applicant:disclosure.yes') },
          ]}
        />
      </Field>

      {showEditor ? (
        <CollectionEditor<PreviousVisa>
          items={items}
          onChange={(next) => updateApplicant({ previousVisas: next })}
          createEmpty={() => ({ country: '', visaType: '' })}
          validate={(d) =>
            d.country.length === 2 && d.visaType.trim().length > 0
          }
          emptyIcon={Stamp}
          emptyTitle={t('applicant:previousVisas.empty.title')}
          emptyDescription={t('applicant:previousVisas.empty.description')}
          labels={{
            add: t('applicant:previousVisas.add'),
            addTitle: t('applicant:previousVisas.addTitle'),
            editTitle: t('applicant:previousVisas.editTitle'),
            save: t('applicant:collection.save'),
            cancel: t('applicant:collection.cancel'),
            edit: t('applicant:collection.edit'),
            remove: t('applicant:collection.remove'),
          }}
          renderSummary={(visa) => {
            const meta = [
              visa.status
                ? td(`visa-domain:previousVisaStatus.${visa.status}`)
                : null,
              visa.issueDate ? f.dateShort(visa.issueDate) : null,
              visa.expiryDate ? f.dateShort(visa.expiryDate) : null,
            ].filter(Boolean)
            return (
              <div className="space-y-0.5">
                <p className="text-body text-foreground font-medium">
                  {visa.visaType || t('applicant:previousVisas.untitled')}
                  {visa.country ? ` · ${visa.country}` : ''}
                </p>
                {meta.length > 0 && (
                  <p className="text-caption text-muted-foreground">
                    {meta.join(' · ')}
                  </p>
                )}
              </div>
            )
          }}
          renderForm={({ draft, setDraft }) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t('applicant:fields.visaCountry')}
                required
                htmlFor="visa-country"
              >
                <CountryCombobox
                  id="visa-country"
                  ariaLabel={t('applicant:fields.visaCountry')}
                  value={draft.country}
                  onValueChange={(code) =>
                    setDraft({ ...draft, country: code })
                  }
                />
              </Field>

              <Field
                label={t('applicant:fields.visaType')}
                required
                description={t('applicant:hints.visaTypeExample')}
              >
                <Input
                  value={draft.visaType}
                  onChange={(e) =>
                    setDraft({ ...draft, visaType: e.target.value })
                  }
                />
              </Field>

              <Field label={t('applicant:fields.visaIssueDate')}>
                <Input
                  type="date"
                  value={draft.issueDate ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      issueDate: e.target.value || undefined,
                    })
                  }
                />
              </Field>

              <Field label={t('applicant:fields.visaExpiryDate')}>
                <Input
                  type="date"
                  value={draft.expiryDate ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      expiryDate: e.target.value || undefined,
                    })
                  }
                />
              </Field>

              <Field label={t('applicant:fields.entryCount')}>
                <Input
                  type="number"
                  min={1}
                  value={draft.entryCount ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      entryCount: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </Field>

              <Field
                label={t('applicant:fields.visaStatus')}
                htmlFor="visa-status"
              >
                <Select
                  value={draft.status ?? undefined}
                  onValueChange={(value) =>
                    setDraft({
                      ...draft,
                      status: value as PreviousVisa['status'],
                    })
                  }
                >
                  <SelectTrigger id="visa-status" className="w-full">
                    <SelectValue
                      placeholder={t('applicant:hints.selectStatus')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {VISA_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {td(`visa-domain:previousVisaStatus.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label={t('applicant:fields.notes')}
                className="sm:col-span-2"
              >
                <Textarea
                  rows={2}
                  value={draft.notes ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, notes: e.target.value || undefined })
                  }
                />
              </Field>
            </div>
          )}
        />
      ) : (
        <GuidanceNote tone="info">
          {t('applicant:guidance.noPreviousVisas')}
        </GuidanceNote>
      )}

      <div className="border-border border-t pt-6">
        <Field label={t('applicant:disclosure.refusalsQuestion')}>
          <SegmentedControl<'no' | 'yes'>
            ariaLabel={t('applicant:disclosure.refusalsQuestion')}
            value={refusalsDeclared}
            onValueChange={setRefusalsDeclared}
            options={[
              { value: 'no', label: t('applicant:disclosure.no') },
              { value: 'yes', label: t('applicant:disclosure.yes') },
            ]}
          />
        </Field>

        {showRefusals ? (
          <div className="mt-6">
            <CollectionEditor<PreviousRefusal>
              items={refusals}
              onChange={(next) => updateApplicant({ previousRefusals: next })}
              createEmpty={() => ({ country: '' })}
              validate={(d) => d.country.length === 2}
              emptyIcon={FileX}
              emptyTitle={t('applicant:refusals.empty.title')}
              emptyDescription={t('applicant:refusals.empty.description')}
              labels={{
                add: t('applicant:refusals.add'),
                addTitle: t('applicant:refusals.addTitle'),
                editTitle: t('applicant:refusals.editTitle'),
                save: t('applicant:collection.save'),
                cancel: t('applicant:collection.cancel'),
                edit: t('applicant:collection.edit'),
                remove: t('applicant:collection.remove'),
              }}
              renderSummary={(refusal) => {
                const meta = [
                  refusal.visaType || null,
                  refusal.refusedOn ? f.dateShort(refusal.refusedOn) : null,
                ].filter(Boolean)
                return (
                  <div className="space-y-0.5">
                    <p className="text-body text-foreground font-medium">
                      {refusal.country || t('applicant:refusals.untitled')}
                    </p>
                    {meta.length > 0 && (
                      <p className="text-caption text-muted-foreground">
                        {meta.join(' · ')}
                      </p>
                    )}
                  </div>
                )
              }}
              renderForm={({ draft, setDraft }) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={t('applicant:fields.refusalCountry')}
                    required
                    htmlFor="refusal-country"
                  >
                    <CountryCombobox
                      id="refusal-country"
                      ariaLabel={t('applicant:fields.refusalCountry')}
                      value={draft.country}
                      onValueChange={(code) =>
                        setDraft({ ...draft, country: code })
                      }
                    />
                  </Field>

                  <Field label={t('applicant:fields.refusedOn')}>
                    <Input
                      type="date"
                      value={draft.refusedOn ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          refusedOn: e.target.value || undefined,
                        })
                      }
                    />
                  </Field>

                  <Field
                    label={t('applicant:fields.visaType')}
                    description={t('applicant:hints.visaTypeExample')}
                  >
                    <Input
                      value={draft.visaType ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          visaType: e.target.value || undefined,
                        })
                      }
                    />
                  </Field>

                  <Field
                    label={t('applicant:fields.notes')}
                    className="sm:col-span-2"
                  >
                    <Textarea
                      rows={2}
                      value={draft.notes ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          notes: e.target.value || undefined,
                        })
                      }
                    />
                  </Field>
                </div>
              )}
            />
          </div>
        ) : (
          <GuidanceNote tone="info" className="mt-6">
            {t('applicant:guidance.noRefusals')}
          </GuidanceNote>
        )}
      </div>
    </div>
  )
}
