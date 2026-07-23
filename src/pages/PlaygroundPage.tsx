import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  FileText,
  Info,
  Plane,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

import { PageHeader } from '@/components/ui/page-header'
import { PageBody, Section, SectionHeader } from '@/components/ui/section'
import { Field } from '@/components/ui/field'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataList, DataListItem } from '@/components/ui/data-list'
import { Toolbar, SearchInput } from '@/components/ui/toolbar'
import { Kbd } from '@/components/ui/kbd'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  StatusBadge,
  type StatusTone,
  DOCUMENT_STATUS_TONE,
  humanizeStatus,
} from '@/components/ui/status-badge'
import { NoDossierState } from '@/components/NoDossierState'
import { BrandMark } from '@/components/layout/BrandMark'
import { useTheme } from '@/app/providers/ThemeProvider'
import { useLocale } from '@/app/providers/LocaleProvider'
import { LanguageSelect } from '@/components/ui/language-select'
import { SourceNote } from '@/components/ui/source-note'
import { ReadinessRing } from '@/components/ui/readiness-ring'
import { ReadinessHero } from '@/components/dashboard/ReadinessHero'
import { MetricsRow } from '@/components/dashboard/MetricsRow'
import { NextActions } from '@/components/dashboard/NextActions'
import { UpcomingTimeline } from '@/components/dashboard/UpcomingTimeline'
import { DocumentsSummary } from '@/components/dashboard/DocumentsSummary'
import { ValidationSummary } from '@/components/dashboard/ValidationSummary'
import { TripSummary } from '@/components/dashboard/TripSummary'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { buildDashboardModel } from '@/features/dashboard/dashboard-model'
import { useFormatters } from '@/lib/format'
import { dynamicT } from '@/lib/i18n-dynamic'
import type { RequirementSource } from '@/config/types'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'

/**
 * Design system playground.
 *
 * Every reusable primitive on one page, in every meaningful state, so the
 * visual language can be iterated on without clicking through the real app.
 * Not linked from the production sidebar — see src/config/navigation.ts.
 *
 * Add a primitive here in the same commit that adds it to components/ui.
 */
export default function PlaygroundPage() {
  const { theme, resolvedTheme } = useTheme()
  const { locale } = useLocale()
  const { t } = useTranslation(['playground', 'common', 'visa-domain'])

  return (
    <PageBody>
      <PageHeader
        eyebrow={t('playground:eyebrow')}
        title={t('playground:title')}
        description={t('playground:description')}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone="neutral" size="md" dot>
              {locale} · {theme} → {resolvedTheme}
            </StatusBadge>
            <LanguageSelect />
            <ThemeToggle />
          </div>
        }
      />

      <Nav />
      <Internationalization />
      <Foundations />
      <Typography />
      <Buttons />
      <Badges />
      <Forms />
      <Feedback />
      <DataDisplay />
      <Overlays />
      <Composition />
      <Dashboard />
    </PageBody>
  )
}

/* -------------------------------------------------------------------------
 * Layout helpers, local to the playground
 * ---------------------------------------------------------------------- */

const SECTIONS = [
  'i18n',
  'foundations',
  'typography',
  'buttons',
  'badges',
  'forms',
  'feedback',
  'data',
  'overlays',
  'composition',
  'dashboard',
] as const

function Nav() {
  const { t } = useTranslation(['playground'])
  const td = dynamicT(t)

  return (
    <nav aria-label={td('playground:title')} className="flex flex-wrap gap-2">
      {SECTIONS.map((id) => (
        <a
          key={id}
          href={`#${id}`}
          className="bg-card text-body hover:border-border-strong hover:bg-accent rounded-full border px-3 py-1 transition-colors"
        >
          {td(`playground:sections.${id}`)}
        </a>
      ))}
    </nav>
  )
}

/* -------------------------------------------------------------------------
 * Internationalization
 * ---------------------------------------------------------------------- */

/**
 * Fictional demo records. These exist only to exercise the SourceNote
 * component — they are NOT real requirement sources and must never be copied
 * into a country template.
 */
const DEMO_VERIFIED_SOURCE: RequirementSource[] = [
  {
    id: 'demo-verified',
    authority: 'Örnek Konsolosluk / Example Consulate',
    titleKey: 'playground:i18n.demoSourceTitle',
    url: 'https://example.invalid/visa',
    sourceType: 'consulate',
    jurisdiction: 'GR',
    language: 'tr',
    lastVerifiedAt: '2026-07-15',
    retrievedAt: '2026-07-15',
  },
]

