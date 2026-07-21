import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

// Lazy load pages for better performance
import { lazy, Suspense } from 'react'
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

function PageLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
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
    ],
  },
])
