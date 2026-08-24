import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Compass,
  FolderOpen,
  FileText,
  ListChecks,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
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

/**
 * The dossier command center: a thin composition of purpose-driven sections over
 * the derived dashboard model. All data logic lives in `useDashboardModel`; this
 * page decides only layout and order. It answers one question on sight — what
 * should I do next — with readiness as the single dominant progress indicator.
 */
export default function DashboardPage() {
  const { hasData } = useDossier()
  // Identity only — never data. The dashboard still derives everything it
  // *shows* from the active dossier alone; it just says which one that is
  // (ADR-040).
  const { activeTitle } = useWorkspace()
  const { t } = useTranslation(['dashboard', 'common', 'visa-domain'])
  const td = dynamicT(t)
  const model = useDashboardModel()
  const app = model.active

  if (!hasData) {
    return <DashboardEmptyState />
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
          count: app.readiness.outstanding,
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
        // The dossier, not the person, is what this page is about. With several
        // dossiers open in several tabs a greeting is the same everywhere,
        // while the name answers "which one am I in" at any width — including
        // below `sm`, where the header switcher's label is hidden.
        title={activeTitle ?? greeting}
        description={activeTitle ? greeting : undefined}
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
            outstandingCount={app.readiness.outstanding}
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
          <DocumentsSummary readiness={app.documents} />
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
 * A lightweight first-run fallback. The guided setup now lives at `/welcome`
 * (the index redirect sends brand-new users there); if someone lands on an empty
 * Dashboard directly, this invites them into that flow rather than dead-ending.
 */
/**
 * No dossier is open. That is two different situations, and telling them apart
 * is the point: a brand-new visitor is welcomed, while someone who simply
 * closed a dossier is shown the way back to the ones they have (ADR-040).
 */
function DashboardEmptyState() {
  const { t } = useTranslation(['dashboard', 'common'])
  const { summaries } = useWorkspace()
  const savedCount = summaries.length
  const hasSaved = savedCount > 0

  return (
    <PageBody>
      <PageHeader
        eyebrow={hasSaved ? undefined : t('dashboard:welcome')}
        title={
          hasSaved
            ? t('common:noDossier.savedTitle')
            : t('dashboard:welcomeDescription')
        }
      />

      <EmptyState
        icon={hasSaved ? FolderOpen : Compass}
        title={
          hasSaved
            ? t('common:noDossier.savedDescription', { count: savedCount })
            : t('dashboard:getStarted.title')
        }
        description={
          hasSaved ? undefined : t('dashboard:getStarted.description')
        }
        action={
          hasSaved ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link to="/dossiers">{t('common:noDossier.openAction')}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/welcome?step=create">
                  <Plus className="size-4" />
                  {t('common:noDossier.startAction')}
                </Link>
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link to="/welcome">
                <Plus className="size-4" />
                {t('common:noDossier.startAction')}
              </Link>
            </Button>
          )
        }
      />

      <p className="text-caption text-muted-foreground inline-flex items-center justify-center gap-1.5 text-center">
        <ShieldCheck className="size-3.5 shrink-0" />
        {t('dashboard:getStarted.privacyNote')}
      </p>
    </PageBody>
  )
}
