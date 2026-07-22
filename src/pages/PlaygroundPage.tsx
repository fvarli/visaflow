import { useState } from 'react'
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

  return (
    <PageBody>
      <PageHeader
        eyebrow="Internal"
        title="Design system playground"
        description="Every reusable primitive, in every state. Use this to iterate on the visual language before applying it to real pages."
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone="neutral" size="md" dot>
              {theme} → {resolvedTheme}
            </StatusBadge>
            <ThemeToggle />
          </div>
        }
      />

      <Nav />
      <Foundations />
      <Typography />
      <Buttons />
      <Badges />
      <Forms />
      <Feedback />
      <DataDisplay />
      <Overlays />
      <Composition />
    </PageBody>
  )
}

/* -------------------------------------------------------------------------
 * Layout helpers, local to the playground
 * ---------------------------------------------------------------------- */

const SECTIONS = [
  ['foundations', 'Foundations'],
  ['typography', 'Typography'],
  ['buttons', 'Buttons'],
  ['badges', 'Badges & status'],
  ['forms', 'Forms'],
  ['feedback', 'Feedback'],
  ['data', 'Data display'],
  ['overlays', 'Overlays'],
  ['composition', 'Composition'],
] as const

function Nav() {
  return (
    <nav aria-label="Playground sections" className="flex flex-wrap gap-2">
      {SECTIONS.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          className="bg-card text-body hover:border-border-strong hover:bg-accent rounded-full border px-3 py-1 transition-colors"
        >
          {label}
        </a>
      ))}
    </nav>
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
  return (
    <Block
      id="foundations"
      title="Foundations"
      description="Surfaces, accent and status tokens. Every swatch is a live CSS variable — it follows the theme."
    >
      <Row label="Surfaces" align="start">
        <Swatch name="background" className="bg-background" note="canvas" />
        <Swatch name="card" className="bg-card" note="raised" />
        <Swatch name="popover" className="bg-popover" note="overlay" />
        <Swatch name="muted" className="bg-muted" note="recessed" />
        <Swatch name="sidebar" className="bg-sidebar" />
      </Row>

      <Row label="Accent" hint="Cobalt Indigo" align="start">
        <Swatch name="primary" className="bg-primary" note="actions" />
        <Swatch name="primary-hover" className="bg-primary-hover" />
        <Swatch
          name="brand-subtle"
          className="bg-brand-subtle"
          note="active nav"
        />
        <Swatch name="ring" className="bg-ring" note="focus" />
      </Row>

      <Row label="Status" hint="solid / muted" align="start">
        <Swatch name="success" className="bg-success" />
        <Swatch name="warning" className="bg-warning" />
        <Swatch name="danger" className="bg-danger" />
        <Swatch name="info" className="bg-info" note="low chroma" />
      </Row>

      <Row label="Status muted" align="start">
        <Swatch name="success-muted" className="bg-success-muted" />
        <Swatch name="warning-muted" className="bg-warning-muted" />
        <Swatch name="danger-muted" className="bg-danger-muted" />
        <Swatch name="info-muted" className="bg-info-muted" />
      </Row>

      <Row label="Text" align="start">
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
      <Row label="Radius" align="start">
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

      <Row label="Elevation" hint="hue-tinted, faint" align="start">
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
      title="Typography"
      description="Inter Variable, self-hosted. Each size carries its own line-height, tracking and weight."
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

      <Row label="Numerals" hint="tabular via data-numeric" align="start">
        <div className="space-y-1">
          <p className="text-body">Proportional: 1,480.00 · 2026-07-22</p>
          <p data-numeric className="text-body">
            Tabular: 1,480.00 · 2026-07-22
          </p>
        </div>
      </Row>

      <Row label="Mono" hint="JetBrains Mono" align="start">
        <p className="text-body font-mono">U12345678 · DOC-PASSPORT-01</p>
      </Row>
    </Block>
  )
}

/* -------------------------------------------------------------------------
 * Buttons
 * ---------------------------------------------------------------------- */

