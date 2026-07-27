import { forwardRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsSectionProps {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * A calm settings group: a real `<h2>` heading (focus-managed by the shell) plus
 * an optional description and its content — deliberately not wrapped in a Card,
 * so the control center stays flat and premium rather than a stack of nested
 * cards. The forwarded ref points at the heading for focus-on-section-change.
 */
export const SettingsSection = forwardRef<
  HTMLHeadingElement,
  SettingsSectionProps
>(function SettingsSection({ title, description, children, className }, ref) {
  return (
    <section className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col gap-1">
        <h2
          ref={ref}
          tabIndex={-1}
          className="text-heading text-foreground outline-none"
        >
          {title}
        </h2>
        {description && (
          <p className="text-body text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  )
})
