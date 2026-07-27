import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, FileText, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge, DOCUMENT_STATUS_TONE } from '@/components/ui/status-badge'
import { documentLabel } from '@/lib/document-label'
import { dynamicT } from '@/lib/i18n-dynamic'
import type {
  SponsorDocRow,
  SponsorDocumentsView,
} from '@/features/sponsors/sponsor-documents'

interface SponsorDocumentLinkerProps {
  documents: SponsorDocumentsView
  onLink: (docId: string) => void
  onUnlink: (docId: string) => void
}

/**
 * The per-sponsor evidence linker. It associates existing sponsor-evidence
 * documents with a sponsor (via `Sponsor.documentIds`) through an accessible
 * checklist — linking never creates, edits, or deletes a document; Documents
 * remains the sole owner of that (ADR-028). It clearly separates linked
 * evidence, other eligible documents, missing applicable requirements (create in
 * Documents), and stale links (removable without deleting anything).
 */
export function SponsorDocumentLinker({
  documents,
  onLink,
  onUnlink,
}: SponsorDocumentLinkerProps) {
  const { t } = useTranslation(['sponsors', 'visa-domain', 'documents'])
  const td = dynamicT(t)

  const eligible: SponsorDocRow[] = [
    ...documents.linked,
    ...documents.eligibleUnlinked,
  ]

  const docHref = (docId: string) => `/documents?category=sponsor&doc=${docId}`

  return (
    <div className="flex flex-col gap-5">
      {/* The eligible-document checklist (linked + linkable). */}
      {eligible.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {eligible.map((row) => {
            const label = documentLabel(t, row.code, row.name)
            const checkboxId = `sponsor-doc-${row.docId}`
            return (
              <li
                key={row.docId}
                className="bg-card flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Checkbox
                    id={checkboxId}
                    checked={row.linked}
                    onCheckedChange={(checked) =>
                      checked ? onLink(row.docId) : onUnlink(row.docId)
                    }
                    aria-label={t(
                      row.linked
                        ? 'sponsors:documents.unlinkLabel'
                        : 'sponsors:documents.linkLabel',
                      { document: label }
                    )}
                  />
                  <label
                    htmlFor={checkboxId}
                    className="flex min-w-0 flex-col gap-0.5"
                  >
                    <span className="text-body text-foreground truncate">
                      {label}
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {t('sponsors:documents.ownerContext', {
                        owner: td(`visa-domain:ownerType.${row.ownerType}`),
                      })}
                    </span>
                  </label>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <StatusBadge
                    tone={DOCUMENT_STATUS_TONE[row.status] ?? 'neutral'}
                  >
                    {td(`visa-domain:documentStatus.${row.status}`)}
                  </StatusBadge>
                  <Link
                    to={docHref(row.docId)}
                    className="text-primary inline-flex items-center gap-1 rounded-sm text-sm hover:underline"
                    aria-label={t('sponsors:documents.open')}
                  >
                    {t('sponsors:documents.open')}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-body text-muted-foreground">
          {t('sponsors:documents.none')}
        </p>
      )}

      {/* Missing applicable requirements — created in Documents, then linked here. */}
      {documents.missingRequirements.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-eyebrow text-muted-foreground uppercase">
            {t('sponsors:documents.missingTitle')}
          </h4>
          <p className="text-caption text-muted-foreground">
            {t('sponsors:documents.missingHint')}
          </p>
          <ul className="flex flex-col gap-2">
            {documents.missingRequirements.map((req) => (
              <li
                key={req.code}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-body text-foreground flex min-w-0 items-center gap-2">
                  <FileText
                    aria-hidden
                    className="text-muted-foreground size-4 shrink-0"
                  />
                  <span className="truncate">{td(req.nameKey)}</span>
                </span>
                <Link
                  to="/documents?category=sponsor"
                  className="text-primary inline-flex shrink-0 items-center gap-1 rounded-sm text-sm hover:underline"
                >
                  {t('sponsors:documents.openCategory')}
                  <ArrowRight className="size-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stale links — removable without deleting any document. */}
      {documents.stale.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-warning flex items-center gap-1.5 text-sm font-medium">
            <TriangleAlert aria-hidden className="size-4" />
            {t('sponsors:documents.staleTitle')}
          </h4>
          <p className="text-caption text-muted-foreground">
            {t('sponsors:documents.staleHint')}
          </p>
          <ul className="flex flex-col gap-2">
            {documents.stale.map((id) => (
              <li key={id} className="flex items-center justify-between gap-3">
                <span className="text-caption text-muted-foreground truncate font-mono">
                  {id}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUnlink(id)}
                >
                  {t('sponsors:documents.removeStale')}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {eligible.length > 0 &&
        documents.missingRequirements.length === 0 &&
        documents.eligibleUnlinked.length === 0 &&
        documents.stale.length === 0 && (
          <p className="text-caption text-success">
            {t('sponsors:documents.allLinked')}
          </p>
        )}
    </div>
  )
}
