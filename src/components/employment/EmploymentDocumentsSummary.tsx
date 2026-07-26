import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, FileText } from 'lucide-react'
import {
  StatusBadge,
  DOCUMENT_STATUS_TONE,
  type StatusTone,
} from '@/components/ui/status-badge'
import { dynamicT } from '@/lib/i18n-dynamic'
import type {
  EmploymentDocRow,
  EmploymentDocumentsView,
} from '@/features/employment/employment-documents'

interface EmploymentDocumentsSummaryProps {
  documents: EmploymentDocumentsView
}

function toneFor(status: EmploymentDocRow['status']): StatusTone {
  if (status === 'not_instantiated') return 'neutral'
  return DOCUMENT_STATUS_TONE[status] ?? 'neutral'
}

/** A focused Documents deep-link: the employment category, plus the doc when instantiated. */
function docHref(row: EmploymentDocRow): string {
  return row.docId
    ? `/documents?category=employment&doc=${row.docId}`
    : '/documents?category=employment'
}

/**
 * Employment-only document readiness, reusing the Documents feature (never a
 * second status store). Each requirement shows its current dossier status and
 * links straight into the Documents workspace, focused on the employment
 * category (and the specific document when it has been instantiated).
 */
export function EmploymentDocumentsSummary({
  documents,
}: EmploymentDocumentsSummaryProps) {
  const { t } = useTranslation(['employment', 'visa-domain', 'common'])
  const td = dynamicT(t)
  const { rows, buckets } = documents

  if (rows.length === 0) {
    return (
      <p className="text-body text-muted-foreground">
        {t('employment:documents.none')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-muted-foreground">
        {t('employment:documents.readyCount', {
          ready: buckets.ready,
          total: buckets.requiredTotal,
        })}
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.code}
            className="bg-card flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <FileText
                aria-hidden
                className="text-muted-foreground size-4 shrink-0"
              />
              <span className="text-body text-foreground truncate">
                {td(row.nameKey)}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <StatusBadge tone={toneFor(row.status)}>
                {td(`employment:documents.docStatus.${row.status}`)}
              </StatusBadge>
              <Link
                to={docHref(row)}
                className="text-primary inline-flex items-center gap-1 rounded-sm text-sm font-medium hover:underline"
                aria-label={t('employment:documents.openInDocumentsFor', {
                  document: td(row.nameKey),
                })}
              >
                {t('employment:documents.open')}
                <ArrowRight className="size-3.5" />
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
