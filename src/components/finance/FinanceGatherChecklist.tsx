import * as React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, ClipboardCopy, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  financeClipboardText,
  type FinanceDocRow,
  type GatherGroupView,
} from '@/features/finance/finance-documents'

interface FinanceGatherChecklistProps {
  gather: GatherGroupView[]
}

/** Copy to clipboard with a graceful fallback for environments without the API. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'absolute'
    area.style.left = '-9999px'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

/** Documents deep-link for a gather row: its category (plus the doc when instantiated). */
function docHref(row: FinanceDocRow): string {
  return row.docId
    ? `/documents?category=${row.category}&doc=${row.docId}`
    : `/documents?category=${row.category}`
}

/**
 * "Financial evidence to gather" — the applicable financial documents not yet in
 * hand, grouped (Personal / Sponsor / Employer-funded). The Copy action copies
 * only the localized document names (never any applicant, sponsor, bank,
 * balance, or income value) as grouped plain text, announces success inline for
 * assistive tech, and keeps focus on the button. Hidden when nothing is missing.
 */
export function FinanceGatherChecklist({
  gather,
}: FinanceGatherChecklistProps) {
  const { t } = useTranslation(['finance', 'visa-domain', 'common'])
  const td = dynamicT(t)
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  if (gather.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-2.5">
        <CheckCircle2 className="text-success size-5 shrink-0" />
        <p className="text-body">{t('finance:documents.gather.empty')}</p>
      </div>
    )
  }

  const onCopy = async () => {
    const text = financeClipboardText(
      gather.map((g) => ({
        label: t(`finance:documents.gather.groups.${g.id}`),
        rows: g.rows,
      })),
      t('finance:documents.gather.heading'),
      (nameKey) => td(nameKey)
    )
    await copyText(text)
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h3 className="text-body text-foreground font-medium">
          {t('finance:documents.gather.title')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('finance:documents.gather.description')}
        </p>
      </div>

      {gather.map((group) => (
        <div key={group.id} className="flex flex-col gap-2">
          <h4 className="text-eyebrow text-muted-foreground uppercase">
            {t(`finance:documents.gather.groups.${group.id}`)}
          </h4>
          <ul className="flex flex-col gap-2">
            {group.rows.map((row) => (
              <li
                key={row.code}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-body text-foreground flex min-w-0 items-center gap-2">
                  <Check
                    aria-hidden
                    className="text-muted-foreground size-4 shrink-0"
                  />
                  <span className="truncate">{td(row.nameKey)}</span>
                </span>
                <Link
                  to={docHref(row)}
                  className="text-primary -my-1 inline-flex shrink-0 items-center gap-1 rounded-sm py-1 text-sm hover:underline"
                >
                  {t('finance:documents.open')}
                  <ArrowRight className="size-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onCopy}>
          <ClipboardCopy />
          {t('finance:documents.gather.copy')}
        </Button>
        <span
          role="status"
          aria-live="polite"
          className="text-caption text-success"
        >
          {copied ? t('finance:documents.gather.copied') : ''}
        </span>
      </div>
    </div>
  )
}
