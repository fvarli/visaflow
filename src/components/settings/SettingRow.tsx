import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingRowProps {
  label: ReactNode
  description?: ReactNode
  /** The interactive control (carries its own accessible name). */
  control: ReactNode
  className?: string
}

/**
 * One setting: a label + optional description on the left, its control on the
 * right (stacking on mobile). A composition primitive shared across the Settings
 * sections — the control supplies its own accessible name, so this stays layout-
 * only and reusable.
 */
export function SettingRow({
  label,
  description,
  control,
  className,
}: SettingRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body text-foreground font-medium">{label}</span>
        {description && (
          <span className="text-caption text-muted-foreground text-pretty">
            {description}
          </span>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}
