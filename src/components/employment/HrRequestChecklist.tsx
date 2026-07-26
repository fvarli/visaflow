import * as React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, ClipboardCopy, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dynamicT } from '@/lib/i18n-dynamic'
import {
  hrClipboardText,
  type EmploymentDocRow,
} from '@/features/employment/employment-documents'

interface HrRequestChecklistProps {
  requests: EmploymentDocRow[]
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

/**
 * "What to request from HR" — the applicable employment documents not yet in
 * hand, derived from missing requirements (never hardcoded). The Copy action
 * copies only the localized document names (no applicant/employer/salary values)
 * as plain text, announces success inline for assistive tech, and keeps focus on
 * the button. Hidden when nothing is outstanding.
 */
export function HrRequestChecklist({ requests }: HrRequestChecklistProps) {
  const { t } = useTranslation(['employment', 'visa-domain', 'common'])
  const td = dynamicT(t)
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  if (requests.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-2.5">
        <CheckCircle2 className="text-success size-5 shrink-0" />
        <p className="text-body">{t('employment:documents.hr.empty')}</p>
      </div>
    )
  }

  const onCopy = async () => {
    const text = hrClipboardText(
      requests,
      t('employment:documents.hr.heading'),
      (nameKey) => td(nameKey)
    )
    await copyText(text)
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <h3 className="text-body text-foreground font-medium">
          {t('employment:documents.hr.title')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('employment:documents.hr.description')}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {requests.map((row) => (
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
              to={
                row.docId
                  ? `/documents?category=employment&doc=${row.docId}`
                  : '/documents?category=employment'
              }
              className="text-primary inline-flex shrink-0 items-center gap-1 rounded-sm text-sm hover:underline"
            >
              {t('employment:documents.open')}
              <ArrowRight className="size-3.5" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onCopy}>
          <ClipboardCopy />
          {t('employment:documents.hr.copy')}
        </Button>
        <span
          role="status"
          aria-live="polite"
          className="text-caption text-success"
        >
          {copied ? t('employment:documents.hr.copied') : ''}
        </span>
      </div>
    </div>
  )
}
