import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Pencil, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { useFindingText } from '@/lib/finding-text'
import { useFormatters } from '@/lib/format'
import { documentLabel } from '@/lib/document-label'
import { dynamicT } from '@/lib/i18n-dynamic'
import type {
  SponsorCardView,
  SponsorReadiness,
} from '@/features/sponsors/sponsor-model'

interface SponsorWorkspaceCardProps {
  card: SponsorCardView
  onEdit: () => void
  onRemove: () => void
  /**
   * Lets the page reach this card's primary action. Used to send focus here
   * when the editor closes and whatever opened it no longer exists — the page
   * owns that decision; the card only exposes the element.
   */
  editButtonRef?: React.Ref<HTMLButtonElement>
}

const READINESS_TONE: Record<SponsorReadiness, StatusTone> = {
  ready: 'success',
  needsAttention: 'warning',
  incomplete: 'neutral',
}

/**
 * A rich sponsor card that answers "who is this sponsor, how complete are they,
 * and what's next" — the summary; the editing Sheet owns the details. It shows
 * relationship, participation, a calm organizational readiness label (never a
 * financial-strength score or approval likelihood — ADR-016/028), missing
 * evidence, linked-document count, findings, and one next action.
 */
export function SponsorWorkspaceCard({
  card,
  onEdit,
  onRemove,
  editButtonRef,
}: SponsorWorkspaceCardProps) {
  const { t } = useTranslation(['sponsors', 'visa-domain'])
  const td = dynamicT(t)
  const f = useFormatters()
  const findingText = useFindingText()

  const missingLabel = (reason: { id: string; code?: string }): string =>
    reason.id === 'requirement' && reason.code
      ? documentLabel(t, reason.code)
      : td(`sponsors:missing.${reason.id}`)

  const nextActionLabel = (): string | null => {
    const action = card.nextAction
    if (!action) return null
    if (action.id === 'addDocument' && action.code) {
      return t('sponsors:nextAction.addDocument', {
        document: documentLabel(t, action.code),
      })
    }
    return td(`sponsors:nextAction.${action.id}`)
  }

  const nextAction = nextActionLabel()

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <User
              aria-hidden
              className="text-muted-foreground size-4 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-body text-foreground truncate font-medium">
                {card.firstName} {card.lastName}
              </p>
              <p className="text-caption text-muted-foreground">
                {td(`visa-domain:sponsorRelationship.${card.relationship}`)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <StatusBadge tone={READINESS_TONE[card.readiness]} dot>
              {t(`sponsors:readiness.${card.readiness}`)}
            </StatusBadge>
            {card.hasStale && (
              <StatusBadge tone="warning" size="sm">
                {t('sponsors:card.staleBadge', {
                  count: card.documents.stale.length,
                })}
              </StatusBadge>
            )}
          </div>
        </div>

        {/* Participation */}
        <div className="flex flex-col gap-2">
          {card.participation.coveredExpenses.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-eyebrow text-muted-foreground uppercase">
                {t('sponsors:card.covers')}
              </span>
              {card.participation.coveredExpenses.map((e) => (
                <StatusBadge key={e} tone="neutral" size="sm">
                  {td(`visa-domain:expenseType.${e}`)}
                </StatusBadge>
              ))}
            </div>
          )}
          {card.participation.monthlyIncome != null ? (
            <p className="text-caption text-muted-foreground" data-numeric>
              {t('sponsors:card.monthlyIncome')}:{' '}
              {f.currency(
                card.participation.monthlyIncome,
                card.participation.currency
              )}
            </p>
          ) : (
            card.participation.coveredExpenses.length === 0 && (
              <p className="text-caption text-muted-foreground">
                {t('sponsors:card.noParticipation')}
              </p>
            )
          )}
          <p className="text-caption text-muted-foreground">
            {card.documents.linkedCount > 0
              ? t('sponsors:card.documentsLinked', {
                  count: card.documents.linkedCount,
                })
              : t('sponsors:card.noDocuments')}
          </p>
        </div>

        {/* Findings (calm, verbatim from the engine) */}
        {card.findings.length > 0 && (
          <ul className="flex flex-col gap-1">
            {card.findings.map((finding) => (
              <li
                key={finding.id}
                className="text-caption text-muted-foreground"
              >
                {findingText(finding).title}
              </li>
            ))}
          </ul>
        )}

        {/* Missing evidence */}
        {card.missing.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-eyebrow text-muted-foreground uppercase">
              {t('sponsors:card.missingTitle')}
            </span>
            <ul className="text-caption text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
              {card.missing.map((reason) => (
                <li key={`${reason.id}-${reason.code ?? ''}`}>
                  · {missingLabel(reason)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next action + controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          {nextAction ? (
            <span className="text-caption text-foreground inline-flex items-center gap-1.5">
              <ArrowRight aria-hidden className="text-primary size-3.5" />
              {nextAction}
            </span>
          ) : (
            <span aria-hidden />
          )}
          <div className="flex items-center gap-2">
            <Button
              ref={editButtonRef}
              variant="outline"
              size="sm"
              onClick={onEdit}
            >
              <Pencil />
              {t('sponsors:card.edit')}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              aria-label={t('sponsors:card.remove')}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