const DEMO_UNVERIFIED_SOURCE: RequirementSource[] = [
  {
    id: 'demo-unverified',
    authority: 'Örnek Bakanlık / Example Ministry',
    titleKey: 'playground:i18n.demoSourceTitle',
    sourceType: 'government',
    jurisdiction: 'GR',
    // No lastVerifiedAt — this is exactly the honest "not checked" case.
  },
]

/** The longest real labels in each language, for wrapping checks. */
const LONG_LABEL_KEYS = [
  'navigation:items.consistencyChecks',
  'visa-domain:requirements.TRAVEL_INSURANCE.name',
  'visa-domain:requirements.SPONSOR_BANK_STATEMENTS.name',
  'visa-domain:documentStatus.not_applicable',
  'visa-domain:sponsorRelationship.grandparent',
]

function Internationalization() {
  const { t } = useTranslation(['playground', 'common', 'visa-domain'])
  const td = dynamicT(t)
  const { locale, intlLocale } = useLocale()
  const format = useFormatters()

  return (
    <Block
      id="i18n"
      title={t('playground:sections.i18n')}
      description={t('playground:i18n.description')}
    >
      <Row label={t('playground:rows.languageSelector')}>
        <LanguageSelect />
        <StatusBadge tone="neutral" size="md">
          {t('playground:i18n.activeLocale')}: {locale} · {intlLocale}
        </StatusBadge>
      </Row>

      <Row
        label={t('playground:rows.longLabels')}
        hint={t('playground:i18n.longLabelNote')}
        align="start"
      >
        <div className="flex max-w-md flex-wrap gap-2">
          {LONG_LABEL_KEYS.map((key) => (
            <StatusBadge key={key} tone="neutral" size="md">
              {td(key)}
            </StatusBadge>
          ))}
        </div>
      </Row>

      <Row label={t('playground:rows.dates')} align="start">
        <div className="space-y-1" data-numeric>
          <p className="text-body">{format.date('2026-08-12')}</p>
          <p className="text-body">{format.dateShort('2026-08-12')}</p>
          <p className="text-body">{format.dateTime('2026-08-12T09:30:00Z')}</p>
        </div>
      </Row>

      <Row label={t('playground:rows.currency')} align="start">
        <div className="space-y-1" data-numeric>
          <p className="text-body">{format.currency(98000, 'TRY')}</p>
          <p className="text-body">{format.currency(30000, 'EUR')}</p>
          <p className="text-body">{format.currency(2450.5, 'USD')}</p>
        </div>
      </Row>

      <Row label={t('playground:rows.numbers')} align="start">
        <div className="space-y-1" data-numeric>
          <p className="text-body">{format.number(1234567.89)}</p>
          <p className="text-body">{format.percent(72)}</p>
        </div>
      </Row>

      <Row label={t('playground:rows.documentStatus')}>
        {Object.keys(DOCUMENT_STATUS_TONE).map((status) => (
          <StatusBadge
            key={status}
            tone={DOCUMENT_STATUS_TONE[status]}
            size="md"
            dot
          >
            {td(`visa-domain:documentStatus.${status}`)}
          </StatusBadge>
        ))}
      </Row>

      <Row label={t('playground:rows.sourceVerified')} align="start">
        <div className="w-full max-w-2xl">
          <SourceNote
            sources={DEMO_VERIFIED_SOURCE}
            reviewStatus="verified"
            lastReviewedAt="2026-07-15"
          />
        </div>
      </Row>

      <Row label={t('playground:rows.sourceUnverified')} align="start">
        <div className="w-full max-w-2xl">
          <SourceNote
            sources={DEMO_UNVERIFIED_SOURCE}
            reviewStatus="unverified"
          />
        </div>
      </Row>
    </Block>
  )
}

function Block({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Section id={id} className="scroll-mt-20">
      <SectionHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col gap-8">{children}</CardContent>
      </Card>
    </Section>
  )
}

