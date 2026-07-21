import { AlertTriangle } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-[var(--muted)] px-4 py-3">
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          VisaFlow is an organizational tool. It does not provide legal advice,
          represent any embassy or visa center, or guarantee a visa decision.
          Always verify requirements using current official sources.
        </p>
      </div>
    </footer>
  )
}
