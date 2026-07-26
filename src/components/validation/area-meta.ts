import {
  Briefcase,
  CalendarRange,
  FileText,
  MapPin,
  Plane,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react'
import type { ReviewAreaId } from '@/features/validation/finding-presentation'

/**
 * Icon per dossier area, shared by the "looks good" list and the review
 * summary. Kept out of the component files so both read from one vocabulary
 * (and the component files stay fast-refresh clean).
 */
export const AREA_ICON: Record<ReviewAreaId, typeof User> = {
  passport: User,
  trip: Plane,
  accommodation: MapPin,
  insurance: ShieldCheck,
  appointment: CalendarRange,
  documents: FileText,
  employment: Briefcase,
  sponsors: Users,
}
