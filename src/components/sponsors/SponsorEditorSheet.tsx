import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Building2, Trash2 } from 'lucide-react'
import { useDossier } from '@/app/providers/DossierProvider'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Field } from '@/components/ui/field'
import { FieldHelp } from '@/components/ui/field-help'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { CountryCombobox } from '@/components/ui/country-combobox'
import { CollectionEditor } from '@/components/ui/collection-editor'
import { StatusBadge } from '@/components/ui/status-badge'
import { DataList, DataListItem } from '@/components/ui/data-list'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dynamicT } from '@/lib/i18n-dynamic'
import { useFormatters } from '@/lib/format'
import {
  CurrencySchema,
  EmploymentStatusSchema,
  ExpenseTypeSchema,
  type Currency,
  type EmploymentStatus,
} from '@/domain/types/common'
import {
  InvestmentSchema,
  OwnedAssetSchema,
  type Investment,
  type OwnedAsset,
  type Sponsor,
} from '@/domain/schemas/sponsor.schema'
import {
  SPONSOR_SECTION_IDS,
  deriveSectionStates,
  firstIncompleteSection,
  type SponsorSectionId,
} from '@/features/sponsors/sponsor-editor'
import {
  useSponsorsModel,
  type SponsorCardView,
} from '@/features/sponsors/sponsor-model'
import { SponsorRelationshipSelector } from './SponsorRelationshipSelector'
import { SponsorDocumentLinker } from './SponsorDocumentLinker'

interface SponsorEditorSheetProps {
  sponsorId: string | null
  onClose: () => void
  onRequestRemove: () => void
}

const CURRENCIES = CurrencySchema.options
const EMPLOYMENT_STATUSES = EmploymentStatusSchema.options
const EXPENSES = ExpenseTypeSchema.options
const INVESTMENT_TYPES = InvestmentSchema.shape.type.options
const ASSET_TYPES = OwnedAssetSchema.shape.type.options

/**
 * The sponsor editing surface: a right-side Sheet (full-screen on mobile) that
 * owns all sponsor editing, organized into progressive accordion sections. The
 * first incomplete section opens automatically; each shows a calm completion
 * indicator. Every field autosaves via `updateSponsor` (shallow merge) — there
 * is never a Save button. The Sheet traps focus, restores it on close, closes on
 * Escape, and preserves data across section and sponsor switches (edits live in
 * the store). Document management stays in Documents; this only records
 * associations (ADR-028).
 */
