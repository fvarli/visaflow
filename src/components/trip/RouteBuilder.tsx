import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { CountryCombobox } from '@/components/ui/country-combobox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useFormatters } from '@/lib/format'
import { useLocale } from '@/app/providers/LocaleProvider'
import { getCountryName } from '@/lib/countries'
import {
  maxStopNights,
  routeCoverage,
  stopNights,
  syncStopNights,
  totalRouteNights,
} from '@/features/trip/route-dates'
import type { RouteStop } from '@/domain/schemas/trip.schema'
import { JourneyTimeline, JourneyStop } from './JourneyTimeline'
import { DestinationCard } from './DestinationCard'
import { CoverageSummary } from './CoverageSummary'

interface RouteBuilderProps {
  stops: RouteStop[]
  mainDestinationCountry?: string
  /** Lowercased city names that have an accommodation reservation. */
  bookedCities?: string[]
  /** Trip boundary, for the route-coverage indicator. */
  entryDate?: string | null
  exitDate?: string | null
  onChange: (next: RouteStop[]) => void
}

/** Pure array move — the single reorder primitive a future drag layer reuses. */
function reorder<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  if (moved === undefined) return list
  next.splice(to, 0, moved)
  return next
}

/**
 * The route builder — the signature trip experience. Destinations render as a
 * connected journey (vertical timeline of DestinationCards) rather than table
 * rows, with the declared main destination highlighted and per-stop nights
 * scaled to the longest stay. Reordering is Up/Down today but isolated behind
 * `reorder()` so drag-and-drop can be layered on without changing the rest.
 * Commits the whole `route` array via `onChange` — no schema/provider change.
 */
export function RouteBuilder({
  stops,
  mainDestinationCountry,
  bookedCities = [],
  entryDate,
  exitDate,
  onChange,
}: RouteBuilderProps) {
  const { t } = useTranslation(['trip', 'visa-domain'])
  const { locale } = useLocale()
  const f = useFormatters()

  const [open, setOpen] = React.useState(false)
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [draft, setDraft] = React.useState<RouteStop | null>(null)

  const maxNights = maxStopNights(stops)
  const coverage = routeCoverage(stops, entryDate, exitDate)

  const startAdd = () => {
    setDraft({
      city: '',
      country: '',
      arrivalDate: '',
      departureDate: '',
      nights: 0,
    })
    setEditingIndex(null)
    setOpen(true)
  }

  const startEdit = (index: number) => {
    const stop = stops[index]
    if (!stop) return
    setDraft(stop)
    setEditingIndex(index)
    setOpen(true)
  }

  const move = (index: number, delta: number) => {
    onChange(reorder(stops, index, index + delta))
  }

  const remove = (index: number) => {
    onChange(stops.filter((_, i) => i !== index))
  }

  const save = () => {
    if (!draft) return
    // Keep the stored `nights` in sync with the date pair (dates are canonical).
    const stop = syncStopNights(draft)
    if (editingIndex === null) onChange([...stops, stop])
    else onChange(stops.map((s, i) => (i === editingIndex ? stop : s)))
    setOpen(false)
    setDraft(null)
    setEditingIndex(null)
  }

  const canSave =
    draft !== null &&
    draft.city.trim().length > 0 &&
    draft.country.length === 2 &&
    draft.arrivalDate.length > 0 &&
    draft.departureDate.length > 0

  return (
    <div className="flex flex-col gap-4">
      {stops.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={t('trip:route.empty.title')}
          description={t('trip:route.empty.description')}
          action={
            <Button size="sm" onClick={startAdd}>
              <Plus />
              {t('trip:route.add')}
            </Button>
          }
        />
      ) : (
        <>
          <JourneyTimeline>
            {stops.map((stop, index) => {
              const isMain =
                !!mainDestinationCountry &&
                stop.country === mainDestinationCountry
              const booked = bookedCities.includes(
                stop.city.trim().toLowerCase()
              )
              return (
                <JourneyStop
                  key={index}
                  isLast={index === stops.length - 1}
                  highlight={isMain}
                >
                  <DestinationCard
                    city={stop.city}
                    countryLabel={getCountryName(stop.country, locale)}
                    dateRangeLabel={`${f.dateShort(stop.arrivalDate)} – ${f.dateShort(
                      stop.departureDate
                    )}`}
                    nightsLabel={t('trip:nights', { count: stopNights(stop) })}
                    ratio={maxNights > 0 ? stopNights(stop) / maxNights : 0}
                    isMain={isMain}
                    mainLabel={t('trip:route.main')}
                    accommodationLabel={
                      booked
                        ? t('trip:route.stayBooked')
                        : t('trip:route.noStay')
                    }
                    accommodationTone={booked ? 'success' : 'neutral'}
                    actions={
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('trip:route.moveUp')}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('trip:route.moveDown')}
                          disabled={index === stops.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('trip:collection.edit')}
                          onClick={() => startEdit(index)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('trip:collection.remove')}
                          onClick={() => remove(index)}
                        >
                          <Trash2 />
                        </Button>
                      </>
                    }
                  />
                </JourneyStop>
              )
            })}
          </JourneyTimeline>

          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={startAdd}>
              <Plus />
              {t('trip:route.add')}
            </Button>
            <p className="text-caption text-muted-foreground">
              {t('trip:route.totalNights', {
                nights: t('trip:nights', { count: totalRouteNights(stops) }),
              })}
            </p>
          </div>

          {coverage.status === 'match' && (
            <CoverageSummary
              tone="success"
              title={t('trip:route.coverage.match', {
                nights: t('trip:nights', { count: coverage.routeNights }),
              })}
            />
          )}
          {coverage.status === 'under' && (
            <CoverageSummary
              tone="warning"
              title={t('trip:route.coverage.under', {
                route: coverage.routeNights,
                trip: coverage.tripNights ?? 0,
              })}
            />
          )}
          {coverage.status === 'over' && (
            <CoverageSummary
              tone="warning"
              title={t('trip:route.coverage.over', {
                route: coverage.routeNights,
                trip: coverage.tripNights ?? 0,
              })}
            />
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIndex === null
                ? t('trip:route.addTitle')
                : t('trip:route.editTitle')}
            </DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('trip:route.fields.city')} required>
                <Input
                  value={draft.city}
                  onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                />
              </Field>
              <Field
                label={t('trip:route.fields.country')}
                required
                htmlFor="route-stop-country"
              >
                <CountryCombobox
                  id="route-stop-country"
                  ariaLabel={t('trip:route.fields.country')}
                  value={draft.country}
                  onValueChange={(code) =>
                    setDraft({ ...draft, country: code })
                  }
                />
              </Field>
              <Field label={t('trip:route.fields.arrival')} required>
                <Input
                  type="date"
                  value={draft.arrivalDate}
                  onChange={(e) =>
                    setDraft({ ...draft, arrivalDate: e.target.value })
                  }
                />
              </Field>
              <Field label={t('trip:route.fields.departure')} required>
                <Input
                  type="date"
                  value={draft.departureDate}
                  onChange={(e) =>
                    setDraft({ ...draft, departureDate: e.target.value })
                  }
                />
              </Field>
              <Field
                label={t('trip:route.fields.purpose')}
                className="sm:col-span-2"
              >
                <Input
                  value={draft.purpose ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, purpose: e.target.value || undefined })
                  }
                />
              </Field>
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
