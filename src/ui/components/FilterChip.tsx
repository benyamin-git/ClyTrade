import { X } from 'lucide-react'
import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/cn'
import { IconButton } from './IconButton'

export interface FilterChipProps {
  label: string
  onRemove: () => void
  className?: string
}

export function FilterChip({ label, onRemove, className }: FilterChipProps) {
  const { t } = useI18n()

  return (
    <span
      className={cn(
        'inline-flex h-control max-w-full items-center rounded-app-full border border-outline-variant bg-surface-container text-sm text-on-surface',
        className,
      )}
    >
      <span className="ms-3 truncate">{label}</span>
      <IconButton
        label={t('filters.remove', { label })}
        size="sm"
        onClick={onRemove}
        className="ms-1 me-1"
      >
        <X />
      </IconButton>
    </span>
  )
}