function Buttons() {
  return (
    <Block
      id="buttons"
      title="Buttons"
      description="Focus rings come from the global :focus-visible rule — tab through these to check consistency."
    >
      <Row label="Variants">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </Row>

      <Row label="Sizes">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
      </Row>

      <Row label="With icons">
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

      <Row label="Icon only">
        <Button size="icon-xs" variant="outline" aria-label="Delete">
          <Trash2 />
        </Button>
        <Button size="icon-sm" variant="outline" aria-label="Delete">
          <Trash2 />
        </Button>
        <Button size="icon" variant="outline" aria-label="Delete">
          <Trash2 />
        </Button>
        <Button size="icon-lg" variant="outline" aria-label="Delete">
          <Trash2 />
        </Button>
      </Row>

      <Row label="Disabled">
        <Button disabled>Default</Button>
        <Button variant="outline" disabled>
          Outline
        </Button>
        <Button variant="ghost" disabled>
          Ghost
        </Button>
      </Row>

      <Row label="Keyboard">
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
  return (
    <Block
      id="badges"
      title="Badges & status"
      description="StatusBadge is the token-driven one — prefer it for anything that carries state."
    >
      <Row label="StatusBadge" hint="tone">
        {TONES.map((tone) => (
          <StatusBadge key={tone} tone={tone}>
            {humanizeStatus(tone)}
          </StatusBadge>
        ))}
      </Row>

      <Row label="With dot" hint="reads faster in tables">
        {TONES.map((tone) => (
          <StatusBadge key={tone} tone={tone} dot>
            {humanizeStatus(tone)}
          </StatusBadge>
        ))}
      </Row>

      <Row label="Size md">
        {TONES.map((tone) => (
          <StatusBadge key={tone} tone={tone} size="md" dot>
            {humanizeStatus(tone)}
          </StatusBadge>
        ))}
      </Row>

      <Row label="Document status" hint="live domain mapping">
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

      <Row label="Badge" hint="legacy variants">
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
  const [checked, setChecked] = useState(true)

  return (
    <Block
      id="forms"
      title="Forms"
      description="Field wires label, description and error to the control. Inspect the DOM here to confirm aria-describedby and aria-invalid."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="First name">
          <Input placeholder="As on passport" />
        </Field>

        <Field label="Passport number" required>
          <Input placeholder="U12345678" className="font-mono" />
        </Field>

        <Field
          label="Nationality"
          required
          description="Two-letter country code"
        >
          <Input
            placeholder="TR"
            maxLength={2}
            className="font-mono uppercase"
          />
        </Field>

        <Field
          label="Entry date"
          required
          error="Entry date must be before the exit date"
        >
          <Input type="date" />
        </Field>

        <Field label="Marital status" htmlFor="pg-marital">
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

        <Field label="Disabled">
          <Input placeholder="Not editable" disabled />
        </Field>
      </div>

      <Field label="Notes" description="Supports multiple lines">
        <Textarea placeholder="Anything worth remembering…" rows={3} />
      </Field>

      <Row label="Checkbox">
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

      <Row label="Toolbar" align="start">
        <Toolbar className="w-full">
          <SearchInput placeholder="Search documents..." aria-label="Search" />
          <Select>
            <SelectTrigger className="w-full sm:w-44" aria-label="Category">
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
  return (
    <Block
      id="feedback"
      title="Feedback"
      description="Alerts, progress and loading. Tints are low chroma — a change in paper stock, not a colored box."
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

      <Row label="Progress" align="start">
        <div className="w-full max-w-md space-y-3">
          <Progress value={0} aria-label="0 percent" />
          <Progress value={35} aria-label="35 percent" />
          <Progress value={72} aria-label="72 percent" />
          <Progress value={100} aria-label="100 percent" />
        </div>
      </Row>

      <Row label="Skeleton" align="start">
        <div className="w-full max-w-md space-y-2.5">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </Row>

      <Separator />

      <Row label="EmptyState" align="start">
        <div className="w-full">
          <EmptyState
            icon={FileText}
            title="No documents match"
            description="Try clearing the search or loosening the filters."
            action={<Button size="sm">Clear filters</Button>}
          />
        </div>
      </Row>

      <Row label="Inline variant" align="start">
        <div className="w-full">
          <EmptyState
            variant="inline"
            icon={Calendar}
            title="No timeline events yet"
            description="Add appointment and trip dates to see them plotted here."
          />
        </div>
      </Row>

      <Row label="NoDossierState" hint="app-specific" align="start">
        <div className="w-full">
          <NoDossierState label="documents" />
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
  return (
    <Block
      id="data"
      title="Data display"
      description="Metrics, tables and label/value pairs. Numbers use tabular figures so columns align."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Appointment"
          icon={Calendar}
          value="12 Aug 2026"
          hint="21 days remaining"
        />
        <StatCard label="Trip start" icon={Plane} value="Not set" muted />
        <StatCard
          label="Open findings"
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

      <Row label="DataList" align="start">
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
  return (
    <Block
      id="overlays"
      title="Overlays"
      description="Dialog, tooltip and accordion. Check focus trapping and escape handling here."
    >
      <Row label="Dialog">
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

      <Row label="Tooltip">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>Exports a JSON file to your device</TooltipContent>
        </Tooltip>
      </Row>

      <Row label="Accordion" align="start">
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
  return (
    <Block
      id="composition"
      title="Composition"
      description="How the page-level pieces sit together. This is the rhythm every redesigned page should inherit."
    >
      <Row label="BrandMark" align="start">
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

      <Row label="Card anatomy" align="start">
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
