import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Compass,
  FileText,
  ListChecks,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { useDashboardModel } from '@/features/dashboard/dashboard-model'
import { PageHeader } from '@/components/ui/page-header'
import { PageBody, Section, SectionHeader } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SourceNote } from '@/components/ui/source-note'
import { dynamicT } from '@/lib/i18n-dynamic'
import { ReadinessHero } from '@/components/dashboard/ReadinessHero'
import { NextAction } from '@/components/dashboard/NextAction'
import { UpcomingTimeline } from '@/components/dashboard/UpcomingTimeline'
import { ConsistencyHealth } from '@/components/dashboard/ConsistencyHealth'
import { DocumentsSummary } from '@/components/dashboard/DocumentsSummary'
import { TripSummary } from '@/components/dashboard/TripSummary'
import { DossierSnapshot } from '@/components/dashboard/DossierSnapshot'

/** Only Greece is configured today; kept as a named constant, not a literal. */
const DEFAULT_COUNTRY = 'GR'

/**
 * The dossier command center: a thin composition of purpose-driven sections over
 * the derived dashboard model. All data logic lives in `useDashboardModel`; this
 * page decides only layout and order. It answers one question on sight — what
 * should I do next — with readiness as the single dominant progress indicator.
 */
export default function DashboardPage() {
  const { hasData, initializeEmpty } = useDossier()
  const { t } = useTranslation(['dashboard', 'common', 'visa-domain'])
  const td = dynamicT(t)
  const model = useDashboardModel()
  const app = model.active

  if (!hasData) {
    return (
      <DashboardEmptyState onStart={() => initializeEmpty(DEFAULT_COUNTRY)} />
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
  const statusLabel =
    app.readiness.state === 'documents_remaining'
      ? td('dashboard:hero.verdict.documents_remaining', {
          count: app.readiness.missingCount,
        })
      : td(`dashboard:hero.verdict.${app.readiness.state}`)
  const eyebrow = [countryLabel, visaTypeLabel, statusLabel]
    .filter(Boolean)
    .join(' · ')

  const greeting = app.greetingName
    ? t('dashboard:greeting.hello', { name: app.greetingName })
    : t('dashboard:greeting.helloNeutral')

  return (
    <PageBody>
      <PageHeader
        eyebrow={eyebrow || undefined}
        title={greeting}
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

      {/* Hero row: the dominant readiness indicator + the single next action. */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ReadinessHero
            percent={app.readiness.percent}
            state={app.readiness.state}
            missingCount={app.readiness.missingCount}
            nextMilestone={app.nextMilestone}
          />
        </div>
        <div className="lg:col-span-2">
          <NextAction action={app.nextActions[0] ?? null} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <UpcomingTimeline items={app.upcomingTimeline} />
          <ConsistencyHealth validation={app.validation} />
        </div>
        <div className="flex flex-col gap-6">
          <DocumentsSummary breakdown={app.documentsBreakdown} />
          <TripSummary
            countryCode={app.countryCode}
            trip={app.trip}
            financing={app.financing}
            sponsorCount={app.sponsorCount}
          />
          <DossierSnapshot items={app.snapshot} />
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

/**
 * The first-run experience: an inviting introduction rather than a blank page.
 * The primary path starts a Greece application in memory; importing an existing
 * dossier uses the Import control in the header.
 */
function DashboardEmptyState({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation(['dashboard', 'common'])

  return (
    <PageBody>
      <PageHeader
        eyebrow={t('dashboard:welcome')}
        title={t('dashboard:welcomeDescription')}
      />

      <EmptyState
        icon={Compass}
        title={t('dashboard:getStarted.title')}
        description={t('dashboard:getStarted.description')}
        action={
          <div className="flex flex-col items-center gap-3">
            <Button onClick={onStart}>
              <Plus className="size-4" />
              {t('dashboard:getStarted.startGreece')}
            </Button>
            <Link
              to="/documents"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-sm text-sm"
            >
              {t('dashboard:getStarted.explore')}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        }
      />

      <p className="text-caption text-muted-foreground inline-flex items-center justify-center gap-1.5 text-center">
        <ShieldCheck className="size-3.5 shrink-0" />
        {t('dashboard:getStarted.privacyNote')}
      </p>
      <p className="text-caption text-muted-foreground text-center">
        {t('dashboard:getStarted.orImportPlain')}
      </p>
    </PageBody>
  )
}
