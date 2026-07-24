import type { ComponentType } from 'react'
import { Bus, Car, Plane, Ship, Train, Route as RouteIcon } from 'lucide-react'
import type { TransportReservation } from '@/domain/schemas/trip.schema'

/** Presentation mapping from transport type to a lucide icon. */
export const TRANSPORT_ICON: Record<
  TransportReservation['type'],
  ComponentType<{ className?: string }>
> = {
  flight: Plane,
  train: Train,
  bus: Bus,
  car: Car,
  ferry: Ship,
  other: RouteIcon,
}
