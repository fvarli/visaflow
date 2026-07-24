import { useTranslation } from 'react-i18next'
import { Plane } from 'lucide-react'
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
import { dynamicT } from '@/lib/i18n-dynamic'
import type { TransportReservation } from '@/domain/schemas/trip.schema'
import { TRANSPORT_ICON } from './transport-meta'

const TYPES: TransportReservation['type'][] = [
  'flight',
  'train',
  'bus',
  'car',
  'ferry',
  'other',
]
const STATUSES: TransportReservation['status'][] = [
  'pending',
  'confirmed',
  'ticketed',
]
const STATUS_TONE: Record<TransportReservation['status'], StatusTone> = {
  pending: 'warning',
  confirmed: 'success',
  ticketed: 'success',
}

/** Step 4 — how the traveller gets around, as travel segments via the CollectionEditor. */
export function TransportationStep() {
  const { state, updateTrip } = useDossier()
  const { t } = useTranslation(['trip', 'visa-domain'])
  const td = dynamicT(t)
  const items = state.application?.trip?.transportReservations ?? []

  return (
    <CollectionEditor<TransportReservation>
      items={items}
      onChange={(next) => updateTrip({ transportReservations: next })}
      createEmpty={() => ({
        type: 'flight',
        departureCity: '',
        arrivalCity: '',
        departureDate: '',
        status: 'pending',
      })}
      validate={(d) =>
        d.departureCity.trim().length > 0 &&
        d.arrivalCity.trim().length > 0 &&
        d.departureDate.length > 0
      }
      emptyIcon={Plane}
      emptyTitle={t('trip:transportation.empty.title')}
      emptyDescription={t('trip:transportation.empty.description')}
      labels={{
        add: t('trip:transportation.add'),
        addTitle: t('trip:transportation.addTitle'),
        editTitle: t('trip:transportation.editTitle'),
        save: t('trip:collection.save'),
        cancel: t('trip:collection.cancel'),
        edit: t('trip:collection.edit'),
        remove: t('trip:collection.remove'),
      }}
      renderSummary={(seg) => {
        const Icon = TRANSPORT_ICON[seg.type]
        return (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Icon className="text-muted-foreground size-4" aria-hidden />
              <p className="text-body text-foreground font-medium">
                {seg.departureCity} → {seg.arrivalCity}
              </p>
              <StatusBadge tone={STATUS_TONE[seg.status]} dot>
                {td(`visa-domain:transportStatus.${seg.status}`)}
              </StatusBadge>
            </div>
            <p className="text-caption text-muted-foreground">
              {[td(`visa-domain:transportType.${seg.type}`), seg.carrier]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        )
      }}
      renderForm={({ draft, setDraft }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('trip:transportation.fields.type')} htmlFor="tr-type">
            <Select
              value={draft.type}
              onValueChange={(v) =>
                setDraft({ ...draft, type: v as TransportReservation['type'] })
              }
            >
              <SelectTrigger id="tr-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {td(`visa-domain:transportType.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('trip:transportation.fields.carrier')}>
            <Input
              value={draft.carrier ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, carrier: e.target.value || undefined })
              }
            />
          </Field>
          <Field label={t('trip:transportation.fields.departureCity')} required>
            <Input
              value={draft.departureCity}
              onChange={(e) =>
                setDraft({ ...draft, departureCity: e.target.value })
              }
            />
          </Field>
          <Field label={t('trip:transportation.fields.arrivalCity')} required>
            <Input
              value={draft.arrivalCity}
              onChange={(e) =>
                setDraft({ ...draft, arrivalCity: e.target.value })
              }
            />
          </Field>
          <Field label={t('trip:transportation.fields.departureDate')} required>
            <Input
              type="date"
              value={draft.departureDate}
              onChange={(e) =>
                setDraft({ ...draft, departureDate: e.target.value })
              }
            />
          </Field>
          <Field label={t('trip:transportation.fields.departureTime')}>
            <Input
              type="time"
              value={draft.departureTime ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  departureTime: e.target.value || undefined,
                })
              }
            />
          </Field>
          <Field label={t('trip:transportation.fields.arrivalDate')}>
            <Input
              type="date"
              value={draft.arrivalDate ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, arrivalDate: e.target.value || undefined })
              }
            />
          </Field>
          <Field label={t('trip:transportation.fields.arrivalTime')}>
            <Input
              type="time"
              value={draft.arrivalTime ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, arrivalTime: e.target.value || undefined })
              }
            />
          </Field>
          <Field label={t('trip:transportation.fields.reservationNumber')}>
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
          <Field label={t('trip:transportation.fields.passengerName')}>
            <Input
              value={draft.passengerName ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  passengerName: e.target.value || undefined,
                })
              }
            />
          </Field>
          <Field
            label={t('trip:transportation.fields.status')}
            htmlFor="tr-status"
          >
            <Select
              value={draft.status}
              onValueChange={(v) =>
                setDraft({
                  ...draft,
                  status: v as TransportReservation['status'],
                })
              }
            >
              <SelectTrigger id="tr-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {td(`visa-domain:transportStatus.${status}`)}
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
