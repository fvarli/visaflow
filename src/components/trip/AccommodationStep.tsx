import { useTranslation } from 'react-i18next'
import { BedDouble } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { CollectionEditor } from '@/components/ui/collection-editor'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { AccommodationReservation } from '@/domain/schemas/trip.schema'

const TYPES: AccommodationReservation['type'][] = [
  'hotel',
  'airbnb',
  'hostel',
  'apartment',
  'friend_family',
  'other',
]
const STATUSES: AccommodationReservation['status'][] = [
  'pending',
  'confirmed',
  'paid',
]
const STATUS_TONE: Record<AccommodationReservation['status'], StatusTone> = {
  pending: 'warning',
  confirmed: 'success',
  paid: 'success',
}

/** Step 3 — where the traveller stays, as journey items via the CollectionEditor. */
export function AccommodationStep() {
  const { state, updateTrip } = useDossier()
  const { t } = useTranslation(['trip', 'visa-domain'])
  const td = dynamicT(t)
  const f = useFormatters()
  const items = state.application?.trip?.accommodationReservations ?? []

  return (
    <CollectionEditor<AccommodationReservation>
      items={items}
      onChange={(next) => updateTrip({ accommodationReservations: next })}
      createEmpty={() => ({
        type: 'hotel',
        name: '',
        city: '',
        checkInDate: '',
        checkOutDate: '',
        status: 'pending',
      })}
      validate={(d) =>
        d.name.trim().length > 0 &&
        d.city.trim().length > 0 &&
        d.checkInDate.length > 0 &&
        d.checkOutDate.length > 0
      }
      emptyIcon={BedDouble}
      emptyTitle={t('trip:accommodation.empty.title')}
      emptyDescription={t('trip:accommodation.empty.description')}
      labels={{
        add: t('trip:accommodation.add'),
        addTitle: t('trip:accommodation.addTitle'),
        editTitle: t('trip:accommodation.editTitle'),
        save: t('trip:collection.save'),
        cancel: t('trip:collection.cancel'),
        edit: t('trip:collection.edit'),
        remove: t('trip:collection.remove'),
      }}
      renderSummary={(a) => (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body text-foreground font-medium">{a.name}</p>
            <StatusBadge tone={STATUS_TONE[a.status]} dot>
              {td(`visa-domain:accommodationStatus.${a.status}`)}
            </StatusBadge>
          </div>
          <p className="text-caption text-muted-foreground">
            {[
              td(`visa-domain:accommodationType.${a.type}`),
              a.city,
              `${f.dateShort(a.checkInDate)} → ${f.dateShort(a.checkOutDate)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      )}
      renderForm={({ draft, setDraft }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('trip:accommodation.fields.name')} required>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>
          <Field label={t('trip:accommodation.fields.type')} htmlFor="acc-type">
            <Select
              value={draft.type}
              onValueChange={(v) =>
                setDraft({
                  ...draft,
                  type: v as AccommodationReservation['type'],
                })
              }
            >
              <SelectTrigger id="acc-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {td(`visa-domain:accommodationType.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('trip:accommodation.fields.city')} required>
            <Input
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            />
          </Field>
          <Field label={t('trip:accommodation.fields.reservationNumber')}>
            <Input
              value={draft.reservationNumber ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  reservationNumber: e.target.value || undefined,
                })
              }
            />
          </Field>
          <Field label={t('trip:accommodation.fields.checkIn')} required>
            <Input
              type="date"
              value={draft.checkInDate}
              onChange={(e) =>
                setDraft({ ...draft, checkInDate: e.target.value })
              }
            />
          </Field>
          <Field label={t('trip:accommodation.fields.checkOut')} required>
            <Input
              type="date"
              value={draft.checkOutDate}
              onChange={(e) =>
                setDraft({ ...draft, checkOutDate: e.target.value })
              }
            />
          </Field>
          <Field label={t('trip:accommodation.fields.guestName')}>
            <Input
              value={draft.guestName ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, guestName: e.target.value || undefined })
              }
            />
          </Field>
          <Field
            label={t('trip:accommodation.fields.status')}
            htmlFor="acc-status"
          >
            <Select
              value={draft.status}
              onValueChange={(v) =>
                setDraft({
                  ...draft,
                  status: v as AccommodationReservation['status'],
                })
              }
            >
              <SelectTrigger id="acc-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {td(`visa-domain:accommodationStatus.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}
    />
  )
}
