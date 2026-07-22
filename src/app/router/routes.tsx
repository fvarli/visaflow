import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

// Lazy load pages for better performance
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'

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
const NotesPage = lazy(() => import('@/pages/NotesPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

// Design system playground. Lazy like everything else, so it costs nothing
// until visited; the sidebar only links it in development.
const PlaygroundPage = lazy(() => import('@/pages/PlaygroundPage'))

/**
 * Shaped to match the real page rhythm (title, description, then cards) so
 * nothing jumps when the lazy chunk resolves.
 */
function PageLoader() {
  const { t } = useTranslation()

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

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <LazyPage>
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
        path: 'notes',
        element: (
          <LazyPage>
            <NotesPage />
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
])
