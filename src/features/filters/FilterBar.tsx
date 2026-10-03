import type { ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useI18n } from '@/i18n/I18nContext'
import { Button } from '@/ui/components/Button'

export interface FilterBarProps {
  activeCount: number
  onOpenFilters: () => void
  trailing?: ReactNode
  leading?: ReactNode
}

export function FilterBar({ activeCount, onOpenFilters, trailing, leading }: FilterBarProps) {
  const { t } = useI18n()
  const hasActive = activeCount > 0

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {leading}
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
  )
}
