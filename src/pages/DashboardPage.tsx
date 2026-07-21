import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { differenceInDays, parseISO, format } from 'date-fns'
import { useDossier } from '@/app/providers/DossierProvider'
import { runValidation } from '@/domain/rules/runner'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Plane,
  Calendar,
  FileText,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function DashboardPage() {
  const { state, hasData, initializeEmpty } = useDossier()

  const stats = useMemo(() => {
    if (!hasData || !state.applicant || !state.application) {
      return null
    }

    // Calculate document stats
    const requiredDocs = state.documents.filter((d) => d.required)
    const readyDocs = requiredDocs.filter(
      (d) => d.status === 'ready' || d.status === 'not_applicable'
    )
    const completionPercent =
      requiredDocs.length > 0
        ? Math.round((readyDocs.length / requiredDocs.length) * 100)
        : 0

    const missingDocs = requiredDocs.filter(
      (d) => d.status === 'not_started' || d.status === 'requested'
    )
    const needsUpdateDocs = state.documents.filter(
      (d) => d.status === 'needs_update'
    )

    // Calculate days until events
    const today = new Date()
    const appointmentDate = state.application.appointment?.date
      ? parseISO(state.application.appointment.date)
      : null
    const tripStartDate = state.application.trip?.entryDate
      ? parseISO(state.application.trip.entryDate)
      : null

    const daysUntilAppointment = appointmentDate
      ? differenceInDays(appointmentDate, today)
      : null
    const daysUntilTravel = tripStartDate
      ? differenceInDays(tripStartDate, today)
      : null

    // Run validation
    const dossier: Dossier = {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      applicant: state.applicant,
      application: state.application,
      documents: state.documents,
      sponsors: state.sponsors,
    }
    const validationResult = runValidation(dossier)

    return {
      completionPercent,
      totalRequired: requiredDocs.length,
      totalReady: readyDocs.length,
      missingDocs,
      needsUpdateDocs,
      daysUntilAppointment,
      daysUntilTravel,
      appointmentDate,
      tripStartDate,
      validationResult,
    }
  }, [state, hasData])

  // Empty state - no data loaded
  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome to VisaFlow</h1>
          <p className="text-muted-foreground">
            Organize your visa application dossier with confidence.
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Privacy Notice</AlertTitle>
          <AlertDescription>
            Your data remains in browser memory only. No information is sent to
            any server. Export your dossier regularly to save your progress.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Choose how you would like to begin organizing your visa
              application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => initializeEmpty('GR')}
              className="w-full justify-start"
            >
              <Plus className="mr-2 h-4 w-4" />
              Start New Greece Application
            </Button>
            <p className="text-sm text-muted-foreground">
              Or use the Import button in the sidebar to load existing data.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {state.application?.destinationCountry ?? 'No destination'} -{' '}
            {state.application?.visaType.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/documents">
            <Button variant="outline" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Documents
            </Button>
          </Link>
          <Link to="/consistency-checks">
            <Button variant="outline" size="sm">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Check Issues
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Dates */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Appointment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.appointmentDate ? (
              <>
                <div className="text-2xl font-bold">
                  {format(stats.appointmentDate, 'MMM d, yyyy')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.daysUntilAppointment !== null &&
                  stats.daysUntilAppointment >= 0
                    ? `${stats.daysUntilAppointment} days remaining`
                    : 'Past date'}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No appointment set</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trip Start</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.tripStartDate ? (
              <>
                <div className="text-2xl font-bold">
                  {format(stats.tripStartDate, 'MMM d, yyyy')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.daysUntilTravel !== null && stats.daysUntilTravel >= 0
                    ? `${stats.daysUntilTravel} days until travel`
                    : 'Past date'}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No trip dates set</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Document Completion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Document Completion</span>
            <span className="text-sm font-normal text-muted-foreground">
              {stats.totalReady} / {stats.totalRequired} required documents
              ready
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={stats.completionPercent} className="h-2" />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">{stats.totalReady} ready</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm">
                {stats.missingDocs.length} pending
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm">
                {stats.needsUpdateDocs.length} need update
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Consistency Checks</CardTitle>
          <CardDescription>
            Automated checks for common issues in your dossier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats.validationResult.errorCount > 0 && (
              <Badge variant="destructive">
                {stats.validationResult.errorCount} error
                {stats.validationResult.errorCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {stats.validationResult.warningCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800"
              >
                {stats.validationResult.warningCount} warning
                {stats.validationResult.warningCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {stats.validationResult.errorCount === 0 &&
              stats.validationResult.warningCount === 0 && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  No issues found
                </Badge>
              )}
          </div>

          {stats.validationResult.findings.length > 0 && (
            <div className="mt-4 space-y-2">
              {stats.validationResult.findings.slice(0, 3).map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-start gap-2 text-sm"
                >
                  {finding.severity === 'error' ? (
                    <AlertCircle className="h-4 w-4 mt-0.5 text-red-500" />
                  ) : finding.severity === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500" />
                  )}
                  <span>{finding.title}</span>
                </div>
              ))}
              {stats.validationResult.findings.length > 3 && (
                <Link
                  to="/consistency-checks"
                  className="inline-flex items-center text-sm text-primary hover:underline"
                >
                  View all {stats.validationResult.findings.length} findings
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {stats.missingDocs.length > 0 && (
              <Link to="/documents" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Complete {stats.missingDocs.length} missing document
                  {stats.missingDocs.length !== 1 ? 's' : ''}
                </Button>
              </Link>
            )}
            {!state.application?.appointment && (
              <Link to="/trip" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Set appointment date
                </Button>
              </Link>
            )}
            {!state.application?.trip && (
              <Link to="/trip" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Plane className="mr-2 h-4 w-4" />
                  Add trip details
                </Button>
              </Link>
            )}
            {stats.validationResult.errorCount > 0 && (
              <Link to="/consistency-checks" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Resolve {stats.validationResult.errorCount} error
                  {stats.validationResult.errorCount !== 1 ? 's' : ''}
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
