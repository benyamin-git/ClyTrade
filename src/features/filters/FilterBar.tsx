import type { ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useI18n } from '@/i18n/I18nContext'
import { Button } from '@/ui/components/Button'
import { FilterChip } from '@/ui/components/FilterChip'

export interface FilterBarChip {
  id: string
  label: string
  onClear: () => void
}

export interface FilterBarProps {
  children: ReactNode
  chips: readonly FilterBarChip[]
  activeCount: number
  onOpenFilters: () => void
  onClearAll: () => void
  trailing?: ReactNode
}

export function FilterBar({
  children,
  chips,
  activeCount,
  onOpenFilters,
  onClearAll,
  trailing,
}: FilterBarProps) {
  const { t } = useI18n()
  const hasActive = activeCount > 0
  const showChips = chips.length > 0 || hasActive

  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button
          size="sm"
          variant="outlined"
          icon={<SlidersHorizontal />}
          onClick={onOpenFilters}
          aria-label={
            hasActive
              ? `${t('filters.open')}: ${t('filters.activeCount', { count: activeCount })}`
              : t('filters.open')
          }
        >
          {t('filters.open')}
          {hasActive ? (
            <span
              aria-hidden="true"
              className="inline-flex min-w-5 items-center justify-center rounded-app-full bg-primary px-1.5 text-2xs font-medium tabular-nums text-on-primary"
            >
              {activeCount}
            </span>
          ) : null}
        </Button>
        <div className="flex-1" />
        {trailing}
      </div>
      {showChips ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {chips.map((chip) => (
            <FilterChip
              key={chip.id}
              label={chip.label}
              onRemove={chip.onClear}
              className="shrink-0"
            />
          ))}
          {hasActive ? (
            <Button variant="text" size="sm" className="shrink-0" onClick={onClearAll}>
              {t('filters.clearAll')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
