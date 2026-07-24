import { useTranslation } from 'react-i18next'
import { Plane } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { CollectionEditor } from '@/components/ui/collection-editor'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useFormatters } from '@/lib/format'
import type { TravelHistoryEntry } from '@/domain/schemas/passport.schema'

/**
 * Step 4 — recent trips, an optional list on the same CollectionEditor as
 * previous visas. Entry date is the only required field per record.
 */
export function TravelHistoryStep() {
  const { state, updateApplicant } = useDossier()
  const { t } = useTranslation('applicant')
  const f = useFormatters()
  const items = state.applicant?.travelHistory ?? []

  return (
    <CollectionEditor<TravelHistoryEntry>
      items={items}
      onChange={(next) => updateApplicant({ travelHistory: next })}
      createEmpty={() => ({ country: '', entryDate: '' })}
      validate={(d) => d.country.length === 2 && d.entryDate.length > 0}
      emptyIcon={Plane}
      emptyTitle={t('travelHistory.empty.title')}
      emptyDescription={t('travelHistory.empty.description')}
      labels={{
        add: t('travelHistory.add'),
        addTitle: t('travelHistory.addTitle'),
        editTitle: t('travelHistory.editTitle'),
        save: t('collection.save'),
        cancel: t('collection.cancel'),
        edit: t('collection.edit'),
        remove: t('collection.remove'),
      }}
      renderSummary={(trip) => {
        const dates = [
          trip.entryDate ? f.dateShort(trip.entryDate) : null,
          trip.exitDate ? f.dateShort(trip.exitDate) : null,
        ].filter(Boolean)
        return (
          <div className="space-y-0.5">
            <p className="text-body text-foreground font-medium">
              {trip.country || t('travelHistory.untitled')}
              {trip.purpose ? ` · ${trip.purpose}` : ''}
            </p>
            {dates.length > 0 && (
              <p className="text-caption text-muted-foreground">
                {dates.join(' → ')}
              </p>
            )}
          </div>
        )
      }}
      renderForm={({ draft, setDraft }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('fields.travelCountry')}
            required
            description={t('hints.countryCode')}
          >
            <Input
              value={draft.country}
              maxLength={2}
              placeholder="GR"
              className="font-mono uppercase"
              onChange={(e) =>
                setDraft({ ...draft, country: e.target.value.toUpperCase() })
              }
            />
          </Field>

          <Field label={t('fields.purpose')}>
            <Input
              value={draft.purpose ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, purpose: e.target.value || undefined })
              }
            />
          </Field>

          <Field label={t('fields.entryDate')} required>
            <Input
              type="date"
              value={draft.entryDate}
              onChange={(e) =>
                setDraft({ ...draft, entryDate: e.target.value })
              }
            />
          </Field>

          <Field label={t('fields.exitDate')}>
            <Input
              type="date"
              value={draft.exitDate ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, exitDate: e.target.value || undefined })
              }
            />
          </Field>

          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="travel-visa-required"
              checked={draft.visaRequired ?? false}
              onCheckedChange={(v) =>
                setDraft({ ...draft, visaRequired: v === true })
              }
            />
            <Label htmlFor="travel-visa-required" className="text-body">
              {t('fields.visaRequired')}
            </Label>
          </div>
        </div>
      )}
    />
  )
}
