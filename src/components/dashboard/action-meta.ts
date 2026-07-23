import type { ComponentType } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Plane,
  RefreshCw,
} from 'lucide-react'
import type {
  ActionDescriptor,
  ActionKind,
} from '@/features/dashboard/dashboard-model'
import type { DynamicTFunction } from '@/lib/i18n-dynamic'

/** Icon per next-action kind. Shared by the hero CTA and the action list. */
export const ACTION_ICON: Record<
  ActionKind,
  ComponentType<{ className?: string }>
> = {
  resolveErrors: AlertCircle,
  completeMissingDocs: FileText,
  updateDocuments: RefreshCw,
  reviewWarnings: AlertTriangle,
  setAppointment: Calendar,
  addTrip: Plane,
}

/** Localized label for an action, pluralized when it carries a count. */
export function actionLabel(
  td: DynamicTFunction,
  action: ActionDescriptor
): string {
  return td(
    `dashboard:nextActions.${action.id}`,
    action.count !== undefined ? { count: action.count } : undefined
  )
}
