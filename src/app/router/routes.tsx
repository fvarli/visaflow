import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

// Lazy load pages for better performance
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { useDossier } from '@/app/providers/DossierProvider'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { firstRunTarget } from '@/features/onboarding/onboarding-model'

const WelcomePage = lazy(() => import('@/pages/WelcomePage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ApplicantPage = lazy(() => import('@/pages/ApplicantPage'))
const TripPage = lazy(() => import('@/pages/TripPage'))
const EmploymentPage = lazy(() => import('@/pages/EmploymentPage'))
const FinancePage = lazy(() => import('@/pages/FinancePage'))
const SponsorsPage = lazy(() => import('@/pages/SponsorsPage'))
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'))
const TimelinePage = lazy(() => import('@/pages/TimelinePage'))
const ConsistencyChecksPage = lazy(
  () => import('@/pages/ConsistencyChecksPage')
)
const ReviewPage = lazy(() => import('@/pages/ReviewPage'))
const ReviewPrintPage = lazy(() => import('@/pages/ReviewPrintPage'))
const NotesPage = lazy(() => import('@/pages/NotesPage'))
const DossiersPage = lazy(() => import('@/pages/DossiersPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

// Design system playground. Lazy like everything else, so it costs nothing
// until visited; the sidebar only links it in development.
const PlaygroundPage = lazy(() => import('@/pages/PlaygroundPage'))

/**
 * Shaped to match the real page rhythm (title, description, then cards) so
 * nothing jumps when the lazy chunk resolves.
 */
function PageLoader() {
  const { t } = useTranslation('common')

  return (
    <div
      className="flex flex-col gap-8"
      role="status"
      aria-label={t('a11y.loadingPage')}
    >
      <div className="space-y-2.5 pb-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <span className="sr-only">{t('states.loading')}</span>
    </div>
  )
}

function LazyPage({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return <Suspense fallback={fallback ?? <PageLoader />}>{children}</Suspense>
}

/**
 * The index decides where a visitor lands — but only once it can answer honestly.
 *
 * Restoring a dossier from IndexedDB is asynchronous, so deciding on the first
 * commit means deciding before storage has spoken: a returning user with saved
 * dossiers was sent to `/welcome` every time. Waiting for `ready` is the whole
 * fix. Until then this renders the same calm loader every lazy route uses and
 * chooses nothing — no flash of onboarding, and above all no dossier created
 * (ADR-040, superseding ADR-031's `hasData`-only rule).
 *
 * Still the only redirect; every workspace route stays directly reachable and
 * shows its own empty state.
 */
export function FirstRunRedirect() {
  const { hasData } = useDossier()
  const { ready, summaries } = useWorkspace()

  if (!ready) return <PageLoader />

  return (
    <Navigate
      to={firstRunTarget({ hasData, savedCount: summaries.length })}
      replace
    />
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <FirstRunRedirect />,
      },
      {
        path: 'welcome',
        element: (
          <LazyPage>
            <WelcomePage />
          </LazyPage>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <LazyPage fallback={<DashboardSkeleton />}>
            <DashboardPage />
          </LazyPage>
        ),
      },
      {
        path: 'applicant',
        element: (
          <LazyPage>
            <ApplicantPage />
          </LazyPage>
        ),
      },
      {
        path: 'trip',
        element: (
          <LazyPage>
            <TripPage />
          </LazyPage>
        ),
      },
      {
        path: 'employment',
        element: (
          <LazyPage>
            <EmploymentPage />
          </LazyPage>
        ),
      },
      {
        path: 'finance',
        element: (
          <LazyPage>
            <FinancePage />
          </LazyPage>
        ),
      },
      {
        path: 'sponsors',
        element: (
          <LazyPage>
            <SponsorsPage />
          </LazyPage>
        ),
      },
      {
        path: 'documents',
        element: (
          <LazyPage>
            <DocumentsPage />
          </LazyPage>
        ),
      },
      {
        path: 'timeline',
        element: (
          <LazyPage>
            <TimelinePage />
          </LazyPage>
        ),
      },
      {
        path: 'consistency-checks',
        element: (
          <LazyPage>
            <ConsistencyChecksPage />
          </LazyPage>
        ),
      },
      {
        path: 'review',
        element: (
          <LazyPage>
            <ReviewPage />
          </LazyPage>
        ),
      },
      {
        path: 'notes',
        element: (
          <LazyPage>
            <NotesPage />
          </LazyPage>
        ),
      },
      {
        path: 'dossiers',
        element: (
          <LazyPage>
            <DossiersPage />
          </LazyPage>
        ),
      },
      {
        path: 'settings',
        element: (
          <LazyPage>
            <SettingsPage />
          </LazyPage>
        ),
      },
      {
        path: 'playground',
        element: (
          <LazyPage>
            <PlaygroundPage />
          </LazyPage>
        ),
      },
    ],
  },
  /**
   * The printable appointment package sits **outside** `AppLayout` on purpose.
   *
   * Everything above renders inside the app shell — header, sidebar, footer,
   * workspace notices. None of that belongs on paper, and hiding it with
   * `@media print` would leave the guarantee one CSS mistake from failing.
   * Rendering it nowhere cannot fail. The providers wrap the router (see
   * `App.tsx`), so this page still reads the open dossier (ADR-042).
   */
  {
    path: '/review/print',
    element: (
      <LazyPage>
        <ReviewPrintPage />
      </LazyPage>
    ),
  },
])
