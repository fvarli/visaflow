import { Link } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

/**
 * The "nothing loaded yet" state, shared by every page that needs a dossier.
 *
 * Nine pages each hand-rolled this as a destructive-looking Alert. An empty
 * state is not an error — it is an invitation — so this is neutral and gives
 * the user somewhere to go.
 */
export function NoDossierState({ label }: { label?: string }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No application loaded"
      description={
        label
          ? `Start a new application or import an existing dossier to work on ${label}.`
          : 'Start a new application or import an existing dossier to continue.'
      }
      action={
        <Button asChild size="sm">
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      }
    />
  )
}
