import { cn } from '@/lib/cn'

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  value: T
  options: readonly SegmentedControlOption<T>[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-app-full border border-outline-variant/60 bg-surface-container p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'state-layer rounded-app-full font-medium transition-colors',
              size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
              active
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
