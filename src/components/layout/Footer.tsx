import { Info } from 'lucide-react'

/**
 * Legal disclaimer.
 *
 * Previously pinned as permanent chrome below the scroll area, so it took
 * vertical space on every page forever. It is a statement of scope, not a
 * control — it belongs at the end of the content, read once.
 */
export function Footer() {
  return (
    <footer className="mt-4 border-t pt-6">
      <div className="text-muted-foreground flex items-start gap-2.5">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 opacity-70" />
        <p className="text-caption max-w-3xl text-pretty">
          VisaFlow is an organizational tool. It does not provide legal advice,
          represent any embassy or visa center, or guarantee a visa decision.
          Always verify requirements using current official sources.
        </p>
      </div>
    </footer>
  )
}
