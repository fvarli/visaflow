import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Users } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { PageHeader } from '@/components/ui/page-header'
import { PageBody } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { GuidanceNote } from '@/components/ui/guidance-note'
import { NoDossierState } from '@/components/NoDossierState'
import { createSponsorId } from '@/domain/types/common'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import {
  useSponsorsModel,
  type SponsorCardView,
} from '@/features/sponsors/sponsor-model'
import { SponsorWorkspaceCard } from '@/components/sponsors/SponsorWorkspaceCard'
import { SponsorEditorSheet } from '@/components/sponsors/SponsorEditorSheet'
import { RemoveSponsorDialog } from '@/components/sponsors/RemoveSponsorDialog'

/**
 * The Sponsors workspace — the canonical place to manage every sponsor and their
 * evidence. Rich summary cards answer who is sponsoring, how complete each is,
 * what's missing, and what's next; the editing Sheet (opened from a card or via
 * `?sponsor=<id>`) owns all sponsor data and document associations. Documents,
 * Finance, and Validation link here; document management stays in Documents
 * (ADR-028). Autosave throughout — there is no Save button.
 */
export default function SponsorsPage() {
  const { addSponsor, removeSponsor, hasData } = useDossier()
  const { t } = useTranslation('sponsors')
  const model = useSponsorsModel()

  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('sponsor')
  const [removeTarget, setRemoveTarget] = useState<SponsorCardView | null>(null)

  const openEditor = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('sponsor', id)
      return next
    })
  const closeEditor = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('sponsor')
      return next
    })

  const handleAdd = () => {
    const sponsor: Sponsor = {
      id: createSponsorId(),
      relationship: 'other',
      firstName: '',
      lastName: '',
      currency: 'EUR',
      investments: [],
      ownedAssets: [],
      coveredExpenses: [],
      sponsorshipLetter: false,
      proofOfRelationship: false,
      documentIds: [],
    }
    addSponsor(sponsor)
    openEditor(sponsor.id)
  }

  const confirmRemove = () => {
    if (!removeTarget) return
    const id = removeTarget.id
    removeSponsor(id)
    if (selectedId === id) closeEditor()
    setRemoveTarget(null)
  }

  if (!hasData) {
    return (
      <PageBody>
        <NoDossierState section={t('title')} />
      </PageBody>
    )
  }

  return (
    <PageBody>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          model.count > 0 && (
            <Button size="sm" onClick={handleAdd}>
              <Plus />
              {t('add')}
            </Button>
          )
        }
      />

      {model.needsSponsorButNone && (
        <GuidanceNote tone="info">{t('fundingNudge')}</GuidanceNote>
      )}

      {model.count === 0 ? (
        <EmptyState
          icon={Users}
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Button onClick={handleAdd}>
              <Plus />
              {t('empty.action')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {model.sponsors.map((card) => (
            <SponsorWorkspaceCard
              key={card.id}
              card={card}
              onEdit={() => openEditor(card.id)}
              onRemove={() => setRemoveTarget(card)}
            />
          ))}
        </div>
      )}

      <SponsorEditorSheet
        sponsorId={selectedId}
        onClose={closeEditor}
        onRequestRemove={() => {
          const card = model.sponsors.find((c) => c.id === selectedId)
          if (card) setRemoveTarget(card)
        }}
      />

      <RemoveSponsorDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
        sponsorName={
          removeTarget
            ? `${removeTarget.firstName} ${removeTarget.lastName}`.trim()
            : ''
        }
        onConfirm={confirmRemove}
      />
    </PageBody>
  )
}
