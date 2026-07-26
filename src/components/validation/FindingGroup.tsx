import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Briefcase,
  Calendar,
  ChevronRight,
  FileText,
  Plane,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import { dynamicT } from '@/lib/i18n-dynamic'
import { HEALTH_LABEL_KEY } from '@/features/validation/finding-presentation'
import type { CategoryGroup } from '@/features/validation/validation-model'
import type { FindingCategory } from '@/features/validation/finding-presentation'
import { FindingCard } from './FindingCard'

const CATEGORY_ICON: Record<FindingCategory, typeof User> = {
  applicant: User,
  trip: Plane,
  documents: FileText,
  employment: Briefcase,
  finance: Wallet,
  sponsors: Users,
  timeline: Calendar,
}

interface FindingGroupProps {
  group: CategoryGroup
  defaultOpen?: boolean
}

/**
 * A collapsible domain group of findings. The heading is a disclosure button
 * (`aria-expanded` + `aria-controls`) carrying the group's calm health label
 * and count, so a reviewer can scan or fold each area. Errors-first ordering is
 * preserved from the engine.
 */
export function FindingGroup({ group, defaultOpen = true }: FindingGroupProps) {
  const { t } = useTranslation('validation')
  const td = dynamicT(t)
  const [open, setOpen] = React.useState(defaultOpen)
  const contentId = React.useId()
  const Icon = CATEGORY_ICON[group.id]
  const count = group.findings.length

  return (
    <section className="space-y-3">
      <h2 className="min-w-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={contentId}
          className="group flex w-full items-center gap-2.5 text-left"
        >
          <ChevronRight
            aria-hidden
            className={cn(
              'text-muted-foreground size-4 shrink-0 transition-transform',
              open && 'rotate-90'
            )}
          />
          <Icon aria-hidden className="text-muted-foreground size-4 shrink-0" />
          <span className="text-heading text-foreground">
            {td(`center.categories.${group.id}`)}
          </span>
          <span className="text-caption text-muted-foreground font-normal">
            {t('center.finding.count', { count })}
          </span>
          <StatusBadge tone={group.tone} className="ml-auto">
            {td(HEALTH_LABEL_KEY[group.health])}
          </StatusBadge>
        </button>
      </h2>
      <div id={contentId} hidden={!open} className="space-y-2.5">
        {open &&
          group.findings.map((item, index) => (
            <FindingCard key={`${item.finding.id}-${index}`} item={item} />
          ))}
      </div>
    </section>
  )
}
