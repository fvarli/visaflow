import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { differenceInDays, parseISO } from 'date-fns'
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
import { useFormatters } from '@/lib/format'
import { useFindingText } from '@/lib/finding-text'
import { dynamicT } from '@/lib/i18n-dynamic'

export default function DashboardPage() {
  const { state, hasData, initializeEmpty } = useDossier()
  const { t } = useTranslation([
    'dashboard',
    'common',
    'validation',
    'navigation',
  ])
  const format = useFormatters()
  const findingText = useFindingText()

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
          <h1 className="text-2xl font-bold">{t('dashboard:welcome')}</h1>
          <p className="text-muted-foreground">
            {t('dashboard:welcomeDescription')}
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('common:privacy.title')}</AlertTitle>
          <AlertDescription>{t('common:privacy.body')}</AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard:getStarted.title')}</CardTitle>
            <CardDescription>
              {t('dashboard:getStarted.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => initializeEmpty('GR')}
              className="w-full justify-start"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard:getStarted.startGreece')}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('dashboard:getStarted.orImportPlain')}
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
          <h1 className="text-2xl font-bold">{t('dashboard:title')}</h1>
          <p className="text-muted-foreground">
            {state.application?.destinationCountry
              ? dynamicT(t)(
                  `visa-domain:countries.${state.application.destinationCountry}`,
                  { defaultValue: state.application.destinationCountry }
                )
              : t('common:states.notSet')}
            {state.application?.visaType &&
              ` · ${dynamicT(t)(`visa-domain:visaTypes.${state.application.visaType}`)}`}
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
            <CardTitle className="text-sm font-medium">
              {t('dashboard:cards.appointment')}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.appointmentDate ? (
              <>
                <div className="text-2xl font-bold">
                  {format.dateShort(stats.appointmentDate)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.daysUntilAppointment !== null &&
                  stats.daysUntilAppointment >= 0
                    ? t('common:time.daysRemaining', {
                        count: stats.daysUntilAppointment,
                      })
                    : t('common:time.datePassed')}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                {t('common:states.notSet')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard:cards.tripStart')}
            </CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.tripStartDate ? (
              <>
                <div className="text-2xl font-bold">
                  {format.dateShort(stats.tripStartDate)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.daysUntilTravel !== null && stats.daysUntilTravel >= 0
                    ? t('dashboard:cards.daysUntilTravel', {
                        count: stats.daysUntilTravel,
                      })
                    : t('common:time.datePassed')}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                {t('common:states.notSet')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Document Completion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('dashboard:completion.title')}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {t('dashboard:completion.description', {
                ready: stats.totalReady,
                total: stats.totalRequired,
              })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={stats.completionPercent} className="h-2" />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                {stats.totalReady} {t('dashboard:completion.ready')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm">
                {stats.missingDocs.length} {t('dashboard:completion.pending')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm">
                {stats.needsUpdateDocs.length}{' '}
                {t('dashboard:completion.needUpdate')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard:checks.title')}</CardTitle>
          <CardDescription>{t('dashboard:checks.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats.validationResult.errorCount > 0 && (
              <Badge variant="destructive">
                {t('validation:summary.errorCount', {
                  count: stats.validationResult.errorCount,
                })}
              </Badge>
            )}
            {stats.validationResult.warningCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800"
              >
                {t('validation:summary.warningCount', {
                  count: stats.validationResult.warningCount,
                })}
              </Badge>
            )}
            {stats.validationResult.errorCount === 0 &&
              stats.validationResult.warningCount === 0 && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  {t('dashboard:checks.noIssues')}
                </Badge>
              )}
          </div>

          {stats.validationResult.findings.length > 0 && (
            <div className="mt-4 space-y-2">
              {stats.validationResult.findings
                .slice(0, 3)
                .map((finding, index) => (
                  <div
                    key={`${finding.id}-${index}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    {finding.severity === 'error' ? (
                      <AlertCircle className="h-4 w-4 mt-0.5 text-red-500" />
                    ) : finding.severity === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500" />
                    )}
                    <span>{findingText(finding).title}</span>
                  </div>
                ))}
              {stats.validationResult.findings.length > 3 && (
                <Link
                  to="/consistency-checks"
                  className="inline-flex items-center text-sm text-primary hover:underline"
                >
                  {t('dashboard:checks.viewAllFindings', {
                    count: stats.validationResult.findings.length,
                  })}
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
          <CardTitle>{t('dashboard:nextSteps.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {stats.missingDocs.length > 0 && (
              <Link to="/documents" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  {t('dashboard:nextSteps.completeMissingDocs', {
                    count: stats.missingDocs.length,
                  })}
                </Button>
              </Link>
            )}
            {!state.application?.appointment && (
              <Link to="/trip" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  {t('dashboard:nextSteps.setAppointment')}
                </Button>
              </Link>
            )}
            {!state.application?.trip && (
              <Link to="/trip" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Plane className="mr-2 h-4 w-4" />
                  {t('dashboard:nextSteps.addTrip')}
                </Button>
              </Link>
            )}
            {stats.validationResult.errorCount > 0 && (
              <Link to="/consistency-checks" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {t('dashboard:nextSteps.resolveErrors', {
                    count: stats.validationResult.errorCount,
                  })}
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
