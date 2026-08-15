import {
  AlertTriangle,
  Ban,
  Check,
  CircleDashed,
  CircleSlash,
  type LucideIcon,
} from 'lucide-react'
import type { StatusTone } from '@/components/ui/status-badge'
import type { ChecklistState } from '@/features/review/review-checklist'
import type {
  BundleState,
  PrintableState,
} from '@/features/review/review-print'

/**
 * Presentation vocabulary for the Final Review workspace.
 *
 * Tone stays deliberately calm: a missing document is `neutral`, not `danger`.
 * Nothing on this page is an emergency — a missing document is simply the next
 * thing to collect, and a red wall of items would make an already anxious user
 * more anxious without telling them anything new (ADR-025's discipline, applied
 * to the checklist).
 *
 * Every state also carries an icon, so status is never communicated by colour
 * alone.
 */

export const CHECKLIST_STATE_TONE: Record<ChecklistState, StatusTone> = {
  ready: 'success',
  needsAttention: 'warning',
  missing: 'neutral',
  optional: 'neutral',
  notApplicable: 'neutral',
}

export const CHECKLIST_STATE_ICON: Record<ChecklistState, LucideIcon> = {
  ready: Check,
  needsAttention: AlertTriangle,
  missing: CircleDashed,
  optional: CircleDashed,
  notApplicable: CircleSlash,
}

export const PRINTABLE_STATE_TONE: Record<PrintableState, StatusTone> = {
  ready: 'success',
  partial: 'warning',
  unavailable: 'neutral',
}

export const BUNDLE_STATE_TONE: Record<BundleState, StatusTone> = {
  ready: 'success',
  partial: 'warning',
  missing: 'neutral',
  notApplicable: 'neutral',
}

export const BUNDLE_STATE_ICON: Record<BundleState, LucideIcon> = {
  ready: Check,
  partial: AlertTriangle,
  missing: CircleDashed,
  notApplicable: Ban,
}
