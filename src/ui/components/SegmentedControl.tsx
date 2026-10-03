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
  variant?: 'pill' | 'inline' | 'separated'
  fullWidth?: boolean
  ariaLabel?: string
  className?: string
}

const sizeClasses = {
  xs: 'h-6 px-1.5 text-2xs',
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
} as const

const variantClasses = {
  pill: 'rounded-app-full border border-outline-variant bg-surface-container-lowest p-0.5',
  inline: 'rounded-app-sm bg-surface-container p-0.5',
} as const

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  variant = 'pill',
  fullWidth = false,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  if (variant === 'separated') {
    return (
      <div role="group" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                'state-layer inline-flex shrink-0 items-center justify-center rounded-app-full border font-medium whitespace-nowrap transition-colors',
                sizeClasses[size],
                active
                  ? 'border-transparent bg-secondary-container text-on-secondary-container'
                  : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5',
        fullWidth ? 'w-full flex-wrap' : 'w-fit shrink-0',
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
              'state-layer font-medium whitespace-nowrap transition-colors',
              fullWidth && 'min-w-fit flex-1',
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