export function SponsorEditorSheet({
  sponsorId,
  onClose,
  onRequestRemove,
}: SponsorEditorSheetProps) {
  const { state, updateSponsor } = useDossier()
  const model = useSponsorsModel()
  const sponsor = state.sponsors.find((s) => s.id === sponsorId) ?? null
  const card = model.sponsors.find((c) => c.id === sponsorId) ?? null

  // If the targeted sponsor disappears (e.g. removed), close the editor.
  useEffect(() => {
    if (sponsorId && !sponsor) onClose()
  }, [sponsorId, sponsor, onClose])

  const open = sponsor !== null && card !== null

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        {sponsor && card && (
          <SponsorEditorBody
            key={sponsor.id}
            sponsor={sponsor}
            card={card}
            update={(patch) => updateSponsor(sponsor.id, patch)}
            onRemove={onRequestRemove}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

interface BodyProps {
  sponsor: Sponsor
  card: SponsorCardView
  update: (patch: Partial<Sponsor>) => void
  onRemove: () => void
}

function SponsorEditorBody({ sponsor, card, update, onRemove }: BodyProps) {
  const { t } = useTranslation(['sponsors', 'visa-domain', 'common'])
  const td = dynamicT(t)
  const f = useFormatters()

  const states = deriveSectionStates(sponsor, card.documents)
  const completeById = Object.fromEntries(states.map((s) => [s.id, s.complete]))
  const initial = firstIncompleteSection(sponsor, card.documents)

  const collectionLabels = (
    add: string,
    addTitle: string,
    editTitle: string
  ) => ({
    add,
    addTitle,
    editTitle,
    save: t('collection.save'),
    cancel: t('collection.cancel'),
    edit: t('collection.edit'),
    remove: t('collection.remove'),
  })

  const toggleExpense = (expense: (typeof EXPENSES)[number]) => {
    const has = sponsor.coveredExpenses.includes(expense)
    update({
      coveredExpenses: has
        ? sponsor.coveredExpenses.filter((e) => e !== expense)
        : [...sponsor.coveredExpenses, expense],
    })
  }

  return (
    <div className="flex flex-col">
      <SheetHeader className="border-b">
        <SheetTitle>
          {t('editor.title', {
            name: `${sponsor.firstName} ${sponsor.lastName}`.trim(),
          })}
        </SheetTitle>
        <SheetDescription>{t('editor.description')}</SheetDescription>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-danger hover:text-danger self-start"
        >
          <Trash2 />
          {t('card.remove')}
        </Button>
      </SheetHeader>

      <Accordion
        type="single"
        collapsible
        defaultValue={initial}
        className="px-4 pb-6"
      >
        {SPONSOR_SECTION_IDS.map((id) => (
          <AccordionItem key={id} value={id}>
            <AccordionTrigger>
              <span className="flex w-full items-center justify-between gap-3 pr-2">
                <span>{t(`editor.sections.${id}.title`)}</span>
                {id !== 'review' && (
                  <StatusBadge
                    tone={completeById[id] ? 'success' : 'neutral'}
                    size="sm"
                    dot
                  >
                    {t(
                      completeById[id]
                        ? 'editor.sectionComplete'
                        : 'editor.sectionIncomplete'
                    )}
                  </StatusBadge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-5 pt-1">
              <p className="text-caption text-muted-foreground">
                {t(`editor.sections.${id}.description`)}
              </p>
              {renderSection(id)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )

  function renderSection(id: SponsorSectionId) {
    switch (id) {
      case 'basics':
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('fields.firstName')} required>
              <Input
                value={sponsor.firstName}
                onChange={(e) => update({ firstName: e.target.value })}
              />
            </Field>
            <Field label={t('fields.lastName')} required>
              <Input
                value={sponsor.lastName}
                onChange={(e) => update({ lastName: e.target.value })}
              />
            </Field>
            <Field
              label={t('fields.relationship')}
              htmlFor="sponsor-relationship"
              required
              className="sm:col-span-2"
            >
              <SponsorRelationshipSelector
                id="sponsor-relationship"
                value={sponsor.relationship}
                ariaLabel={t('fields.relationship')}
                onValueChange={(relationship) => update({ relationship })}
              />
            </Field>
          </div>
        )
      case 'contact':
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('fields.dateOfBirth')}>
              <Input
                type="date"
                value={sponsor.dateOfBirth ?? ''}
                onChange={(e) =>
                  update({ dateOfBirth: e.target.value || undefined })
                }
              />
            </Field>
            <Field label={t('fields.email')}>
              <Input
                type="email"
                value={sponsor.email ?? ''}
                onChange={(e) => update({ email: e.target.value || undefined })}
              />
            </Field>
            <Field
              label={t('fields.nationality')}
              htmlFor="sponsor-nationality"
            >
              <CountryCombobox
                id="sponsor-nationality"
                value={sponsor.nationality ?? ''}
                ariaLabel={t('fields.nationality')}
                onValueChange={(v) => update({ nationality: v || undefined })}
              />
            </Field>
            <Field
              label={t('fields.countryOfResidence')}
              htmlFor="sponsor-residence"
            >
              <CountryCombobox
                id="sponsor-residence"
                value={sponsor.countryOfResidence ?? ''}
                ariaLabel={t('fields.countryOfResidence')}
                onValueChange={(v) =>
                  update({ countryOfResidence: v || undefined })
                }
              />
            </Field>
            <Field label={t('fields.phone')}>
              <Input
                value={sponsor.phone ?? ''}
                onChange={(e) => update({ phone: e.target.value || undefined })}
              />
            </Field>
            <Field label={t('fields.address')} className="sm:col-span-2">
              <Input
                value={sponsor.address ?? ''}
                onChange={(e) =>
                  update({ address: e.target.value || undefined })
                }
              />
            </Field>
          </div>
        )
      case 'employment':
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('fields.employmentStatus')}
              htmlFor="sponsor-emp-status"
            >
              <Select
                value={sponsor.employmentStatus ?? undefined}
                onValueChange={(v) =>
                  update({ employmentStatus: v as EmploymentStatus })
                }
              >
                <SelectTrigger id="sponsor-emp-status" className="w-full">
                  <SelectValue
                    placeholder={t('fields.employmentStatusPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {td(`visa-domain:employmentStatus.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('fields.employerName')}>
              <Input
                value={sponsor.employerName ?? ''}
                onChange={(e) =>
                  update({ employerName: e.target.value || undefined })
                }
              />
            </Field>
            <Field label={t('fields.jobTitle')} className="sm:col-span-2">
              <Input
                value={sponsor.jobTitle ?? ''}
                onChange={(e) =>
                  update({ jobTitle: e.target.value || undefined })
                }
              />
            </Field>
          </div>
        )
      case 'financial':
        return (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t('fields.monthlyIncome')}>
                <Input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={sponsor.monthlyIncome ?? ''}
                  onChange={(e) =>
                    update({
                      monthlyIncome: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </Field>
              <Field label={t('fields.currency')} htmlFor="sponsor-currency">
                <Select
                  value={sponsor.currency}
                  onValueChange={(v) => update({ currency: v as Currency })}
                >
                  <SelectTrigger id="sponsor-currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('fields.liquidAssets')}>
                <Input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={sponsor.liquidAssets ?? ''}
                  onChange={(e) =>
                    update({
                      liquidAssets: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </Field>
            </div>
            <p className="text-caption text-muted-foreground">
              {t('financial.hint')}
            </p>
          </div>
        )
      case 'assets':
        return (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <h4 className="text-body text-foreground font-medium">
                {t('assets.investments.title')}
              </h4>
              <CollectionEditor<Investment>
                items={sponsor.investments}
                onChange={(next) => update({ investments: next })}
                createEmpty={() => ({
                  type: 'stocks',
                  value: 0,
                  currency: 'EUR',
                })}
                validate={(d) => d.value >= 0}
                emptyIcon={TrendingUp}
                emptyTitle={t('assets.investments.empty.title')}
                emptyDescription={t('assets.investments.empty.description')}
                labels={collectionLabels(
                  t('assets.investments.add'),
                  t('assets.investments.addTitle'),
                  t('assets.investments.editTitle')
                )}
                renderSummary={(inv) => (
                  <p className="text-body text-foreground">
                    {td(`sponsors:assets.investmentType.${inv.type}`)} ·{' '}
                    {f.currency(inv.value, inv.currency)}
                  </p>
                )}
                renderForm={({ draft, setDraft }) => (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label={t('assets.investments.type')}
                      htmlFor="inv-type"
                    >
                      <Select
                        value={draft.type}
                        onValueChange={(v) =>
                          setDraft({
                            ...draft,
                            type: v as Investment['type'],
                          })
                        }
                      >
                        <SelectTrigger id="inv-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INVESTMENT_TYPES.map((it) => (
                            <SelectItem key={it} value={it}>
                              {td(`sponsors:assets.investmentType.${it}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label={t('assets.investments.value')}>
                      <Input
                        type="number"
                        min={0}
                        value={draft.value}
                        onChange={(e) =>
                          setDraft({ ...draft, value: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field
                      label={t('assets.investments.institution')}
                      className="sm:col-span-2"
                    >
                      <Input
                        value={draft.institution ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            institution: e.target.value || undefined,
                          })
                        }
                      />
                    </Field>
                  </div>
                )}
              />
            </section>

            <section className="flex flex-col gap-3">
              <h4 className="text-body text-foreground font-medium">
                {t('assets.owned.title')}
              </h4>
              <CollectionEditor<OwnedAsset>
                items={sponsor.ownedAssets}
                onChange={(next) => update({ ownedAssets: next })}
                createEmpty={() => ({
                  type: 'property',
                  description: '',
                  currency: 'EUR',
                })}
                validate={(d) => d.description.trim().length > 0}
                emptyIcon={Building2}
                emptyTitle={t('assets.owned.empty.title')}
                emptyDescription={t('assets.owned.empty.description')}
                labels={collectionLabels(
                  t('assets.owned.add'),
                  t('assets.owned.addTitle'),
                  t('assets.owned.editTitle')
                )}
                renderSummary={(asset) => (
                  <p className="text-body text-foreground">
                    {td(`sponsors:assets.assetType.${asset.type}`)} ·{' '}
                    {asset.description}
                  </p>
                )}
                renderForm={({ draft, setDraft }) => (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('assets.owned.type')} htmlFor="asset-type">
                      <Select
                        value={draft.type}
                        onValueChange={(v) =>
                          setDraft({
                            ...draft,
                            type: v as OwnedAsset['type'],
                          })
                        }
                      >
                        <SelectTrigger id="asset-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSET_TYPES.map((at) => (
                            <SelectItem key={at} value={at}>
                              {td(`sponsors:assets.assetType.${at}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label={t('assets.owned.estimatedValue')}>
                      <Input
                        type="number"
                        min={0}
                        value={draft.estimatedValue ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            estimatedValue: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                      />
                    </Field>
                    <Field
                      label={t('assets.owned.description')}
                      className="sm:col-span-2"
                      required
                    >
                      <Input
                        value={draft.description}
                        onChange={(e) =>
                          setDraft({ ...draft, description: e.target.value })
                        }
                      />
                    </Field>
                    <Field
                      label={t('assets.owned.location')}
                      className="sm:col-span-2"
                    >
                      <Input
                        value={draft.location ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            location: e.target.value || undefined,
                          })
                        }
                      />
                    </Field>
                  </div>
                )}
              />
            </section>
          </div>
        )
      case 'expenses':
        return (
          <ul className="flex flex-col gap-2">
            {EXPENSES.map((expense) => {
              const id = `sponsor-expense-${expense}`
              return (
                <li key={expense} className="flex items-center gap-2.5">
                  <Checkbox
                    id={id}
                    checked={sponsor.coveredExpenses.includes(expense)}
                    onCheckedChange={() => toggleExpense(expense)}
                  />
                  <label htmlFor={id} className="text-body text-foreground">
                    {td(`visa-domain:expenseType.${expense}`)}
                  </label>
                </li>
              )
            })}
          </ul>
        )
      case 'letters':
        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="sponsor-letter"
                checked={sponsor.sponsorshipLetter}
                onCheckedChange={(c) =>
                  update({ sponsorshipLetter: c === true })
                }
              />
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="sponsor-letter"
                  className="text-body text-foreground"
                >
                  {t('letters.sponsorshipLetter.label')}
                </label>
                <FieldHelp
                  label={t('letters.sponsorshipLetter.label')}
                  title={t('letters.sponsorshipLetter.label')}
                >
                  <p>{t('letters.sponsorshipLetter.help')}</p>
                </FieldHelp>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="sponsor-proof"
                checked={sponsor.proofOfRelationship}
                onCheckedChange={(c) =>
                  update({ proofOfRelationship: c === true })
                }
              />
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="sponsor-proof"
                  className="text-body text-foreground"
                >
                  {t('letters.proofOfRelationship.label')}
                </label>
                <FieldHelp
                  label={t('letters.proofOfRelationship.label')}
                  title={t('letters.proofOfRelationship.label')}
                >
                  <p>{t('letters.proofOfRelationship.help')}</p>
                </FieldHelp>
              </div>
            </div>
          </div>
        )
      case 'documents':
        return (
          <div className="flex flex-col gap-4">
            <p className="text-caption text-muted-foreground">
              {t('documents.description')}
            </p>
            <SponsorDocumentLinker
              documents={card.documents}
              onLink={(docId) =>
                update({ documentIds: [...sponsor.documentIds, docId] })
              }
              onUnlink={(docId) =>
                update({
                  documentIds: sponsor.documentIds.filter((d) => d !== docId),
                })
              }
            />
          </div>
        )
      case 'review':
        return (
          <div className="flex flex-col gap-4">
            <StatusBadge
              tone={
                card.readiness === 'ready'
                  ? 'success'
                  : card.readiness === 'needsAttention'
                    ? 'warning'
                    : 'neutral'
              }
              dot
            >
              {t(`readiness.${card.readiness}`)}
            </StatusBadge>
            <DataList>
              <DataListItem
                label={t('fields.relationship')}
                value={td(
                  `visa-domain:sponsorRelationship.${sponsor.relationship}`
                )}
              />
              <DataListItem
                label={t('fields.monthlyIncome')}
                value={
                  sponsor.monthlyIncome != null
                    ? f.currency(sponsor.monthlyIncome, sponsor.currency)
                    : undefined
                }
              />
              <DataListItem
                label={t('editor.sections.expenses.title')}
                value={
                  sponsor.coveredExpenses.length > 0
                    ? sponsor.coveredExpenses
                        .map((e) => td(`visa-domain:expenseType.${e}`))
                        .join(', ')
                    : undefined
                }
              />
              <DataListItem
                label={t('editor.sections.documents.title')}
                value={t('card.documentsLinked', {
                  count: card.documents.linkedCount,
                })}
              />
            </DataList>
            <Field label={t('fields.notes')}>
              <Textarea
                value={sponsor.notes ?? ''}
                placeholder={t('fields.notesPlaceholder')}
                onChange={(e) => update({ notes: e.target.value || undefined })}
              />
            </Field>
          </div>
        )
    }
  }
}
