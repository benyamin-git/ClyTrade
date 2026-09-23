import { cn } from '@/lib/cn'

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  value: T
  options: readonly SegmentedControlOption<T>[]
  onChange: (value: T) => void
  size?: 'xs' | 'sm' | 'md'
  variant?: 'pill' | 'inline'
  ariaLabel?: string
  className?: string
}

const sizeClasses = {
  xs: 'h-6 px-1.5 text-2xs',
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
} as const

const variantClasses = {
  pill: 'rounded-app-full border border-outline-variant/60 bg-surface-container p-0.5',
  inline: 'rounded-app-sm bg-surface-container p-0.5',
} as const

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  variant = 'pill',
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-0.5',
        variantClasses[variant],
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
              'state-layer font-medium transition-colors',
              variant === 'pill' ? 'rounded-app-full' : 'rounded-app-xs',
              sizeClasses[size],
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