/** Labelled row of specimens. */
function Row({
  label,
  hint,
  children,
  align = 'center',
}: {
  label: string
  hint?: string
  children: React.ReactNode
  align?: 'center' | 'start'
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-6">
      <div className="space-y-0.5">
        <p className="text-eyebrow text-muted-foreground uppercase">{label}</p>
        {hint && (
          <p className="text-caption text-muted-foreground/70">{hint}</p>
        )}
      </div>
      <div
        className={`flex flex-wrap gap-3 ${align === 'center' ? 'items-center' : 'items-start'}`}
      >
        {children}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------
 * Foundations
 * ---------------------------------------------------------------------- */

function Swatch({
  name,
  className,
  note,
}: {
  name: string
  className: string
  note?: string
}) {
  return (
    <div className="min-w-[8.5rem] space-y-1.5">
      <div className={`h-12 rounded-lg border ${className}`} />
      <p className="text-caption text-foreground font-mono">{name}</p>
      {note && <p className="text-caption text-muted-foreground">{note}</p>}
    </div>
  )
}

function Foundations() {
  const { t } = useTranslation(['playground', 'common', 'visa-domain'])
  return (
    <Block
      id="foundations"
      title={t('playground:sections.foundations')}
      description={t('playground:blurbs.foundations')}
    >
      <Row label={t('playground:rows.surfaces')} align="start">
        <Swatch
          name="background"
          className="bg-background"
          note={t('playground:hints.canvas')}
        />
        <Swatch
          name="card"
          className="bg-card"
          note={t('playground:hints.raised')}
        />
        <Swatch
          name="popover"
          className="bg-popover"
          note={t('playground:hints.overlay')}
        />
        <Swatch
          name="muted"
          className="bg-muted"
          note={t('playground:hints.recessed')}
        />
        <Swatch name="sidebar" className="bg-sidebar" />
      </Row>

      <Row
        label={t('playground:rows.accent')}
        hint={t('playground:hints.cobaltIndigo')}
        align="start"
      >
        <Swatch
          name="primary"
          className="bg-primary"
          note={t('playground:hints.actions')}
        />
        <Swatch name="primary-hover" className="bg-primary-hover" />
        <Swatch
          name="brand-subtle"
          className="bg-brand-subtle"
          note={t('playground:hints.activeNav')}
        />
        <Swatch
          name="ring"
          className="bg-ring"
          note={t('playground:hints.focus')}
        />
      </Row>

      <Row
        label={t('playground:rows.status')}
        hint={t('playground:hints.solidMuted')}
        align="start"
      >
        <Swatch name="success" className="bg-success" />
        <Swatch name="warning" className="bg-warning" />
        <Swatch name="danger" className="bg-danger" />
        <Swatch
          name="info"
          className="bg-info"
          note={t('playground:hints.lowChroma')}
        />
      </Row>

      <Row label={t('playground:rows.statusMuted')} align="start">
        <Swatch name="success-muted" className="bg-success-muted" />
        <Swatch name="warning-muted" className="bg-warning-muted" />
        <Swatch name="danger-muted" className="bg-danger-muted" />
        <Swatch name="info-muted" className="bg-info-muted" />
      </Row>

      <Row label={t('playground:rows.text')} align="start">
        <div className="space-y-1">
          <p className="text-foreground text-body">text-foreground</p>
          <p className="text-muted-foreground text-body">
            text-muted-foreground
          </p>
          <p className="text-primary text-body">text-primary</p>
        </div>
      </Row>

      <Separator />

      {/* Class names are spelled out in full: Tailwind scans source text, so
          an interpolated `rounded-${r}` would never be generated. */}
      <Row label={t('playground:rows.radius')} align="start">
        {(
          [
            ['sm', 'rounded-sm'],
            ['md', 'rounded-md'],
            ['lg', 'rounded-lg'],
            ['xl', 'rounded-xl'],
            ['2xl', 'rounded-2xl'],
          ] as const
        ).map(([name, cls]) => (
          <div key={name} className="space-y-1.5 text-center">
            <div className={`bg-muted size-14 border ${cls}`} />
            <p className="text-caption text-muted-foreground font-mono">
              {name}
            </p>
          </div>
        ))}
      </Row>

      <Row
        label={t('playground:rows.elevation')}
        hint={t('playground:hints.hueTinted')}
        align="start"
      >
        {(
          [
            ['xs', 'shadow-xs'],
            ['sm', 'shadow-sm'],
            ['md', 'shadow-md'],
            ['lg', 'shadow-lg'],
          ] as const
        ).map(([name, cls]) => (
          <div key={name} className="space-y-1.5 text-center">
            <div className={`bg-card size-14 rounded-xl border ${cls}`} />
            <p className="text-caption text-muted-foreground font-mono">
              {name}
            </p>
          </div>
        ))}
      </Row>
    </Block>
  )
}

/* -------------------------------------------------------------------------
 * Typography
 * ---------------------------------------------------------------------- */

function Typography() {
  const { t } = useTranslation(['playground', 'common', 'visa-domain'])
  const scale = [
    ['text-display', 'Display — 30/36, -0.021em', 'text-display'],
    ['text-title', 'Title — 24/32, -0.017em', 'text-title'],
    ['text-heading', 'Heading — 16/24, -0.011em', 'text-heading'],
    ['text-body', 'Body — 14/22, the default', 'text-body'],
    ['text-small', 'Small — 13/20', 'text-small'],
    ['text-caption', 'Caption — 12/16', 'text-caption'],
    ['text-eyebrow', 'EYEBROW — 11/16, +0.06em', 'text-eyebrow uppercase'],
  ] as const

  return (
    <Block
      id="typography"
      title={t('playground:sections.typography')}
      description={t('playground:blurbs.typography')}
    >
      <div className="divide-border divide-y">
        {scale.map(([token, sample, cls]) => (
          <div
            key={token}
            className="grid gap-2 py-3 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-6"
          >
            <p className="text-caption text-muted-foreground font-mono">
              {token}
            </p>
            <p className={cls}>{sample}</p>
          </div>
        ))}
      </div>

      <Separator />

      <Row
        label={t('playground:rows.numerals')}
        hint={t('playground:hints.tabular')}
        align="start"
      >
        <div className="space-y-1">
          <p className="text-body">Proportional: 1,480.00 · 2026-07-22</p>
          <p data-numeric className="text-body">
            Tabular: 1,480.00 · 2026-07-22
          </p>
        </div>
      </Row>

      <Row
        label={t('playground:rows.mono')}
        hint={t('playground:hints.jetbrains')}
        align="start"
      >
        <p className="text-body font-mono">U12345678 · DOC-PASSPORT-01</p>
      </Row>
    </Block>
  )
}

/* -------------------------------------------------------------------------
 * Buttons
 * ---------------------------------------------------------------------- */

function Buttons() {
  const { t } = useTranslation(['playground', 'common', 'visa-domain'])
  return (
    <Block
      id="buttons"
      title={t('playground:sections.buttons')}
      description={t('playground:blurbs.buttons')}
    >
      <Row label={t('playground:rows.variants')}>
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </Row>

      <Row label={t('playground:rows.sizes')}>
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
      </Row>

      <Row label={t('playground:rows.withIcons')}>
        <Button>
          <Plus />
          Add sponsor
        </Button>
        <Button variant="outline">
          <FileText />
          Documents
        </Button>
        <Button variant="ghost">
          Continue
          <ArrowRight />
        </Button>
      </Row>

      <Row label={t('playground:rows.iconOnly')}>
        <Button
          size="icon-xs"
          variant="outline"
          aria-label={t('common:actions.delete')}
        >
          <Trash2 />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label={t('common:actions.delete')}
        >
          <Trash2 />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label={t('common:actions.delete')}
        >
          <Trash2 />
        </Button>
        <Button
          size="icon-lg"
          variant="outline"
          aria-label={t('common:actions.delete')}
        >
          <Trash2 />
        </Button>
      </Row>

      <Row label={t('playground:rows.disabled')}>
        <Button disabled>Default</Button>
        <Button variant="outline" disabled>
          Outline
        </Button>
        <Button variant="ghost" disabled>
          Ghost
        </Button>
      </Row>

      <Row label={t('playground:rows.keyboard')}>
        <span className="text-body text-muted-foreground inline-flex items-center gap-1.5">
          Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search
        </span>
      </Row>
    </Block>
  )
}

/* -------------------------------------------------------------------------
 * Badges & status
 * ---------------------------------------------------------------------- */

const TONES: StatusTone[] = [
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
  'accent',
]

function Badges() {
  const { t } = useTranslation(['playground', 'common', 'visa-domain'])
  return (
    <Block
      id="badges"
      title={t('playground:sections.badges')}
      description={t('playground:blurbs.badges')}
    >
      <Row label={t('playground:rows.statusBadge')} hint="tone">
        {TONES.map((tone) => (
          <StatusBadge key={tone} tone={tone}>
            {humanizeStatus(tone)}
          </StatusBadge>
        ))}
      </Row>

      <Row
        label={t('playground:rows.withDot')}
        hint={t('playground:hints.readsFaster')}
      >
        {TONES.map((tone) => (
          <StatusBadge key={tone} tone={tone} dot>
            {humanizeStatus(tone)}
          </StatusBadge>
        ))}
      </Row>

      <Row label={t('playground:rows.sizeMd')}>
        {TONES.map((tone) => (
          <StatusBadge key={tone} tone={tone} size="md" dot>
            {humanizeStatus(tone)}
          </StatusBadge>
        ))}
      </Row>

      <Row
        label={t('playground:rows.documentStatus')}
        hint={t('playground:hints.liveMapping')}
      >
        {Object.keys(DOCUMENT_STATUS_TONE).map((status) => (
          <StatusBadge
            key={status}
            tone={DOCUMENT_STATUS_TONE[status]}
            size="md"
            dot
          >
            {humanizeStatus(status)}
          </StatusBadge>
        ))}
      </Row>

      <Separator />

      <Row
        label={t('playground:rows.badge')}
        hint={t('playground:hints.legacyVariants')}
      >
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="ghost">Ghost</Badge>
      </Row>
    </Block>
  )
}

/* -------------------------------------------------------------------------
 * Forms
 * ---------------------------------------------------------------------- */

function Forms() {
  const { t } = useTranslation([
    'playground',
    'common',
    'applicant',
    'trip',
    'documents',
  ])
  const [checked, setChecked] = useState(true)

  return (
    <Block
      id="forms"
      title={t('playground:sections.forms')}
      description={t('playground:blurbs.forms')}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t('applicant:fields.firstName')}>
          <Input placeholder="As on passport" />
        </Field>

        <Field label={t('applicant:fields.passportNumber')} required>
          <Input placeholder="U12345678" className="font-mono" />
        </Field>

        <Field
          label={t('applicant:fields.nationality')}
          required
          description={t('applicant:hints.countryCode')}
        >
          <Input
            placeholder="TR"
            maxLength={2}
            className="font-mono uppercase"
          />
        </Field>

        <Field
          label={t('trip:dates.entryDate')}
          required
          error={t('trip:errors.entryDateRequired')}
        >
          <Input type="date" />
        </Field>

        <Field label={t('applicant:fields.maritalStatus')} htmlFor="pg-marital">
          <Select>
            <SelectTrigger id="pg-marital" className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="married">Married</SelectItem>
              <SelectItem value="divorced">Divorced</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label={t('playground:rows.disabled')}>
          <Input placeholder="Not editable" disabled />
        </Field>
      </div>

      <Field
        label={t('documents:edit.notes')}
        description={t('playground:demo.multiline')}
      >
        <Textarea placeholder="Anything worth remembering…" rows={3} />
      </Field>

      <Row label={t('playground:rows.checkbox')}>
        <div className="flex items-center gap-2">
          <Checkbox
            id="pg-check"
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
          />
          <Label htmlFor="pg-check">Required only</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="pg-check-off" />
          <Label htmlFor="pg-check-off">Unchecked</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="pg-check-dis" disabled />
          <Label htmlFor="pg-check-dis">Disabled</Label>
        </div>
      </Row>

      <Row label={t('playground:rows.toolbar')} align="start">
        <Toolbar className="w-full">
          <SearchInput
            placeholder={t('documents:filters.search')}
            aria-label={t('documents:filters.searchLabel')}
          />
          <Select>
            <SelectTrigger
              className="w-full sm:w-44"
              aria-label={t('documents:filters.categoryLabel')}
            >
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="identity">Identity</SelectItem>
            </SelectContent>
          </Select>
        </Toolbar>
      </Row>
    </Block>
  )
}

/* -------------------------------------------------------------------------
 * Feedback
 * ---------------------------------------------------------------------- */

function Feedback() {
  const { t } = useTranslation(['playground', 'common', 'visa-domain'])
  return (
    <Block
      id="feedback"
      title={t('playground:sections.feedback')}
      description={t('playground:blurbs.feedback')}
    >
      <div className="flex flex-col gap-3">
        <Alert>
          <Info />
          <AlertTitle>Default</AlertTitle>
          <AlertDescription>
            Neutral information that needs no particular tone.
          </AlertDescription>
        </Alert>
        <Alert variant="info">
          <ShieldCheck />
          <AlertTitle>Info</AlertTitle>
          <AlertDescription>
            Your data stays in browser memory only.
          </AlertDescription>
        </Alert>
        <Alert variant="success">
          <ShieldCheck />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>All checks passed.</AlertDescription>
        </Alert>
        <Alert variant="warning">
          <AlertCircle />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Your passport expires within 3 months of the trip.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Destructive</AlertTitle>
          <AlertDescription>
            Exit date is before the entry date.
          </AlertDescription>
        </Alert>
      </div>

      <Separator />

      <Row label={t('playground:rows.progress')} align="start">
        <div className="w-full max-w-md space-y-3">
          <Progress value={0} aria-label="0 percent" />
          <Progress value={35} aria-label="35 percent" />
          <Progress value={72} aria-label="72 percent" />
          <Progress value={100} aria-label="100 percent" />
        </div>
      </Row>

      <Row label={t('playground:rows.skeleton')} align="start">
        <div className="w-full max-w-md space-y-2.5">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </Row>

      <Separator />

      <Row label={t('playground:rows.emptyState')} align="start">
        <div className="w-full">
          <EmptyState
            icon={FileText}
            title="No documents match"
            description="Try clearing the search or loosening the filters."
            action={<Button size="sm">Clear filters</Button>}
          />
        </div>
      </Row>

      <Row label={t('playground:rows.inlineVariant')} align="start">
        <div className="w-full">
          <EmptyState
            variant="inline"
            icon={Calendar}
            title="No timeline events yet"
            description="Add appointment and trip dates to see them plotted here."
          />
        </div>
      </Row>

      <Row
        label={t('playground:rows.noDossier')}
        hint={t('playground:hints.appSpecific')}
        align="start"
      >
        <div className="w-full">
          <NoDossierState section="Belgeler" />
        </div>
      </Row>
    </Block>
  )
}

/* -------------------------------------------------------------------------
 * Data display
 * ---------------------------------------------------------------------- */

const DEMO_ROWS = [
  { name: 'Valid passport', code: 'PASSPORT', status: 'ready', required: true },
  {
    name: 'Travel medical insurance',
    code: 'INSURANCE',
    status: 'needs_update',
    required: true,
  },
  {
    name: 'Bank statement (3 months)',
    code: 'BANK_STMT',
    status: 'requested',
    required: true,
  },
  {
    name: 'Employment letter',
    code: 'EMP_LETTER',
    status: 'not_started',
    required: false,
  },
]

function DataDisplay() {
  const { t } = useTranslation([
    'playground',
    'common',
    'dashboard',
    'validation',
    'visa-domain',
  ])
  return (
    <Block
      id="data"
      title={t('playground:sections.data')}
      description={t('playground:blurbs.data')}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t('dashboard:cards.appointment')}
          icon={Calendar}
          value="12 Aug 2026"
          hint="21 days remaining"
        />
        <StatCard
          label={t('dashboard:cards.tripStart')}
          icon={Plane}
          value={t('common:states.notSet')}
          muted
        />
        <StatCard
          label={t('validation:summary.findings')}
          icon={AlertCircle}
          value={3}
          hint="1 error · 2 warnings"
          badge={{ label: 'Review', tone: 'warning' }}
        />
      </div>

      <Separator />

      <Card className="py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Required</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEMO_ROWS.map((row) => (
                <TableRow key={row.code}>
                  <TableCell>
                    <p className="text-foreground font-medium">{row.name}</p>
                    <p className="text-caption text-muted-foreground mt-0.5 font-mono">
                      {row.code}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      tone={DOCUMENT_STATUS_TONE[row.status] ?? 'neutral'}
                      dot
                    >
                      {humanizeStatus(row.status)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.required ? 'Required' : 'Optional'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      <Row label={t('playground:rows.dataList')} align="start">
        <div className="w-full max-w-2xl">
          <DataList>
            <DataListItem label="Full name" value="Ferzender Varli" />
            <DataListItem label="Passport number" value="U12345678" mono />
            <DataListItem label="Issuing country" value="TR" mono />
            <DataListItem label="Expiry date" value="2031-04-18" mono />
            <DataListItem label="Second nationality" value={undefined} />
          </DataList>
        </div>
      </Row>
    </Block>
  )
}

/* -------------------------------------------------------------------------
 * Overlays
 * ---------------------------------------------------------------------- */

function Overlays() {
  const { t } = useTranslation(['playground', 'common', 'visa-domain'])
  return (
    <Block
      id="overlays"
      title={t('playground:sections.overlays')}
      description={t('playground:blurbs.overlays')}
    >
      <Row label={t('playground:rows.dialog')}>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit document</DialogTitle>
              <DialogDescription>
                Valid passport — update its details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Issued date">
                <Input type="date" />
              </Field>
              <Field label="Valid until">
                <Input type="date" />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline">Cancel</Button>
              <Button>Save changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </Row>

      <Row label={t('playground:rows.tooltip')}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>Exports a JSON file to your device</TooltipContent>
        </Tooltip>
      </Row>

      <Row label={t('playground:rows.accordion')} align="start">
        <Accordion type="multiple" className="w-full max-w-2xl">
          <AccordionItem value="one">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-danger size-4 shrink-0" />
                <span className="text-body font-medium">
                  Passport expires too soon
                </span>
                <StatusBadge tone="danger">Error</StatusBadge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pl-7">
                <p className="text-body text-muted-foreground">
                  Your passport must remain valid for at least three months
                  after the intended departure date.
                </p>
                <div className="space-y-1.5">
                  <p className="text-eyebrow text-muted-foreground uppercase">
                    Related fields
                  </p>
                  <code className="bg-muted text-caption text-muted-foreground rounded border px-1.5 py-0.5 font-mono">
                    applicant.passport.expiryDate
                  </code>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="two">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Info className="text-info size-4 shrink-0" />
                <span className="text-body font-medium">
                  Consider adding a cover letter
                </span>
                <StatusBadge tone="info">Info</StatusBadge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-body text-muted-foreground pl-7">
                Optional, but it helps the consulate understand your itinerary.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Row>
    </Block>
  )
}

/* -------------------------------------------------------------------------
 * Composition
 * ---------------------------------------------------------------------- */

function Composition() {
  const { t } = useTranslation(['playground', 'common', 'visa-domain'])
  return (
    <Block
      id="composition"
      title={t('playground:sections.composition')}
      description={t('playground:blurbs.composition')}
    >
      <Row label={t('playground:rows.brandMark')} align="start">
        <BrandMark />
        <BrandMark showWordmark={false} />
      </Row>

      <Separator />

      <div className="bg-background rounded-xl border p-6">
        <PageHeader
          title="Documents"
          description="Track every document this application requires, and where each one stands."
          actions={
            <>
              <Button variant="outline" size="sm">
                <FileText />
                Export
              </Button>
              <Button size="sm">
                <Plus />
                Add
              </Button>
            </>
          }
        />
        <div className="mt-8">
          <SectionHeader
            title="Section header"
            description="Used to group related content inside a page"
            actions={
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight />
              </Button>
            }
          />
        </div>
      </div>

      <Separator />

      <Row label={t('playground:rows.cardAnatomy')} align="start">
        <Card className="w-full max-w-md">
          <CardHeader className="border-b">
            <CardTitle>Card title</CardTitle>
            <CardDescription>
              A short description of what this card contains.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body text-muted-foreground">
              Card content sits here, at body size.
            </p>
          </CardContent>
          <CardFooter className="border-t">
            <Button size="sm" variant="outline">
              Footer action
            </Button>
          </CardFooter>
        </Card>
      </Row>
    </Block>
  )
}

/* -------------------------------------------------------------------------
 * Dashboard widgets
 * ---------------------------------------------------------------------- */

/**
 * A fictional dossier used only to drive the dashboard widget demos. It is not
 * real applicant data and must never be copied into the app or a template.
 */
const DEMO_APPLICANT: Applicant = {
  id: 'demo-applicant',
  firstName: 'Demo',
  lastName: 'Applicant',
  dateOfBirth: '1990-01-01',
  nationality: 'TR',
  passport: {
    number: 'X0000000',
    issueDate: '2022-01-01',
    expiryDate: '2032-01-01',
    issuingCountry: 'TR',
    passportType: 'ordinary',
  },
  previousPassports: [],
  previousVisas: [],
  travelHistory: [],
}

const DEMO_APPLICATION: Application = {
  applicationId: 'demo-app',
  applicantId: 'demo-applicant',
  destinationCountry: 'GR',
  visaType: 'short_stay_tourism',
  status: 'preparing',
  createdAt: '2027-01-01T00:00:00.000Z',
  appointment: {
    date: '2027-03-15',
    location: 'Demo VAC',
    type: 'visa_center',
  },
  trip: {
    entryDate: '2027-05-01',
    exitDate: '2027-05-10',
    firstEntryCountry: 'GR',
    mainDestinationCountry: 'GR',
    entryCity: 'Athens',
    exitCity: 'Athens',
    route: [],
    transportReservations: [],
    accommodationReservations: [],
    insurance: {
      provider: 'Demo Insure',
      coverageStartDate: '2027-05-01',
      coverageEndDate: '2027-05-10',
      coverageAmount: 30000,
      currency: 'EUR',
      medicalCoverage: true,
      repatriationCoverage: true,
    },
    estimatedBudget: 2000,
    budgetCurrency: 'EUR',
  },
  financing: {
    source: 'self',
    currency: 'EUR',
    selfFundedAmount: 2000,
    accountBalance: 12000,
  },
  sponsorIds: [],
  documentIds: [],
  notes: [],
}

const demoDoc = (
  code: string,
  category: Document['category'],
  status: Document['status']
): Document => ({
  id: `demo-${code}`,
  code,
  category,
  ownerType: 'applicant',
  ownerId: 'demo-applicant',
  required: true,
  status,
  verified: status === 'ready',
})

const DEMO_DOCUMENTS: Document[] = [
  demoDoc('APPLICATION_FORM', 'application_form', 'ready'),
  demoDoc('PASSPORT_CURRENT', 'passport', 'ready'),
  demoDoc('PHOTOS', 'identity', 'ready'),
  demoDoc('ID_CARD_COPY', 'identity', 'ready'),
  demoDoc('BANK_STATEMENTS', 'financial', 'needs_update'),
  demoDoc('EMPLOYMENT_LETTER', 'employment', 'requested'),
  demoDoc('PAYSLIPS', 'employment', 'received'),
  demoDoc('TRAVEL_INSURANCE', 'insurance', 'not_started'),
  demoDoc('TRANSPORT_RESERVATION', 'travel', 'not_started'),
  demoDoc('ACCOMMODATION', 'accommodation', 'not_started'),
]

const DEMO_MODEL = buildDashboardModel({
  applicant: DEMO_APPLICANT,
  application: DEMO_APPLICATION,
  documents: DEMO_DOCUMENTS,
  sponsors: [],
})

function Dashboard() {
  const { t } = useTranslation([
    'playground',
    'dashboard',
    'common',
    'validation',
    'visa-domain',
  ])
  const td = dynamicT(t)
  const format = useFormatters()
  const app = DEMO_MODEL.active

  return (
    <Block
      id="dashboard"
      title={t('playground:sections.dashboard')}
      description={t('playground:blurbs.dashboard')}
    >
      <Row label={t('playground:rows.readinessRing')} align="start">
        <ReadinessRing
          value={40}
          size={132}
          label={t('dashboard:hero.readinessLabel')}
          valueLabel={format.percent(40)}
          caption={td('dashboard:hero.verdict.documents_remaining', {
            count: 5,
          })}
        />
        <ReadinessRing
          value={72}
          size={132}
          label={t('dashboard:hero.readinessLabel')}
          valueLabel={format.percent(72)}
          caption={td('dashboard:hero.verdict.preparing')}
        />
        <ReadinessRing
          value={100}
          size={132}
          label={t('dashboard:hero.readinessLabel')}
          valueLabel={format.percent(100)}
          caption={td('dashboard:hero.verdict.ready_for_appointment')}
        />
      </Row>

      <Separator />

      <div className="flex flex-col gap-6">
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
        <div className="grid gap-6 lg:grid-cols-2">
          <NextActions actions={app.nextActions} />
          <UpcomingTimeline items={app.upcomingTimeline} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <DocumentsSummary buckets={app.documents} />
          <ValidationSummary validation={app.validation} />
        </div>
        <TripSummary
          countryCode={app.countryCode}
          trip={app.trip}
          financing={app.financing}
          sponsorCount={app.sponsorCount}
        />
      </div>

      <Separator />

      <Row label={t('playground:rows.dashboardSkeleton')} align="start">
        <div className="w-full">
          <DashboardSkeleton />
        </div>
      </Row>
    </Block>
  )
}
