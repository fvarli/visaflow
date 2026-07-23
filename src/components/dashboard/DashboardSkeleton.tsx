import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** A single shimmering placeholder block. */
function Block({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('bg-muted relative overflow-hidden rounded-xl', className)}
    >
      <div className="animate-shimmer absolute inset-0" />
    </div>
  )
}

/**
 * Loading placeholder shaped like the real dashboard, shown while the lazy
 * chunk resolves so nothing jumps when it arrives. The shimmer is disabled
 * under `prefers-reduced-motion` by the global rule.
 */
export function DashboardSkeleton() {
  const { t } = useTranslation('common')

  return (
    <div
      role="status"
      aria-label={t('a11y.loadingPage')}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col gap-2.5 pb-2">
        <Block className="h-7 w-56" />
        <Block className="h-4 w-80" />
      </div>

      <Block className="h-44 w-full" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Block className="h-28" />
        <Block className="h-28" />
        <Block className="h-28" />
        <Block className="h-28" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Block className="h-56 w-full" />
          <Block className="h-56 w-full" />
        </div>
        <div className="flex flex-col gap-6">
          <Block className="h-40 w-full" />
          <Block className="h-40 w-full" />
        </div>
      </div>

      <span className="sr-only">{t('states.loading')}</span>
    </div>
  )
}
