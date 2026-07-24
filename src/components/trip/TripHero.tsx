import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'

export interface TripHeroFact {
  label: string
  value: string
}

interface TripHeroProps {
  /** Live facts only — destination, dates, nights, main destination, etc. */
  facts: TripHeroFact[]
  /** Preformatted "3 to review"; shown only when there is something to review. */
  findingsLabel?: string
  findingsTone?: StatusTone
  className?: string
}

/**
 * The trip overview: a calm, compact band of live facts that answers "where,
 * when, how long, main destination, appointment" at a glance. Deliberately a
 * wrap of small labeled facts rather than KPI tiles, and never a readiness or
 * approval score — the pending-findings pill is organizational only.
 */
function TripHero({
  facts,
  findingsLabel,
  findingsTone = 'warning',
  className,
}: TripHeroProps) {
  return (
    <Card className={cn('py-0', className)}>
      <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <p className="text-eyebrow text-muted-foreground uppercase">
              {fact.label}
            </p>
            <p className="text-body text-foreground truncate font-medium">
              {fact.value}
            </p>
          </div>
        ))}
        {findingsLabel && (
          <div className="ml-auto shrink-0">
            <StatusBadge tone={findingsTone} size="md" dot>
              {findingsLabel}
            </StatusBadge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { TripHero }
