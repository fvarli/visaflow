import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AlertCircle, Compass, FileText, ListChecks, Plus } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { useDashboardModel } from '@/features/dashboard/dashboard-model'
import { PageHeader } from '@/components/ui/page-header'
import { PageBody, Section, SectionHeader } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SourceNote } from '@/components/ui/source-note'
import { dynamicT } from '@/lib/i18n-dynamic'
import { ReadinessHero } from '@/components/dashboard/ReadinessHero'
import { MetricsRow } from '@/components/dashboard/MetricsRow'
import { NextActions } from '@/components/dashboard/NextActions'
import { UpcomingTimeline } from '@/components/dashboard/UpcomingTimeline'
import { DocumentsSummary } from '@/components/dashboard/DocumentsSummary'
import { ValidationSummary } from '@/components/dashboard/ValidationSummary'
import { TripSummary } from '@/components/dashboard/TripSummary'

/** Only Greece is configured today; kept as a named constant, not a literal. */
const DEFAULT_COUNTRY = 'GR'

/**
 * The dossier command center: a thin composition of reusable widgets over the
 * derived dashboard model. All data logic lives in `useDashboardModel`; this
 * page decides only layout and order.
 */
export default function DashboardPage() {
  const { hasData, initializeEmpty } = useDossier()
  const { t } = useTranslation(['dashboard', 'common', 'visa-domain'])
  const td = dynamicT(t)
  const model = useDashboardModel()
  const app = model.active

  if (!hasData) {
    return (
      <PageBody>
        <PageHeader
          title={t('dashboard:welcome')}
          description={t('dashboard:welcomeDescription')}
        />

        <Alert>
          <AlertCircle />
          <AlertTitle>{t('common:privacy.title')}</AlertTitle>
          <AlertDescription>{t('common:privacy.body')}</AlertDescription>
        </Alert>

        <EmptyState
          icon={Compass}
          title={t('dashboard:getStarted.title')}
          description={t('dashboard:getStarted.description')}
          action={
            <Button onClick={() => initializeEmpty(DEFAULT_COUNTRY)}>
              <Plus className="size-4" />
              {t('dashboard:getStarted.startGreece')}
            </Button>
          }
        />
        <p className="text-caption text-muted-foreground text-center">
          {t('dashboard:getStarted.orImportPlain')}
        </p>
      </PageBody>
    )
  }

  const countryLabel = app.countryCode
    ? td(`visa-domain:countries.${app.countryCode}`, {
        defaultValue: app.countryCode,
      })
    : null
  const visaTypeLabel = app.visaType
    ? td(`visa-domain:visaTypes.${app.visaType}`)
    : null
  const eyebrow = [countryLabel, visaTypeLabel].filter(Boolean).join(' · ')

  return (
    <PageBody>
      <PageHeader
        eyebrow={eyebrow || undefined}
        title={t('dashboard:title')}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/documents">
                <FileText className="size-4" />
                {t('dashboard:header.documents')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/consistency-checks">
                <ListChecks className="size-4" />
                {t('dashboard:header.checkIssues')}
              </Link>
            </Button>
          </>
        }
      />

      <ReadinessHero
        percent={app.readiness.percent}
        state={app.readiness.state}
        missingCount={app.readiness.missingCount}
        appointment={app.appointment}
        primaryAction={app.nextActions[0]}
      />

      <MetricsRow
        documents={app.documents}
        appointment={app.appointment}
        trip={app.trip}
        validation={app.validation}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <NextActions actions={app.nextActions} />
          <UpcomingTimeline items={app.upcomingTimeline} />
        </div>
        <div className="flex flex-col gap-6">
          <DocumentsSummary buckets={app.documents} />
          <ValidationSummary validation={app.validation} />
          <TripSummary
            countryCode={app.countryCode}
            trip={app.trip}
            financing={app.financing}
            sponsorCount={app.sponsorCount}
          />
        </div>
      </div>

      <Section>
        <SectionHeader
          title={t('dashboard:sourceStatus.title')}
          description={t('dashboard:sourceStatus.description')}
        />
        <SourceNote sources={app.sources} reviewStatus={app.reviewStatus} />
      </Section>
    </PageBody>
  )
}
