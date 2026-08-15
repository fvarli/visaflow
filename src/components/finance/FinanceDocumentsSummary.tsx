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
  FinanceDocRow,
  FinanceDocumentsView,
} from '@/features/finance/finance-documents'

interface FinanceDocumentsSummaryProps {
  documents: FinanceDocumentsView
}

function toneFor(status: FinanceDocRow['status']): StatusTone {
  if (status === 'not_instantiated') return 'neutral'
  return DOCUMENT_STATUS_TONE[status] ?? 'neutral'
}

/** A focused Documents deep-link: the document's category, plus the doc when instantiated. */
function docHref(row: FinanceDocRow): string {
  return row.docId
    ? `/documents?category=${row.category}&doc=${row.docId}`
    : `/documents?category=${row.category}`
}

/**
 * Financial-evidence readiness, grouped (Bank / Employment income / Sponsor /
 * Employer / Other) and reusing the Documents feature as the single source of
 * status. Each requirement links straight into the Documents workspace, focused
 * on its category (and the specific document once instantiated).
 */
export function FinanceDocumentsSummary({
  documents,
}: FinanceDocumentsSummaryProps) {
  const { t } = useTranslation(['finance', 'visa-domain', 'common'])
  const td = dynamicT(t)
  const { groups, readiness } = documents

  if (groups.length === 0) {
    return (
      <p className="text-body text-muted-foreground">
        {t('finance:documents.none')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-body text-muted-foreground">
        {t('finance:documents.readyCount', {
          ready: readiness.ready,
          total: readiness.applicable,
        })}
      </p>

      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-2">
          <h3 className="text-eyebrow text-muted-foreground uppercase">
            {t(`finance:documents.groups.${group.id}`)}
          </h3>
          <ul className="flex flex-col gap-2">
            {group.rows.map((row) => (
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
                    {td(`finance:documents.docStatus.${row.status}`)}
                  </StatusBadge>
                  <Link
                    to={docHref(row)}
                    className="text-primary inline-flex items-center gap-1 rounded-sm text-sm font-medium hover:underline"
                    aria-label={t('finance:documents.openInDocumentsFor', {
                      document: td(row.nameKey),
                    })}
                  >
                    {t('finance:documents.open')}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
