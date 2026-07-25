import { useTranslation } from 'react-i18next'
import { LayoutGrid, List, Table2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toolbar, ToolbarSpacer, SearchInput } from '@/components/ui/toolbar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/ui/segmented-control'
import { dynamicT } from '@/lib/i18n-dynamic'
import type {
  DocumentCategory,
  DocumentStatus,
  OwnerType,
} from '@/domain/types/common'
import type { DocumentFilters as Filters } from '@/features/documents/document-filters'

export type DocumentView = 'cards' | 'list' | 'table'

const STATUSES: DocumentStatus[] = [
  'not_started',
  'requested',
  'received',
  'needs_update',
  'ready',
  'not_applicable',
]

interface DocumentFiltersProps {
  filters: Filters
  categories: DocumentCategory[]
  owners: OwnerType[]
  onUpdate: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  onClear: () => void
  activeCount: number
  resultsLabel: string
  view: DocumentView
  onViewChange: (view: DocumentView) => void
}

/**
 * The filter + view control strip. Filter state is view-independent, so
 * switching Cards/List/Table preserves every active filter. Composes the
 * shared `Toolbar`, `SearchInput`, `Select` and `SegmentedControl` primitives.
 */
export function DocumentFilters({
  filters,
  categories,
  owners,
  onUpdate,
  onClear,
  activeCount,
  resultsLabel,
  view,
  onViewChange,
}: DocumentFiltersProps) {
  const { t } = useTranslation(['documents', 'visa-domain', 'common'])
  const td = dynamicT(t)

  const viewOptions: SegmentedOption<DocumentView>[] = [
    { value: 'cards', label: t('documents:view.cards'), icon: LayoutGrid },
    { value: 'list', label: t('documents:view.list'), icon: List },
    { value: 'table', label: t('documents:view.table'), icon: Table2 },
  ]

  return (
    <div className="space-y-3">
      <Toolbar>
        <SearchInput
          placeholder={t('documents:filters.search')}
          aria-label={t('documents:filters.searchLabel')}
          value={filters.search}
          onChange={(e) => onUpdate('search', e.target.value)}
        />

        <Select
          value={filters.status}
          onValueChange={(v) => onUpdate('status', v as Filters['status'])}
        >
          <SelectTrigger aria-label={t('documents:filters.statusLabel')}>
            <SelectValue placeholder={t('documents:filters.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('documents:filters.allStatuses')}
            </SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {td(`visa-domain:documentStatus.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category}
          onValueChange={(v) => onUpdate('category', v as Filters['category'])}
        >
          <SelectTrigger aria-label={t('documents:filters.categoryLabel')}>
            <SelectValue placeholder={t('documents:filters.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('documents:filters.allCategories')}
            </SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {td(`visa-domain:documentCategory.${cat}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {owners.length > 1 && (
          <Select
            value={filters.owner}
            onValueChange={(v) => onUpdate('owner', v as Filters['owner'])}
          >
            <SelectTrigger aria-label={t('documents:filters.ownerLabel')}>
              <SelectValue placeholder={t('documents:filters.owner')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('documents:filters.allOwners')}
              </SelectItem>
              {owners.map((owner) => (
                <SelectItem key={owner} value={owner}>
                  {td(`visa-domain:ownerType.${owner}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={filters.requirement}
          onValueChange={(v) =>
            onUpdate('requirement', v as Filters['requirement'])
          }
        >
          <SelectTrigger aria-label={t('documents:filters.requirementLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('documents:filters.requirementAll')}
            </SelectItem>
            <SelectItem value="required">
              {t('documents:filters.requirementRequired')}
            </SelectItem>
            <SelectItem value="optional">
              {t('documents:filters.requirementOptional')}
            </SelectItem>
          </SelectContent>
        </Select>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X />
            {t('documents:filters.clear')}
          </Button>
        )}

        <ToolbarSpacer />

        <SegmentedControl
          options={viewOptions}
          value={view}
          onValueChange={onViewChange}
          ariaLabel={t('documents:view.label')}
          size="sm"
        />
      </Toolbar>

      <p className="text-caption text-muted-foreground">{resultsLabel}</p>
    </div>
  )
}
