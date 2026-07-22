import { cn } from '@/lib/utils'

/**
 * Wordmark with a small geometric glyph — a stamped page corner, which is
 * what a visa actually is. Drawn rather than imported so it inherits theme
 * tokens and needs no asset request.
 */
export function BrandMark({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden
        className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-[7px] shadow-xs"
      >
        <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
          <path
            d="M3.5 2.5h5.25L12.5 6.25V13a.5.5 0 0 1-.5.5H3.5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 2.75V6a.5.5 0 0 0 .5.5h3.25"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="m5.75 9.5 1.4 1.4 2.85-2.85"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-[0.9375rem] font-semibold tracking-[-0.017em]">
          VisaFlow
        </span>
      )}
    </span>
  )
}
